-- 20261028090000_collaboration_invites_require_consent.sql
--
-- Una invitación a colaborar en una tarea solo puede aceptarla la persona invitada.
--
-- Hasta ahora una invitación (la envía el dueño) y una solicitud (la envía quien quiere colaborar)
-- eran filas `pending` idénticas, así que el dueño podía "aceptar" sus propias invitaciones
-- (por la política de UPDATE del dueño o por `respond_to_collaboration_request`) y la persona
-- invitada acababa siendo colaboradora sin haberlo aceptado.
--
-- Solución: cada fila recuerda quién la originó (`origin`).
--   · 'invite'  → la creó el dueño/colaborador para otra persona. Solo el invitado la acepta o rechaza.
--   · 'request' → la creó el propio usuario (solicitud o unión abierta). Solo el dueño la aprueba.

-- 1. Columna origin ---------------------------------------------------------------------------
ALTER TABLE public.bucket_collaborators
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'invite'
  CHECK (origin IN ('invite', 'request'));

-- Datos existentes: las filas pendientes con una notificación `collaboration_request` del propio
-- usuario son solicitudes; el resto (invitaciones) se quedan como 'invite'.
UPDATE public.bucket_collaborators bc
   SET origin = 'request'
 WHERE bc.origin = 'invite'
   AND EXISTS (
     SELECT 1 FROM public.notifications n
      WHERE n.type = 'collaboration_request'
        AND n.bucket_id = bc.bucket_id
        AND n.actor_id = bc.user_id
   );

-- 2. El origen y el estado inicial los decide el servidor ---------------------------------------
CREATE OR REPLACE FUNCTION public.bucket_collaborators_set_origin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserciones sin usuario autenticado (seed, service role, tareas internas): se respetan.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = auth.uid() THEN
    NEW.origin := 'request';
  ELSE
    -- Invitar a otra persona: siempre queda pendiente hasta que ella acepte.
    NEW.origin := 'invite';
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bucket_collaborators_set_origin ON public.bucket_collaborators;
CREATE TRIGGER bucket_collaborators_set_origin
  BEFORE INSERT ON public.bucket_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.bucket_collaborators_set_origin();

-- El origen no se puede cambiar después.
CREATE OR REPLACE FUNCTION public.bucket_collaborators_lock_origin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.origin := OLD.origin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bucket_collaborators_lock_origin ON public.bucket_collaborators;
CREATE TRIGGER bucket_collaborators_lock_origin
  BEFORE UPDATE ON public.bucket_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.bucket_collaborators_lock_origin();

-- 3. Políticas de UPDATE ------------------------------------------------------------------------
-- La persona invitada acepta/rechaza SU invitación (un solicitante no puede auto-aprobarse).
DROP POLICY IF EXISTS "User can update their own collaboration status" ON public.bucket_collaborators;
CREATE POLICY "User can update their own collaboration status" ON public.bucket_collaborators
FOR UPDATE
USING (user_id = auth.uid() AND origin = 'invite')
WITH CHECK (user_id = auth.uid() AND origin = 'invite');

-- El dueño solo aprueba SOLICITUDES de otras personas, nunca invitaciones suyas.
DROP POLICY IF EXISTS "Bucket owner can update collaboration status" ON public.bucket_collaborators;
CREATE POLICY "Bucket owner can update collaboration status" ON public.bucket_collaborators
FOR UPDATE
USING (
  origin = 'request'
  AND EXISTS (
    SELECT 1 FROM public.buckets b
    WHERE b.id = bucket_collaborators.bucket_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  origin = 'request'
  AND EXISTS (
    SELECT 1 FROM public.buckets b
    WHERE b.id = bucket_collaborators.bucket_id
      AND b.user_id = auth.uid()
  )
);

-- 4. RPC: responder a solicitudes (solo solicitudes, nunca invitaciones) ---------------------------
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
  v_origin text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT user_id INTO v_owner_id FROM public.buckets WHERE id = p_bucket_id;
  IF v_owner_id IS NULL OR v_owner_id != v_uid THEN
    RAISE EXCEPTION 'Solo el creador de la tarea puede gestionar solicitudes de colaboración';
  END IF;

  SELECT origin INTO v_origin
    FROM public.bucket_collaborators
   WHERE bucket_id = p_bucket_id AND user_id = p_user_id AND status = 'pending';

  IF v_origin IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna solicitud pendiente de este usuario';
  END IF;

  IF v_origin <> 'request' THEN
    RAISE EXCEPTION 'Las invitaciones solo puede aceptarlas la persona invitada';
  END IF;

  IF p_accept THEN
    UPDATE public.bucket_collaborators
       SET status = 'accepted', updated_at = now()
     WHERE bucket_id = p_bucket_id AND user_id = p_user_id;

    BEGIN
      INSERT INTO public.notifications (recipient_id, type, actor_id, bucket_id, is_read, created_at)
      VALUES (p_user_id, 'collaboration_accepted', v_uid, p_bucket_id, false, now());
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

NOTIFY pgrst, 'reload schema';
