-- 20261019082000_fix_block_user_follows.sql
-- Corregir la función RPC block_user para eliminar relaciones de seguimiento en public.follows en lugar de public.friends

CREATE OR REPLACE FUNCTION public.block_user(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF v_caller = p_target_user_id THEN
    RAISE EXCEPTION 'No puedes bloquearte a ti mismo';
  END IF;

  -- Insertar en blocked_users
  INSERT INTO public.blocked_users (blocker_id, blocked_id)
  VALUES (v_caller, p_target_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Eliminar solicitudes y relaciones de seguimiento mutuas si existen en follows
  DELETE FROM public.follows
  WHERE (follower_id = v_caller AND following_id = p_target_user_id)
     OR (follower_id = p_target_user_id AND following_id = v_caller);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
