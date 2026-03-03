import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHARF_APP_URL             = Deno.env.get("WHARF_APP_URL") ?? "https://app.talentwharf.com";

// ── Entry ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405 });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all orgs with an active Slack incoming-webhook
  const { data: slackWebhooks } = await sb
    .from("webhooks")
    .select("org_id, url")
    .eq("type", "slack")
    .eq("active", true);

  if (!slackWebhooks || slackWebhooks.length === 0) {
    return json({ sent: 0 });
  }

  let sent = 0;
  const errs: string[] = [];

  for (const wh of slackWebhooks) {
    try {
      await sendDigest(sb, wh.org_id, wh.url);
      sent++;
    } catch (e) {
      errs.push(`org ${wh.org_id}: ${e}`);
      console.error(`slack-digest error for org ${wh.org_id}:`, e);
    }
  }

  console.log(`slack-digest: sent=${sent} errors=${errs.length}`);
  return json({ sent, errors: errs });
});

// ── Build + send one org's digest ─────────────────────────────────────────────

async function sendDigest(
  sb: ReturnType<typeof createClient>,
  orgId: string,
  webhookUrl: string,
): Promise<void> {
  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Candidate snapshot ────────────────────────────────────────────────────
  const { data: candidates } = await sb
    .from("candidates")
    .select("id, name, status, created_at")
    .eq("org_id", orgId);

  const all = candidates ?? [];
  if (all.length === 0) return; // nothing to report

  const counts: Record<string, number> = {
    new: 0, contacted: 0, interviewing: 0, hired: 0, rejected: 0,
  };
  for (const c of all) {
    if (c.status in counts) counts[c.status]++;
  }

  const newThisWeek = all.filter(c => new Date(c.created_at) >= weekAgo).length;

  // ── Who in "interviewing" still needs a scorecard? ────────────────────────
  const interviewing = all.filter(c => c.status === "interviewing");
  let needsScorecard: Array<{ id: string; name: string }> = [];

  if (interviewing.length > 0) {
    const { data: scorecards } = await sb
      .from("candidate_feedback")
      .select("candidate_id")
      .in("candidate_id", interviewing.map(c => c.id));

    const done = new Set((scorecards ?? []).map(s => s.candidate_id));
    needsScorecard = interviewing.filter(c => !done.has(c.id));
  }

  // ── Build Block Kit ───────────────────────────────────────────────────────
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const statusLine = [
    `🆕 *${counts.new}* New`,
    `📞 *${counts.contacted}* Contacted`,
    `🎤 *${counts.interviewing}* Interviewing`,
    `✅ *${counts.hired}* Hired`,
    counts.rejected > 0 ? `❌ *${counts.rejected}* Passed` : null,
  ].filter(Boolean).join("  ·  ");

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 Daily Hiring Brief — ${dayName}, ${dateStr}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: statusLine },
    },
  ];

  if (newThisWeek > 0) {
    blocks.push({
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `📈 *${newThisWeek}* new candidate${newThisWeek !== 1 ? "s" : ""} added this week`,
      }],
    });
  }

  if (needsScorecard.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔔 *Needs a scorecard (${needsScorecard.length}):*\n${
          needsScorecard.map(c => `• ${c.name}`).join("\n")
        }`,
      },
    });
  }

  // "View Pipeline" external link button
  blocks.push({
    type: "actions",
    elements: [{
      type: "button",
      text: { type: "plain_text", text: "View Pipeline →" },
      url: `${WHARF_APP_URL}/pipeline`,
      action_id: "open_pipeline",
    }],
  });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) throw new Error(`Slack returned HTTP ${res.status}`);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
