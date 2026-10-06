-- 003_triggers.sql
-- Database triggers and functions (profile creation, storage quotas, auto-follow rules)

-- 1. Create Profile on Signup
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Extract username from email, or fallback to UUID
    COALESCE(
      SPLIT_PART(NEW.email, '@', 1),
      NEW.id::text
    ) || '_' || substr(md5(random()::text), 1, 4),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_profile_on_signup();

-- 2. Follows Auto-Accept
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS trigger AS $$
DECLARE
  target_visibility text;
BEGIN
  SELECT visibility INTO target_visibility FROM profiles WHERE id = NEW.following_id;
  
  IF target_visibility = 'private' THEN
    NEW.status := 'pending';
    -- Trigger follow request notification
    INSERT INTO notifications (recipient_id, type, actor_id)
    VALUES (NEW.following_id, 'follow_request', NEW.follower_id);
  ELSE
    NEW.status := 'accepted';
    -- Trigger follow notification
    INSERT INTO notifications (recipient_id, type, actor_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id);
    -- Insert feed event for new follow
    INSERT INTO feed_events (actor_id, type)
    VALUES (NEW.follower_id, 'followed');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_insert_follows
  BEFORE INSERT ON follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_follow();

-- 3. Bucket completion feed event & timestamps
CREATE OR REPLACE FUNCTION public.handle_bucket_before()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_update_bucket
  BEFORE INSERT OR UPDATE ON buckets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_bucket_before();

CREATE OR REPLACE FUNCTION public.handle_bucket_after()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO feed_events (actor_id, type, bucket_id)
    VALUES (NEW.user_id, 'completed', NEW.id);
  ELSIF NEW.status = 'pending' AND OLD IS NULL THEN
    INSERT INTO feed_events (actor_id, type, bucket_id)
    VALUES (NEW.user_id, 'new_bucket', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_update_bucket
  AFTER INSERT OR UPDATE ON buckets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_bucket_after();

-- 4. Storage Quota Triggers
CREATE OR REPLACE FUNCTION public.increment_storage_used()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET storage_used_bytes = storage_used_bytes + NEW.size_bytes + COALESCE(NEW.thumb_size_bytes, 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_insert_bucket_photo
  AFTER INSERT ON bucket_photos
  FOR EACH ROW EXECUTE PROCEDURE public.increment_storage_used();

CREATE OR REPLACE FUNCTION public.decrement_storage_used()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET storage_used_bytes = storage_used_bytes - OLD.size_bytes - COALESCE(OLD.thumb_size_bytes, 0)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_delete_bucket_photo
  AFTER DELETE ON bucket_photos
  FOR EACH ROW EXECUTE PROCEDURE public.decrement_storage_used();
