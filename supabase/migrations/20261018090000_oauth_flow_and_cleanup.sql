-- Migration: OAuth signup/login helpers and account cleanup
-- 1. Ensure delete_user properly cascades and removes from auth.users
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = calling_user_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- 2. Cleanup uncompleted/unregistered OAuth user (used when logging in without an existing account)
CREATE OR REPLACE FUNCTION public.cleanup_unregistered_oauth_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
  is_onboarded boolean;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT onboarding_completed INTO is_onboarded
  FROM public.profiles
  WHERE id = calling_user_id;

  -- Only delete if onboarding was NOT completed
  IF is_onboarded IS NOT TRUE THEN
    DELETE FROM auth.users WHERE id = calling_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_unregistered_oauth_user() TO authenticated;

-- 3. Update create_profile_on_signup to support Google avatar (picture or avatar_url)
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger AS $$
DECLARE
  chosen_username text;
  display_name_val text;
  clean_email text;
  avatar_val text;
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

  avatar_val := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
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
    avatar_val,
    CASE 
      WHEN NEW.raw_user_meta_data->>'username' IS NOT NULL AND NEW.raw_user_meta_data->>'username' != '' 
      THEN true 
      ELSE false 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
