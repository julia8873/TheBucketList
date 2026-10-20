-- 20261020080000_fix_task_participants_and_shared_album_visibility.sql
-- 1. Ensure buckets SELECT RLS allows viewing tasks in shared/accessible albums and for collaborators
-- 2. Update get_bucket_participants to return all participants (owner, direct collaborators, album owners, album members)
--    without requiring the viewer to already be an accepted participant.

-- 1. Buckets SELECT policy
DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  public.is_admin(auth.uid()) OR
  (
    NOT public.is_suspended(user_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_between(user_id, auth.uid()))
    AND (
      visibility = 'public' OR
      (visibility = 'followers' AND public.is_following(user_id)) OR
      EXISTS (
        SELECT 1 FROM public.bucket_collaborators bc
        WHERE bc.bucket_id = public.buckets.id
          AND bc.user_id = auth.uid()
          AND bc.status IN ('pending', 'accepted')
      ) OR
      public.is_bucket_in_member_album(public.buckets.id) OR
      EXISTS (
        SELECT 1 FROM public.album_items ai
        WHERE ai.bucket_id = public.buckets.id
          AND public.can_view_album(ai.album_id)
      )
    )
  )
);

-- 2. get_bucket_participants
DROP FUNCTION IF EXISTS public.get_bucket_participants(uuid);

CREATE OR REPLACE FUNCTION public.get_bucket_participants(p_bucket_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_owner boolean,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_participants AS (
    -- 1. Creador / propietario de la tarea
    SELECT
      b.user_id AS uid,
      true AS is_owner,
      'accepted'::text AS status,
      1 AS priority
    FROM public.buckets b
    WHERE b.id = p_bucket_id

    UNION ALL

    -- 2. Colaboradores directos de la tarea (tanto aceptados como pendientes)
    SELECT
      bc.user_id AS uid,
      false AS is_owner,
      COALESCE(bc.status, 'accepted')::text AS status,
      2 AS priority
    FROM public.bucket_collaborators bc
    WHERE bc.bucket_id = p_bucket_id
      AND bc.status IN ('accepted', 'pending')

    UNION ALL

    -- 3. Propietario del álbum (o álbumes) que contienen la tarea
    SELECT
      a.owner_id AS uid,
      false AS is_owner,
      'accepted'::text AS status,
      3 AS priority
    FROM public.album_items ai
    JOIN public.albums a ON a.id = ai.album_id
    WHERE ai.bucket_id = p_bucket_id

    UNION ALL

    -- 4. Miembros / colaboradores de los álbumes que contienen la tarea
    SELECT
      am.user_id AS uid,
      false AS is_owner,
      COALESCE(am.status, 'accepted')::text AS status,
      4 AS priority
    FROM public.album_items ai
    JOIN public.album_members am ON am.album_id = ai.album_id
    WHERE ai.bucket_id = p_bucket_id
      AND am.status IN ('accepted', 'pending')
  ),
  deduped AS (
    SELECT
      ap.uid,
      bool_or(ap.is_owner) AS is_owner,
      CASE
        WHEN bool_or(ap.status = 'accepted') THEN 'accepted'
        ELSE 'pending'
      END AS status,
      min(ap.priority) AS best_priority
    FROM all_participants ap
    GROUP BY ap.uid
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    d.is_owner,
    d.status
  FROM deduped d
  JOIN public.profiles p ON p.id = d.uid
  WHERE (auth.uid() IS NULL OR NOT public.is_blocked_between(p.id, auth.uid()))
  ORDER BY d.is_owner DESC, d.best_priority ASC, p.username ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bucket_participants(uuid) TO authenticated, anon;
