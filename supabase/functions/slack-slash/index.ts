import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return text("Method not allowed", 405);
  }

  // org_id is passed as a query param: ?org=<uuid>
  const url   = new URL(req.url);
  const orgId = url.searchParams.get("org");
  if (!orgId) return slackText("❌ Missing org parameter in slash command URL.");

  // Read raw body (needed for signature verification)
  const rawBody = await req.text();

  // Fetch org's signing secret
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slack_signing_secret")
    .eq("id", orgId)
    .single();

  if (!org) return slackText("❌ Organisation not found.");

  // Verify Slack signature (skip if no secret configured — dev mode)
  if (org.slack_signing_secret) {
    const valid = await verifySlackSignature(req, org.slack_signing_secret, rawBody);
    if (!valid) return text("Forbidden", 403);
  }

  // Parse form-encoded body
  const params = new URLSearchParams(rawBody);

  // ── Interactive component payload (button clicks) ─────────────────────────
  if (params.has("payload")) {
    const interactive = JSON.parse(params.get("payload")!);
    return handleInteractive(interactive, orgId);
  }

  // ── Slash command ─────────────────────────────────────────────────────────
  const rawText = (params.get("text") ?? "").trim();
  const parts   = rawText.split(/\s+/).filter(Boolean);
  const sub     = parts[0]?.toLowerCase() ?? "";

  console.log(`slack-slash: text="${rawText}" org=${orgId}`);

  if (!sub || sub === "help") return handleHelp(orgId);
  if (sub === "pipeline")     return handlePipeline(orgId);
  if (sub === "search")       return handleSearch(orgId, parts.slice(1).join(" "));
  if (sub === "add")          return handleAdd(orgId, params.get("user_id") ?? "", parts.slice(1));

  return slackText(`Unknown command \`${rawText}\`. Type \`/wharf help\` for available commands.`);
});

// ── Interactive: button clicks ────────────────────────────────────────────────

async function handleInteractive(
  // deno-lint-ignore no-explicit-any
  payload: any,
  _orgId: string,
): Promise<Response> {
  if (payload.type !== "block_actions") {
    return new Response("", { status: 200 });
  }

  const action = payload.actions?.[0];
  if (!action) return new Response("", { status: 200 });

  const actionId   = action.action_id as string;
  const value      = action.value as string ?? "";
  const userName   = payload.user?.name ?? "Someone";

  // "View Pipeline" link button — no server action needed
  if (actionId === "open_pipeline") return new Response("", { status: 200 });

  // "Keep Interviewing" — dismiss buttons, leave a note
  if (actionId === "wharf_keep") {
    return slackInteractive({
      replace_original: true,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "⏭ Decision deferred — candidate stays in interviewing." } },
        { type: "context", elements: [{ type: "mrkdwn", text: `Noted by @${userName}` }] },
      ],
    });
  }

  // "Hire" or "Pass" — parse "candidateId|orgId" from button value
  const [candidateId, orgId] = value.split("|");
  if (!candidateId || !orgId) {
    return slackInteractive({ replace_original: false, text: "❌ Invalid action." });
  }

  const statusMap: Record<string, string> = {
    wharf_hire:   "hired",
    wharf_reject: "rejected",
  };
  const newStatus = statusMap[actionId];
  if (!newStatus) return new Response("", { status: 200 });

  // Update candidate
  const { error } = await supabaseAdmin
    .from("candidates")
    .update({ status: newStatus })
    .eq("id", candidateId)
    .eq("org_id", orgId);

  if (error) {
    return slackInteractive({
      replace_original: false,
      text: `❌ Failed to update: ${error.message}`,
    });
  }

  // Fetch name for confirmation message
  const { data: cand } = await supabaseAdmin
    .from("candidates")
    .select("name")
    .eq("id", candidateId)
    .single();

  const name = cand?.name ?? "Candidate";

  const msg = newStatus === "hired"
    ? `🎉 *${name}* marked as *hired!* Great hire!`
    : `👋 *${name}* marked as *passed.* On to the next one.`;

  return slackInteractive({
    replace_original: true,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: msg } },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Decision by @${userName} via Slack` }],
      },
    ],
  });
}

// ── Slash command handlers ────────────────────────────────────────────────────

async function handleHelp(orgId: string): Promise<Response> {
  const fnUrl = `${SUPABASE_URL}/functions/v1/slack-slash?org=${orgId}`;
  return slackBlocks([
    header("Wharf — Slash Commands"),
    section(`*Available commands:*\n• \`/wharf pipeline\` — Pipeline counts by status\n• \`/wharf search [name]\` — Search for a candidate\n• \`/wharf add [name] [email]\` — Quick-add a candidate\n• \`/wharf help\` — Show this message`),
    context(`Slash command URL: \`${fnUrl}\``),
  ]);
}

async function handlePipeline(orgId: string): Promise<Response> {
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("status")
    .eq("org_id", orgId);

  const counts: Record<string, number> = {
    new: 0, screening: 0, interviewing: 0, offered: 0, hired: 0, rejected: 0,
  };
  for (const c of (candidates ?? [])) {
    if (c.status in counts) counts[c.status]++;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines = [
    `🆕 New: *${counts.new}*`,
    `🔍 Screening: *${counts.screening}*`,
    `🎤 Interviewing: *${counts.interviewing}*`,
    `📋 Offered: *${counts.offered}*`,
    `✅ Hired: *${counts.hired}*`,
    `❌ Rejected: *${counts.rejected}*`,
  ].join("\n");

  return slackBlocks([
    header(`Pipeline — ${total} candidates`),
    section(lines),
    context(`via Wharf`),
  ]);
}

async function handleSearch(orgId: string, query: string): Promise<Response> {
  if (!query) return slackText("Usage: `/wharf search [name]`");

  const { data: results } = await supabaseAdmin
    .from("candidates")
    .select("id, name, headline, status, email")
    .eq("org_id", orgId)
    .ilike("name", `%${query}%`)
    .limit(5);

  if (!results || results.length === 0) {
    return slackText(`No candidates found matching "${query}".`);
  }

  const statusEmoji: Record<string, string> = {
    new: "🆕", contacted: "📞", interviewing: "🎤", hired: "✅", rejected: "❌",
  };

  const blocks = [
    header(`Search: "${query}" — ${results.length} result${results.length !== 1 ? "s" : ""}`),
    ...results.map(c => section(
      `${statusEmoji[c.status] ?? "•"} *${c.name}*${c.headline ? ` — ${c.headline}` : ""}\n${c.email ? `📧 ${c.email}` : "_No email_"} · Status: ${c.status}`
    )),
  ];

  return slackBlocks(blocks);
}

async function handleAdd(orgId: string, slackUserId: string, args: string[]): Promise<Response> {
  if (args.length < 2) return slackText("Usage: `/wharf add [Full Name] [email]`");

  const lastArg  = args[args.length - 1];
  const hasEmail = lastArg.includes("@");
  const email    = hasEmail ? lastArg : null;
  const name     = (hasEmail ? args.slice(0, -1) : args).join(" ");

  if (!name) return slackText("Usage: `/wharf add [Full Name] [email]`");

  const { error } = await supabaseAdmin.from("candidates").insert({
    name,
    email: email || null,
    source: "Slack",
    status: "new",
    org_id: orgId,
  });

  if (error) {
    if (error.code === "23505") {
      return slackText(`⚠️ A candidate with email *${email}* already exists.`);
    }
    return slackText(`❌ Error: ${error.message}`);
  }

  return slackText(`✅ Added *${name}*${email ? ` (${email})` : ""} to Wharf.`);
}

// ── Slack signature verification ──────────────────────────────────────────────

async function verifySlackSignature(
  req: Request,
  signingSecret: string,
  rawBody: string,
): Promise<boolean> {
  try {
    const timestamp = req.headers.get("X-Slack-Request-Timestamp") ?? "";
    const slackSig  = req.headers.get("X-Slack-Signature") ?? "";
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const baseStr  = `v0:${timestamp}:${rawBody}`;
    const expected = "v0=" + await hmacSha256(signingSecret, baseStr);
    return expected === slackSig;
  } catch {
    return false;
  }
}

async function hmacSha256(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Slack response helpers ────────────────────────────────────────────────────

function header(t: string) {
  return { type: "header", text: { type: "plain_text", text: t } };
}
function section(t: string) {
  return { type: "section", text: { type: "mrkdwn", text: t } };
}
function context(t: string) {
  return { type: "context", elements: [{ type: "mrkdwn", text: t }] };
}

function slackText(msg: string): Response {
  return new Response(JSON.stringify({ response_type: "ephemeral", text: msg }), {
    headers: { "Content-Type": "application/json" },
  });
}

function slackBlocks(blocks: unknown[]): Response {
  return new Response(JSON.stringify({ response_type: "ephemeral", blocks }), {
    headers: { "Content-Type": "application/json" },
  });
}

function slackInteractive(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function text(msg: string, status = 200): Response {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain" } });
}
