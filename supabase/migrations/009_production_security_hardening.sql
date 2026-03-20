-- Production security hardening
-- Applied: 2026-03-17

-- 1. Fix candidates_insert policy: restrict inserts to user's own org
DROP POLICY IF EXISTS candidates_insert ON public.candidates;
CREATE POLICY candidates_insert ON public.candidates
  FOR INSERT
  WITH CHECK (org_id = public.current_org_id());

-- 2. Fix org_insert policy: block direct API inserts
--    (signup trigger bypasses this via SECURITY DEFINER)
DROP POLICY IF EXISTS org_insert ON public.organizations;
CREATE POLICY org_insert ON public.organizations
  FOR INSERT
  WITH CHECK (false);

-- 3. Fix function search_paths to prevent search_path injection
CREATE OR REPLACE FUNCTION public.current_org_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.set_candidate_org_id()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.org_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.org_id := (SELECT org_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
