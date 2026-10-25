-- Migration: Permitir obtener los push tokens del destinatario para enviar notificaciones push
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(p_user_id uuid)
RETURNS TABLE(token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT pt.token
    FROM public.push_tokens pt
    WHERE pt.user_id = p_user_id AND pt.token IS NOT NULL AND pt.token != ''
    UNION
    SELECT p.push_token AS token
    FROM public.profiles p
    WHERE p.id = p_user_id AND p.push_token IS NOT NULL AND p.push_token != '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_push_tokens(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_push_tokens(uuid) TO service_role;
