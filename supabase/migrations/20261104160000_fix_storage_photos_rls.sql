-- 20261104160000_fix_storage_photos_rls.sql
-- Fix storage.objects RLS policies for 'photos' bucket and repair storage quota calculation

-- 1. Ensure bucket settings allow common image types and higher per-file limit (20MB)
UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = '{"image/jpeg","image/png","image/webp","image/heic","image/jpg"}'
WHERE id = 'photos';

-- 2. Drop legacy / problematic policies on storage.objects
DROP POLICY IF EXISTS "Public photos are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos if under quota" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- 3. SELECT: Anyone can read from the public 'photos' bucket
CREATE POLICY "Public photos are viewable by everyone" ON storage.objects
  FOR SELECT
  USING ( bucket_id = 'photos' );

-- 4. INSERT: Authenticated users can upload photos to 'photos' bucket
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (
      -- Folder matches user's ID
      (storage.foldername(name))[1] = auth.uid()::text
      -- Or standard asset folders
      OR (storage.foldername(name))[1] IN ('covers', 'avatars', 'album-covers')
      -- Or owner_id / owner matching
      OR owner_id = auth.uid()::text
      OR owner = auth.uid()
      OR owner IS NULL
    )
    -- Safe quota check with generous 500MB limit, impervious to NULLs
    AND COALESCE(
      (SELECT storage_used_bytes FROM public.profiles WHERE id = auth.uid()),
      0
    ) < 524288000
  );

-- 5. UPDATE: Required for upsert: true when replacing covers/avatars
CREATE POLICY "Authenticated users can update photos" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] IN ('covers', 'avatars', 'album-covers')
      OR owner_id = auth.uid()::text
      OR owner = auth.uid()
      OR owner IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'photos'
  );

-- 6. DELETE: Allow users to remove photos in their folders
CREATE POLICY "Authenticated users can delete photos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] IN ('covers', 'avatars', 'album-covers')
      OR owner_id = auth.uid()::text
      OR owner = auth.uid()
      OR owner IS NULL
    )
  );

-- 7. Repair storage_used_bytes in public.profiles:
-- Set default to 0 and recalculate actual usage from existing bucket_photos
ALTER TABLE public.profiles
  ALTER COLUMN storage_used_bytes SET DEFAULT 0;

UPDATE public.profiles p
SET storage_used_bytes = COALESCE(
  (
    SELECT SUM(COALESCE(size_bytes, 0) + COALESCE(thumb_size_bytes, 0))
    FROM public.bucket_photos bp
    WHERE bp.user_id = p.id
  ),
  0
);

-- 8. Fix triggers to never allow NULL or negative storage_used_bytes
CREATE OR REPLACE FUNCTION public.increment_storage_used()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + COALESCE(NEW.size_bytes, 0) + COALESCE(NEW.thumb_size_bytes, 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_storage_used()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - COALESCE(OLD.size_bytes, 0) - COALESCE(OLD.thumb_size_bytes, 0))
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
