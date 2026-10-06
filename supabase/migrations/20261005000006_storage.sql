-- 006_storage.sql
-- Configure Supabase Storage for bucket photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 5242880, '{"image/jpeg","image/png","image/webp","image/heic"}');



-- 1. Anyone can read public bucket photos
CREATE POLICY "Public photos are viewable by everyone" ON storage.objects
  FOR SELECT
  USING ( bucket_id = 'photos' );

-- 2. Authenticated users can upload photos, subject to the 50MB global quota
CREATE POLICY "Users can upload photos if under quota" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' 
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner)
    -- Check global quota of 50MB (52428800 bytes)
    AND (
      SELECT storage_used_bytes 
      FROM public.profiles 
      WHERE id = auth.uid()
    ) < 52428800
  );

-- 3. Users can delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );
