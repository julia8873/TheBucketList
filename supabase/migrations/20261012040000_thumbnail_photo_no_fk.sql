-- 20261012040000_thumbnail_photo_no_fk.sql
-- La FK buckets.thumbnail_photo_id -> bucket_photos creaba una segunda relación entre ambas
-- tablas y PostgREST fallaba (PGRST201, relación ambigua) en cada select con bucket_photos(...).
-- Se elimina la FK y se mantiene el "ON DELETE SET NULL" con un trigger.

ALTER TABLE buckets DROP CONSTRAINT IF EXISTS buckets_thumbnail_photo_id_fkey;

CREATE OR REPLACE FUNCTION public.reset_thumbnail_on_photo_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE buckets
     SET thumbnail_photo_id = NULL,
         thumbnail_mode = 'auto'
   WHERE thumbnail_photo_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_thumbnail_on_photo_delete ON bucket_photos;
CREATE TRIGGER trg_reset_thumbnail_on_photo_delete
  AFTER DELETE ON bucket_photos
  FOR EACH ROW EXECUTE FUNCTION public.reset_thumbnail_on_photo_delete();

NOTIFY pgrst, 'reload schema';
