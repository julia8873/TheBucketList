-- Fix: Revert the broken RLS policies on buckets and item_subtasks back to the original
-- The collaborator fetch is now done separately in the app (two-query approach), 
-- so we don't need the RLS policies to know about collaborators.

DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  visibility = 'public' OR
  (visibility = 'followers' AND public.is_following(user_id)) OR
  EXISTS (
    SELECT 1 FROM public.bucket_collaborators
    WHERE bucket_id = public.buckets.id
      AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own buckets" ON public.buckets;
CREATE POLICY "Users can update own buckets" ON public.buckets FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.bucket_collaborators
    WHERE bucket_id = public.buckets.id
      AND user_id = auth.uid()
      AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks;
CREATE POLICY "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid()
      OR b.visibility = 'public'
      OR (b.visibility = 'followers' AND public.is_following(b.user_id))
      OR EXISTS (
        SELECT 1 FROM public.bucket_collaborators c
        WHERE c.bucket_id = b.id AND c.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can manage subtasks for own buckets" ON public.item_subtasks;
CREATE POLICY "Users can manage subtasks for own buckets" ON public.item_subtasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bucket_collaborators c
        WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted'
      )
    )
  )
);
