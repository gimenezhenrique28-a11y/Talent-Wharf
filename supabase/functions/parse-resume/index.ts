import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY         = Deno.env.get("ANTHROPIC_API_KEY");

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405, cors);

  // ── JWT auth ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawToken   = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!rawToken) return json({ error: "Missing Authorization header" }, 401, cors);

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${rawToken}` } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401, cors);

  // ── Parse body ────────────────────────────────────────────────────────────
  let pdf_base64: string;
  try {
    const body = await req.json();
    pdf_base64 = body?.pdf_base64;
    if (!pdf_base64) throw new Error("missing");
  } catch {
    return json({ error: "pdf_base64 is required" }, 400, cors);
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "Resume parsing not configured — set ANTHROPIC_API_KEY" }, 503, cors);
  }

  console.log(`parse-resume: user=${user.id} pdf_len=${pdf_base64.length}`);

  // ── Call Claude ───────────────────────────────────────────────────────────

  // System prompt: grounding rules that prevent hallucination
  const SYSTEM = `You are a CV data extraction tool. Your only job is to copy information that is \
explicitly present in the provided document.

STRICT RULES — no exceptions:
- Extract ONLY text that appears verbatim or near-verbatim in the document
- Never infer, guess, or generate any information not present in the document
- Never fabricate a summary — "about" must come from the candidate's own words if present
- If a field is absent or ambiguous, return null (strings) or [] (arrays)
- Return a single JSON object. No markdown fences, no explanation, no preamble.`;

  const USER_PROMPT = `Extract the following fields from this CV. Use this exact JSON shape:
{
  "name": "full name or null",
  "email": "email address or null",
  "headline": "current or most recent job title or null",
  "about": "candidate's own professional summary verbatim or condensed, or null if absent",
  "skills": ["skill1", "skill2"],
  "experience": [
    { "title": "Job Title", "company": "Company Name", "start": "2020", "end": "Present" }
  ]
}
Constraints: skills max 15 (most relevant first), experience max 5 (most recent first).`;

  let extracted: Record<string, unknown>;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "pdfs-2024-09-25",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:       "claude-haiku-4-5-20251001",
        max_tokens:  1024,
        temperature: 0,           // deterministic — eliminates creative invention
        system:      SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf_base64 } },
              { type: "text", text: USER_PROMPT },
            ],
          },
          // Pre-fill the assistant turn — forces model to start with { and skip any prose prefix
          { role: "assistant", content: [{ type: "text", text: "{" }] },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "Claude API error", detail: errText }, 500, cors);
    }

    const data = await res.json();
    // Pre-fill means response continues from "{" — prepend it back
    const raw  = "{" + (data.content?.[0]?.text ?? "");
    extracted  = JSON.parse(raw);

    // ── Post-processing validation: reject anything that looks invented ────
    if (extracted.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(extracted.email))) {
      extracted.email = null;
    }
    if (Array.isArray(extracted.skills)) {
      extracted.skills = (extracted.skills as unknown[])
        .filter((s): s is string => typeof s === "string" && s.length >= 1 && s.length <= 60)
        .slice(0, 15);
    }
    if (Array.isArray(extracted.experience)) {
      const currentYear = new Date().getFullYear();
      extracted.experience = (extracted.experience as unknown[]).filter((e) => {
        const startYear = parseInt(String((e as Record<string, string>).start ?? ""));
        return isNaN(startYear) || (startYear >= 1950 && startYear <= currentYear + 1);
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: "Failed to parse CV", detail: msg }, 500, cors);
  }

  return json({ success: true, data: extracted }, 200, cors);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
