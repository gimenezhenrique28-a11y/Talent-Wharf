-- Migration: Add consent tracking columns to candidates
-- Candidates can be asked for permission to enrich their profile
-- from GitHub and LinkedIn. This tracks the full lifecycle of that request.

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'not_requested'
    CHECK (consent_status IN ('not_requested', 'pending', 'granted', 'denied')),
  ADD COLUMN IF NOT EXISTS consent_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS consent_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_responded_at TIMESTAMPTZ;

-- Index for fast token lookups (handle-consent edge function)
CREATE INDEX IF NOT EXISTS candidates_consent_token_idx
  ON public.candidates (consent_token)
  WHERE consent_token IS NOT NULL;
