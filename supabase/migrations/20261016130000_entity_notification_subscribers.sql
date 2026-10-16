-- Migration: Entity Notification Subscribers for Buckets & Albums
-- Allows users to request notifications for tasks and albums, creators to manage/remove subscribers,
-- and triggers notifications upon updates.

CREATE TABLE IF NOT EXISTS public.entity_notification_subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type text NOT NULL CHECK (target_type IN ('bucket', 'album')),
    bucket_id uuid REFERENCES public.buckets(id) ON DELETE CASCADE,
    album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE,
    subscriber_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_target_consistency CHECK (
        (target_type = 'bucket' AND bucket_id IS NOT NULL AND album_id IS NULL) OR
        (target_type = 'album' AND album_id IS NOT NULL AND bucket_id IS NULL)
    ),
    CONSTRAINT uq_bucket_subscriber UNIQUE (bucket_id, subscriber_id),
    CONSTRAINT uq_album_subscriber UNIQUE (album_id, subscriber_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_subscribers_bucket ON public.entity_notification_subscribers(bucket_id, status);
CREATE INDEX IF NOT EXISTS idx_entity_subscribers_album ON public.entity_notification_subscribers(album_id, status);
CREATE INDEX IF NOT EXISTS idx_entity_subscribers_subscriber ON public.entity_notification_subscribers(subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_entity_subscribers_owner ON public.entity_notification_subscribers(owner_id);

-- Enable RLS
ALTER TABLE public.entity_notification_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view relevant subscriptions"
    ON public.entity_notification_subscribers
    FOR SELECT
    USING (
        auth.uid() = subscriber_id OR
        auth.uid() = requester_id OR
        auth.uid() = owner_id
    );

CREATE POLICY "Users can insert subscription requests"
    ON public.entity_notification_subscribers
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Owners or subscribers can update status"
    ON public.entity_notification_subscribers
    FOR UPDATE
    USING (auth.uid() = owner_id OR auth.uid() = subscriber_id);

CREATE POLICY "Owners or subscribers can delete subscriptions"
    ON public.entity_notification_subscribers
    FOR DELETE
    USING (auth.uid() = owner_id OR auth.uid() = subscriber_id);

-- Realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_notification_subscribers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Trigger for New Subscription Request Notification
CREATE OR REPLACE FUNCTION public.handle_entity_subscriber_created()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name text;
    v_target_title text;
    v_recipient uuid;
    v_content text;
BEGIN
    SELECT COALESCE(display_name, username, 'Un usuario') INTO v_actor_name
    FROM public.profiles WHERE id = NEW.requester_id;

    IF NEW.target_type = 'bucket' THEN
        SELECT title INTO v_target_title FROM public.buckets WHERE id = NEW.bucket_id;
    ELSE
        SELECT title INTO v_target_title FROM public.albums WHERE id = NEW.album_id;
    END IF;

    -- If requester is the subscriber (asking the owner)
    IF NEW.requester_id = NEW.subscriber_id THEN
        v_recipient := NEW.owner_id;
        v_content := v_actor_name || ' ha solicitado activar las notificaciones para ' || 
                     CASE WHEN NEW.target_type = 'bucket' THEN 'tu tarea "' ELSE 'tu álbum "' END || 
                     COALESCE(v_target_title, '') || '".';
    ELSE
        -- If requester is the owner (inviting a friend to follow notifications)
        v_recipient := NEW.subscriber_id;
        v_content := v_actor_name || ' quiere que recibas notificaciones de su ' || 
                     CASE WHEN NEW.target_type = 'bucket' THEN 'tarea "' ELSE 'álbum "' END || 
                     COALESCE(v_target_title, '') || '".';
    END IF;

    IF v_recipient IS NOT NULL AND v_recipient != NEW.requester_id THEN
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            type,
            bucket_id,
            album_id,
            content
        ) VALUES (
            v_recipient,
            NEW.requester_id,
            'notification_request',
            NEW.bucket_id,
            NEW.album_id,
            v_content
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_entity_subscriber_created ON public.entity_notification_subscribers;
CREATE TRIGGER trg_entity_subscriber_created
AFTER INSERT ON public.entity_notification_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.handle_entity_subscriber_created();

-- 2. Trigger for Request Accepted Notification
CREATE OR REPLACE FUNCTION public.handle_entity_subscriber_updated()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name text;
    v_target_title text;
    v_recipient uuid;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        IF NEW.target_type = 'bucket' THEN
            SELECT title INTO v_target_title FROM public.buckets WHERE id = NEW.bucket_id;
        ELSE
            SELECT title INTO v_target_title FROM public.albums WHERE id = NEW.album_id;
        END IF;

        -- Notify the requester that it was accepted
        v_recipient := CASE 
            WHEN NEW.requester_id = NEW.subscriber_id THEN NEW.subscriber_id
            ELSE NEW.subscriber_id
        END;

        SELECT COALESCE(display_name, username, 'El usuario') INTO v_actor_name
        FROM public.profiles WHERE id = auth.uid();

        IF v_recipient IS NOT NULL AND v_recipient != auth.uid() THEN
            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                type,
                bucket_id,
                album_id,
                content
            ) VALUES (
                v_recipient,
                auth.uid(),
                'notification_accepted',
                NEW.bucket_id,
                NEW.album_id,
                '¡Se han activado las notificaciones para ' || 
                CASE WHEN NEW.target_type = 'bucket' THEN 'la tarea "' ELSE 'el álbum "' END || 
                COALESCE(v_target_title, '') || '"!'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_entity_subscriber_updated ON public.entity_notification_subscribers;
CREATE TRIGGER trg_entity_subscriber_updated
AFTER UPDATE ON public.entity_notification_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.handle_entity_subscriber_updated();

-- 3. Trigger for Bucket Updates -> Notify Accepted Subscribers
CREATE OR REPLACE FUNCTION public.notify_bucket_subscribers_on_update()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_content text;
    r RECORD;
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
    ELSIF OLD.title != NEW.title OR COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
        v_content := v_actor_name || ' ha actualizado la tarea: "' || NEW.title || '"';
    ELSE
        -- No major field changed
        RETURN NEW;
    END IF;

    -- Send notification to all accepted subscribers except the updater
    FOR r IN (
        SELECT subscriber_id 
        FROM public.entity_notification_subscribers 
        WHERE bucket_id = NEW.id 
          AND status = 'accepted'
          AND subscriber_id != v_actor_id
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_bucket_subscribers_on_update ON public.buckets;
CREATE TRIGGER trg_notify_bucket_subscribers_on_update
AFTER UPDATE ON public.buckets
FOR EACH ROW
EXECUTE FUNCTION public.notify_bucket_subscribers_on_update();

-- 4. Trigger for Album Updates -> Notify Accepted Subscribers
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

    IF OLD.title != NEW.title OR COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
        v_content := v_actor_name || ' ha actualizado el álbum: "' || NEW.title || '"';
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
