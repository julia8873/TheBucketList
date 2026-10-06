-- 007_notification_triggers.sql
-- Triggers for sending notifications on reactions and comments

-- 1. Reaction Notifications
CREATE OR REPLACE FUNCTION public.handle_new_reaction()
RETURNS trigger AS $$
DECLARE
  bucket_owner uuid;
BEGIN
  SELECT user_id INTO bucket_owner FROM buckets WHERE id = NEW.bucket_id;
  
  -- Don't notify if the user reacts to their own bucket
  IF bucket_owner != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, type, actor_id, bucket_id)
    VALUES (bucket_owner, 'reaction', NEW.user_id, NEW.bucket_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_insert_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_reaction();

-- 2. Comment Notifications
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  bucket_owner uuid;
BEGIN
  SELECT user_id INTO bucket_owner FROM buckets WHERE id = NEW.bucket_id;
  
  -- Don't notify if the user comments on their own bucket
  IF bucket_owner != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, type, actor_id, bucket_id)
    VALUES (bucket_owner, 'comment', NEW.user_id, NEW.bucket_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_insert_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_comment();

-- 3. Webhook/Edge Function Call for Push Notifications
-- To actually send the push token to FCM/Web, we can use a Database Webhook 
-- that listens to the `notifications` table inserts and calls our Supabase Edge Function `send-push`.

-- (In a real Supabase project, you would create this Webhook via the Dashboard 
-- or using the pg_net extension. For local dev, we assume the Edge Function is called by the webhook).
