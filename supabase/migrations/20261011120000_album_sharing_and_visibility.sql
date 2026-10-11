-- 20261011120000_album_sharing_and_visibility.sql
-- 1. Notifications support for album invites
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE;

-- 2. Trigger on album_members for invitation notifications
CREATE OR REPLACE FUNCTION public.notify_album_member()
RETURNS trigger AS $$
DECLARE
  v_album_title text;
  v_album_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT title, owner_id INTO v_album_title, v_album_owner FROM public.albums WHERE id = NEW.album_id;
    IF v_album_owner IS NOT NULL AND NEW.user_id != v_album_owner THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, album_id, content)
      VALUES (
        NEW.user_id,
        v_album_owner,
        'album_invite',
        NEW.album_id,
        'Te han invitado a colaborar en el álbum "' || COALESCE(v_album_title, 'un álbum') || '"'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_album_member_added ON public.album_members;
CREATE TRIGGER on_album_member_added
  AFTER INSERT ON public.album_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_album_member();

-- 3. Security definer helper to check if current user is an accepted member of an album
CREATE OR REPLACE FUNCTION public.is_album_member(p_album_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_members
    WHERE album_id = p_album_id AND user_id = auth.uid() AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Security definer helper to check if a bucket belongs to a shared album where current user is member
CREATE OR REPLACE FUNCTION public.is_bucket_in_member_album(p_bucket_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_items ai
    JOIN public.album_members am ON ai.album_id = am.album_id
    WHERE ai.bucket_id = p_bucket_id AND am.user_id = auth.uid() AND am.status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Album RLS for Followers & Members
DROP POLICY IF EXISTS "Follower albums are viewable by followers" ON public.albums;
CREATE POLICY "Follower albums are viewable by followers" ON public.albums FOR SELECT USING (
  visibility = 'followers' AND public.is_following(owner_id)
);

DROP POLICY IF EXISTS "Shared albums are viewable by members" ON public.albums;
CREATE POLICY "Shared albums are viewable by members" ON public.albums FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.album_members WHERE album_id = albums.id AND user_id = auth.uid())
);

-- Album members can see other accepted members of the same album
DROP POLICY IF EXISTS "Album members readable by album owner or members" ON public.album_members;
CREATE POLICY "Album members readable by album owner or members" ON public.album_members FOR SELECT USING (
  auth_is_album_owner(album_id) OR
  user_id = auth.uid() OR
  status = 'accepted'
);

-- 6. Buckets & Subtasks RLS: tasks in shared albums are viewable by the album's accepted collaborators
DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  visibility = 'public' OR
  (visibility = 'followers' AND public.is_following(user_id)) OR
  EXISTS (SELECT 1 FROM public.bucket_collaborators WHERE bucket_id = buckets.id AND user_id = auth.uid() AND status IN ('pending', 'accepted')) OR
  public.is_bucket_in_member_album(id)
);

DROP POLICY IF EXISTS "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks;
CREATE POLICY "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND public.is_following(b.user_id)) OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
      public.is_bucket_in_member_album(b.id)
    )
  )
);

DROP POLICY IF EXISTS "Users can manage subtasks for own buckets" ON public.item_subtasks;
CREATE POLICY "Users can manage subtasks for own buckets" ON public.item_subtasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
    b.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted') OR
    public.is_bucket_in_member_album(b.id)
  ))
);
