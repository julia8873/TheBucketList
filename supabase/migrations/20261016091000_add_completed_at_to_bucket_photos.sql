-- Migration: Add completed_at column to bucket_photos to track when a photo was completed
ALTER TABLE public.bucket_photos
ADD COLUMN IF NOT EXISTS completed_at timestamptz;
