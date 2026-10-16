-- Migration: Fix notify_bucket_subscribers_on_update trigger function
-- buckets table has column 'status' ('pending', 'in_progress', 'completed', etc.), NOT 'is_completed'
-- 'is_completed' only exists on daily_tasks.

CREATE OR REPLACE FUNCTION public.notify_bucket_subscribers_on_update()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_content text;
    r RECORD;
    r_alb RECORD;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        v_actor_id := NEW.user_id;
    END IF;

    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    -- Determine notification message based on what changed
    -- Table 'buckets' uses 'status' (pending, completed, etc.), not 'is_completed'
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_content := v_actor_name || ' ha completado la tarea: "' || NEW.title || '"';
    ELSIF OLD.status != NEW.status THEN
        v_content := v_actor_name || ' ha cambiado el estado de la tarea "' || NEW.title || '" a: ' || NEW.status;
    ELSIF OLD.title != NEW.title THEN
        v_content := v_actor_name || ' ha renombrado la tarea a: "' || NEW.title || '"';
    ELSIF COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
        v_content := v_actor_name || ' ha actualizado las notas de la tarea: "' || NEW.title || '"';
    ELSIF OLD.deadline IS DISTINCT FROM NEW.deadline THEN
        v_content := v_actor_name || ' ha actualizado la fecha límite de la tarea: "' || NEW.title || '"';
    ELSE
        v_content := v_actor_name || ' ha actualizado la tarea: "' || NEW.title || '"';
    END IF;

    -- 3a. Send notification to all accepted subscribers of the task
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE bucket_id = NEW.id 
          AND status = 'accepted'
    ) LOOP
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            type,
            bucket_id,
            content
        ) VALUES (
            r.subscriber_id,
            v_actor_id,
            'bucket_update',
            NEW.id,
            v_content
        );
    END LOOP;

    -- 3b. Also send notification to all accepted subscribers of any albums containing this task
    FOR r_alb IN (
        SELECT DISTINCT ens.subscriber_id, ens.album_id, a.title as album_title
        FROM public.entity_notification_subscribers ens
        JOIN public.album_items ai ON ai.album_id = ens.album_id
        JOIN public.albums a ON a.id = ens.album_id
        WHERE ai.bucket_id = NEW.id
          AND ens.status = 'accepted'
    ) LOOP
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            type,
            album_id,
            bucket_id,
            content
        ) VALUES (
            r_alb.subscriber_id,
            v_actor_id,
            'album_update',
            r_alb.album_id,
            NEW.id,
            v_actor_name || ' ha actualizado la tarea "' || NEW.title || '" en el álbum "' || r_alb.album_title || '"'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
