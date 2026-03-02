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
  const PROMPT = `Extract structured data from this CV/resume.
Return ONLY valid JSON — no markdown fences, no explanation. Use this exact shape:
{
  "name": "full name or null",
  "email": "email address or null",
  "headline": "current job title / role or null",
  "about": "2-3 sentence professional summary or null",
  "skills": ["skill1", "skill2"],
  "experience": [
    { "title": "Job Title", "company": "Company Name", "start": "2020", "end": "Present" }
  ]
}
Rules:
- skills: max 15, most relevant first
- experience: max 5 entries, most recent first
- If a field is not in the CV, use null (for strings) or [] (for arrays)`;

  let extracted: unknown;
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
        model:      "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type:   "document",
              source: { type: "base64", media_type: "application/pdf", data: pdf_base64 },
            },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "Claude API error", detail: errText }, 500, cors);
    }

    const data  = await res.json();
    const raw   = data.content?.[0]?.text ?? "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    extracted   = JSON.parse(clean);
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
