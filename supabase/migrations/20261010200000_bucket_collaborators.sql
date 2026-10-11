-- 20261010200000_bucket_collaborators.sql

CREATE TABLE public.bucket_collaborators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id uuid REFERENCES public.buckets(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(bucket_id, user_id)
);

-- RLS for bucket_collaborators
ALTER TABLE public.bucket_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators viewable by bucket owner or the user" ON bucket_collaborators FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND b.user_id = auth.uid())
);

CREATE POLICY "Owner can insert collaborators" ON bucket_collaborators FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND b.user_id = auth.uid())
);

CREATE POLICY "User can update their own collaboration status" ON bucket_collaborators FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY "Owner or user can delete collaborator" ON bucket_collaborators FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND b.user_id = auth.uid())
);

-- Update Bucket RLS Policies to allow collaborators to read/write
-- We will replace the existing SELECT and UPDATE policies on buckets.

DROP POLICY IF EXISTS "Buckets are viewable based on visibility" ON public.buckets;
CREATE POLICY "Buckets are viewable based on visibility" ON public.buckets FOR SELECT USING (
  user_id = auth.uid() OR
  visibility = 'public' OR
  (visibility = 'followers' AND public.is_following(user_id)) OR
  EXISTS (SELECT 1 FROM bucket_collaborators WHERE bucket_id = buckets.id AND user_id = auth.uid() AND status IN ('pending', 'accepted'))
);

DROP POLICY IF EXISTS "Users can update own buckets" ON public.buckets;
CREATE POLICY "Users can update own buckets" ON public.buckets FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM bucket_collaborators WHERE bucket_id = buckets.id AND user_id = auth.uid() AND status = 'accepted')
);

-- Update Subtasks RLS
DROP POLICY IF EXISTS "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks;
CREATE POLICY "Subtasks are viewable by those who can view the bucket" ON public.item_subtasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
      b.user_id = auth.uid() OR b.visibility = 'public' OR (b.visibility = 'followers' AND public.is_following(b.user_id)) OR
      EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
    )
  )
);

DROP POLICY IF EXISTS "Users can manage subtasks for own buckets" ON public.item_subtasks;
CREATE POLICY "Users can manage subtasks for own buckets" ON public.item_subtasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.buckets b WHERE b.id = bucket_id AND (
    b.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.bucket_collaborators c WHERE c.bucket_id = b.id AND c.user_id = auth.uid() AND c.status = 'accepted')
  ))
);

-- Update Notifications Trigger for bucket_collaborators
CREATE OR REPLACE FUNCTION public.notify_bucket_collaborator()
RETURNS trigger AS $$
DECLARE
  bucket_title text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT title INTO bucket_title FROM buckets WHERE id = NEW.bucket_id;
    INSERT INTO notifications (recipient_id, actor_id, type, bucket_id, content)
    VALUES (NEW.user_id, auth.uid(), 'collaboration_invite', NEW.bucket_id, 'Te ha invitado a colaborar en la tarea "' || bucket_title || '"');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_bucket_collaborator_added
  AFTER INSERT ON public.bucket_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.notify_bucket_collaborator();
