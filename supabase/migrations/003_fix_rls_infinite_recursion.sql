-- ============================================================
-- Fix Infinite Recursion in RLS Policies
-- ============================================================
-- The issue: current_org_id() queries profiles table within an RLS-protected
-- context, causing infinite recursion. We fix this by disabling row_security
-- within the function.

-- Step 1: Drop existing policies that use current_org_id()
DROP POLICY IF EXISTS "profile_select_own_org" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_self" ON public.profiles;

-- Step 2: Recreate current_org_id() with row_security disabled
DROP FUNCTION IF EXISTS public.current_org_id();

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
  );
END;
$$;

-- Step 3: Recreate the profile policies with safer logic
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

-- Step 4: Ensure your profile has an org_id if it doesn't
UPDATE public.profiles p
SET org_id = (
  SELECT o.id FROM public.organizations o
  WHERE o.slug = COALESCE(split_part(p.email, '@', 1), p.id::text)
  ORDER BY o.created_at DESC
  LIMIT 1
)
WHERE p.org_id IS NULL AND p.id = auth.uid();

-- Step 5: If still no org, create one
INSERT INTO public.organizations (name, slug, plan)
SELECT 
  COALESCE(split_part(p.email, '@', 1), p.id::text) || '''s Team',
  COALESCE(split_part(p.email, '@', 1), p.id::text),
  'free'
FROM public.profiles p
WHERE p.org_id IS NULL AND p.id = auth.uid()
ON CONFLICT (slug) DO NOTHING;

-- Step 6: Try again to set org_id
UPDATE public.profiles p
SET org_id = (
  SELECT o.id FROM public.organizations o
  WHERE o.slug = COALESCE(split_part(p.email, '@', 1), p.id::text)
  ORDER BY o.created_at DESC
  LIMIT 1
)
WHERE p.org_id IS NULL AND p.id = auth.uid();

-- Verify the fix
SELECT id, email, name, org_id FROM public.profiles WHERE id = auth.uid();
