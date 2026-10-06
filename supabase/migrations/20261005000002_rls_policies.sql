-- 002_rls_policies.sql
-- Implement Row Level Security policies for all tables based on the architecture rules.

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_following(target_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = auth.uid()
      AND following_id = target_user_id
      AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. App Config (Public read, no write)
CREATE POLICY "App config is viewable by everyone" ON app_config FOR SELECT USING (true);

-- 2. Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Categories (Public read, no write)
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- 4. Templates (Public read, no write)
CREATE POLICY "Templates are viewable by everyone" ON templates FOR SELECT USING (true);

-- 5. Buckets
CREATE POLICY "Buckets are viewable based on visibility" ON buckets FOR SELECT USING (
  user_id = auth.uid() OR
  visibility = 'public' OR
  (visibility = 'followers' AND is_following(user_id))
);
CREATE POLICY "Users can insert own buckets" ON buckets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buckets" ON buckets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own buckets" ON buckets FOR DELETE USING (auth.uid() = user_id);

-- 6. Item Subtasks
CREATE POLICY "Subtasks are viewable by those who can view the bucket" ON item_subtasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can manage subtasks for own buckets" ON item_subtasks FOR ALL USING (
  EXISTS (SELECT 1 FROM buckets b WHERE b.id = bucket_id AND b.user_id = auth.uid())
);

-- 7. Bucket Photos
CREATE POLICY "Photos are viewable by those who can view the bucket" ON bucket_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can insert own photos" ON bucket_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON bucket_photos FOR DELETE USING (auth.uid() = user_id);

-- 8. Follows
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Users can accept/reject follows to themselves" ON follows FOR UPDATE USING (auth.uid() = following_id);

-- 9. Feed Events
CREATE POLICY "Feed events viewable if from accepted follows" ON feed_events FOR SELECT USING (
  auth.uid() = actor_id OR is_following(actor_id)
);

-- 10. Reactions
CREATE POLICY "Reactions viewable by those who can view the bucket" ON reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can react to visible buckets" ON reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can delete own reactions" ON reactions FOR DELETE USING (auth.uid() = user_id);

-- 11. Comments
CREATE POLICY "Comments viewable by those who can view the bucket" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can comment on visible buckets" ON comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND is_following(b.user_id))
    )
  )
);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 12. Notification Prefs
CREATE POLICY "Users can view own prefs" ON notification_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON notification_prefs FOR UPDATE USING (auth.uid() = user_id);

-- 13. Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update own notifications (mark read)" ON notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = recipient_id);

-- 14. Push Tokens
CREATE POLICY "Users can manage own push tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);
