-- 20261111090000_debounce_like_notifications.sql
-- Evitar notificaciones duplicadas y spam cuando un usuario da like, quita el like y vuelve a dar like repetidamente.

-- 1. Índice para búsqueda ultrarrápida de notificaciones existentes
CREATE INDEX IF NOT EXISTS idx_notifications_like_debounce
  ON public.notifications (recipient_id, actor_id, type, bucket_id, created_at);

-- 2. Actualizar trigger de likes en tareas
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
    -- Evitar spam si el usuario da like, lo quita y vuelve a dar like repetidamente:
    -- Si ya existe una notificación de me gusta de este usuario para esta tarea en las últimas 6 horas,
    -- o si la notificación anterior aún no ha sido leída, no volvemos a generar otra ni a enviar push.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE recipient_id = v_owner
        AND actor_id = NEW.user_id
        AND type = 'reaction'
        AND bucket_id = NEW.bucket_id
        AND (
          is_read = false
          OR created_at > (now() - interval '6 hours')
        )
    ) THEN
      RETURN NEW;
    END IF;

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

-- 3. Actualizar trigger de likes en comentarios
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  v_comment comments%ROWTYPE;
  v_bucket buckets%ROWTYPE;
  v_liker profiles%ROWTYPE;
  v_liker_name text;
BEGIN
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Don't notify if liking own comment
  IF v_comment.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Evitar spam si el usuario da like, lo quita y vuelve a dar like al comentario
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = v_comment.user_id
      AND actor_id = NEW.user_id
      AND type = 'comment_like'
      AND comment_id = v_comment.id
      AND (
        is_read = false
        OR created_at > (now() - interval '6 hours')
      )
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_bucket FROM buckets WHERE id = v_comment.bucket_id;
  SELECT * INTO v_liker FROM profiles WHERE id = NEW.user_id;

  v_liker_name := COALESCE(v_liker.display_name, v_liker.username, 'Alguien');

  INSERT INTO notifications (recipient_id, type, actor_id, bucket_id, comment_id, content)
  VALUES (
    v_comment.user_id,
    'comment_like',
    NEW.user_id,
    v_comment.bucket_id,
    v_comment.id,
    v_liker_name || ' le ha dado me gusta a tu comentario en "' || COALESCE(v_bucket.title, 'una tarea') || '"'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
