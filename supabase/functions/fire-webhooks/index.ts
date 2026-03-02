import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
        return fireSlack(webhook, event, payload);
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

// ── Fire Slack webhook (Block Kit format) ────────────────────────────────────

async function fireSlack(
  webhook: WebhookRow,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const name   = String(payload.candidate_name ?? payload.name ?? "A candidate");
  const status = String(payload.new_status ?? payload.status ?? "");

  let text = "";
  if (event === "candidate.created") {
    text = `✅ *New candidate added:* ${name}`;
  } else if (event === "candidate.status_changed") {
    text = `🔄 *${name}* moved to *${status}*`;
  } else {
    text = `📋 Wharf event: *${event}* — ${name}`;
  }

  const body = JSON.stringify({
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `via <https://app.talentwharf.com|TalentWharf>` }],
      },
    ],
  });

  const res = await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
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
