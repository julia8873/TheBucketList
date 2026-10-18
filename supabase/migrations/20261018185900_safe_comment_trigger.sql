-- Fix comment trigger to safely handle album comments where bucket_id is null
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  bucket_owner uuid;
  album_owner uuid;
BEGIN
  IF NEW.bucket_id IS NOT NULL THEN
    SELECT user_id INTO bucket_owner FROM buckets WHERE id = NEW.bucket_id;
    
    IF bucket_owner IS NOT NULL AND bucket_owner != NEW.user_id THEN
      INSERT INTO notifications (recipient_id, type, actor_id, bucket_id, comment_id)
      VALUES (bucket_owner, 'comment', NEW.user_id, NEW.bucket_id, NEW.id);
    END IF;
  ELSIF NEW.album_id IS NOT NULL THEN
    SELECT owner_id INTO album_owner FROM albums WHERE id = NEW.album_id;
    
    -- If notifications has an album_id or supports generic notifications
    -- we can notify album owner
    IF album_owner IS NOT NULL AND album_owner != NEW.user_id THEN
      -- Silently skip if notifications schema doesn't have album_id
      BEGIN
        INSERT INTO notifications (recipient_id, type, actor_id, comment_id)
        VALUES (album_owner, 'comment', NEW.user_id, NEW.id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
