-- Migration: Add position column to collections table for admin reordering
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS position int DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_collections_position ON public.collections(position ASC);

