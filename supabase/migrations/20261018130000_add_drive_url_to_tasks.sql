-- Migration: Add drive_url to buckets and daily_tasks
ALTER TABLE public.buckets 
ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.daily_tasks 
ADD COLUMN IF NOT EXISTS drive_url text;

-- Add index on drive_url if needed for lookups
CREATE INDEX IF NOT EXISTS idx_buckets_drive_url ON public.buckets(drive_url) WHERE drive_url IS NOT NULL;
