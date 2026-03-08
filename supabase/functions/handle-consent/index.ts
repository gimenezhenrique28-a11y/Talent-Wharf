import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("WHARF_APP_URL") ?? "https://app.talentwharf.com";

// ── Main handler ───────────────────────────────────────────────────────────────
// This is a public GET endpoint — no JWT required.
// The consent token in the URL is the credential.

Deno.serve(async (req: Request) => {
  // Allow GET and OPTIONS only
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Accept",
      },
    });
  }

  if (req.method !== "GET") {
    return htmlPage("Error", "Method not allowed", "Only GET requests are accepted.", "#e57373");
  }

  // If the caller wants JSON (e.g. our React ConsentPage), respond with JSON
  const wantsJson = (req.headers.get("Accept") ?? "").includes("application/json");

  const url = new URL(req.url);
  const token  = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  // Validate inputs
  if (!token) {
    return wantsJson
      ? jsonResponse({ error: "missing_token" }, 400)
      : htmlPage("Invalid Link", "Missing token", "This link appears to be invalid or incomplete.", "#e57373");
  }
  if (action !== "allow" && action !== "deny") {
    return wantsJson
      ? jsonResponse({ error: "invalid_action" }, 400)
      : htmlPage("Invalid Link", "Invalid action", "This link appears to be invalid.", "#e57373");
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Look up candidate by token ─────────────────────────────────────────────
  const { data: candidate, error: fetchErr } = await supabaseAdmin
    .from("candidates")
    .select("id, name, consent_status, consent_responded_at")
    .eq("consent_token", token)
    .single();

  if (fetchErr || !candidate) {
    return wantsJson
      ? jsonResponse({ error: "not_found" }, 404)
      : htmlPage(
          "Link Not Found",
          "This link is no longer valid",
          "It may have already been used, or it has expired.",
          "#e57373",
        );
  }

  // Already responded?
  if (candidate.consent_responded_at) {
    return wantsJson
      ? jsonResponse({ outcome: "already_responded", consent_status: candidate.consent_status })
      : htmlPage(
          "Already Responded",
          "You've already responded",
          `You previously ${candidate.consent_status === "granted" ? "allowed" : "declined"} access to your public profile data. No further action needed.`,
          "#f59e0b",
        );
  }

  // ── Update consent ─────────────────────────────────────────────────────────
  const newStatus = action === "allow" ? "granted" : "denied";
  const now = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("candidates")
    .update({
      consent_status: newStatus,
      consent_responded_at: now,
      consent_token: null, // invalidate token to prevent replay
    })
    .eq("id", candidate.id);

  if (updateErr) {
    console.error("handle-consent update failed:", updateErr);
    return wantsJson
      ? jsonResponse({ error: "update_failed" }, 500)
      : htmlPage("Error", "Something went wrong", "We couldn't save your response. Please try again.", "#e57373");
  }

  // ── Log ────────────────────────────────────────────────────────────────────
  await supabaseAdmin.from("activity_log").insert({
    candidate_id: candidate.id,
    user_id: null,
    action: action === "allow" ? "consent_granted" : "consent_denied",
    metadata: {},
  }).catch((err: unknown) => console.warn("activity_log insert failed:", err));

  // ── Return confirmation ────────────────────────────────────────────────────
  if (wantsJson) {
    return jsonResponse({ outcome: action === "allow" ? "granted" : "denied" });
  }

  if (action === "allow") {
    return htmlPage(
      "Access Allowed",
      "Thanks, access granted!",
      `We'll now be able to reference your public GitHub and LinkedIn profiles when considering you for opportunities. You won't receive any further emails about this.`,
      "#22c55e",
    );
  } else {
    return htmlPage(
      "Access Declined",
      "Got it — no problem.",
      `We've recorded your preference and won't look up your GitHub or LinkedIn profiles. You won't receive any further emails about this.`,
      "#6b7280",
    );
  }
});

// ── HTML page builder ──────────────────────────────────────────────────────────

function htmlPage(title: string, heading: string, body: string, accentColor: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — TalentWharf</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #111111;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 12px;
      padding: 40px 36px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: ${accentColor}20;
      border: 1px solid ${accentColor}40;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 22px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: rgba(255,255,255,0.55);
      line-height: 1.7;
    }
    .brand {
      margin-top: 32px;
      font-size: 12px;
      color: rgba(255,255,255,0.20);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${accentColor === "#22c55e" ? "✓" : accentColor === "#e57373" ? "✕" : accentColor === "#f59e0b" ? "!" : "·"}</div>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(body)}</p>
    <div class="brand">TalentWharf</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
