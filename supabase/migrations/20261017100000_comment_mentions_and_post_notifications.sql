-- Migration: Notify on comment publication and mentions
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  v_bucket_owner uuid;
  v_bucket_title text;
  v_actor_name text;
  v_comment_preview text;
  v_owner_content text;
  v_sub_content text;
  v_mention_content text;
  v_notified_user_ids uuid[] := ARRAY[]::uuid[];
  r RECORD;
  r_mention RECORD;
  v_mentioned_user_id uuid;
BEGIN
  SELECT user_id, title INTO v_bucket_owner, v_bucket_title FROM public.buckets WHERE id = NEW.bucket_id;

  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_comment_preview := substring(NEW.body from 1 for 60);
  IF length(NEW.body) > 60 THEN
    v_comment_preview := v_comment_preview || '...';
  END IF;

  -- 1. Notify any users mentioned with @username
  IF NEW.body ~ '@[a-zA-Z0-9_.-]+' THEN
    FOR r_mention IN (
      SELECT DISTINCT match[1] AS mentioned_username
      FROM regexp_matches(NEW.body, '@([a-zA-Z0-9_.-]+)', 'g') AS match
    ) LOOP
      SELECT id INTO v_mentioned_user_id
      FROM public.profiles
      WHERE lower(username) = lower(r_mention.mentioned_username);

      IF v_mentioned_user_id IS NOT NULL AND v_mentioned_user_id != NEW.user_id THEN
        v_mention_content := v_actor_name || ' te ha mencionado en un comentario en la publicación "' || COALESCE(v_bucket_title, 'tarea') || '"';

        INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, comment_id, content)
        VALUES (v_mentioned_user_id, 'mention', NEW.user_id, NEW.bucket_id, NEW.id, v_mention_content);

        v_notified_user_ids := array_append(v_notified_user_ids, v_mentioned_user_id);
      END IF;
    END LOOP;
  END IF;

  -- 2. Notify the publication/task owner (if not the commenter and not already notified as mentioned)
  IF v_bucket_owner IS NOT NULL AND v_bucket_owner != NEW.user_id THEN
    IF NOT (v_bucket_owner = ANY(v_notified_user_ids)) THEN
      v_owner_content := v_actor_name || ' ha comentado en tu publicación "' || COALESCE(v_bucket_title, 'tarea') || '": "' || v_comment_preview || '"';

      INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, comment_id, content)
      VALUES (v_bucket_owner, 'comment', NEW.user_id, NEW.bucket_id, NEW.id, v_owner_content);

      v_notified_user_ids := array_append(v_notified_user_ids, v_bucket_owner);
    END IF;
  END IF;

  -- 3. Also notify accepted subscribers of this task (excluding the commenter, owner, and mentioned users)
  v_sub_content := v_actor_name || ' ha comentado: "' || v_comment_preview || '" en la tarea "' || COALESCE(v_bucket_title, '') || '"';

  FOR r IN (
    SELECT subscriber_id
    FROM public.entity_notification_subscribers
    WHERE bucket_id = NEW.bucket_id
      AND status = 'accepted'
      AND subscriber_id != NEW.user_id
      AND NOT (subscriber_id = ANY(v_notified_user_ids))
  ) LOOP
    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, comment_id, content)
    VALUES (r.subscriber_id, 'comment', NEW.user_id, NEW.bucket_id, NEW.id, v_sub_content);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
