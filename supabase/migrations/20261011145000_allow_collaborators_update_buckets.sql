-- 20261011145000_allow_collaborators_update_buckets.sql
-- Allow collaborators of shared albums to update buckets in those albums

-- 1. Ensure is_bucket_in_member_album handles both album owners and accepted members
CREATE OR REPLACE FUNCTION public.is_bucket_in_member_album(p_bucket_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_items ai
    JOIN public.albums a ON ai.album_id = a.id
    LEFT JOIN public.album_members am ON ai.album_id = am.album_id AND am.user_id = auth.uid() AND am.status = 'accepted'
    WHERE ai.bucket_id = p_bucket_id AND (a.owner_id = auth.uid() OR am.user_id IS NOT NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Update buckets UPDATE policy so that accepted bucket collaborators AND album members can update buckets
DROP POLICY IF EXISTS "Users can update own buckets" ON public.buckets;
CREATE POLICY "Users can update own buckets" ON public.buckets FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.bucket_collaborators
    WHERE bucket_id = public.buckets.id
      AND user_id = auth.uid()
      AND status = 'accepted'
  ) OR
  public.is_bucket_in_member_album(public.buckets.id)
);
