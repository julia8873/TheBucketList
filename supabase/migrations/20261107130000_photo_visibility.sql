-- 20261107130000_photo_visibility.sql
-- Add visibility column to bucket_photos with default 'public' and update RLS policies.

ALTER TABLE public.bucket_photos
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'followers', 'private'));

CREATE INDEX IF NOT EXISTS idx_bucket_photos_visibility
  ON public.bucket_photos(visibility);

-- Update RLS SELECT policy so viewers can only see photos according to their visibility
DROP POLICY IF EXISTS "Photos are viewable by those who can view the bucket" ON public.bucket_photos;

CREATE POLICY "Photos are viewable by those who can view the bucket" ON public.bucket_photos FOR SELECT USING (
  -- Photo creator, bucket owner, or accepted collaborator can see all photos
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  ) OR
  -- For other viewers, bucket must be viewable AND photo visibility must match
  (
    EXISTS (
      SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
        (b.user_id = auth.uid()) OR
        (
          (b.visibility = 'public' OR (b.visibility = 'followers' AND public.is_following(b.user_id))) AND
          (NOT public.is_private_profile(b.user_id) OR public.is_following(b.user_id))
        ) OR
        public.is_bucket_in_member_album(b.id)
      )
    ) AND
    (
      visibility = 'public' OR
      (visibility = 'followers' AND (
        public.is_following(bucket_photos.user_id) OR
        EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND public.is_following(b.user_id))
      ))
    )
  )
);
