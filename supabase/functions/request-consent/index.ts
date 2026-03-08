import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@talentwharf.com";
const APP_URL = Deno.env.get("WHARF_APP_URL") ?? "https://app.talentwharf.com";

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const dashboardUrl = Deno.env.get("DASHBOARD_URL") || APP_URL;

  function corsHeaders(origin?: string) {
    return {
      "Access-Control-Allow-Origin": origin === dashboardUrl ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req.headers.get("origin") ?? undefined) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Resolve org ────────────────────────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("org_id, name")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return json({ error: "No organisation found for user" }, 403);

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { candidate_id: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { candidate_id, force = false } = body;
  if (!candidate_id) return json({ error: "candidate_id is required" }, 400);

  // ── Fetch candidate ────────────────────────────────────────────────────────
  const { data: candidate, error: fetchErr } = await supabaseAdmin
    .from("candidates")
    .select("id, name, email, consent_status, org_id")
    .eq("id", candidate_id)
    .single();

  if (fetchErr || !candidate) return json({ error: "Candidate not found" }, 404);
  if (candidate.org_id !== profile.org_id) return json({ error: "Forbidden" }, 403);
  if (!candidate.email) return json({ error: "Candidate has no email address" }, 422);

  // Don't re-send unless forced
  if (!force && (candidate.consent_status === "granted" || candidate.consent_status === "denied")) {
    return json({ ok: true, skipped: true, reason: `Consent already ${candidate.consent_status}` });
  }

  // ── Generate token & update candidate ─────────────────────────────────────
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("candidates")
    .update({
      consent_status: "pending",
      consent_token: token,
      consent_requested_at: now,
      consent_responded_at: null,
    })
    .eq("id", candidate_id);

  if (updateErr) return json({ error: "Failed to update candidate", detail: updateErr.message }, 500);

  // ── Build email ────────────────────────────────────────────────────────────
  const allowUrl = `${APP_URL}/consent?token=${token}&action=allow`;
  const denyUrl  = `${APP_URL}/consent?token=${token}&action=deny`;

  const subject = `Quick question about your profile`;
  const htmlBody = buildConsentEmail(candidate.name, allowUrl, denyUrl);
  const textBody = buildConsentEmailText(candidate.name, allowUrl, denyUrl);

  // ── Send via Resend ────────────────────────────────────────────────────────
  let sendOk = false;
  let sendError: string | undefined;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [candidate.email],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    sendOk = resendRes.ok;
    if (!resendRes.ok) sendError = await resendRes.text();
  } catch (err) {
    sendError = String(err);
  }

  if (!sendOk) {
    console.error("Consent email send failed:", sendError);
    return json({ error: "Failed to send consent email", detail: sendError }, 502);
  }

  // ── Log ────────────────────────────────────────────────────────────────────
  await Promise.allSettled([
    supabaseAdmin.from("email_history").insert({
      candidate_id,
      user_id: user.id,
      subject,
      body: textBody,
      template_id: "consent_request",
      sent_at: now,
    }),
    supabaseAdmin.from("activity_log").insert({
      candidate_id,
      user_id: user.id,
      action: "consent_requested",
      metadata: { email: candidate.email },
    }),
  ]);

  return json({ ok: true });
});

// ── Email builders ─────────────────────────────────────────────────────────────

function buildConsentEmail(name: string, allowUrl: string, denyUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quick question about your profile</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.10);border-radius:8px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">TalentWharf</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Hi ${name.split(' ')[0]},
              </p>
              <p style="margin:16px 0 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">
                You've been added to a talent bank. Before we look up any public information from your GitHub or LinkedIn profiles, we'd like to ask for your permission first.
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">
                This would only ever include publicly available information — nothing private.
              </p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${allowUrl}"
                       style="display:inline-block;background:#22c55e;color:#000000;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:6px;letter-spacing:-0.01em;">
                      Allow access
                    </a>
                  </td>
                  <td>
                    <a href="${denyUrl}"
                       style="display:inline-block;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.70);font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;border:1px solid rgba(255,255,255,0.14);letter-spacing:-0.01em;">
                      No thanks
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.30);line-height:1.6;">
                You're receiving this because someone added you to a talent database on TalentWharf.
                If you didn't expect this email, you can safely ignore it or click "No thanks" above.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildConsentEmailText(name: string, allowUrl: string, denyUrl: string): string {
  return `Hi ${name.split(' ')[0]},

You've been added to a talent bank. Before we look up any public information from your GitHub or LinkedIn profiles, we'd like to ask for your permission first.

This would only ever include publicly available information — nothing private.

Allow access:
${allowUrl}

No thanks:
${denyUrl}

---
You're receiving this because someone added you to a talent database on TalentWharf.
If you didn't expect this email, you can safely ignore it.`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("DASHBOARD_URL") || APP_URL,
    },
  });
}
