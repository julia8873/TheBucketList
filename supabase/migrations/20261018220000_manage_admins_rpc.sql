-- Migration: Admin management RPCs

CREATE OR REPLACE FUNCTION public.add_admin(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
  v_target_id uuid;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo los administradores pueden añadir otros administradores';
  END IF;

  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE lower(trim(username)) = lower(trim(p_username));

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario con el username @%', p_username;
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = v_target_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_admin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_admin(p_target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
  v_target_username text;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo los administradores pueden retirar administradores';
  END IF;

  SELECT username INTO v_target_username
  FROM public.profiles
  WHERE id = p_target_id;

  IF lower(trim(v_target_username)) = 'juliamiralles8873' THEN
    RAISE EXCEPTION 'No se puede revocar el rol al administrador principal';
  END IF;

  IF p_target_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes retirar tus propios permisos de administrador';
  END IF;

  UPDATE public.profiles
  SET role = 'user'
  WHERE id = p_target_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.remove_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admins()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.role, p.created_at
  FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.created_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admins() TO authenticated;
