import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@talentwharf.com";

// ── Email templates ───────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  interview_invite: {
    subject: "Interview Invitation — {position} at {company}",
    body: `Hi {name},

We'd love to invite you to interview for the {position} role at {company}.

📅 Date: {date}
⏰ Time: {time}
📍 Location: {location}
💻 Format: {format}
⏱ Duration: {duration}

Please reply to confirm your availability.

Best regards,
The {company} Team`,
  },

  follow_up: {
    subject: "Following Up — {position} at {company}",
    body: `Hi {name},

I wanted to follow up regarding the {position} opportunity at {company}.

We were impressed with your profile and would love to continue the conversation.

Are you still interested? Feel free to reply to this email.

Best regards,
The {company} Team`,
  },

  initial_outreach: {
    subject: "Exciting Opportunity — {position} at {company}",
    body: `Hi {name},

I came across your profile and think you'd be a great fit for the {position} role at {company}.

We're building something exciting and looking for talented people like you.

Would you be open to a quick call to learn more?

Best regards,
The {company} Team`,
  },

  rejection: {
    subject: "Update on Your Application — {company}",
    body: `Hi {name},

Thank you for your interest in the {position} role at {company} and for the time you invested in our process.

After careful consideration, we've decided to move forward with other candidates whose experience more closely aligns with our current needs.

We appreciate your interest and wish you the best in your search.

Best regards,
The {company} Team`,
  },

  offer: {
    subject: "Job Offer — {position} at {company}",
    body: `Hi {name},

We're thrilled to offer you the {position} position at {company}!

💰 Compensation: {salary}
🎁 Benefits: {benefits}
📅 Start Date: {start_date}

Please review the attached offer letter and let us know if you have any questions.

We look forward to welcoming you to the team!

Best regards,
The {company} Team`,
  },
};

// ── Main handler ──────────────────────────────────────────────────────────────

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
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Rate limiting for send-email (per-user)
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const recent = await supabaseAdmin
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinuteAgo);

    const recentCount = (recent as any).count || 0;
    const EMAIL_RATE_LIMIT_PER_MINUTE = 30; // allow 30 email sends per minute per user
    if (recentCount > EMAIL_RATE_LIMIT_PER_MINUTE) {
      console.warn(`Email send rate limit for user ${user.id}: ${recentCount}/min`);
      return json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (err) {
    console.error('send-email rate limit check failed:', err);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    candidate_ids: string[];
    subject?: string;
    body?: string;
    template_id?: string;
    variables?: Record<string, string>;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { candidate_ids, template_id, variables = {} } = body;
  let emailSubject = body.subject ?? "";
  let emailBody = body.body ?? "";

  if (!Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    return json({ error: "candidate_ids must be a non-empty array" }, 400);
  }

  // ── Apply template if requested ───────────────────────────────────────────
  if (template_id && TEMPLATES[template_id]) {
    const tpl = TEMPLATES[template_id];
    emailSubject = emailSubject || tpl.subject;
    emailBody = emailBody || tpl.body;
  }

  if (!emailSubject || !emailBody) {
    return json({ error: "subject and body are required (or provide a valid template_id)" }, 400);
  }

  // ── Fetch candidates ──────────────────────────────────────────────────────
  const { data: candidates, error: fetchError } = await supabaseAdmin
    .from("candidates")
    .select("id, name, email")
    .in("id", candidate_ids);

  if (fetchError) {
    return json({ error: "Failed to fetch candidates", detail: fetchError.message }, 500);
  }

  const results: Array<{ candidate_id: string; status: "sent" | "skipped" | "failed"; reason?: string }> = [];

  for (const candidate of candidates ?? []) {
    if (!candidate.email) {
      results.push({ candidate_id: candidate.id, status: "skipped", reason: "No email address" });
      continue;
    }

    // ── Substitute variables ────────────────────────────────────────────────
    const allVars: Record<string, string> = {
      name: candidate.name,
      ...variables,
    };

    const finalSubject = substituteVars(emailSubject, allVars);
    const finalBody = substituteVars(emailBody, allVars);

    // ── Send via Resend ─────────────────────────────────────────────────────
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
          subject: finalSubject,
          text: finalBody,
        }),
      });

      if (resendRes.ok) {
        sendOk = true;
      } else {
        const errText = await resendRes.text();
        sendError = errText;
      }
    } catch (err) {
      sendError = String(err);
    }

    if (sendOk) {
      // ── Log to email_history ──────────────────────────────────────────────
      await supabaseAdmin.from("email_history").insert({
        candidate_id: candidate.id,
        user_id: user.id,
        subject: finalSubject,
        body: finalBody,
        template_id: template_id ?? null,
        sent_at: new Date().toISOString(),
      });

      // ── Log to activity_log ───────────────────────────────────────────────
      await supabaseAdmin.from("activity_log").insert({
        candidate_id: candidate.id,
        user_id: user.id,
        action: "email_sent",
        metadata: { subject: finalSubject, template_id: template_id ?? null },
      });

      results.push({ candidate_id: candidate.id, status: "sent" });
    } else {
      results.push({ candidate_id: candidate.id, status: "failed", reason: sendError });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return json({ sent, failed, skipped, results });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("DASHBOARD_URL") || "https://app.talentwharf.com",
    },
  });
}
