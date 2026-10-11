-- 20261011134000_collaborative_albums_permissions.sql
-- Allow owner and accepted collaborators to update album info (title, description, cover, visibility, etc.)
DROP POLICY IF EXISTS "Albums are updatable by owner" ON public.albums;
DROP POLICY IF EXISTS "Albums are updatable by owner or members" ON public.albums;
CREATE POLICY "Albums are updatable by owner or members" ON public.albums
  FOR UPDATE USING (
    auth.uid() = owner_id OR public.is_album_member(id)
  );

-- Allow owner and accepted collaborators to invite others to an album
DROP POLICY IF EXISTS "Album members insertable by album owner" ON public.album_members;
DROP POLICY IF EXISTS "Album members insertable by album owner or members" ON public.album_members;
CREATE POLICY "Album members insertable by album owner or members" ON public.album_members
  FOR INSERT WITH CHECK (
    auth_is_album_owner(album_id) OR public.is_album_member(album_id)
  );

-- Allow owner and accepted collaborators to update items in an album
DROP POLICY IF EXISTS "Album items updatable by bucket owner" ON public.album_items;
DROP POLICY IF EXISTS "Album items updatable by bucket owner or album members" ON public.album_items;
CREATE POLICY "Album items updatable by bucket owner or album members" ON public.album_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.buckets WHERE id = bucket_id AND user_id = auth.uid()) OR
    public.is_album_member(album_id)
  );

-- Enable Realtime for albums and album_members so changes sync immediately
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.albums;
  EXCEPTION WHEN duplicate_object THEN
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_members;
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;

ALTER TABLE public.albums REPLICA IDENTITY FULL;
ALTER TABLE public.album_members REPLICA IDENTITY FULL;
