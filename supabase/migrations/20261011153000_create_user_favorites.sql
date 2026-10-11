-- Migration: Create user_favorites table for per-user favorites on buckets and albums
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bucket_id uuid REFERENCES buckets(id) ON DELETE CASCADE,
  album_id uuid REFERENCES albums(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_favorite_target CHECK (
    (bucket_id IS NOT NULL AND album_id IS NULL) OR
    (bucket_id IS NULL AND album_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_bucket ON user_favorites(user_id, bucket_id) WHERE bucket_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_album ON user_favorites(user_id, album_id) WHERE album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);
