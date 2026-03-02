-- ============================================================
-- Fix Profile Org ID - Resolve Infinite Recursion in RLS
-- ============================================================
-- This migration fixes the issue where user profiles don't have
-- an org_id set, causing infinite recursion in RLS policies.

-- Step 1: Temporarily disable RLS to allow updates
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;

-- Step 2: Create organizations for any profile without one
INSERT INTO public.organizations (name, slug, plan)
SELECT 
  COALESCE(split_part(p.email, '@', 1), p.id::text) || '''s Team' as name,
  COALESCE(split_part(p.email, '@', 1), p.id::text) as slug,
  'free' as plan
FROM public.profiles p
WHERE p.org_id IS NULL
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Update profiles to set org_id from the organization
UPDATE public.profiles p
SET org_id = (
  SELECT o.id FROM public.organizations o
  WHERE o.slug = COALESCE(split_part(p.email, '@', 1), p.id::text)
  LIMIT 1
)
WHERE p.org_id IS NULL;

-- Step 4: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the fix
SELECT 
  p.id,
  p.email,
  p.name,
  p.org_id,
  o.name as org_name
FROM public.profiles p
LEFT JOIN public.organizations o ON p.org_id = o.id
WHERE p.org_id IS NOT NULL;
