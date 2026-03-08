-- Migration: Fix current_org_id() to read from profiles, drop stale users-based policies
--
-- Root cause: current_org_id() was reading from public.users, but the BEFORE INSERT
-- trigger (set_candidate_org_id) reads from public.profiles. When these two tables
-- had different org_id values for a user, INSERT + SELECT-back (?.select=id) would
-- fail with 403 because the inserted row's org_id didn't match current_org_id().
--
-- Fix: point current_org_id() at profiles (the authoritative source) and drop the
-- old "Users can …" policies that also referenced public.users directly — they are
-- superseded by the modern candidates_insert/select/update/delete policies.

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
  );
END;
$$;

DROP POLICY IF EXISTS "Users can insert org candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view org candidates"   ON public.candidates;
DROP POLICY IF EXISTS "Users can update org candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can delete org candidates" ON public.candidates;
