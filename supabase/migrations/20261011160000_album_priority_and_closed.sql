-- Migration: Add priority, is_closed, and closed_at to albums table
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz DEFAULT null;
