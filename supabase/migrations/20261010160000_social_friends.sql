-- 20261010160000_social_friends.sql
-- Amigos: solicitudes de seguimiento, búsqueda de personas, estadísticas de perfil
-- y cuentas privadas.
--
-- Cambios:
--   1. No se puede seguir a uno mismo.
--   2. El receptor de una solicitud puede rechazarla (DELETE) y no puede alterar
--      follower_id / following_id al aceptarla (UPDATE).
--   3. Al aceptar una solicitud se avisa al solicitante (notificación 'follow_accepted').
--      Al cancelarla / rechazarla se borra la notificación 'follow_request'.
--   4. Las tareas de una cuenta privada solo las ven sus seguidores aceptados
--      (política RESTRICTIVE sobre buckets; el resto de tablas la heredan).
--   5. RPCs: search_people(), get_profile_stats().

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sin auto-follow
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_no_self_follow') THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_follows_following_status ON public.follows (following_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_follower_status  ON public.follows (follower_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rechazar solicitudes + blindar el UPDATE
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can remove follows to themselves" ON public.follows;
CREATE POLICY "Users can remove follows to themselves" ON public.follows
  FOR DELETE USING (auth.uid() = following_id);

CREATE OR REPLACE FUNCTION public.guard_follow_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id <> OLD.follower_id OR NEW.following_id <> OLD.following_id THEN
    RAISE EXCEPTION 'follower_id y following_id no se pueden modificar';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_update_follows ON public.follows;
CREATE TRIGGER before_update_follows
  BEFORE UPDATE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.guard_follow_update();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Notificaciones al aceptar / limpiar al cancelar
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_follow_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- La solicitud ya está resuelta: fuera la notificación pendiente del receptor.
    DELETE FROM notifications
     WHERE recipient_id = NEW.following_id
       AND actor_id = NEW.follower_id
       AND type = 'follow_request';

    -- Avisa al solicitante de que ya te sigue / le has aceptado.
    INSERT INTO notifications (recipient_id, type, actor_id)
    VALUES (NEW.follower_id, 'follow_accepted', NEW.following_id);

    INSERT INTO feed_events (actor_id, type)
    VALUES (NEW.follower_id, 'followed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_update_follows_accept ON public.follows;
CREATE TRIGGER after_update_follows_accept
  AFTER UPDATE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_follow_accepted();

CREATE OR REPLACE FUNCTION public.handle_follow_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' THEN
    DELETE FROM notifications
     WHERE recipient_id = OLD.following_id
       AND actor_id = OLD.follower_id
       AND type = 'follow_request';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS after_delete_follows ON public.follows;
CREATE TRIGGER after_delete_follows
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_follow_deleted();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Cuentas privadas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_private_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT visibility = 'private' FROM profiles WHERE id = target_user_id), false);
$$;

-- RESTRICTIVE: se combina con AND con las políticas SELECT existentes.
-- Subtareas, fotos, reacciones y comentarios consultan buckets, así que la heredan.
DROP POLICY IF EXISTS "Private accounts hide buckets from non-followers" ON public.buckets;
CREATE POLICY "Private accounts hide buckets from non-followers" ON public.buckets
  AS RESTRICTIVE
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR NOT public.is_private_profile(user_id)
    OR public.is_following(user_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5a. Nº de tareas que el usuario actual puede ver de otro usuario
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.visible_bucket_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN target_user_id = auth.uid() THEN
      (SELECT count(*)::int FROM buckets b WHERE b.user_id = target_user_id)
    WHEN public.is_private_profile(target_user_id) AND NOT public.is_following(target_user_id) THEN
      0
    ELSE
      (SELECT count(*)::int FROM buckets b
        WHERE b.user_id = target_user_id
          AND (b.visibility = 'public'
               OR (b.visibility = 'followers' AND public.is_following(target_user_id))))
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5b. Búsqueda de personas
--     follow_status: 'none' | 'pending' | 'accepted'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text,
  public_count integer,
  follow_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT replace(replace(replace(regexp_replace(trim(p_query), '^@', ''), '\', '\\'), '%', '\%'), '_', '\_') AS term
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.visibility,
    public.visible_bucket_count(p.id) AS public_count,
    COALESCE(f.status, 'none') AS follow_status
  FROM profiles p
  CROSS JOIN q
  LEFT JOIN follows f
    ON f.follower_id = auth.uid() AND f.following_id = p.id
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(q.term) >= 2
    AND (p.username ILIKE '%' || q.term || '%' ESCAPE '\'
         OR p.display_name ILIKE '%' || q.term || '%' ESCAPE '\')
  ORDER BY
    (p.username ILIKE q.term || '%' ESCAPE '\' OR p.display_name ILIKE q.term || '%' ESCAPE '\') DESC,
    p.username ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 30);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5c. Estadísticas del perfil público
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user uuid)
RETURNS TABLE (
  completed_count integer,
  public_count integer,
  followers_count integer,
  following_count integer,
  follow_status text,
  is_locked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM buckets b WHERE b.user_id = p_user AND b.status = 'completed'),
    public.visible_bucket_count(p_user),
    (SELECT count(*)::int FROM follows f WHERE f.following_id = p_user AND f.status = 'accepted'),
    (SELECT count(*)::int FROM follows f WHERE f.follower_id = p_user AND f.status = 'accepted'),
    COALESCE((SELECT f.status FROM follows f
               WHERE f.follower_id = auth.uid() AND f.following_id = p_user), 'none'),
    (p_user <> auth.uid()
      AND public.is_private_profile(p_user)
      AND NOT public.is_following(p_user));
$$;

REVOKE ALL ON FUNCTION public.search_people(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visible_bucket_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_people(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visible_bucket_count(uuid) TO authenticated;
