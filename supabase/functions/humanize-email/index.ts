import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")\!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")\!;
const ANTHROPIC_API_KEY         = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method \!== "POST")    return json({ error: "Method not allowed" }, 405, cors);

  // JWT auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawToken   = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (\!rawToken) return json({ error: "Missing Authorization header" }, 401, cors);

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: \ } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || \!user) return json({ error: "Unauthorized" }, 401, cors);

  if (\!ANTHROPIC_API_KEY) {
    return json({ error: "Humanize not configured - set ANTHROPIC_API_KEY in edge function secrets" }, 503, cors);
  }

  // Parse body
  let body: { subject?: string; body?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400, cors); }

  const { subject = "", body: emailBody = "" } = body;
  if (\!emailBody.trim()) return json({ error: "body is required" }, 400, cors);

  const prompt = \;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         ANTHROPIC_API_KEY\!,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (\!res.ok) {
      const errText = await res.text();
      return json({ error: "Claude API error", detail: errText }, 500, cors);
    }

    const data   = await res.json();
    const raw    = data.content?.[0]?.text ?? "";
    const clean  = raw.replace(/^\\s*$/i, "").trim();
    const result = JSON.parse(clean);

    return json({ subject: result.subject ?? subject, body: result.body ?? emailBody }, 200, cors);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: "Humanize failed", detail: msg }, 500, cors);
  }
});

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
