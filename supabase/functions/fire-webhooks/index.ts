import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHARF_APP_URL             = Deno.env.get("WHARF_APP_URL") ?? "https://app.talentwharf.com";

interface WebhookRow {
  id:     string;
  url:    string;
  type:   string;
  events: string[];
  secret: string | null;
  name:   string;
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

  // ── JWT auth ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawToken   = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!rawToken) return json({ error: "Missing Authorization header" }, 401, cors);

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${rawToken}` } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401, cors);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Resolve org_id ────────────────────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) return json({ error: "Profile not found" }, 404, cors);
  const orgId = profile.org_id;

  // ── Parse body ────────────────────────────────────────────────────────────
  let event: string, payload: Record<string, unknown>;
  try {
    const body = await req.json();
    event   = body?.event;
    payload = body?.payload ?? {};
    if (!event) throw new Error("missing event");
  } catch {
    return json({ error: "event and payload are required" }, 400, cors);
  }

  // ── Fetch active webhooks for this org + event ────────────────────────────
  const { data: webhooks } = await supabaseAdmin
    .from("webhooks")
    .select("id, url, type, events, secret, name")
    .eq("org_id", orgId)
    .eq("active", true);

  if (!webhooks || webhooks.length === 0) {
    return json({ fired: 0 }, 200, cors);
  }

  const matching = (webhooks as WebhookRow[]).filter(w =>
    Array.isArray(w.events) && w.events.includes(event)
  );

  if (matching.length === 0) {
    return json({ fired: 0 }, 200, cors);
  }

  const timestamp = new Date().toISOString();

  // ── Fire all matching webhooks in parallel ────────────────────────────────
  const results = await Promise.allSettled(
    matching.map(async (webhook) => {
      if (webhook.type === "slack") {
        return fireSlack(webhook, event, payload, orgId);
      }
      return fireGeneric(webhook, event, payload, timestamp);
    })
  );

  const fired  = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  console.log(`fire-webhooks: event=${event} org=${orgId} fired=${fired} failed=${failed}`);

  return json({ fired, failed }, 200, cors);
});

// ── Fire generic webhook ──────────────────────────────────────────────────────

async function fireGeneric(
  webhook: WebhookRow,
  event: string,
  payload: Record<string, unknown>,
  timestamp: string,
): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp, source: "wharf" });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent":   "Wharf-Webhooks/1.0",
    "X-Wharf-Event": event,
  };

  if (webhook.secret) {
    headers["X-Wharf-Signature"] = await hmacSha256(webhook.secret, body);
  }

  const res = await fetch(webhook.url, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${webhook.url}`);
}

// ── Fire Slack webhook (rich Block Kit) ───────────────────────────────────────

async function fireSlack(
  webhook: WebhookRow,
  event: string,
  payload: Record<string, unknown>,
  orgId: string,
): Promise<void> {
  const name        = String(payload.candidate_name ?? payload.name ?? "A candidate");
  const newStatus   = String(payload.new_status ?? payload.status ?? "");
  const candidateId = String(payload.candidate_id ?? "");
  const candidateUrl = candidateId
    ? `<${WHARF_APP_URL}/candidates/${candidateId}|${name}>`
    : name;

  let blocks: unknown[] = [];

  // ── candidate.created ─────────────────────────────────────────────────────
  if (event === "candidate.created") {
    const skills = Array.isArray(payload.skills) ? (payload.skills as string[]).slice(0, 3) : [];
    const source = String(payload.source ?? "");

    let headerText = `✅ New candidate added: ${candidateUrl}`;
    if (payload.headline) headerText += `\n_${payload.headline}_`;

    blocks = [
      { type: "section", text: { type: "mrkdwn", text: headerText } },
    ];

    const ctx: string[] = [];
    if (skills.length > 0) ctx.push(`🏷 ${skills.join(" · ")}`);
    if (source)             ctx.push(`via ${source}`);
    if (ctx.length > 0) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: ctx.join("  ·  ") }],
      });
    }

  // ── candidate.status_changed ──────────────────────────────────────────────
  } else if (event === "candidate.status_changed") {
    const statusEmoji: Record<string, string> = {
      new: "🆕", contacted: "📞", interviewing: "🎤", hired: "🎉", rejected: "👋",
    };
    const emoji = statusEmoji[newStatus] ?? "🔄";
    const oldStatus = payload.old_status ? ` _(was ${payload.old_status})_` : "";

    blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${emoji} *${candidateUrl}* moved to *${newStatus}*${oldStatus}` },
      },
    ];

    // ── Action buttons when entering "interviewing" ───────────────────────
    if (newStatus === "interviewing" && candidateId && orgId) {
      const btnValue = `${candidateId}|${orgId}`;
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "✅ Hire" },
            action_id: "wharf_hire",
            value: btnValue,
            style: "primary",
            confirm: {
              title:   { type: "plain_text", text: "Hire this candidate?" },
              text:    { type: "mrkdwn",     text: `Mark *${name}* as hired?` },
              confirm: { type: "plain_text", text: "Yes, hire" },
              deny:    { type: "plain_text", text: "Cancel" },
            },
          },
          {
            type: "button",
            text: { type: "plain_text", text: "⏭ Keep Interviewing" },
            action_id: "wharf_keep",
            value: btnValue,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "❌ Pass" },
            action_id: "wharf_reject",
            value: btnValue,
            style: "danger",
            confirm: {
              title:   { type: "plain_text", text: "Pass on this candidate?" },
              text:    { type: "mrkdwn",     text: `Mark *${name}* as passed?` },
              confirm: { type: "plain_text", text: "Yes, pass" },
              deny:    { type: "plain_text", text: "Cancel" },
            },
          },
        ],
      });
    }

    // View-in-Wharf context link
    if (candidateId) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `<${WHARF_APP_URL}/candidates/${candidateId}|View ${name} in Wharf>` }],
      });
    }

  // ── fallback ──────────────────────────────────────────────────────────────
  } else {
    blocks = [
      { type: "section", text: { type: "mrkdwn", text: `📋 Wharf event: *${event}* — ${name}` } },
    ];
  }

  const res = await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) throw new Error(`Slack returned HTTP ${res.status}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hmacSha256(secret: string, body: string): Promise<string> {
  const enc  = new TextEncoder();
  const key  = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig  = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return "sha256=" + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
