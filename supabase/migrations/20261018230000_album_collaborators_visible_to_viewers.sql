-- 20261018230000_album_collaborators_visible_to_viewers.sql
-- Allow anyone who can view an album to view all collaborators in that album (both accepted and pending)

CREATE OR REPLACE FUNCTION public.can_view_album(p_album_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.albums a
    WHERE a.id = p_album_id AND (
      a.owner_id = auth.uid() OR
      a.visibility = 'public' OR
      (a.visibility = 'followers' AND public.is_following(a.owner_id)) OR
      EXISTS (SELECT 1 FROM public.album_members am WHERE am.album_id = a.id AND am.user_id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Album members readable by album owner or members" ON public.album_members;
DROP POLICY IF EXISTS "Album members readable by album viewers" ON public.album_members;

CREATE POLICY "Album members readable by album viewers" ON public.album_members FOR SELECT USING (
  auth_is_album_owner(album_id) OR
  user_id = auth.uid() OR
  public.can_view_album(album_id) OR
  status = 'accepted'
);
