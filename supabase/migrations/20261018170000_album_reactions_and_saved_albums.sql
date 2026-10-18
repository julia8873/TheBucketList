-- Migration: album reactions, saved albums, and album copied tracking

-- 1. Add copied_from_id to albums
ALTER TABLE albums ADD COLUMN IF NOT EXISTS copied_from_id uuid REFERENCES albums(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_albums_copied_from_id ON albums(copied_from_id);

-- 2. Album reactions (Likes on albums)
CREATE TABLE IF NOT EXISTS album_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz DEFAULT now(),
  UNIQUE (album_id, user_id)
);

ALTER TABLE album_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Album reactions are viewable by everyone" ON album_reactions;
CREATE POLICY "Album reactions are viewable by everyone" 
  ON album_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own album reaction" ON album_reactions;
CREATE POLICY "Users can insert own album reaction" 
  ON album_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own album reaction" ON album_reactions;
CREATE POLICY "Users can delete own album reaction" 
  ON album_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_album_reactions_album_id ON album_reactions(album_id);
CREATE INDEX IF NOT EXISTS idx_album_reactions_user_id ON album_reactions(user_id);

-- 3. User Saved Albums (Bookmarked albums from other users)
CREATE TABLE IF NOT EXISTS user_saved_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, album_id)
);

ALTER TABLE user_saved_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved albums" ON user_saved_albums;
CREATE POLICY "Users can view own saved albums" 
  ON user_saved_albums FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can see count of saved albums" ON user_saved_albums;
CREATE POLICY "Anyone can see count of saved albums"
  ON user_saved_albums FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can save albums" ON user_saved_albums;
CREATE POLICY "Users can save albums" 
  ON user_saved_albums FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave albums" ON user_saved_albums;
CREATE POLICY "Users can unsave albums" 
  ON user_saved_albums FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_saved_albums_user_id ON user_saved_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_albums_album_id ON user_saved_albums(album_id);
