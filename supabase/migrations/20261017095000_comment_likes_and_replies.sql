-- Create comment_likes table and add parent_id to comments
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Comment likes viewable by everyone'
  ) THEN
    CREATE POLICY "Comment likes viewable by everyone" ON comment_likes
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Users can insert own comment likes'
  ) THEN
    CREATE POLICY "Users can insert own comment likes" ON comment_likes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'Users can delete own comment likes'
  ) THEN
    CREATE POLICY "Users can delete own comment likes" ON comment_likes
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Allow threaded replies / tracking parent comment
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Ensure task owners can delete comments on their own tasks
DROP POLICY IF EXISTS "Bucket owners can delete comments on their buckets" ON comments;
CREATE POLICY "Bucket owners can delete comments on their buckets" ON comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buckets
      WHERE buckets.id = comments.bucket_id
      AND buckets.user_id = auth.uid()
    )
  );

-- Trigger to notify comment author when someone likes their comment
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  v_comment comments%ROWTYPE;
  v_bucket buckets%ROWTYPE;
  v_liker profiles%ROWTYPE;
  v_liker_name text;
BEGIN
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Don't notify if liking own comment
  IF v_comment.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_bucket FROM buckets WHERE id = v_comment.bucket_id;
  SELECT * INTO v_liker FROM profiles WHERE id = NEW.user_id;

  v_liker_name := COALESCE(v_liker.display_name, v_liker.username, 'Alguien');

  INSERT INTO notifications (recipient_id, type, actor_id, bucket_id, comment_id, content)
  VALUES (
    v_comment.user_id,
    'comment_like',
    NEW.user_id,
    v_comment.bucket_id,
    v_comment.id,
    v_liker_name || ' le ha dado me gusta a tu comentario en "' || COALESCE(v_bucket.title, 'una tarea') || '"'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_comment_like_notification ON comment_likes;
CREATE TRIGGER trg_comment_like_notification
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();
