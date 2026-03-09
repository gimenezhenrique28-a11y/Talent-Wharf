import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CapturePayload {
  name: string;
  email?: string;
  headline?: string;
  linkedin_url?: string;
  about?: string;
  skills?: string[];
  experience?: unknown[];
  source?: string;
  captured_from?: string;
}

Deno.serve(async (req: Request) => {
  const allowedOrigins = [
    "chrome-extension://",
    Deno.env.get("DASHBOARD_URL") || "https://app.talentwharf.com",
  ];

  function corsHeaders(allowAll = false) {
    return {
      "Access-Control-Allow-Origin": allowAll ? "*" : "chrome-extension://",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(false) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Validate API key ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!rawKey.startsWith("wharf_sk_")) {
    return json({ error: "Invalid API key format" }, 401);
  }

  // SHA-256 hash the key to look it up (keys are stored hashed)
  const keyHash = await sha256(rawKey);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: apiKey, error: keyError } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, revoked, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !apiKey) {
    return json({ error: "API key not found" }, 401);
  }

  if (apiKey.revoked) {
    return json({ error: "API key has been revoked" }, 403);
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return json({ error: "API key has expired" }, 403);
  }

  // ── Rate limiting (per-key, sliding window using activity_log) ───────────
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const recent = await supabaseAdmin
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', apiKey.user_id)
      .gte('created_at', oneMinuteAgo);

    const recentCount = (recent as any).count || 0;
    const RATE_LIMIT_PER_MINUTE = 10; // 10 captures per minute is generous for manual capture
    if (recentCount > RATE_LIMIT_PER_MINUTE) {
      console.warn(`Rate limit exceeded for key ${apiKey.id} (user ${apiKey.user_id}): ${recentCount}/min`);
      return json({ error: 'Rate limit exceeded. Maximum 10 captures per minute.' }, 429);
    }
  } catch (rlErr) {
    console.error('Rate limit check failed:', rlErr);
    // on error, continue rather than block legitimate traffic
  }

  // ── Get org_id for the key owner ──────────────────────────────────────────
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", apiKey.user_id)
    .single();

  if (profileError || !profile?.org_id) {
    return json({ error: "User profile not found" }, 404);
  }

  // ── Update last_used_at ───────────────────────────────────────────────────
  await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: CapturePayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!payload.name?.trim()) {
    return json({ error: "name is required" }, 400);
  }

  // ── Upsert candidate ──────────────────────────────────────────────────────
  const candidateData = {
    name: payload.name.trim(),
    email: payload.email?.trim() || null,
    headline: payload.headline?.trim() || null,
    linkedin_url: payload.linkedin_url?.trim() || null,
    about: payload.about?.trim() || null,
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    experience: Array.isArray(payload.experience) ? payload.experience : [],
    source: payload.source ?? "LinkedIn",
    captured_from: payload.captured_from ?? null,
    org_id: profile.org_id,
    status: "new",
    captured_at: new Date().toISOString(),
  };

  // If email is provided, upsert on (email, org_id) conflict
  if (candidateData.email) {
    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from("candidates")
      .upsert(candidateData, {
        onConflict: "email,org_id",
        ignoreDuplicates: false,
      })
      .select("id, name")
      .single();

    if (upsertError) {
      console.error(`Database error for org ${profile.org_id}:`, upsertError.message);
      return json({ error: "Failed to save candidate" }, 500);
    }

    await logActivity(supabaseAdmin, upserted.id, apiKey.user_id, "captured_via_extension", {
      source: candidateData.source,
    });

    return json({ id: upserted.id, name: upserted.name, created: true });
  }

  // No email — plain insert
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("candidates")
    .insert(candidateData)
    .select("id, name")
    .single();

  if (insertError) {
    console.error(`Database insert error for org ${profile.org_id}:`, insertError.message);
    return json({ error: "Failed to save candidate" }, 500);
  }

  await logActivity(supabaseAdmin, inserted.id, apiKey.user_id, "captured_via_extension", {
    source: candidateData.source,
  });

  return json({ id: inserted.id, name: inserted.name, created: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logActivity(
  supabase: ReturnType<typeof createClient>,
  candidateId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await supabase.from("activity_log").insert({
    candidate_id: candidateId,
    user_id: userId,
    action,
    metadata,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "chrome-extension://",
    },
  });
}
