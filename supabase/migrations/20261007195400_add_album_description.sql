-- Migration to add description to albums if not exists
ALTER TABLE albums ADD COLUMN IF NOT EXISTS description text;
