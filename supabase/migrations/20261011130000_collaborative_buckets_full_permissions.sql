-- 20261011130000_collaborative_buckets_full_permissions.sql
-- Allow accepted collaborators to view and manage photos, tags, and private buckets

-- 1. Buckets restrictive policy: allow collaborators and member album viewers
DROP POLICY IF EXISTS "Private accounts hide buckets from non-followers" ON public.buckets;
CREATE POLICY "Private accounts hide buckets from non-followers" ON public.buckets AS RESTRICTIVE FOR SELECT USING (
  (user_id = auth.uid()) OR
  (NOT public.is_private_profile(user_id)) OR
  public.is_following(user_id) OR
  EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = buckets.id AND c.user_id = auth.uid() AND c.status IN ('pending', 'accepted')) OR
  public.is_bucket_in_member_album(buckets.id)
);

-- 2. Bucket photos: viewable by collaborators and album members
DROP POLICY IF EXISTS "Photos are viewable by those who can view the bucket" ON public.bucket_photos;
CREATE POLICY "Photos are viewable by those who can view the bucket" ON public.bucket_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      b.visibility = 'public' OR
      (b.visibility = 'followers' AND public.is_following(b.user_id)) OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status IN ('pending', 'accepted')) OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

-- 3. Bucket photos: insert by owner or accepted collaborator
DROP POLICY IF EXISTS "Users can insert own photos" ON public.bucket_photos;
CREATE POLICY "Users can insert own photos" ON public.bucket_photos FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

-- 4. Bucket photos: delete by photo owner or bucket owner
DROP POLICY IF EXISTS "Users can delete own photos" ON public.bucket_photos;
CREATE POLICY "Users can delete own photos" ON public.bucket_photos FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND b.user_id = auth.uid())
);

-- 5. Item tags: viewable, insertable, deletable by owner and accepted collaborators
DROP POLICY IF EXISTS "Users can view their item_tags" ON public.item_tags;
CREATE POLICY "Users can view their item_tags" ON public.item_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = item_tags.item_id AND (
      b.user_id = auth.uid() OR
      b.visibility = 'public' OR
      (b.visibility = 'followers' AND public.is_following(b.user_id)) OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status IN ('pending', 'accepted')) OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

DROP POLICY IF EXISTS "Users can insert their item_tags" ON public.item_tags;
CREATE POLICY "Users can insert their item_tags" ON public.item_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = item_tags.item_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their item_tags" ON public.item_tags;
CREATE POLICY "Users can delete their item_tags" ON public.item_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = item_tags.item_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);
