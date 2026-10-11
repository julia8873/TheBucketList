-- 20261011113000_collaborators_select_accepted.sql
-- Allow accepted collaborators to be viewed by anyone who can view the bucket, while pending remains visible only to owner and the user.

DROP POLICY IF EXISTS "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators;

CREATE POLICY "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators FOR SELECT USING (
  user_id = auth.uid() OR public.is_bucket_owner(bucket_id) OR status = 'accepted'
);
