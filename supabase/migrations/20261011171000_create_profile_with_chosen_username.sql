-- Migration: Support chosen username during signup and validate username uniqueness
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger AS $$
DECLARE
  chosen_username text;
  display_name_val text;
BEGIN
  chosen_username := lower(trim(NEW.raw_user_meta_data->>'username'));
  
  -- Si no se proporcionó username (p.ej. Google signup), generar uno temporal
  IF chosen_username IS NULL OR chosen_username = '' THEN
    chosen_username := COALESCE(
      SPLIT_PART(NEW.email, '@', 1),
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
    display_name, 
    avatar_url,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    chosen_username,
    display_name_val,
    NEW.raw_user_meta_data->>'avatar_url',
    -- Si ya se proporcionó username en el registro, el onboarding queda completado
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

-- RPC to check if a username is available
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF username_to_check IS NULL OR length(trim(username_to_check)) < 3 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(username_to_check))
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;

-- RPC to check if an email is available
CREATE OR REPLACE FUNCTION public.check_email_available(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF email_to_check IS NULL OR position('@' in email_to_check) = 0 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(email_to_check))
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE lower(email) = lower(trim(email_to_check))
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;
