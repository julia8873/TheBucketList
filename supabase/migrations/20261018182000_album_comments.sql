-- Migration: allow comments on albums in the comments table
ALTER TABLE comments ALTER COLUMN bucket_id DROP NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES albums(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_album_id ON comments(album_id);

-- Ensure users can view comments on albums
DROP POLICY IF EXISTS "Comments on albums viewable by everyone" ON comments;
CREATE POLICY "Comments on albums viewable by everyone"
  ON comments FOR SELECT USING (album_id IS NOT NULL);

-- Ensure users can comment on albums
DROP POLICY IF EXISTS "Users can comment on albums" ON comments;
CREATE POLICY "Users can comment on albums"
  ON comments FOR INSERT WITH CHECK (album_id IS NOT NULL AND auth.uid() = user_id);

-- Ensure album owners can delete comments on their albums
DROP POLICY IF EXISTS "Album owners can delete comments on their albums" ON comments;
CREATE POLICY "Album owners can delete comments on their albums"
  ON comments FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = comments.album_id
        AND albums.owner_id = auth.uid()
    )
  );
