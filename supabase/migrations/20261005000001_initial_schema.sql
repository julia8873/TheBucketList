-- 001_initial_schema.sql
-- All core tables, indexes, check constraints, and RLS enabled.

-- 1. App Config
CREATE TABLE app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  note text
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 2. Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  storage_used_bytes bigint DEFAULT 0,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_username ON profiles(username);

-- 3. Categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_es text NOT NULL,
  name_en text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4. Templates
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles ON DELETE SET NULL,
  category_id uuid REFERENCES categories,
  title text NOT NULL,
  description text,
  is_official bool DEFAULT false,
  use_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 5. Buckets
CREATE TABLE buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  category_id uuid REFERENCES categories,
  title text NOT NULL,
  description text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'archived')),
  deadline date,
  location_text text,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  completed_at timestamptz,
  template_id uuid REFERENCES templates,
  copied_from_id uuid REFERENCES buckets,
  copied_from_user_id uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_buckets_user_id ON buckets(user_id);
CREATE INDEX idx_buckets_status ON buckets(status);

-- 6. Item Subtasks
CREATE TABLE item_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES buckets ON DELETE CASCADE,
  title text NOT NULL,
  done bool DEFAULT false,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE item_subtasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_item_subtasks_bucket_id ON item_subtasks(bucket_id);

-- 7. Bucket Photos
CREATE TABLE bucket_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES buckets ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumb_path text,
  width int,
  height int,
  size_bytes int NOT NULL,
  thumb_size_bytes int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bucket_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bucket_photos_bucket_id ON bucket_photos(bucket_id);

-- 8. Shared Lists
CREATE TABLE shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  visibility text DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'private')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;

CREATE TABLE shared_list_members (
  list_id uuid NOT NULL REFERENCES shared_lists ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  role text DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  PRIMARY KEY (list_id, user_id)
);
ALTER TABLE shared_list_members ENABLE ROW LEVEL SECURITY;

-- 9. Follows
CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status text DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- 10. Feed Events
CREATE TABLE feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type text CHECK (type IN ('completed', 'new_bucket', 'followed', 'copied_bucket')),
  bucket_id uuid REFERENCES buckets ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_feed_events_actor_id ON feed_events(actor_id);
CREATE INDEX idx_feed_events_created_at ON feed_events(created_at DESC);

-- 11. Reactions
CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES buckets ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥', '❤️', '👏', '🎉', '✈️', '🌟')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, user_id)
);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reactions_bucket_id ON reactions(bucket_id);

-- 12. Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES buckets ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_bucket_id ON comments(bucket_id);

-- 13. Reports
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  bucket_id uuid REFERENCES buckets ON DELETE CASCADE,
  comment_id uuid REFERENCES comments ON DELETE CASCADE,
  reason text NOT NULL,
  resolved bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 14. Notification Prefs
CREATE TABLE notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  reaction_push bool DEFAULT true,
  comment_push bool DEFAULT true,
  follow_push bool DEFAULT true,
  deadline_push bool DEFAULT true,
  friend_completed_push bool DEFAULT true,
  quiet_start time,
  quiet_end time,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;

-- 15. Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type text NOT NULL,
  actor_id uuid REFERENCES profiles ON DELETE SET NULL,
  bucket_id uuid REFERENCES buckets ON DELETE CASCADE,
  comment_id uuid REFERENCES comments ON DELETE CASCADE,
  is_read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);

-- 16. Push Tokens
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('android', 'web')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
