-- 20261016110000_profile_stats_include_collaborations.sql
-- Update get_profile_stats and visible_bucket_count to include collaborative tasks and shared album tasks.

CREATE OR REPLACE FUNCTION public.visible_bucket_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN target_user_id = auth.uid() THEN
      (
        SELECT count(DISTINCT b.id)::int
        FROM public.buckets b
        LEFT JOIN public.bucket_collaborators c ON c.bucket_id = b.id AND c.user_id = target_user_id AND c.status IN ('pending', 'accepted')
        LEFT JOIN public.album_items ai ON ai.bucket_id = b.id
        LEFT JOIN public.album_members am ON am.album_id = ai.album_id AND am.user_id = target_user_id AND am.status = 'accepted'
        WHERE (b.user_id = target_user_id OR c.id IS NOT NULL OR am.user_id IS NOT NULL)
          AND b.status <> 'archived'
      )
    WHEN public.is_private_profile(target_user_id) AND NOT public.is_following(target_user_id) THEN
      0
    ELSE
      (
        SELECT count(DISTINCT b.id)::int
        FROM public.buckets b
        LEFT JOIN public.bucket_collaborators c ON c.bucket_id = b.id AND c.user_id = target_user_id AND c.status = 'accepted'
        LEFT JOIN public.album_items ai ON ai.bucket_id = b.id
        LEFT JOIN public.album_members am ON am.album_id = ai.album_id AND am.user_id = target_user_id AND am.status = 'accepted'
        WHERE (b.user_id = target_user_id OR c.id IS NOT NULL OR am.user_id IS NOT NULL)
          AND b.status <> 'archived'
          AND (b.visibility = 'public'
               OR (b.visibility = 'followers' AND public.is_following(target_user_id)))
      )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user uuid)
RETURNS TABLE (
  completed_count integer,
  public_count integer,
  followers_count integer,
  following_count integer,
  follow_status text,
  is_locked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT count(DISTINCT b.id)::int
      FROM public.buckets b
      LEFT JOIN public.bucket_collaborators c ON c.bucket_id = b.id AND c.user_id = p_user AND c.status = 'accepted'
      LEFT JOIN public.album_items ai ON ai.bucket_id = b.id
      LEFT JOIN public.album_members am ON am.album_id = ai.album_id AND am.user_id = p_user AND am.status = 'accepted'
      WHERE (b.user_id = p_user OR c.id IS NOT NULL OR am.user_id IS NOT NULL)
        AND b.status = 'completed'
        AND b.status <> 'archived'
    ),
    public.visible_bucket_count(p_user),
    (SELECT count(*)::int FROM public.follows f WHERE f.following_id = p_user AND f.status = 'accepted'),
    (SELECT count(*)::int FROM public.follows f WHERE f.follower_id = p_user AND f.status = 'accepted'),
    COALESCE((SELECT f.status FROM public.follows f
               WHERE f.follower_id = auth.uid() AND f.following_id = p_user), 'none'),
    (p_user <> auth.uid()
      AND public.is_private_profile(p_user)
      AND NOT public.is_following(p_user));
$$;

REVOKE ALL ON FUNCTION public.get_profile_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visible_bucket_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visible_bucket_count(uuid) TO authenticated;
