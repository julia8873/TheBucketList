-- Fix: notify_album_subscribers_on_update referenced OLD.cover_image and OLD.cover_key
-- but the albums table uses cover_path (not cover_image / cover_key).

CREATE OR REPLACE FUNCTION public.notify_album_subscribers_on_update()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_content text;
    r RECORD;
    v_recent_notif_id uuid;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        v_actor_id := NEW.owner_id;
    END IF;

    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    IF OLD.title != NEW.title THEN
        v_content := v_actor_name || ' ha cambiado el nombre del album a: "' || NEW.title || '"';
    ELSIF OLD.is_closed != NEW.is_closed THEN
        v_content := v_actor_name || ' ha ' || CASE WHEN NEW.is_closed THEN 'cerrado' ELSE 'reabierto' END || ' el album: "' || NEW.title || '"';
    ELSIF COALESCE(OLD.cover_path, '') != COALESCE(NEW.cover_path, '') THEN
        v_content := v_actor_name || ' ha cambiado la portada del album: "' || NEW.title || '"';
    ELSIF COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
        v_content := v_actor_name || ' ha actualizado la descripcion del album: "' || NEW.title || '"';
    ELSE
        RETURN NEW;
    END IF;

    FOR r IN (
        SELECT subscriber_id
        FROM public.entity_notification_subscribers
        WHERE album_id = NEW.id
          AND status = 'accepted'
          AND subscriber_id != v_actor_id
    ) LOOP
        SELECT id INTO v_recent_notif_id
        FROM public.notifications
        WHERE recipient_id = r.subscriber_id
          AND album_id = NEW.id
          AND type = 'album_update'
          AND created_at > (now() - interval '2 minutes')
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_recent_notif_id IS NOT NULL THEN
            UPDATE public.notifications
            SET content = v_content,
                actor_id = v_actor_id,
                created_at = now()
            WHERE id = v_recent_notif_id;
        ELSE
            INSERT INTO public.notifications (
                recipient_id, actor_id, type, album_id, content
            ) VALUES (
                r.subscriber_id, v_actor_id, 'album_update', NEW.id, v_content
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;