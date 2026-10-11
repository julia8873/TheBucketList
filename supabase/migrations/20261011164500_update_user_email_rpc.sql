-- Migration: allow updating user email without email verification
CREATE OR REPLACE FUNCTION public.update_user_email(new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
  clean_email text;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  clean_email := lower(trim(new_email));

  IF clean_email IS NULL OR clean_email = '' OR position('@' in clean_email) = 0 THEN
    RAISE EXCEPTION 'Formato de correo electrónico no válido';
  END IF;

  -- Comprobar si ya existe otra cuenta con este email
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(email) = clean_email AND id != calling_user_id
  ) OR EXISTS (
    SELECT 1 FROM auth.identities 
    WHERE lower(email) = clean_email AND user_id != calling_user_id
  ) THEN
    RAISE EXCEPTION 'Este correo electrónico ya está registrado por otra cuenta';
  END IF;

  -- Actualizar directamente auth.users para que no requiera confirmación por email
  -- y limpiar cualquier solicitud de cambio de email previa (deben ser '' para evitar errores de scan en GoTrue)
  UPDATE auth.users
  SET 
    email = clean_email,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    email_change_sent_at = NULL,
    email_change_confirm_status = 0,
    raw_user_meta_data = CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('email', clean_email)
      ELSE jsonb_set(raw_user_meta_data, '{email}', to_jsonb(clean_email))
    END,
    updated_at = now()
  WHERE id = calling_user_id;

  -- Actualizar también auth.identities para que coincida el proveedor email
  UPDATE auth.identities
  SET
    identity_data = jsonb_set(identity_data, '{email}', to_jsonb(clean_email)),
    updated_at = now()
  WHERE user_id = calling_user_id AND provider = 'email';
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_email(text) TO authenticated;
