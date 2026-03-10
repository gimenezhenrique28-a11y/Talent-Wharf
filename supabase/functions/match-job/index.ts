import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

interface Candidate {
  id: string;
  name: string;
  headline: string | null;
  skills: string[];
  experience: Array<{ title?: string; company?: string }>;
}

interface MatchResult {
  id: string;
  name: string;
  match_score: number;
  matching_skills: string[];
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ─ Auth ─
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ─ Get org_id ─
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.org_id) return json({ error: "User profile not found" }, 404);

  // ─ Parse body <
  let job_description: string;
  try {
    const body = await req.json();
    job_description = body?.job_description?.trim();
    if (!job_description) throw new Error("empty");
  } catch {
    return json({ error: "job_description is required" }, 400);
  }

  // ─ Fetch candidates <
  const { data: candidates, error: candidatesError } = await supabaseAdmin
    .from("candidates")
    .select("id, name, headline, skills, experience")
    .eq("org_id", profile.org_id)
    .limit(50);

  if (candidatesError) return json({ error: "Failed to fetch candidates", detail: candidatesError.message }, 500);
  if (!candidates || candidates.length === 0) return json({ matches: [] });

  // ─ Build prompt <
  const candidateSummaries = (candidates as Candidate[]).map((c) => {
    const skills = Array.isArray(c.skills) ? c.skills.slice(0, 8).join(", ") : "";
    const exp = Array.isArray(c.experience)
      ? c.experience.slice(0, 2).map((e) => `${e.title ?? ""} at ${e.company ?? ""}`.trim()).join("; ")
      : "";
    return `ID:${c.id}|${c.name}|${c.headline ?? ""}|${skills}|${exp}`;
  });

  const systemPrompt = `You are a technical recruiter. Rank the top 10 best candidates for this job.
Return ONLY a valid JSON array, no markdown:
[{"id":"<uuid>","name":"<string>","match_score":<0-100>,"matching_skills":["skill1"],"reasoning":"<1 sentence>"}]
Order by match_score descending.`;

  const userPrompt = `JOB:\n${job_description.slice(0, 1500)}\n\nCANDIDATES:\n${candidateSummaries.join("\n")}`;

  // ─ Call Claude ─
  let claudeResponse: Response;
  try {
    claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (err) {
    return json({ error: "Failed to reach Anthropic API", detail: String(err) }, 502);
  }

  if (!claudeResponse.ok) {
    const detail = await claudeResponse.text();
    return json({ error: "Anthropic API error", detail }, 502);
  }

  const claudeData = await claudeResponse.json();
  const rawText: string = claudeData?.content?.[0]?.text ?? "";

  // ─ Parse response ─
  let matches: MatchResult[];
  try {
    const cleaned = rawText.replace(/```json\n/g, "").replace(/```\n?/g, "").trim();
    matches = JSON.parse(cleaned);
    if (!Array.isArray(matches)) throw new Error("Not an array");
  } catch {
    return json({ error: "Failed to parse AI response", raw: rawText }, 500);
  }

  const sanitized: MatchResult[] = matches
    .slice(0, 10)
    .map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.name ?? ""),
      match_score: Math.min(100, Math.max(0, Number(m.match_score ?? 0))),
      matching_skills: Array.isArray(m.matching_skills) ? m.matching_skills.map(String) : [],
      reasoning: String(m.reasoning ?? ""),
    }))
    .filter((m) => m.id);

  return json({ matches: sanitized });
});

// ─ Helpers ─

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
