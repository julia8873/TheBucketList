-- Fix infinite RLS recursion between buckets <-> bucket_collaborators
-- 
-- Problem: 
--   buckets SELECT policy -> queries bucket_collaborators
--   bucket_collaborators SELECT policy -> queries buckets (to check ownership)
--   = infinite recursion, everything fails
--
-- Fix: bucket_collaborators SELECT policy must NOT reference buckets.
-- Users can simply see rows where they are the user_id OR the bucket owner.
-- We use a SECURITY DEFINER function to check ownership without triggering RLS.

CREATE OR REPLACE FUNCTION public.is_bucket_owner(p_bucket_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buckets
    WHERE id = p_bucket_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policy on bucket_collaborators
DROP POLICY IF EXISTS "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators;

-- New policy: no reference to buckets table (uses SECURITY DEFINER function)
CREATE POLICY "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators FOR SELECT USING (
  user_id = auth.uid() OR public.is_bucket_owner(bucket_id)
);

DROP POLICY IF EXISTS "Owner can insert collaborators" ON public.bucket_collaborators;
CREATE POLICY "Owner can insert collaborators" ON public.bucket_collaborators FOR INSERT WITH CHECK (
  public.is_bucket_owner(bucket_id)
);

DROP POLICY IF EXISTS "Owner or user can delete collaborator" ON public.bucket_collaborators;
CREATE POLICY "Owner or user can delete collaborator" ON public.bucket_collaborators FOR DELETE USING (
  user_id = auth.uid() OR public.is_bucket_owner(bucket_id)
);
