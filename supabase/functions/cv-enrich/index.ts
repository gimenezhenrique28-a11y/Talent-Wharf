import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY         = Deno.env.get("ANTHROPIC_API_KEY");

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestBody {
  candidate_id: string;
  pdf_base64:   string;
  filename?:    string;
}

interface Extracted {
  name?:       string | null;
  email?:      string | null;
  headline?:   string | null;
  about?:      string | null;
  skills?:     string[];
  experience?: Array<{ title: string; company: string; start?: string; end?: string }>;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405, cors);

  // ── Auth: accept either a wharf_sk_ API key OR a JWT from the dashboard ───
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawToken   = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let   userId: string;
  let   orgId:  string;

  if (rawToken.startsWith("wharf_sk_")) {
    // ── API key auth (existing path) ────────────────────────────────────────
    const keyHash = await sha256(rawToken);
    const { data: apiKey, error: keyErr } = await supabaseAdmin
      .from("api_keys")
      .select("id, user_id, revoked")
      .eq("key_hash", keyHash)
      .single();

    if (keyErr || !apiKey || apiKey.revoked) {
      return json({ error: "Unauthorized" }, 401, cors);
    }
    userId = apiKey.user_id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .single();
    if (!profile?.org_id) return json({ error: "Profile not found" }, 404, cors);
    orgId = profile.org_id;

  } else {
    // ── JWT auth (dashboard path) ───────────────────────────────────────────
    if (!rawToken) return json({ error: "Missing Authorization header" }, 401, cors);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${rawToken}` } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401, cors);
    userId = user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .single();
    if (!profile?.org_id) return json({ error: "Profile not found" }, 404, cors);
    orgId = profile.org_id;
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400, cors); }

  const { candidate_id, pdf_base64, filename } = body;

  if (!candidate_id) return json({ error: "candidate_id is required" }, 400, cors);
  if (!pdf_base64)   return json({ error: "pdf_base64 is required" }, 400, cors);

  // ── Verify candidate belongs to this org ──────────────────────────────────
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, name, headline, about, skills, experience, email")
    .eq("id", candidate_id)
    .eq("org_id", orgId)
    .single();

  if (!candidate) return json({ error: "Candidate not found" }, 404, cors);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "CV parsing not configured — set ANTHROPIC_API_KEY in edge function secrets" }, 503, cors);
  }

  console.log(`cv-enrich: candidate=${candidate_id} pdf_base64_len=${pdf_base64.length} filename=${filename ?? "none"}`);

  // ── Call Claude with the PDF ───────────────────────────────────────────────

  // System prompt: grounding rules that prevent hallucination
  const SYSTEM = `You are a CV data extraction tool. Your only job is to copy information that is \
explicitly present in the provided document.

STRICT RULES — no exceptions:
- Extract ONLY text that appears verbatim or near-verbatim in the document
- Never infer, guess, or generate any information not present in the document
- Never fabricate a summary — "about" must come from the candidate's own words if present
- If a field is absent or ambiguous, return null (strings) or [] (arrays)
- Return a single JSON object. No markdown fences, no explanation, no preamble.`;

  // User prompt: schema only, no behavioral instructions (those are in system)
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

  let extracted: Extracted;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    console.log(`Anthropic response status: ${anthropicRes.status}`);

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`Anthropic API ${anthropicRes.status}:`, errText);
      return json({ error: "Claude API error", detail: errText, status: anthropicRes.status }, 500, cors);
    }

    const anthropicData = await anthropicRes.json();
    // Pre-fill means response continues from "{" — prepend it back
    const raw   = "{" + (anthropicData.content?.[0]?.text ?? "");
    console.log("Claude raw response:", raw.slice(0, 200));
    extracted   = JSON.parse(raw);

    // ── Post-processing validation: reject anything that looks invented ────
    // Email must pass a basic format check
    if (extracted.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(extracted.email))) {
      console.warn("cv-enrich: rejected malformed email", extracted.email);
      extracted.email = null;
    }
    // Skills must be short tokens (long strings are likely hallucinated sentences)
    if (Array.isArray(extracted.skills)) {
      extracted.skills = extracted.skills
        .filter((s): s is string => typeof s === "string" && s.length >= 1 && s.length <= 60)
        .slice(0, 15);
    }
    // Experience dates must be plausible years
    if (Array.isArray(extracted.experience)) {
      const currentYear = new Date().getFullYear();
      extracted.experience = extracted.experience.filter((e) => {
        const startYear = parseInt(String((e as Record<string, string>).start ?? ""));
        return isNaN(startYear) || (startYear >= 1950 && startYear <= currentYear + 1);
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("CV extraction failed:", msg);
    return json({ error: "Failed to parse CV", detail: msg }, 500, cors);
  }

  // ── Only fill in fields that are currently empty on the candidate ─────────
  const patch: Record<string, unknown> = {};

  if (!candidate.headline  && extracted.headline) patch.headline = String(extracted.headline).slice(0, 500);
  if (!candidate.about     && extracted.about)    patch.about    = String(extracted.about).slice(0, 2000);
  if (!candidate.email     && extracted.email)    patch.email    = String(extracted.email).slice(0, 255);

  const hasSkills = Array.isArray(candidate.skills) && (candidate.skills as unknown[]).length > 0;
  if (!hasSkills && Array.isArray(extracted.skills) && extracted.skills.length > 0) {
    patch.skills = (extracted.skills as string[]).slice(0, 15).map((s) => String(s).slice(0, 100));
  }

  const hasExp = Array.isArray(candidate.experience) && (candidate.experience as unknown[]).length > 0;
  if (!hasExp && Array.isArray(extracted.experience) && extracted.experience.length > 0) {
    patch.experience = (extracted.experience as unknown[]).slice(0, 5).map((e: unknown) => {
      const entry = e as Record<string, string>;
      return {
        title:   String(entry.title   ?? "").slice(0, 200),
        company: String(entry.company ?? "").slice(0, 200),
        start:   String(entry.start   ?? "").slice(0, 20),
        end:     String(entry.end     ?? "").slice(0, 20),
      };
    });
  }

  console.log(`cv-enrich: patch keys = [${Object.keys(patch).join(", ")}]`);

  if (Object.keys(patch).length > 0) {
    patch.enriched_at = new Date().toISOString();
    await supabaseAdmin
      .from("candidates")
      .update(patch)
      .eq("id", candidate_id);
  }

  // ── Activity log ──────────────────────────────────────────────────────────
  await supabaseAdmin.from("activity_log").insert({
    candidate_id,
    user_id:      userId,
    action:       "cv_parsed",
    metadata: {
      filename:       filename ?? null,
      fields_updated: Object.keys(patch),
    },
  });

  return json(
    { success: true, candidate_id, updated: Object.keys(patch) },
    200, cors,
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
