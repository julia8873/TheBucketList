CREATE POLICY "Users can update own photos"
ON bucket_photos FOR UPDATE
TO public
USING (auth.uid() = user_id);
