import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Candidate {
  id: string;
  name: string;
  email: string | null;
  headline: string | null;
  about: string | null;
  skills: string[];
  experience: Array<{ title?: string; company?: string; description?: string }>;
}

interface MatchResult {
  id: string;
  name: string;
  match_score: number;
  matching_skills: string[];
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  const dashboardUrl = Deno.env.get("DASHBOARD_URL") || "https://app.talentwharf.com";

  function corsHeaders(origin?: string) {
    return {
      "Access-Control-Allow-Origin": origin === dashboardUrl ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
  }

  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  // ── Get org_id for this user ───────────────────────────────────────────────
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.org_id) {
    return json({ error: "Profile not found" }, 404);
  }

  // ── Rate limiting (per-user) — limit expensive matching calls
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const recent = await supabaseAdmin
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinuteAgo);

    const recentCount = (recent as any).count || 0;
    const MATCH_RATE_LIMIT_PER_MINUTE = 6; // allow 6 match-job calls per minute per user
    if (recentCount > MATCH_RATE_LIMIT_PER_MINUTE) {
      console.warn(`Match-job rate limit for user ${user.id}: ${recentCount}/min`);
      return json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (err) {
    console.error('Match-job rate limit check failed:', err);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let job_description: string;
  try {
    const body = await req.json();
    job_description = body?.job_description?.trim();
    if (!job_description) throw new Error("empty");
  } catch {
    return json({ error: "job_description is required" }, 400);
  }

  // ── Fetch candidates ──────────────────────────────────────────────────────
  const { data: candidates, error: candidatesError } = await supabaseAdmin
    .from("candidates")
    .select("id, name, email, headline, about, skills, experience")
    .eq("org_id", profile.org_id)
    .limit(200);

  if (candidatesError) {
    console.error(`Failed to fetch candidates for org ${profile.org_id}:`, candidatesError.message);
    return json({ error: "Failed to fetch candidates" }, 500);
  }

  if (!candidates || candidates.length === 0) {
    return json({ matches: [] });
  }

  // ── Build candidate summaries for the prompt ───────────────────────────────
  const candidateSummaries = (candidates as Candidate[]).map((c) => {
    const skills = Array.isArray(c.skills) ? c.skills.join(", ") : "";
    const exp = Array.isArray(c.experience)
      ? c.experience
          .slice(0, 3)
          .map((e) => `${e.title ?? ""} at ${e.company ?? ""}`.trim())
          .join("; ")
      : "";
    return `ID:${c.id} | Name:${c.name} | Headline:${c.headline ?? ""} | Skills:${skills} | Experience:${exp} | About:${(c.about ?? "").slice(0, 300)}`;
  });

  const candidateBlock = candidateSummaries.join("\n");

  // ── Call Claude ────────────────────────────────────────────────────────────
  const systemPrompt = `You are an expert technical recruiter. Given a job description and a list of candidates, rank the top 10 best matches.
Return ONLY a valid JSON array (no markdown, no extra text) with this exact structure:
[{"id":"<uuid>","name":"<string>","match_score":<0-100>,"matching_skills":["skill1","skill2"],"reasoning":"<1-2 sentences>"}]
Base match_score on skills overlap, experience relevance, and headline alignment. Order by match_score descending.`;

  const userPrompt = `JOB DESCRIPTION:\n${job_description}\n\nCANDIDATES:\n${candidateBlock}`;

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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
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

  // ── Parse Claude's JSON response ──────────────────────────────────────────
  let matches: MatchResult[];
  try {
    // Strip possible markdown fences
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    matches = JSON.parse(cleaned);
    if (!Array.isArray(matches)) throw new Error("Not an array");
  } catch {
    return json({ error: "Failed to parse AI response", raw: rawText }, 500);
  }

  // Validate and sanitize each result
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("DASHBOARD_URL") || "https://app.talentwharf.com",
    },
  });
}
