-- 20261011140000_album_collaborators_viewable.sql
-- Allow members of an album to view all collaborators in that album

DROP POLICY IF EXISTS "Album members readable by album owner or members" ON public.album_members;

CREATE POLICY "Album members readable by album owner or members" ON public.album_members FOR SELECT USING (
  auth_is_album_owner(album_id) OR
  user_id = auth.uid() OR
  public.is_album_member(album_id) OR
  status = 'accepted'
);
