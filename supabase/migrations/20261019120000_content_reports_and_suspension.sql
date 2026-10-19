-- Migration: perfil de quien te bloqueó, reportes de tareas/álbumes/comentarios y suspensión de cuentas
--
-- 1. get_blocker_profile(): identidad mínima de quien te ha bloqueado (para mostrar "te ha bloqueado")
-- 2. Trigger que impide seguir a alguien que te ha bloqueado (o a quien tú has bloqueado)
-- 3. reports: soporte para tareas, álbumes y comentarios (con snapshot del contenido)
-- 4. Notificación a administradores para cualquier tipo de reporte
-- 5. get_admin_reports() ampliado (usuarios + contenido)
-- 6. Acciones de administración: eliminar contenido reportado, suspender / reactivar cuenta

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Perfil mínimo de quien me ha bloqueado
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_blocker_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    -- Los administradores nunca están bloqueados: ven el perfil completo por la vía normal
    WHEN public.is_admin(auth.uid()) THEN NULL
    WHEN EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE b.blocker_id = p_user_id AND b.blocked_id = auth.uid()
    ) THEN (
      SELECT jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      )
      FROM public.profiles p
      WHERE p.id = p_user_id
    )
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocker_profile(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. No se puede seguir a quien te ha bloqueado
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_follow_when_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Los administradores pueden interactuar siempre (moderación)
  IF public.is_admin(NEW.follower_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = NEW.following_id AND b.blocked_id = NEW.follower_id)
       OR (b.blocker_id = NEW.follower_id AND b.blocked_id = NEW.following_id)
  ) THEN
    RAISE EXCEPTION 'No puedes seguir a este usuario';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_follow_when_blocked ON public.follows;
CREATE TRIGGER trigger_prevent_follow_when_blocked
BEFORE INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.prevent_follow_when_blocked();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Suspensión de cuentas (columnas + protección)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Solo un administrador puede cambiar el estado de suspensión
CREATE OR REPLACE FUNCTION public.guard_profile_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
      OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason)
     AND NOT public.is_admin(auth.uid())
     AND auth.uid() IS NOT NULL THEN
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspension_reason := OLD.suspension_reason;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_profile_suspension ON public.profiles;
CREATE TRIGGER trigger_guard_profile_suspension
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_suspension();

CREATE OR REPLACE FUNCTION public.is_suspended(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND suspended_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated, anon;

-- Los perfiles, tareas y álbumes de cuentas suspendidas dejan de ser visibles para el resto
DROP POLICY IF EXISTS "Profiles are viewable by everyone unless blocked" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone unless blocked" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NULL
  OR public.is_admin(auth.uid())
  OR id = auth.uid()
  OR (suspended_at IS NULL AND NOT public.is_blocked_by(id))
);

DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  public.is_admin(auth.uid()) OR
  (
    NOT public.is_suspended(user_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_between(user_id, auth.uid()))
    AND (
      visibility = 'public' OR
      (visibility = 'followers' AND public.is_following(user_id))
    )
  )
);

DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
CREATE POLICY "Public albums are viewable by everyone" ON public.albums FOR SELECT USING (
  public.is_admin(auth.uid()) OR
  (
    visibility = 'public'
    AND NOT public.is_suspended(owner_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_between(owner_id, auth.uid()))
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. reports: tareas, álbumes y comentarios
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS album_id uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'user';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_title text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_excerpt text;

-- Conservar el reporte aunque el contenido se elimine (el administrador necesita el histórico)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_bucket_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES public.buckets(id) ON DELETE SET NULL;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_comment_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE SET NULL;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_album_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE SET NULL;

UPDATE public.reports SET target_type = 'user' WHERE target_type IS NULL AND reported_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);

-- Completa servidor-side el destinatario del reporte y una copia del contenido,
-- para que el cliente no pueda falsearlos y el histórico se conserve.
CREATE OR REPLACE FUNCTION public.fill_report_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_excerpt text;
  v_comment record;
BEGIN
  IF NEW.comment_id IS NOT NULL THEN
    NEW.target_type := 'comment';
    SELECT c.user_id, c.body, c.bucket_id, c.album_id
      INTO v_comment
    FROM public.comments c WHERE c.id = NEW.comment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El comentario ya no existe';
    END IF;
    v_owner := v_comment.user_id;
    v_excerpt := left(v_comment.body, 300);
    NEW.bucket_id := COALESCE(NEW.bucket_id, v_comment.bucket_id);
    NEW.album_id := COALESCE(NEW.album_id, v_comment.album_id);
    IF v_comment.bucket_id IS NOT NULL THEN
      SELECT title INTO v_title FROM public.buckets WHERE id = v_comment.bucket_id;
    ELSIF v_comment.album_id IS NOT NULL THEN
      SELECT title INTO v_title FROM public.albums WHERE id = v_comment.album_id;
    END IF;
  ELSIF NEW.album_id IS NOT NULL THEN
    NEW.target_type := 'album';
    SELECT owner_id, title, left(COALESCE(description, ''), 300)
      INTO v_owner, v_title, v_excerpt
    FROM public.albums WHERE id = NEW.album_id;
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'El álbum ya no existe';
    END IF;
  ELSIF NEW.bucket_id IS NOT NULL THEN
    NEW.target_type := 'bucket';
    SELECT user_id, title, left(COALESCE(description, ''), 300)
      INTO v_owner, v_title, v_excerpt
    FROM public.buckets WHERE id = NEW.bucket_id;
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'La tarea ya no existe';
    END IF;
  ELSE
    NEW.target_type := 'user';
    v_owner := NEW.reported_user_id;
  END IF;

  IF v_owner IS NOT NULL THEN
    NEW.reported_user_id := v_owner;
  END IF;

  IF NEW.reported_user_id = NEW.reporter_id THEN
    RAISE EXCEPTION 'No puedes reportar tu propio contenido';
  END IF;

  -- Evitar duplicados pendientes del mismo usuario sobre el mismo objetivo
  IF EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.reporter_id = NEW.reporter_id
      AND COALESCE(r.status, 'pending') = 'pending'
      AND r.target_type = NEW.target_type
      AND r.reported_user_id IS NOT DISTINCT FROM NEW.reported_user_id
      AND r.bucket_id IS NOT DISTINCT FROM NEW.bucket_id
      AND r.album_id IS NOT DISTINCT FROM NEW.album_id
      AND r.comment_id IS NOT DISTINCT FROM NEW.comment_id
  ) THEN
    RAISE EXCEPTION 'Ya has reportado esto y el equipo de moderación lo está revisando';
  END IF;

  NEW.target_title := v_title;
  NEW.target_excerpt := v_excerpt;
  NEW.status := COALESCE(NEW.status, 'pending');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_fill_report_target ON public.reports;
CREATE TRIGGER trigger_fill_report_target
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.fill_report_target();

-- Políticas (los administradores se reconocen con is_admin, igual que el resto de RPC)
DROP POLICY IF EXISTS "Users view own reports, admins view all reports" ON public.reports;
CREATE POLICY "Users view own reports, admins view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Notificar a los administradores de CUALQUIER reporte
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_admins_on_user_report()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_reported_username text;
  v_reporter_username text;
  v_what text;
  v_type text;
BEGIN
  SELECT username INTO v_reported_username FROM public.profiles WHERE id = NEW.reported_user_id;
  SELECT username INTO v_reporter_username FROM public.profiles WHERE id = NEW.reporter_id;

  IF NEW.target_type = 'bucket' THEN
    v_what := 'la tarea "' || COALESCE(NEW.target_title, 'sin título') || '" de @' || COALESCE(v_reported_username, 'alguien');
    v_type := 'content_reported';
  ELSIF NEW.target_type = 'album' THEN
    v_what := 'el álbum "' || COALESCE(NEW.target_title, 'sin título') || '" de @' || COALESCE(v_reported_username, 'alguien');
    v_type := 'content_reported';
  ELSIF NEW.target_type = 'comment' THEN
    v_what := 'un comentario de @' || COALESCE(v_reported_username, 'alguien');
    v_type := 'content_reported';
  ELSE
    v_what := '@' || COALESCE(v_reported_username, 'alguien');
    v_type := 'user_reported';
  END IF;

  FOR v_admin IN
    SELECT id FROM public.profiles
    WHERE role = 'admin' OR lower(trim(username)) = 'juliamiralles8873'
  LOOP
    -- No notificar al propio administrador que reporta
    CONTINUE WHEN v_admin.id = NEW.reporter_id;

    INSERT INTO public.notifications (recipient_id, actor_id, type, content, is_read)
    VALUES (
      v_admin.id,
      NEW.reporter_id,
      v_type,
      COALESCE('@' || v_reporter_username, 'Un usuario') || ' ha reportado ' || v_what || ': ' || NEW.reason,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_report ON public.reports;
CREATE TRIGGER trigger_notify_admins_on_report
AFTER INSERT ON public.reports
FOR EACH ROW
WHEN (NEW.reported_user_id IS NOT NULL)
EXECUTE FUNCTION public.notify_admins_on_user_report();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. get_admin_reports(): usuarios + tareas + álbumes + comentarios
-- ═══════════════════════════════════════════════════════════════════════════
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
      'target_type', COALESCE(r.target_type, 'user'),
      'target_title', r.target_title,
      'target_excerpt', r.target_excerpt,
      'bucket_id', r.bucket_id,
      'album_id', r.album_id,
      'comment_id', r.comment_id,
      'reported_user_id', r.reported_user_id,
      'reporter_id', r.reporter_id,
      'reported', (
        SELECT jsonb_build_object(
          'id', p_rep.id,
          'username', p_rep.username,
          'display_name', p_rep.display_name,
          'avatar_url', p_rep.avatar_url,
          'suspended_at', p_rep.suspended_at
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
  FROM public.reports r;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_reports() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Acciones de administración
-- ═══════════════════════════════════════════════════════════════════════════

-- 7.1 Eliminar el contenido reportado (tarea, álbum o comentario) y cerrar el reporte
CREATE OR REPLACE FUNCTION public.admin_remove_reported_content(p_report_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar contenido reportado';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El reporte no existe';
  END IF;

  IF v_report.target_type = 'comment' AND v_report.comment_id IS NOT NULL THEN
    DELETE FROM public.comments WHERE id = v_report.comment_id;
  ELSIF v_report.target_type = 'album' AND v_report.album_id IS NOT NULL THEN
    DELETE FROM public.albums WHERE id = v_report.album_id;
  ELSIF v_report.target_type = 'bucket' AND v_report.bucket_id IS NOT NULL THEN
    DELETE FROM public.buckets WHERE id = v_report.bucket_id;
  END IF;

  -- Cierra este reporte y cualquier otro pendiente sobre el mismo contenido
  UPDATE public.reports
  SET status = 'resolved_content_removed', resolved = true
  WHERE id = p_report_id
     OR (
       COALESCE(status, 'pending') = 'pending'
       AND target_type = v_report.target_type
       AND bucket_id IS NOT DISTINCT FROM v_report.bucket_id
       AND album_id IS NOT DISTINCT FROM v_report.album_id
       AND comment_id IS NOT DISTINCT FROM v_report.comment_id
     );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_reported_content(uuid) TO authenticated;

-- 7.2 Suspender (bloquear) una cuenta: no podrá iniciar sesión ni se verá su contenido
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden bloquear cuentas';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes bloquear tu propia cuenta de administrador';
  END IF;

  IF public.is_admin(p_user_id) THEN
    RAISE EXCEPTION 'No se puede bloquear la cuenta de otro administrador';
  END IF;

  UPDATE public.profiles
  SET suspended_at = now(),
      suspension_reason = NULLIF(trim(COALESCE(p_reason, '')), '')
  WHERE id = p_user_id;

  -- Impide nuevos inicios de sesión y renovaciones de token
  UPDATE auth.users
  SET banned_until = now() + interval '100 years'
  WHERE id = p_user_id;

  -- Cierra las sesiones activas
  DELETE FROM auth.sessions WHERE user_id = p_user_id;

  -- Cierra los reportes pendientes contra la cuenta
  UPDATE public.reports
  SET status = 'resolved_suspended', resolved = true
  WHERE reported_user_id = p_user_id
    AND COALESCE(status, 'pending') = 'pending';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;

-- 7.3 Reactivar una cuenta suspendida
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden reactivar cuentas';
  END IF;

  UPDATE public.profiles
  SET suspended_at = NULL, suspension_reason = NULL
  WHERE id = p_user_id;

  UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) TO authenticated;
