-- Fix foreign key constraint on buckets.copied_from_id so deleting an original bucket
-- sets copied_from_id to NULL on any copied buckets, instead of blocking deletion.

ALTER TABLE buckets
  DROP CONSTRAINT IF EXISTS buckets_copied_from_id_fkey;

ALTER TABLE buckets
  ADD CONSTRAINT buckets_copied_from_id_fkey
  FOREIGN KEY (copied_from_id)
  REFERENCES buckets(id)
  ON DELETE SET NULL;

-- Ensure albums also has ON DELETE SET NULL on albums_copied_from_id_fkey
ALTER TABLE albums
  DROP CONSTRAINT IF EXISTS albums_copied_from_id_fkey;

ALTER TABLE albums
  ADD CONSTRAINT albums_copied_from_id_fkey
  FOREIGN KEY (copied_from_id)
  REFERENCES albums(id)
  ON DELETE SET NULL;

