-- Migration: Admin unrestricted visibility for moderating blocked and reported users
-- Admins must never have users or content hidden from them even if someone blocked the admin.

-- 1. Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND (role = 'admin' OR lower(trim(username)) = 'juliamiralles8873')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- 2. Update is_blocked_by: Admins are never blocked by any user
CREATE OR REPLACE FUNCTION public.is_blocked_by(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin(auth.uid()) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE blocker_id = p_user_id AND blocked_id = auth.uid()
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked_by(uuid) TO authenticated, anon;

-- 3. Update is_blocked_between: Admins are never blocked from seeing content
CREATE OR REPLACE FUNCTION public.is_blocked_between(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin(auth.uid()) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
         OR (blocker_id = p_user_b AND blocked_id = p_user_a)
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated, anon;

-- 4. Update search_people: Admins can search and find all users including those who blocked them
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
    AND (
      public.is_admin(auth.uid())
      OR NOT EXISTS (
        SELECT 1 FROM public.blocked_users b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
    )
  ORDER BY
    (p.username ILIKE q.term || '%' ESCAPE '\' OR p.display_name ILIKE q.term || '%' ESCAPE '\') DESC,
    p.username ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 30);
$$;

GRANT EXECUTE ON FUNCTION public.search_people(text, integer) TO authenticated;

-- 5. Profiles RLS: Admins can always view any profile regardless of block status
DROP POLICY IF EXISTS "Profiles are viewable by everyone unless blocked" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone unless blocked" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NULL 
  OR public.is_admin(auth.uid())
  OR NOT public.is_blocked_by(id)
);

-- 6. RPC: get_admin_reports() returns all reports with complete user profiles for moderation
CREATE OR REPLACE FUNCTION public.get_admin_reports()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden ver los reportes';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'reason', r.reason,
      'details', r.details,
      'status', r.status,
      'resolved', r.resolved,
      'created_at', r.created_at,
      'reported_user_id', r.reported_user_id,
      'reporter_id', r.reporter_id,
      'reported', (
        SELECT jsonb_build_object(
          'id', p_rep.id,
          'username', p_rep.username,
          'display_name', p_rep.display_name,
          'avatar_url', p_rep.avatar_url
        )
        FROM public.profiles p_rep
        WHERE p_rep.id = r.reported_user_id
      ),
      'reporter', (
        SELECT jsonb_build_object(
          'id', p_rtr.id,
          'username', p_rtr.username,
          'display_name', p_rtr.display_name,
          'avatar_url', p_rtr.avatar_url
        )
        FROM public.profiles p_rtr
        WHERE p_rtr.id = r.reporter_id
      )
    ) ORDER BY r.created_at DESC
  )
  INTO v_result
  FROM public.reports r
  WHERE r.reported_user_id IS NOT NULL;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_reports() TO authenticated;

-- 7. Update admin_delete_user to allow authorized admins to delete reported users safely
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT public.is_admin(auth.uid()) INTO v_is_admin;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar cuentas de usuarios';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta de administrador mediante este panel';
  END IF;

  -- Marcar reportes asociados como resueltos
  UPDATE public.reports
  SET status = 'resolved_deleted', resolved = true
  WHERE reported_user_id = target_user_id;

  -- Borrar de auth.users (cascada a profiles, buckets, albums, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
