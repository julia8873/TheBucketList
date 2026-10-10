-- Drop the unique constraint to allow a bucket to belong to multiple albums
ALTER TABLE album_items DROP CONSTRAINT IF EXISTS album_items_bucket_id_key;
