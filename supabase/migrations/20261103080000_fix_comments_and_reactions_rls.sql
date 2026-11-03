-- 20261103080000_fix_comments_and_reactions_rls.sql
-- Fix comments and reactions RLS policies:
--  1. Create public.can_view_bucket(uuid) SECURITY DEFINER to evaluate task visibility
--     consistently across RLS policies without recursion or restrictive policy interference.
--     Handles owner, admins, collaborators, shared/member albums, followers, public tasks, and blocking.
--  2. Update comments policies (SELECT, INSERT, DELETE) to allow any user who can view
--     a bucket (including collaborators and shared album members) to comment on it.
--  3. Update reactions policies (SELECT, INSERT) similarly so collaborators can react.

-- ── 1. Helper function: can_view_bucket ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_view_bucket(p_bucket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_bucket public.buckets%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF p_bucket_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_bucket FROM public.buckets WHERE id = p_bucket_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 1. Owner can always view
  IF v_uid IS NOT NULL AND v_bucket.user_id = v_uid THEN
    RETURN true;
  END IF;

  -- 2. Admin can always view
  IF v_uid IS NOT NULL AND public.is_admin(v_uid) THEN
    RETURN true;
  END IF;

  -- 3. If owner is suspended or there is mutual block, cannot view
  IF public.is_suspended(v_bucket.user_id) THEN
    RETURN false;
  END IF;

  IF v_uid IS NOT NULL AND public.is_blocked_between(v_bucket.user_id, v_uid) THEN
    RETURN false;
  END IF;

  -- 4. Direct collaborators (accepted or pending)
  IF v_uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bucket_collaborators bc
    WHERE bc.bucket_id = p_bucket_id
      AND bc.user_id = v_uid
      AND bc.status IN ('pending', 'accepted')
  ) THEN
    RETURN true;
  END IF;

  -- 5. Bucket in member album or viewable album
  IF v_uid IS NOT NULL AND public.is_bucket_in_member_album(p_bucket_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.album_items ai
    WHERE ai.bucket_id = p_bucket_id
      AND public.can_view_album(ai.album_id)
  ) THEN
    RETURN true;
  END IF;

  -- 6. If account is private, only followers can view
  IF public.is_private_profile(v_bucket.user_id) THEN
    RETURN v_uid IS NOT NULL AND public.is_following(v_bucket.user_id);
  END IF;

  -- 7. Public profile account: check task visibility
  IF v_bucket.visibility = 'public' THEN
    RETURN true;
  END IF;

  IF v_bucket.visibility = 'followers' THEN
    RETURN v_uid IS NOT NULL AND public.is_following(v_bucket.user_id);
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_bucket(uuid) TO authenticated, anon;

-- ── 2. Policies on comments ──────────────────────────────────────────────────

-- SELECT: allow viewing comments if user can view the bucket OR if comment belongs to an album
DROP POLICY IF EXISTS "Comments viewable by those who can view the bucket" ON public.comments;
CREATE POLICY "Comments viewable by those who can view the bucket" ON public.comments
  FOR SELECT USING (
    (bucket_id IS NOT NULL AND public.can_view_bucket(bucket_id))
    OR (album_id IS NOT NULL)
  );

-- INSERT: allow commenting on buckets if user can view the bucket
DROP POLICY IF EXISTS "Users can comment on visible buckets" ON public.comments;
CREATE POLICY "Users can comment on visible buckets" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND bucket_id IS NOT NULL
    AND public.can_view_bucket(bucket_id)
  );

-- DELETE: bucket owners and admins can delete comments on their buckets
DROP POLICY IF EXISTS "Bucket owners can delete comments on their buckets" ON public.comments;
CREATE POLICY "Bucket owners can delete comments on their buckets" ON public.comments
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      (bucket_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.buckets b WHERE b.id = comments.bucket_id AND b.user_id = auth.uid()
      ))
      OR public.is_admin(auth.uid())
    )
  );

-- ── 3. Policies on reactions ─────────────────────────────────────────────────

-- SELECT: allow viewing reactions if user can view the bucket
DROP POLICY IF EXISTS "Reactions viewable by those who can view the bucket" ON public.reactions;
CREATE POLICY "Reactions viewable by those who can view the bucket" ON public.reactions
  FOR SELECT USING (
    bucket_id IS NOT NULL AND public.can_view_bucket(bucket_id)
  );

-- INSERT: allow reacting if user can view the bucket
DROP POLICY IF EXISTS "Users can react to visible buckets" ON public.reactions;
CREATE POLICY "Users can react to visible buckets" ON public.reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND bucket_id IS NOT NULL
    AND public.can_view_bucket(bucket_id)
  );

