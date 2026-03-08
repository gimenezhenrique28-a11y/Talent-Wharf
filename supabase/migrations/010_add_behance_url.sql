-- Migration: Add Behance URL to candidates
-- Enables Behance portfolio enrichment (creative equivalent of GitHub enrichment).

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS behance_url TEXT;
