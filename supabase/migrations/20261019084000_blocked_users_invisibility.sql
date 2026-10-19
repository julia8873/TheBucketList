-- Migration: Enforce complete invisibility and protection for blocked users
-- 1. Update blocked_users policies and indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);

DROP POLICY IF EXISTS "Users can view users they blocked" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can view blocks involving them" ON public.blocked_users;
CREATE POLICY "Users can view blocks involving them"
ON public.blocked_users FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- 2. Helper functions to check block status
CREATE OR REPLACE FUNCTION public.is_blocked_by(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = p_user_id AND blocked_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked_by(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

-- 3. Profiles RLS: A blocked user cannot see the profile of the person who blocked them
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone unless blocked" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone unless blocked" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NULL OR NOT public.is_blocked_by(id)
);

-- 4. Buckets RLS: Do not expose public or follower buckets between blocked parties
DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  (
    (auth.uid() IS NULL OR NOT public.is_blocked_between(user_id, auth.uid()))
    AND (
      visibility = 'public' OR
      (visibility = 'followers' AND public.is_following(user_id))
    )
  )
);

-- 5. Albums RLS: Do not expose public albums between blocked parties
DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
CREATE POLICY "Public albums are viewable by everyone" ON public.albums FOR SELECT USING (
  visibility = 'public' AND (auth.uid() IS NULL OR NOT public.is_blocked_between(owner_id, auth.uid()))
);

-- 6. search_people: Filter out blocked users in both directions
CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text,
  public_count integer,
  follow_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT replace(replace(replace(regexp_replace(trim(p_query), '^@', ''), '\', '\\'), '%', '\%'), '_', '\_') AS term
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.visibility,
    public.visible_bucket_count(p.id) AS public_count,
    COALESCE(f.status, 'none') AS follow_status
  FROM profiles p
  CROSS JOIN q
  LEFT JOIN follows f
    ON f.follower_id = auth.uid() AND f.following_id = p.id
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(q.term) >= 2
    AND (p.username ILIKE '%' || q.term || '%' ESCAPE '\'
         OR p.display_name ILIKE '%' || q.term || '%' ESCAPE '\')
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
    )
  ORDER BY
    (p.username ILIKE q.term || '%' ESCAPE '\' OR p.display_name ILIKE q.term || '%' ESCAPE '\') DESC,
    p.username ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 30);
$$;

GRANT EXECUTE ON FUNCTION public.search_people(text, integer) TO authenticated;
