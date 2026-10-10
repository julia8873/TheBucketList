ALTER TABLE public.buckets ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
