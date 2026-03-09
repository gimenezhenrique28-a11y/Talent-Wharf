-- ============================================================
-- Migration 009: Soft-delete for candidates
-- Adds deleted_at / deleted_by columns.
-- Replaces the blanket DELETE policy with a restricted one:
--   • Any org member can soft-delete (UPDATE deleted_at).
--   • Hard DELETE is removed from RLS — only service role
--     (edge functions using SERVICE_ROLE_KEY) can hard-delete,
--     which is intentional for future GDPR purge tooling.
-- All normal queries must filter WHERE deleted_at IS NULL.
-- ============================================================

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at ON public.candidates(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── Replace RLS policies ──────────────────────────────────────────────────

-- SELECT: exclude soft-deleted rows
DROP POLICY IF EXISTS "candidates_select" ON public.candidates;
CREATE POLICY "candidates_select"
  ON public.candidates FOR SELECT
  USING (org_id = public.current_org_id() AND deleted_at IS NULL);

-- INSERT: unchanged
-- UPDATE: allow only if not already deleted
DROP POLICY IF EXISTS "candidates_update" ON public.candidates;
CREATE POLICY "candidates_update"
  ON public.candidates FOR UPDATE
  USING (org_id = public.current_org_id() AND deleted_at IS NULL);

-- DELETE: revoke from regular users — hard deletes go through service role only
DROP POLICY IF EXISTS "candidates_delete" ON public.candidates;

-- ── Activity log trigger for soft-deletes ────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_candidate_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.activity_log (candidate_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'candidate_deleted', jsonb_build_object('deleted_at', NEW.deleted_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_candidate_soft_delete ON public.candidates;
CREATE TRIGGER trg_candidate_soft_delete
  AFTER UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.log_candidate_soft_delete();
