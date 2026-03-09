-- ============================================================
-- Migration 008: API key expiration
-- Adds expires_at to api_keys (default 1 year from creation).
-- Existing keys get a 1-year window from now.
-- ============================================================

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 year');

-- Back-fill existing keys: give them 1 year from now
UPDATE public.api_keys
  SET expires_at = now() + INTERVAL '1 year'
  WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON public.api_keys(expires_at);
