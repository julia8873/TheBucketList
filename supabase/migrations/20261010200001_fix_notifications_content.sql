-- Fix: add missing content column to notifications and fix the collaborator trigger

-- 1. Add content column if not exists
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content text;

-- 2. Fix the trigger: use NEW.user_id as actor (who created the collaborator row = the bucket owner)
-- In a trigger, auth.uid() is not available when called from the DB server context.
-- We need to get the bucket owner from the buckets table instead.
CREATE OR REPLACE FUNCTION public.notify_bucket_collaborator()
RETURNS trigger AS $$
DECLARE
  bucket_title text;
  bucket_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT title, user_id INTO bucket_title, bucket_owner FROM public.buckets WHERE id = NEW.bucket_id;
    INSERT INTO public.notifications (recipient_id, actor_id, type, bucket_id, content)
    VALUES (
      NEW.user_id,
      bucket_owner,
      'collaboration_invite',
      NEW.bucket_id,
      'Te han invitado a colaborar en "' || COALESCE(bucket_title, 'una tarea') || '"'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
