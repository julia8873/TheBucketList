-- Migration: Enforce strict uniqueness for username and email in public.profiles and auth.users
-- 1. Ensure email column exists in public.profiles and populate from auth.users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p 
SET email = lower(trim(u.email)) 
FROM auth.users u 
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. Create case-insensitive unique indexes for email and username in public.profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique 
ON public.profiles (lower(trim(username)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique 
ON public.profiles (lower(trim(email))) 
WHERE email IS NOT NULL AND email != '';



-- 4. RPC to check if username is available (case-insensitive)
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_u text;
BEGIN
  clean_u := lower(trim(username_to_check));
  IF clean_u IS NULL OR length(clean_u) < 3 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(trim(username)) = clean_u
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;

-- 5. RPC to check if email is available (case-insensitive across auth.users, profiles, auth.identities)
CREATE OR REPLACE FUNCTION public.check_email_available(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_e text;
BEGIN
  clean_e := lower(trim(email_to_check));
  IF clean_e IS NULL OR clean_e = '' OR position('@' in clean_e) = 0 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(trim(email)) = clean_e
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(trim(email)) = clean_e
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE lower(trim(email)) = clean_e
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;

-- 6. Update trigger create_profile_on_signup to enforce uniqueness and set email
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger AS $$
DECLARE
  chosen_username text;
  display_name_val text;
  clean_email text;
BEGIN
  clean_email := lower(trim(NEW.email));
  chosen_username := lower(trim(NEW.raw_user_meta_data->>'username'));
  
  -- Si se especificó username, validar que no exista ya en profiles
  IF chosen_username IS NOT NULL AND chosen_username != '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = chosen_username) THEN
      RAISE EXCEPTION 'Este nombre de usuario ya está en uso';
    END IF;
  ELSE
    -- Si no se proporcionó username (p.ej. Google signup), generar uno único temporal
    chosen_username := COALESCE(
      SPLIT_PART(clean_email, '@', 1),
      NEW.id::text
    ) || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  display_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    chosen_username
  );

  INSERT INTO public.profiles (
    id, 
    username, 
    email,
    display_name, 
    avatar_url,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    chosen_username,
    clean_email,
    display_name_val,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.raw_user_meta_data->>'username' IS NOT NULL AND NEW.raw_user_meta_data->>'username' != '' 
      THEN true 
      ELSE false 
    END
  );

  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update update_user_email function to also update profiles.email and check profiles
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

  -- Comprobar si ya existe otra cuenta con este email en auth.users, profiles o auth.identities
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(trim(email)) = clean_email AND id != calling_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(trim(email)) = clean_email AND id != calling_user_id
  ) OR EXISTS (
    SELECT 1 FROM auth.identities 
    WHERE lower(trim(email)) = clean_email AND user_id != calling_user_id
  ) THEN
    RAISE EXCEPTION 'Este correo electrónico ya está registrado por otra cuenta';
  END IF;

  -- Actualizar auth.users
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

  -- Actualizar profiles.email
  UPDATE public.profiles
  SET
    email = clean_email,
    updated_at = now()
  WHERE id = calling_user_id;

  -- Actualizar auth.identities
  UPDATE auth.identities
  SET
    identity_data = jsonb_set(identity_data, '{email}', to_jsonb(clean_email)),
    updated_at = now()
  WHERE user_id = calling_user_id AND provider = 'email';
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_user_email(text) TO authenticated;
