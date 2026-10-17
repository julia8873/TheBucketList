-- Migration: Fix comment notifications content and notify subscribers
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  v_bucket_owner uuid;
  v_bucket_title text;
  v_actor_name text;
  v_comment_preview text;
  v_content text;
  r RECORD;
BEGIN
  SELECT user_id, title INTO v_bucket_owner, v_bucket_title FROM public.buckets WHERE id = NEW.bucket_id;

  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_comment_preview := substring(NEW.body from 1 for 60);
  IF length(NEW.body) > 60 THEN
    v_comment_preview := v_comment_preview || '...';
  END IF;

  v_content := v_actor_name || ' ha comentado: "' || v_comment_preview || '" en la tarea "' || COALESCE(v_bucket_title, '') || '"';

  -- 1. Notify the task owner (if not commenting on own task)
  IF v_bucket_owner IS NOT NULL AND v_bucket_owner != NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, content)
    VALUES (v_bucket_owner, 'comment', NEW.user_id, NEW.bucket_id, v_content);
  END IF;

  -- 2. Also notify any accepted subscribers of this task (excluding the author of the comment and the owner who was already notified)
  FOR r IN (
    SELECT subscriber_id
    FROM public.entity_notification_subscribers
    WHERE bucket_id = NEW.bucket_id
      AND status = 'accepted'
      AND subscriber_id != NEW.user_id
      AND (v_bucket_owner IS NULL OR subscriber_id != v_bucket_owner)
  ) LOOP
    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, content)
    VALUES (r.subscriber_id, 'comment', NEW.user_id, NEW.bucket_id, v_content);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
