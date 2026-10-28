-- 20261028100000_collaborators_manage_collaborators.sql
--
-- Todos los colaboradores de una tarea (o de un álbum) pueden gestionar al resto de colaboradores:
-- invitar, cancelar invitaciones pendientes, quitar colaboradores y aprobar solicitudes.
-- Nadie, salvo el propio creador, puede quitar al creador.
--
-- Mantiene el consentimiento de 20261028090000: una invitación solo la acepta la persona invitada
-- (la política UPDATE "User can update their own collaboration status" no se toca).

-- 1. Funciones auxiliares (SECURITY DEFINER para no provocar recursión de RLS) ------------------

CREATE OR REPLACE FUNCTION public.bucket_owner_id(p_bucket_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT user_id FROM public.buckets WHERE id = p_bucket_id;
$$;

-- ¿Puede la persona actual gestionar a los colaboradores de la tarea?
--   · el creador
--   · un colaborador directo aceptado
--   · el dueño o un miembro aceptado de un álbum que contiene la tarea
CREATE OR REPLACE FUNCTION public.can_manage_bucket_collaborators(p_bucket_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.buckets b
      WHERE b.id = p_bucket_id AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.bucket_collaborators bc
      WHERE bc.bucket_id = p_bucket_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1
      FROM public.album_items ai
      JOIN public.albums a ON a.id = ai.album_id
      WHERE ai.bucket_id = p_bucket_id
        AND (
          a.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.album_members am
            WHERE am.album_id = a.id
              AND am.user_id = auth.uid()
              AND am.status = 'accepted'
          )
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.album_owner_id(p_album_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT owner_id FROM public.albums WHERE id = p_album_id;
$$;

GRANT EXECUTE ON FUNCTION public.bucket_owner_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_bucket_collaborators(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.album_owner_id(uuid) TO authenticated;

-- 2. bucket_collaborators ------------------------------------------------------------------------

-- Quien gestiona también ve las invitaciones pendientes (para poder cancelarlas).
DROP POLICY IF EXISTS "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators;
CREATE POLICY "Collaborators viewable by bucket owner or the user" ON public.bucket_collaborators
FOR SELECT USING (
  user_id = auth.uid()
  OR status = 'accepted'
  OR public.can_manage_bucket_collaborators(bucket_id)
);

-- Invitar: el creador y cualquier colaborador (nunca "invitar" al creador).
DROP POLICY IF EXISTS "Owner can insert collaborators" ON public.bucket_collaborators;
CREATE POLICY "Owner can insert collaborators" ON public.bucket_collaborators
FOR INSERT WITH CHECK (
  public.can_manage_bucket_collaborators(bucket_id)
  AND user_id IS DISTINCT FROM public.bucket_owner_id(bucket_id)
);

-- Quitar / cancelar invitación: uno mismo (salir) o cualquier colaborador, salvo al creador.
DROP POLICY IF EXISTS "Owner or user can delete collaborator" ON public.bucket_collaborators;
CREATE POLICY "Owner or user can delete collaborator" ON public.bucket_collaborators
FOR DELETE USING (
  user_id = auth.uid()
  OR (
    public.can_manage_bucket_collaborators(bucket_id)
    AND user_id IS DISTINCT FROM public.bucket_owner_id(bucket_id)
  )
);

-- Aprobar solicitudes (origin = 'request'): el creador y cualquier colaborador.
-- Las invitaciones siguen requiriendo que las acepte la persona invitada.
DROP POLICY IF EXISTS "Bucket owner can update collaboration status" ON public.bucket_collaborators;
CREATE POLICY "Bucket owner can update collaboration status" ON public.bucket_collaborators
FOR UPDATE
USING (
  origin = 'request'
  AND public.can_manage_bucket_collaborators(bucket_id)
)
WITH CHECK (
  origin = 'request'
  AND public.can_manage_bucket_collaborators(bucket_id)
);

-- 3. RPC: responder a solicitudes (creador o cualquier colaborador) ------------------------------
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
  v_origin text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT public.can_manage_bucket_collaborators(p_bucket_id) THEN
    RAISE EXCEPTION 'Solo el creador o los colaboradores de la tarea pueden gestionar solicitudes de colaboración';
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

-- 4. album_members --------------------------------------------------------------------------------
-- Invitar ya lo pueden hacer el dueño y los miembros (20261011134000).
-- Quitar / cancelar invitación: uno mismo, el dueño o cualquier miembro aceptado; nunca al dueño.
DROP POLICY IF EXISTS "Album members deletable by owner or user" ON public.album_members;
DROP POLICY IF EXISTS "Album members deletable by owner or members" ON public.album_members;
CREATE POLICY "Album members deletable by owner or members" ON public.album_members
FOR DELETE USING (
  user_id = auth.uid()
  OR (
    (auth_is_album_owner(album_id) OR public.is_album_member(album_id))
    AND role IS DISTINCT FROM 'owner'
    AND user_id IS DISTINCT FROM public.album_owner_id(album_id)
  )
);

NOTIFY pgrst, 'reload schema';
