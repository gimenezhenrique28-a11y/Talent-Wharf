-- ─────────────────────────────────────────────────────────────────────────────
-- 007 — email_templates table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  subject     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(org_id);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_select"
  ON public.email_templates FOR SELECT
  USING (org_id = public.current_org_id());

CREATE POLICY "email_templates_insert"
  ON public.email_templates FOR INSERT
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "email_templates_update"
  ON public.email_templates FOR UPDATE
  USING (org_id = public.current_org_id());

CREATE POLICY "email_templates_delete"
  ON public.email_templates FOR DELETE
  USING (org_id = public.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed default templates for existing orgs
-- (Only inserts if the org has zero templates — safe to run multiple times)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.email_templates (org_id, name, category, subject, body)
SELECT
  o.id,
  t.name,
  t.category,
  t.subject,
  t.body
FROM public.organizations o
CROSS JOIN (
  VALUES
    (
      'Initial Outreach',
      'outreach',
      'Exciting Opportunity — {position} at {company}',
      E'Hi {name},\n\nI came across your profile and think you''d be a great fit for the {position} role at {company}.\n\nWould you be open to a quick call to learn more? {scheduling_link}\n\nBest regards,\nThe {company} Team'
    ),
    (
      'Follow Up',
      'follow-up',
      'Following Up — {position} at {company}',
      E'Hi {name},\n\nI wanted to follow up regarding the {position} opportunity at {company}.\n\nWe were impressed with your profile and would love to continue the conversation.\n\nAre you still interested? Feel free to reply to this email.\n\nBest regards,\nThe {company} Team'
    ),
    (
      'Interview Invitation',
      'interview',
      'Interview Invitation — {position} at {company}',
      E'Hi {name},\n\nWe''d love to invite you to interview for the {position} role at {company}.\n\n📅 Date: {date}\n⏰ Time: {time}\n📍 Location: {location}\n💻 Format: {format}\n⏱ Duration: {duration}\n\nPlease reply to confirm your availability or book a time directly: {scheduling_link}\n\nBest regards,\nThe {company} Team'
    ),
    (
      'Rejection Notice',
      'rejection',
      'Update on Your Application — {company}',
      E'Hi {name},\n\nThank you for your interest in the {position} role at {company}.\n\nAfter careful consideration, we''ve decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe appreciate your time and wish you the best in your search.\n\nBest regards,\nThe {company} Team'
    ),
    (
      'Job Offer',
      'offer',
      'Job Offer — {position} at {company}',
      E'Hi {name},\n\nWe''re thrilled to offer you the {position} position at {company}!\n\n💰 Compensation: {salary}\n🎁 Benefits: {benefits}\n📅 Start Date: {start_date}\n\nWe look forward to welcoming you to the team!\n\nBest regards,\nThe {company} Team'
    )
) AS t(name, category, subject, body)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE org_id = o.id
);
