-- 20261018113000_bucket_collaboration_settings.sql
-- Añadir configuración de colaboración para tareas (solicitudes de seguidores, colaboración abierta sin permiso)

-- 1. Nuevas columnas en buckets
ALTER TABLE public.buckets 
  ADD COLUMN IF NOT EXISTS collaboration_mode text DEFAULT 'invite_only' 
  CHECK (collaboration_mode IN ('invite_only', 'request', 'open'));

ALTER TABLE public.buckets 
  ADD COLUMN IF NOT EXISTS collaboration_audience text DEFAULT 'followers' 
  CHECK (collaboration_audience IN ('followers', 'anyone'));

-- 2. Actualizar políticas RLS de bucket_collaborators para permitir a usuarios solicitar o unirse
DROP POLICY IF EXISTS "Users can request or join collaboration" ON public.bucket_collaborators;
CREATE POLICY "Users can request or join collaboration" ON public.bucket_collaborators
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.buckets b
      WHERE b.id = bucket_collaborators.bucket_id
      AND (
        (b.collaboration_mode = 'open' AND bucket_collaborators.status IN ('accepted', 'pending'))
        OR
        (b.collaboration_mode = 'request' AND bucket_collaborators.status = 'pending')
      )
      AND (
        b.collaboration_audience = 'anyone'
        OR (
          b.collaboration_audience = 'followers'
          AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = auth.uid()
            AND f.following_id = b.user_id
            AND f.status = 'accepted'
          )
        )
      )
    )
  )
);

-- Permitir al dueño del bucket actualizar el estado de los colaboradores (p. ej. aprobar/rechazar solicitudes)
DROP POLICY IF EXISTS "Bucket owner can update collaboration status" ON public.bucket_collaborators;
CREATE POLICY "Bucket owner can update collaboration status" ON public.bucket_collaborators
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.buckets b
    WHERE b.id = bucket_collaborators.bucket_id
    AND b.user_id = auth.uid()
  )
);

-- 3. Función RPC segura para unirse o solicitar colaborar
CREATE OR REPLACE FUNCTION public.request_or_join_bucket_collaboration(
  p_bucket_id uuid,
  p_request_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner_id uuid;
  v_mode text;
  v_audience text;
  v_owner_name text;
  v_target_status text;
  v_existing_status text;
  v_bucket_title text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para colaborar';
  END IF;

  SELECT b.user_id, COALESCE(b.collaboration_mode, 'invite_only'), COALESCE(b.collaboration_audience, 'followers'), b.title
  INTO v_owner_id, v_mode, v_audience, v_bucket_title
  FROM public.buckets b
  WHERE b.id = p_bucket_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Tarea no encontrada';
  END IF;

  IF v_owner_id = v_uid THEN
    RAISE EXCEPTION 'Ya eres el creador de esta tarea';
  END IF;

  -- Comprobar si ya es colaborador o ya solicitó
  SELECT status INTO v_existing_status
  FROM public.bucket_collaborators
  WHERE bucket_id = p_bucket_id AND user_id = v_uid;

  IF v_existing_status = 'accepted' THEN
    RETURN jsonb_build_object('success', true, 'status', 'accepted', 'message', 'Ya eres colaborador de esta tarea');
  END IF;

  IF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('success', true, 'status', 'pending', 'message', 'Ya has enviado una solicitud que está pendiente de aprobación');
  END IF;

  -- Comprobar modo de colaboración
  IF v_mode = 'invite_only' THEN
    RAISE EXCEPTION 'Esta tarea no permite unirse libremente ni solicitar colaborar. Requiere invitación directa del creador.';
  END IF;

  -- Comprobar audiencia permitida
  IF v_audience = 'followers' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = v_uid
      AND f.following_id = v_owner_id
      AND f.status = 'accepted'
    ) THEN
      SELECT username INTO v_owner_name FROM public.profiles WHERE id = v_owner_id;
      RAISE EXCEPTION 'Solo los seguidores de @% pueden colaborar en esta tarea. ¡Síguelo primero!', COALESCE(v_owner_name, 'este usuario');
    END IF;
  END IF;

  -- Determinar si entra directamente o queda pendiente
  IF v_mode = 'open' AND NOT p_request_only THEN
    v_target_status := 'accepted';
  ELSE
    v_target_status := 'pending';
  END IF;

  -- Insertar o actualizar registro de colaborador
  INSERT INTO public.bucket_collaborators (bucket_id, user_id, status, updated_at)
  VALUES (p_bucket_id, v_uid, v_target_status, now())
  ON CONFLICT (bucket_id, user_id)
  DO UPDATE SET status = v_target_status, updated_at = now();

  -- Crear notificación para el dueño de la tarea
  BEGIN
    INSERT INTO public.notifications (
      recipient_id,
      type,
      actor_id,
      bucket_id,
      is_read,
      created_at
    )
    VALUES (
      v_owner_id,
      CASE WHEN v_target_status = 'accepted' THEN 'collaborator_joined' ELSE 'collaboration_request' END,
      v_uid,
      p_bucket_id,
      false,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- No bloquear si las notificaciones fallan
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_target_status,
    'message', CASE WHEN v_target_status = 'accepted' 
      THEN '¡Te has unido como colaborador a la tarea!' 
      ELSE 'Solicitud de colaboración enviada al creador' END
  );
END;
$$;

-- 4. Función RPC para responder a solicitudes de colaboración
CREATE OR REPLACE FUNCTION public.respond_to_collaboration_request(
  p_bucket_id uuid,
  p_user_id uuid,
  p_accept boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT user_id INTO v_owner_id FROM public.buckets WHERE id = p_bucket_id;
  IF v_owner_id IS NULL OR v_owner_id != v_uid THEN
    RAISE EXCEPTION 'Solo el creador de la tarea puede gestionar solicitudes de colaboración';
  END IF;

  IF p_accept THEN
    UPDATE public.bucket_collaborators
    SET status = 'accepted', updated_at = now()
    WHERE bucket_id = p_bucket_id AND user_id = p_user_id;

    BEGIN
      INSERT INTO public.notifications (
        recipient_id,
        type,
        actor_id,
        bucket_id,
        is_read,
        created_at
      )
      VALUES (
        p_user_id,
        'collaboration_accepted',
        v_uid,
        p_bucket_id,
        false,
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  ELSE
    DELETE FROM public.bucket_collaborators
    WHERE bucket_id = p_bucket_id AND user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
