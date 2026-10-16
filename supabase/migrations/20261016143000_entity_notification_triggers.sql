-- Migration: Comprehensive Entity Notification Triggers for Albums & Tasks
-- Ensures updates, adding/removing tasks, editing albums/tasks, adding photos and subtasks
-- notify all accepted subscribers (both in-app notifications and push).

-- 1. Trigger for Album Items (Adding / Removing tasks from an album)
CREATE OR REPLACE FUNCTION public.notify_album_subscribers_on_item_change()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_album_id uuid;
    v_bucket_id uuid;
    v_album_title text;
    v_bucket_title text;
    v_content text;
    r RECORD;
BEGIN
    v_actor_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_album_id := NEW.album_id;
        v_bucket_id := NEW.bucket_id;
    ELSE
        v_album_id := OLD.album_id;
        v_bucket_id := OLD.bucket_id;
    END IF;

    IF v_actor_id IS NULL THEN
        SELECT user_id INTO v_actor_id FROM public.buckets WHERE id = v_bucket_id;
    END IF;

    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    SELECT title INTO v_album_title FROM public.albums WHERE id = v_album_id;
    SELECT title INTO v_bucket_title FROM public.buckets WHERE id = v_bucket_id;

    IF TG_OP = 'INSERT' THEN
        v_content := v_actor_name || ' ha añadido la tarea "' || COALESCE(v_bucket_title, '') || '" al álbum "' || COALESCE(v_album_title, '') || '"';
    ELSE
        v_content := v_actor_name || ' ha eliminado la tarea "' || COALESCE(v_bucket_title, '') || '" del álbum "' || COALESCE(v_album_title, '') || '"';
    END IF;

    -- Notify all accepted subscribers of this album
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE album_id = v_album_id 
          AND status = 'accepted'
    ) LOOP
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            type,
            album_id,
            bucket_id,
            content
        ) VALUES (
            r.subscriber_id,
            v_actor_id,
            'album_update',
            v_album_id,
            v_bucket_id,
            v_content
        );
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_album_subscribers_on_item_change ON public.album_items;
CREATE TRIGGER trg_notify_album_subscribers_on_item_change
AFTER INSERT OR DELETE ON public.album_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_album_subscribers_on_item_change();


-- 2. Trigger for Album Updates (Title, Description, Cover, Status, Closed, etc.)
CREATE OR REPLACE FUNCTION public.notify_album_subscribers_on_update()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_content text;
    r RECORD;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        v_actor_id := NEW.owner_id;
    END IF;

    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    -- Build descriptive notification content
    IF OLD.title != NEW.title THEN
        v_content := v_actor_name || ' ha cambiado el nombre del álbum a: "' || NEW.title || '"';
    ELSIF OLD.is_closed != NEW.is_closed THEN
        v_content := v_actor_name || ' ha ' || CASE WHEN NEW.is_closed THEN 'cerrado' ELSE 'reabierto' END || ' el álbum: "' || NEW.title || '"';
    ELSIF COALESCE(OLD.cover_image, '') != COALESCE(NEW.cover_image, '') OR COALESCE(OLD.cover_key, '') != COALESCE(NEW.cover_key, '') THEN
        v_content := v_actor_name || ' ha cambiado la portada del álbum: "' || NEW.title || '"';
    ELSIF COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
        v_content := v_actor_name || ' ha actualizado la descripción del álbum: "' || NEW.title || '"';
    ELSE
        v_content := v_actor_name || ' ha actualizado el álbum: "' || NEW.title || '"';
    END IF;

    -- Notify all accepted subscribers of this album
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE album_id = NEW.id 
          AND status = 'accepted'
    ) LOOP
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            type,
            album_id,
            content
        ) VALUES (
            r.subscriber_id,
            v_actor_id,
            'album_update',
            NEW.id,
            v_content
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_album_subscribers_on_update ON public.albums;
CREATE TRIGGER trg_notify_album_subscribers_on_update
AFTER UPDATE ON public.albums
FOR EACH ROW
EXECUTE FUNCTION public.notify_album_subscribers_on_update();


-- 3. Trigger for Bucket/Task Updates (Updates task subscribers AND containing album subscribers)
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

    -- 3b. Also send notification to all accepted subscribers of any albums containing this task!
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

DROP TRIGGER IF EXISTS trg_notify_bucket_subscribers_on_update ON public.buckets;
CREATE TRIGGER trg_notify_bucket_subscribers_on_update
AFTER UPDATE ON public.buckets
FOR EACH ROW
EXECUTE FUNCTION public.notify_bucket_subscribers_on_update();


-- 4. Trigger for Bucket Photos (When photos are added to a task)
CREATE OR REPLACE FUNCTION public.notify_subscribers_on_photo_added()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_bucket_title text;
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

    SELECT title INTO v_bucket_title FROM public.buckets WHERE id = NEW.bucket_id;

    v_content := v_actor_name || ' ha añadido fotos a la tarea: "' || COALESCE(v_bucket_title, '') || '"';

    -- Notify task subscribers
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE bucket_id = NEW.bucket_id 
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
            NEW.bucket_id,
            v_content
        );
    END LOOP;

    -- Notify containing album subscribers
    FOR r_alb IN (
        SELECT DISTINCT ens.subscriber_id, ens.album_id, a.title as album_title
        FROM public.entity_notification_subscribers ens
        JOIN public.album_items ai ON ai.album_id = ens.album_id
        JOIN public.albums a ON a.id = ens.album_id
        WHERE ai.bucket_id = NEW.bucket_id
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
            NEW.bucket_id,
            v_actor_name || ' ha añadido fotos a la tarea "' || COALESCE(v_bucket_title, '') || '" en el álbum "' || r_alb.album_title || '"'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_subscribers_on_photo_added ON public.bucket_photos;
CREATE TRIGGER trg_notify_subscribers_on_photo_added
AFTER INSERT ON public.bucket_photos
FOR EACH ROW
EXECUTE FUNCTION public.notify_subscribers_on_photo_added();


-- 5. Trigger for Subtasks (When subtasks/steps are added or completed)
CREATE OR REPLACE FUNCTION public.notify_subscribers_on_subtask_change()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_bucket_title text;
    v_content text;
    r RECORD;
    r_alb RECORD;
BEGIN
    v_actor_id := auth.uid();
    SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    SELECT title INTO v_bucket_title FROM public.buckets WHERE id = NEW.bucket_id;

    IF TG_OP = 'INSERT' THEN
        v_content := v_actor_name || ' ha añadido un paso a la tarea "' || COALESCE(v_bucket_title, '') || '": "' || NEW.title || '"';
    ELSIF OLD.done = false AND NEW.done = true THEN
        v_content := v_actor_name || ' ha completado un paso en la tarea "' || COALESCE(v_bucket_title, '') || '": "' || NEW.title || '"';
    ELSE
        -- Minor edit
        RETURN NEW;
    END IF;

    -- Notify task subscribers
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE bucket_id = NEW.bucket_id 
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
            NEW.bucket_id,
            v_content
        );
    END LOOP;

    -- Notify containing album subscribers
    FOR r_alb IN (
        SELECT DISTINCT ens.subscriber_id, ens.album_id, a.title as album_title
        FROM public.entity_notification_subscribers ens
        JOIN public.album_items ai ON ai.album_id = ens.album_id
        JOIN public.albums a ON a.id = ens.album_id
        WHERE ai.bucket_id = NEW.bucket_id
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
            NEW.bucket_id,
            v_content
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_subscribers_on_subtask_change ON public.item_subtasks;
CREATE TRIGGER trg_notify_subscribers_on_subtask_change
AFTER INSERT OR UPDATE ON public.item_subtasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_subscribers_on_subtask_change();
