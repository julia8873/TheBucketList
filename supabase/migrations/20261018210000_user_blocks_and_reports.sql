-- Migration: User blocks and reports system with admin notifications and account moderation

-- 1. Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view users they blocked" ON public.blocked_users;
CREATE POLICY "Users can view users they blocked"
ON public.blocked_users FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users;
CREATE POLICY "Users can block other users"
ON public.blocked_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id AND auth.uid() <> blocked_id);

DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users;
CREATE POLICY "Users can unblock users"
ON public.blocked_users FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- 2. Update reports table with reported_user_id and details
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users view own reports, admins view all reports" ON public.reports;
CREATE POLICY "Users view own reports, admins view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Trigger to notify all admins when a user report is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_user_report()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_reported_username text;
  v_reporter_username text;
BEGIN
  -- Obtener nombre del usuario reportado
  SELECT username INTO v_reported_username
  FROM public.profiles
  WHERE id = NEW.reported_user_id;

  SELECT username INTO v_reporter_username
  FROM public.profiles
  WHERE id = NEW.reporter_id;

  -- Insertar notificación para cada usuario administrador
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      type,
      content,
      is_read
    ) VALUES (
      v_admin.id,
      NEW.reporter_id,
      'user_reported',
      COALESCE('@' || v_reporter_username, 'Un usuario') || ' ha reportado a @' || COALESCE(v_reported_username, 'alguien') || ': ' || NEW.reason,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_report ON public.reports;
CREATE TRIGGER trigger_notify_admins_on_report
AFTER INSERT ON public.reports
FOR EACH ROW
WHEN (NEW.reported_user_id IS NOT NULL)
EXECUTE FUNCTION public.notify_admins_on_user_report();

-- 4. RPC to block user and clean up relationships
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

  -- Eliminar solicitudes y relaciones de amistad / seguimiento mutuas si existen
  DELETE FROM public.friends
  WHERE (user_id = v_caller AND friend_id = p_target_user_id)
     OR (user_id = p_target_user_id AND friend_id = v_caller);

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

-- 5. RPC to unblock user
CREATE OR REPLACE FUNCTION public.unblock_user(p_target_user_id uuid)
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

  DELETE FROM public.blocked_users
  WHERE blocker_id = v_caller AND blocked_id = p_target_user_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- 6. RPC for Admin to delete user account
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

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
