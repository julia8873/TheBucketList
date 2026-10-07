-- Drop old shared_lists concept
DROP TABLE IF EXISTS shared_list_members CASCADE;
DROP TABLE IF EXISTS shared_lists CASCADE;

-- 1. Albums table
CREATE TABLE albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_path text,
  visibility text DEFAULT 'private' CHECK (visibility IN ('public', 'followers', 'private')),
  is_shared bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_albums_owner_id ON albums(owner_id);

-- 2. Album Items
CREATE TABLE album_items (
  album_id uuid NOT NULL REFERENCES albums ON DELETE CASCADE,
  bucket_id uuid NOT NULL REFERENCES buckets ON DELETE CASCADE,
  position int DEFAULT 0,
  PRIMARY KEY (album_id, bucket_id),
  UNIQUE (bucket_id) -- In v1, a bucket belongs to at most one album
);
ALTER TABLE album_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_album_items_position ON album_items(album_id, position);

-- 3. Album Members (for shared albums)
CREATE TABLE album_members (
  album_id uuid NOT NULL REFERENCES albums ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  PRIMARY KEY (album_id, user_id)
);
ALTER TABLE album_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_album_members_user_id ON album_members(user_id);

-- 4. Bucket performance indexes
CREATE INDEX idx_buckets_user_completed ON buckets(user_id, completed_at);
CREATE INDEX idx_buckets_user_deadline ON buckets(user_id, deadline);

-- 5. Album Progress View
CREATE VIEW album_progress AS
SELECT 
  a.id as album_id,
  COUNT(ai.bucket_id) as total_tasks,
  SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
FROM albums a
LEFT JOIN album_items ai ON a.id = ai.album_id
LEFT JOIN buckets b ON ai.bucket_id = b.id
GROUP BY a.id;

-- 6. RLS Policies

-- Albums: Owners can do anything
CREATE POLICY "Albums are readable by owner" ON albums FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Albums are insertable by owner" ON albums FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Albums are updatable by owner" ON albums FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Albums are deletable by owner" ON albums FOR DELETE USING (auth.uid() = owner_id);

-- Albums: Publicly visible
CREATE POLICY "Public albums are viewable by everyone" ON albums FOR SELECT USING (visibility = 'public');
-- Albums: Followers visible
CREATE POLICY "Follower albums are viewable by followers" ON albums FOR SELECT USING (
  visibility = 'followers' AND EXISTS (
    SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = albums.owner_id AND status = 'accepted'
  )
);
-- Albums: Shared members
CREATE POLICY "Shared albums are viewable by members" ON albums FOR SELECT USING (
  EXISTS (SELECT 1 FROM album_members WHERE album_id = albums.id AND user_id = auth.uid() AND status = 'accepted')
);

-- Album Items
CREATE POLICY "Album items readable by album viewers" ON album_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM albums a 
    WHERE a.id = album_items.album_id AND (
      a.owner_id = auth.uid() OR
      a.visibility = 'public' OR
      (a.visibility = 'followers' AND EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = a.owner_id AND status = 'accepted')) OR
      EXISTS (SELECT 1 FROM album_members WHERE album_id = a.id AND user_id = auth.uid() AND status = 'accepted')
    )
  )
);
-- Only bucket owner can add to album (and they must have access to the album)
CREATE POLICY "Album items insertable by bucket owner" ON album_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM buckets WHERE id = bucket_id AND user_id = auth.uid()) AND
  EXISTS (
    SELECT 1 FROM albums a 
    WHERE a.id = album_id AND (
      a.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM album_members WHERE album_id = a.id AND user_id = auth.uid() AND status = 'accepted')
    )
  )
);
CREATE POLICY "Album items updatable by bucket owner" ON album_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM buckets WHERE id = bucket_id AND user_id = auth.uid())
);
CREATE POLICY "Album items deletable by bucket owner" ON album_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM buckets WHERE id = bucket_id AND user_id = auth.uid())
);

-- Album Members
CREATE POLICY "Album members readable by album owner or members" ON album_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM albums WHERE id = album_members.album_id AND owner_id = auth.uid()) OR
  user_id = auth.uid()
);
CREATE POLICY "Album members insertable by album owner" ON album_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM albums WHERE id = album_id AND owner_id = auth.uid())
);
CREATE POLICY "Album members updatable by user themselves (accept/reject)" ON album_members FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Album members deletable by owner or user" ON album_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM albums WHERE id = album_id AND owner_id = auth.uid()) OR
  user_id = auth.uid()
);
