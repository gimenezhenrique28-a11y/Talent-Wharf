-- ── Migration 008: Pipeline improvements ─────────────────────────────────────
-- 1. Add position field for swimlane grouping
-- 2. Add status_changed_at for accurate "days in stage" tracking
-- 3. Fix status CHECK to include 'screening', 'offered', 'archived'
-- 4. Trigger to update status_changed_at only on status changes
-- 5. pg_cron job to auto-archive rejected candidates after 7 days

-- 1. Add columns
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS position         TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now();

-- Back-fill existing rows
UPDATE public.candidates SET status_changed_at = updated_at WHERE status_changed_at IS NULL;

-- 2. Fix status CHECK constraint
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_status_check;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_status_check
  CHECK (status IN ('new', 'screening', 'contacted', 'interviewing', 'offered', 'hired', 'rejected', 'archived'));

-- 3. Trigger function: only update status_changed_at when status actually changes
CREATE OR REPLACE FUNCTION public.track_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_candidates_status_change ON public.candidates;
CREATE TRIGGER track_candidates_status_change
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.track_status_change();

-- 4. pg_cron: auto-archive rejected candidates after 7 days (runs at 02:00 UTC daily)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'auto-archive-rejected',
  '0 2 * * *',
  $$
    UPDATE public.candidates
    SET status = 'archived', updated_at = now()
    WHERE status = 'rejected'
      AND status_changed_at < now() - interval '7 days';
  $$
);

-- Index for the cron query
CREATE INDEX IF NOT EXISTS idx_candidates_status_changed_at
  ON public.candidates(status, status_changed_at);
