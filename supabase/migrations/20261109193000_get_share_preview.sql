-- 20261109193000_get_share_preview.sql
-- Permite que los rastreadores de enlaces (WhatsApp, Telegram, Facebook, etc.)
-- obtengan los metadatos visuales (título, foto, autor, ubicación) para generar
-- la tarjeta de previsualización sin importar el nivel de visibilidad de la tarea o perfil.

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
        SELECT coalesce(bp.thumb_path, bp.storage_path)
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
      'cover_image', a.cover_image,
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

