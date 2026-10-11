-- 20261011131000_enable_realtime_for_buckets.sql
-- Add buckets and collaboration tables to supabase_realtime publication

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.buckets; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_collaborators; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.item_subtasks; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_photos; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions; EXCEPTION WHEN duplicate_object THEN END;
END $$;

ALTER TABLE public.buckets REPLICA IDENTITY FULL;
ALTER TABLE public.bucket_collaborators REPLICA IDENTITY FULL;
ALTER TABLE public.item_subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.bucket_photos REPLICA IDENTITY FULL;
