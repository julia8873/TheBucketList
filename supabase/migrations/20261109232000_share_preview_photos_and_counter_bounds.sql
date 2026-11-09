-- 20261109232000_share_preview_photos_and_counter_bounds.sql
-- 1. Asegurar que counter_count y counter_target no puedan ser negativos ni exceder el rango de entero de 32 bits
ALTER TABLE public.buckets
  DROP CONSTRAINT IF EXISTS check_counter_count_non_negative,
  ADD CONSTRAINT check_counter_count_non_negative CHECK (counter_count >= 0 AND counter_count <= 2147483647),
  DROP CONSTRAINT IF EXISTS check_counter_target_positive,
  ADD CONSTRAINT check_counter_target_positive CHECK (counter_target IS NULL OR (counter_target >= 0 AND counter_target <= 2147483647));

-- 2. get_share_preview: devolver storage_path (JPEG real) para que WhatsApp / Meta puedan renderizar el preview
CREATE OR REPLACE FUNCTION public.get_share_preview(p_type text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_type = 'bucket' THEN
    SELECT jsonb_build_object(
      'title', b.title,
      'description', coalesce(b.description, ''),
      'location', coalesce(b.location_text, ''),
      'cover_image', b.cover_image,
      'photo_path', (
        SELECT coalesce(bp.storage_path, bp.thumb_path)
        FROM public.bucket_photos bp
        WHERE bp.bucket_id = b.id
        ORDER BY (bp.id = b.thumbnail_photo_id) DESC, bp.created_at DESC
        LIMIT 1
      ),
      'creator_username', p.username,
      'creator_name', p.display_name
    ) INTO result
    FROM public.buckets b
    LEFT JOIN public.profiles p ON p.id = b.user_id
    WHERE b.id = p_id;

  ELSIF p_type = 'album' THEN
    SELECT jsonb_build_object(
      'title', a.title,
      'description', coalesce(a.description, ''),
      'cover_image', coalesce(
        a.cover_image,
        (
          SELECT bp.storage_path
          FROM public.album_items ai
          JOIN public.bucket_photos bp ON bp.bucket_id = ai.bucket_id
          WHERE ai.album_id = a.id
          ORDER BY bp.created_at DESC
          LIMIT 1
        )
      ),
      'creator_username', p.username,
      'creator_name', p.display_name
    ) INTO result
    FROM public.albums a
    LEFT JOIN public.profiles p ON p.id = a.owner_id
    WHERE a.id = p_id;

  ELSIF p_type = 'profile' THEN
    SELECT jsonb_build_object(
      'title', coalesce(p.display_name, p.username, 'Usuario'),
      'description', coalesce(p.bio, ''),
      'username', p.username,
      'avatar_url', p.avatar_url
    ) INTO result
    FROM public.profiles p
    WHERE p.id = p_id;
  END IF;

  RETURN coalesce(result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_preview(text, uuid) TO anon, authenticated, service_role;
