-- 20261023000000_fix_album_items_rls_recursion.sql
--
-- PROBLEMA:
--   La politica INSERT de album_items usaba is_bucket_in_member_album(), que internamente
--   hace SELECT FROM album_items (con RLS activo). Eso evaluaba la politica SELECT de
--   album_items -> SELECT FROM albums -> politica SELECT de albums -> SELECT FROM album_members
--   -> politica SELECT de album_members llama can_view_album() -> SELECT FROM albums otra vez
--   -> Recursion infinita detectada por PostgreSQL.
--
-- SOLUCION:
--   1. Crear funciones SECURITY DEFINER que comprueban directamente (sin RLS)
--      la pertenencia a albumes y buckets.
--   2. Reescribir TODAS las politicas de album_items usando esas funciones seguras.

-- -----------------------------------------------------------------------
-- 1. is_album_member_direct: usuario actual es miembro aceptado del album?
--    SECURITY DEFINER -> salta RLS de album_members
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_album_member_direct(p_album_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_members
    WHERE album_id = p_album_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$;

-- -----------------------------------------------------------------------
-- 2. is_album_accessible_direct: usuario puede ver el album?
--    SECURITY DEFINER -> salta RLS de albums y album_members
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_album_accessible_direct(p_album_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.albums a
    WHERE a.id = p_album_id
      AND (
        a.owner_id = auth.uid()
        OR a.visibility = 'public'
        OR (a.visibility = 'followers' AND public.is_following(a.owner_id))
        OR EXISTS (
          SELECT 1 FROM public.album_members am
          WHERE am.album_id = a.id
            AND am.user_id = auth.uid()
            AND am.status = 'accepted'
        )
      )
  );
$$;

-- -----------------------------------------------------------------------
-- 3. is_bucket_owner_direct: usuario es propietario del bucket?
--    SECURITY DEFINER -> salta RLS de buckets
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_bucket_owner_direct(p_bucket_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buckets
    WHERE id = p_bucket_id AND user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------
-- 4. is_bucket_collaborator_direct: usuario es colaborador aceptado del bucket?
--    SECURITY DEFINER -> salta RLS de bucket_collaborators
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_bucket_collaborator_direct(p_bucket_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bucket_collaborators
    WHERE bucket_id = p_bucket_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$;

-- -----------------------------------------------------------------------
-- 5. can_manage_bucket_direct: usuario tiene acceso de gestion al bucket?
--    (propietario, colaborador aceptado, o miembro de un album que lo contiene)
--    SECURITY DEFINER -> sin recursion porque no toca album_items via RLS
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_bucket_direct(p_bucket_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_bucket_owner_direct(p_bucket_id)
    OR public.is_bucket_collaborator_direct(p_bucket_id)
    OR EXISTS (
      -- Este SELECT es seguro: estamos DENTRO de SECURITY DEFINER, sin RLS
      SELECT 1 FROM public.album_items ai
        JOIN public.album_members am
          ON am.album_id = ai.album_id
         AND am.user_id = auth.uid()
         AND am.status = 'accepted'
      WHERE ai.bucket_id = p_bucket_id
    );
$$;

-- -----------------------------------------------------------------------
-- 6. Politica SELECT de album_items (sin recursion)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Album items readable by album viewers" ON public.album_items;
CREATE POLICY "Album items readable by album viewers" ON public.album_items
FOR SELECT USING (
  public.is_album_accessible_direct(album_items.album_id)
);

-- -----------------------------------------------------------------------
-- 7. Politica INSERT de album_items (sin is_bucket_in_member_album)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Album items insertable by bucket owner" ON public.album_items;
CREATE POLICY "Album items insertable by bucket owner" ON public.album_items
FOR INSERT WITH CHECK (
  public.can_manage_bucket_direct(album_items.bucket_id)
  AND (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_items.album_id
        AND (
          a.owner_id = auth.uid()
          OR public.is_album_member_direct(a.id)
        )
    )
  )
);

-- -----------------------------------------------------------------------
-- 8. Politica DELETE de album_items (sin is_bucket_in_member_album)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Album items deletable by bucket owner" ON public.album_items;
CREATE POLICY "Album items deletable by bucket owner" ON public.album_items
FOR DELETE USING (
  public.can_manage_bucket_direct(album_items.bucket_id)
  AND (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_items.album_id
        AND (
          a.owner_id = auth.uid()
          OR public.is_album_member_direct(a.id)
        )
    )
  )
);

-- -----------------------------------------------------------------------
-- 9. Politica UPDATE de album_items (coherencia)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Album items updatable by bucket owner or album members" ON public.album_items;
CREATE POLICY "Album items updatable by bucket owner or album members" ON public.album_items
FOR UPDATE USING (
  public.is_bucket_owner_direct(album_items.bucket_id)
  OR public.is_album_member_direct(album_items.album_id)
);

-- Permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION public.is_album_member_direct(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_album_accessible_direct(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bucket_owner_direct(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bucket_collaborator_direct(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_bucket_direct(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
