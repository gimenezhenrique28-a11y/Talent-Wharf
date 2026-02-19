-- ============================================================
-- TalentWharf — Initial Schema Migration
-- Paste into Supabase SQL editor and run.
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

-- organizations
CREATE TABLE public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE,
  plan       TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- profiles (extends auth.users)
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  role       TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  org_id     UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- candidates
CREATE TABLE public.candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT,
  headline      TEXT,
  linkedin_url  TEXT,
  about         TEXT,
  skills        JSONB DEFAULT '[]',
  experience    JSONB DEFAULT '[]',
  source        TEXT DEFAULT 'Manual',
  notes         TEXT,
  status        TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interviewing', 'hired', 'rejected')),
  tags          JSONB DEFAULT '[]',
  assigned_to   UUID REFERENCES public.profiles(id),
  org_id        UUID REFERENCES public.organizations(id),
  captured_at   TIMESTAMPTZ DEFAULT now(),
  captured_from TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, org_id)
);

-- candidate_notes
CREATE TABLE public.candidate_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- activity_log
CREATE TABLE public.activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id),
  action       TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- api_keys
CREATE TABLE public.api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash     TEXT UNIQUE NOT NULL,
  key_prefix   TEXT,
  name         TEXT DEFAULT 'Default Key',
  last_used_at TIMESTAMPTZ,
  revoked      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- email_history
CREATE TABLE public.email_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id),
  subject      TEXT,
  body         TEXT,
  template_id  TEXT,
  sent_at      TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────

CREATE INDEX idx_candidates_name       ON public.candidates(name);
CREATE INDEX idx_candidates_email      ON public.candidates(email);
CREATE INDEX idx_candidates_status     ON public.candidates(status);
CREATE INDEX idx_candidates_source     ON public.candidates(source);
CREATE INDEX idx_candidates_org_id     ON public.candidates(org_id);
CREATE INDEX idx_candidates_created_at ON public.candidates(created_at DESC);

CREATE INDEX idx_candidate_notes_candidate ON public.candidate_notes(candidate_id);
CREATE INDEX idx_activity_log_candidate    ON public.activity_log(candidate_id);
CREATE INDEX idx_activity_log_user         ON public.activity_log(user_id);
CREATE INDEX idx_api_keys_user             ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash             ON public.api_keys(key_hash);
CREATE INDEX idx_email_history_candidate   ON public.email_history(candidate_id);
CREATE INDEX idx_profiles_org              ON public.profiles(org_id);


-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY — ENABLE
-- ─────────────────────────────────────────

ALTER TABLE public.organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_history   ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────
-- RLS HELPER: current user's org_id
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ─────────────────────────────────────────
-- RLS POLICIES — organizations
-- ─────────────────────────────────────────

CREATE POLICY "org_select"
  ON public.organizations FOR SELECT
  USING (id = public.current_org_id());

CREATE POLICY "org_insert"
  ON public.organizations FOR INSERT
  WITH CHECK (true);  -- only the trigger inserts organizations

CREATE POLICY "org_update"
  ON public.organizations FOR UPDATE
  USING (id = public.current_org_id());


-- ─────────────────────────────────────────
-- RLS POLICIES — profiles
-- ─────────────────────────────────────────

CREATE POLICY "profile_select_own_org"
  ON public.profiles FOR SELECT
  USING (org_id = public.current_org_id());

CREATE POLICY "profile_select_self"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profile_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profile_update_self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());


-- ─────────────────────────────────────────
-- RLS POLICIES — candidates
-- ─────────────────────────────────────────

CREATE POLICY "candidates_select"
  ON public.candidates FOR SELECT
  USING (org_id = public.current_org_id());

CREATE POLICY "candidates_insert"
  ON public.candidates FOR INSERT
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "candidates_update"
  ON public.candidates FOR UPDATE
  USING (org_id = public.current_org_id());

CREATE POLICY "candidates_delete"
  ON public.candidates FOR DELETE
  USING (org_id = public.current_org_id());


-- ─────────────────────────────────────────
-- RLS POLICIES — candidate_notes
-- ─────────────────────────────────────────

CREATE POLICY "notes_select"
  ON public.candidate_notes FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );

CREATE POLICY "notes_insert"
  ON public.candidate_notes FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );

CREATE POLICY "notes_update"
  ON public.candidate_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notes_delete"
  ON public.candidate_notes FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────
-- RLS POLICIES — activity_log
-- ─────────────────────────────────────────

CREATE POLICY "activity_select"
  ON public.activity_log FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );

CREATE POLICY "activity_insert"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );


-- ─────────────────────────────────────────
-- RLS POLICIES — api_keys
-- ─────────────────────────────────────────

CREATE POLICY "apikeys_select"
  ON public.api_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "apikeys_insert"
  ON public.api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "apikeys_update"
  ON public.api_keys FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "apikeys_delete"
  ON public.api_keys FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────
-- RLS POLICIES — email_history
-- ─────────────────────────────────────────

CREATE POLICY "email_history_select"
  ON public.email_history FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );

CREATE POLICY "email_history_insert"
  ON public.email_history FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE org_id = public.current_org_id()
    )
  );


-- ─────────────────────────────────────────
-- TRIGGER — auto-create profile on signup
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug, plan)
  VALUES (
    split_part(NEW.email, '@', 1) || '''s Team',
    split_part(NEW.email, '@', 1),
    'free'
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, email, name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'admin',
    new_org_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────
-- TRIGGER — updated_at auto-update
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.candidate_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
