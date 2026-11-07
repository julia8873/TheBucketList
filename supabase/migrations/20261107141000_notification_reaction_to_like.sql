-- Migration: Update reaction notification message from "ha reaccionado" to "le ha dado me gusta"
CREATE OR REPLACE FUNCTION public.handle_new_reaction()
RETURNS trigger AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_actor_name text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.buckets WHERE id = NEW.bucket_id;

  -- No notificar si reaccionas a tu propia tarea
  IF v_owner IS NOT NULL AND v_owner != NEW.user_id THEN
    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = NEW.user_id;

    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, content)
    VALUES (
      v_owner, 'reaction', NEW.user_id, NEW.bucket_id,
      v_actor_name || ' le ha dado me gusta a tu tarea "' || COALESCE(v_title, '') || '"'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

