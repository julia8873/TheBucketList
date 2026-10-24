-- Migration: notificaciones de comentarios / reacciones más específicas y con destino navegable
--
-- Problemas que corrige:
--  1. La última versión de handle_new_comment (safe_comment_trigger) creaba la notificación SIN
--     `content` y, para álbumes, SIN `album_id` → al pulsarla no había a dónde navegar.
--     También había perdido las menciones y los avisos a suscriptores de la versión anterior.
--  2. Las reacciones se guardaban sin `content`.
--  3. Faltaba la política INSERT en notification_prefs (el upsert de preferencias fallaba si la
--     fila aún no existía).

-- ── 1. Comentarios ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_actor_name text;
  v_is_album boolean := NEW.album_id IS NOT NULL AND NEW.bucket_id IS NULL;
  v_noun text;
  v_notified uuid[] := ARRAY[]::uuid[];
  v_mentioned_id uuid;
  r_mention RECORD;
  r RECORD;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_is_album THEN
    SELECT owner_id, title INTO v_owner, v_title FROM public.albums WHERE id = NEW.album_id;
    v_noun := 'álbum';
  ELSIF NEW.bucket_id IS NOT NULL THEN
    SELECT user_id, title INTO v_owner, v_title FROM public.buckets WHERE id = NEW.bucket_id;
    v_noun := 'tarea';
  ELSE
    RETURN NEW;
  END IF;

  -- 1. Menciones (@usuario)
  IF NEW.body ~ '@[a-zA-Z0-9_.-]+' THEN
    FOR r_mention IN (
      SELECT DISTINCT m[1] AS mentioned_username
      FROM regexp_matches(NEW.body, '@([a-zA-Z0-9_.-]+)', 'g') AS m
    ) LOOP
      v_mentioned_id := NULL;
      SELECT id INTO v_mentioned_id
      FROM public.profiles
      WHERE lower(username) = lower(r_mention.mentioned_username);

      IF v_mentioned_id IS NOT NULL
         AND v_mentioned_id != NEW.user_id
         AND NOT (v_mentioned_id = ANY(v_notified)) THEN
        INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, album_id, comment_id, content)
        VALUES (
          v_mentioned_id, 'mention', NEW.user_id,
          CASE WHEN v_is_album THEN NULL ELSE NEW.bucket_id END,
          CASE WHEN v_is_album THEN NEW.album_id ELSE NULL END,
          NEW.id,
          v_actor_name || ' te ha mencionado en un comentario en el ' || v_noun || ' "' || COALESCE(v_title, '') || '"'
        );
        v_notified := array_append(v_notified, v_mentioned_id);
      END IF;
    END LOOP;
  END IF;

  -- 2. Dueño de la tarea / álbum
  IF v_owner IS NOT NULL AND v_owner != NEW.user_id AND NOT (v_owner = ANY(v_notified)) THEN
    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, album_id, comment_id, content)
    VALUES (
      v_owner, 'comment', NEW.user_id,
      CASE WHEN v_is_album THEN NULL ELSE NEW.bucket_id END,
      CASE WHEN v_is_album THEN NEW.album_id ELSE NULL END,
      NEW.id,
      v_actor_name || ' ha dejado un comentario en tu ' || v_noun || ' "' || COALESCE(v_title, '') || '"'
    );
    v_notified := array_append(v_notified, v_owner);
  END IF;

  -- 3. Suscriptores aceptados (excluye al autor, al dueño y a los mencionados)
  FOR r IN (
    SELECT subscriber_id
    FROM public.entity_notification_subscribers
    WHERE status = 'accepted'
      AND subscriber_id != NEW.user_id
      AND ((v_is_album AND album_id = NEW.album_id) OR (NOT v_is_album AND bucket_id = NEW.bucket_id))
      AND NOT (subscriber_id = ANY(v_notified))
  ) LOOP
    INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, album_id, comment_id, content)
    VALUES (
      r.subscriber_id, 'comment', NEW.user_id,
      CASE WHEN v_is_album THEN NULL ELSE NEW.bucket_id END,
      CASE WHEN v_is_album THEN NEW.album_id ELSE NULL END,
      NEW.id,
      v_actor_name || ' ha dejado un comentario en el ' || v_noun || ' "' || COALESCE(v_title, '') || '"'
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Una notificación fallida nunca debe impedir publicar el comentario
  RAISE WARNING 'handle_new_comment: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Reacciones ───────────────────────────────────────────────────────────────────────────
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
      v_actor_name || ' ha reaccionado a tu tarea "' || COALESCE(v_title, '') || '"'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. notification_prefs: permitir insertar la propia fila (upsert) ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_prefs' AND policyname = 'Users can insert own prefs'
  ) THEN
    CREATE POLICY "Users can insert own prefs" ON public.notification_prefs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
