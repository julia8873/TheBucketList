-- 20261011130500_fix_collaborator_permissions.sql
-- Fix buckets.id qualification in restrictive policy and broaden collaborator permissions

-- 1. Buckets restrictive policy: explicitly qualify buckets.id
DROP POLICY IF EXISTS "Private accounts hide buckets from non-followers" ON public.buckets;
CREATE POLICY "Private accounts hide buckets from non-followers" ON public.buckets AS RESTRICTIVE FOR SELECT USING (
  (user_id = auth.uid()) OR
  (NOT public.is_private_profile(user_id)) OR
  public.is_following(user_id) OR
  EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = buckets.id AND c.user_id = auth.uid() AND c.status IN ('pending', 'accepted')) OR
  public.is_bucket_in_member_album(buckets.id)
);

-- 2. Bucket photos: allow collaborators to update and delete photos in the shared bucket
DROP POLICY IF EXISTS "Users can update own photos" ON public.bucket_photos;
CREATE POLICY "Users can update own photos" ON public.bucket_photos FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own photos" ON public.bucket_photos;
CREATE POLICY "Users can delete own photos" ON public.bucket_photos FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_photos.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  )
);

-- 3. Bucket collaborators: allow accepted collaborators to invite others
DROP POLICY IF EXISTS "Owner can insert collaborators" ON public.bucket_collaborators;
CREATE POLICY "Owner can insert collaborators" ON public.bucket_collaborators FOR INSERT WITH CHECK (
  is_bucket_owner(bucket_id) OR
  EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = bucket_collaborators.bucket_id AND c.user_id = auth.uid() AND c.status = 'accepted')
);

-- 4. Album items: allow collaborators to organize bucket into their own albums
DROP POLICY IF EXISTS "Album items insertable by bucket owner" ON public.album_items;
CREATE POLICY "Album items insertable by bucket owner" ON public.album_items FOR INSERT WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = album_items.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  )) AND
  (EXISTS (
    SELECT 1 FROM public.albums a WHERE a.id = album_items.album_id AND (
      a.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.album_members am WHERE am.album_id = a.id AND am.user_id = auth.uid() AND am.status = 'accepted')
    )
  ))
);

DROP POLICY IF EXISTS "Album items deletable by bucket owner" ON public.album_items;
CREATE POLICY "Album items deletable by bucket owner" ON public.album_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = album_items.bucket_id AND (
      b.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  ) AND
  (EXISTS (
    SELECT 1 FROM public.albums a WHERE a.id = album_items.album_id AND (
      a.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.album_members am WHERE am.album_id = a.id AND am.user_id = auth.uid() AND am.status = 'accepted')
    )
  ))
);
