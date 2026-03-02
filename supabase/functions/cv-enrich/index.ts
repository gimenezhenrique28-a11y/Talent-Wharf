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

  // ── Auth (same wharf_sk_ pattern as extension-capture) ───────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawKey     = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!rawKey.startsWith("wharf_sk_")) {
    return json({ error: "Invalid API key format" }, 401, cors);
  }

  const keyHash  = await sha256(rawKey);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: apiKey, error: keyErr } = await supabase
    .from("api_keys")
    .select("id, user_id, revoked")
    .eq("key_hash", keyHash)
    .single();

  if (keyErr || !apiKey || apiKey.revoked) {
    return json({ error: "Unauthorized" }, 401, cors);
  }

  // ── Org lookup ────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", apiKey.user_id)
    .single();

  if (!profile?.org_id) return json({ error: "Profile not found" }, 404, cors);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400, cors); }

  const { candidate_id, pdf_base64, filename } = body;

  if (!candidate_id) return json({ error: "candidate_id is required" }, 400, cors);
  if (!pdf_base64)   return json({ error: "pdf_base64 is required" }, 400, cors);

  // ── Verify candidate belongs to this org ──────────────────────────────────
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, name, headline, about, skills, experience, email")
    .eq("id", candidate_id)
    .eq("org_id", profile.org_id)
    .single();

  if (!candidate) return json({ error: "Candidate not found" }, 404, cors);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "CV parsing not configured — set ANTHROPIC_API_KEY in edge function secrets" }, 503, cors);
  }

  // ── Diagnostic log — helps us confirm data is arriving ───────────────────
  console.log(`cv-enrich: candidate=${candidate_id} pdf_base64_len=${pdf_base64.length} filename=${filename ?? "none"}`);

  // ── Call Claude with the PDF ───────────────────────────────────────────────
  // Uses claude-3-5-sonnet which has stable native PDF support.
  // The pdfs-2024-09-25 beta header is required for the document block type.
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
        // claude-3-5-sonnet supports PDF document blocks; haiku did not when the beta launched
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

    console.log(`Anthropic response status: ${anthropicRes.status}`);

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`Anthropic API ${anthropicRes.status}:`, errText);
      return json({ error: "Claude API error", detail: errText, status: anthropicRes.status }, 500, cors);
    }

    const anthropicData = await anthropicRes.json();
    const raw   = anthropicData.content?.[0]?.text ?? "";
    console.log("Claude raw response:", raw.slice(0, 200));
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    extracted   = JSON.parse(clean);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("CV extraction failed:", msg);
    return json({ error: "Failed to parse CV", detail: msg }, 500, cors);
  }

  // ── Only fill in fields that are currently empty on the candidate ─────────
  // (never overwrite data the user already has)
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
    await supabase
      .from("candidates")
      .update(patch)
      .eq("id", candidate_id);
  }

  // ── Activity log ──────────────────────────────────────────────────────────
  await supabase.from("activity_log").insert({
    org_id:       profile.org_id,
    candidate_id,
    user_id:      apiKey.user_id,
    action:       "cv_parsed",
    details: {
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
