-- Migration: Admin roles and collections management
-- 1. Añadir columna 'role' a profiles si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Asignar rol 'admin' a juliamiralles8873
UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(username)) = 'juliamiralles8873'
   OR lower(trim(email)) ILIKE '%juliamiralles8873%'
   OR lower(trim(email)) ILIKE '%jmiralles8873%';

-- 3. Crear tabla collections para colecciones dinámicas de la app y la comunidad
CREATE TABLE IF NOT EXISTS public.collections (
  id text PRIMARY KEY DEFAULT 'col-' || gen_random_uuid()::text,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general',
  badge text DEFAULT '✨ Colección',
  emoji text DEFAULT '📁',
  gradient_colors jsonb DEFAULT '["#1E1E1E", "#333333"]'::jsonb,
  cover_path text,
  author_name text DEFAULT 'TheBucketList',
  is_official boolean DEFAULT true,
  author_avatar text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  clones_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  source_album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- Lectura pública para cualquier usuario
DROP POLICY IF EXISTS "Colecciones legibles por todos" ON public.collections;
CREATE POLICY "Colecciones legibles por todos" 
ON public.collections FOR SELECT 
USING (true);

-- Escritura reservada para administradores
DROP POLICY IF EXISTS "Admins pueden insertar colecciones" ON public.collections;
CREATE POLICY "Admins pueden insertar colecciones" 
ON public.collections FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins pueden actualizar colecciones" ON public.collections;
CREATE POLICY "Admins pueden actualizar colecciones" 
ON public.collections FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins pueden borrar colecciones" ON public.collections;
CREATE POLICY "Admins pueden borrar colecciones" 
ON public.collections FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. RPC para que un administrador promocione directamente un álbum público a colección
CREATE OR REPLACE FUNCTION public.promote_album_to_collection(
  p_album_id uuid,
  p_category text DEFAULT 'general',
  p_badge text DEFAULT '⭐ Destacada',
  p_emoji text DEFAULT '🌟'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
  v_album record;
  v_owner record;
  v_tasks jsonb;
  v_new_id text;
BEGIN
  -- Comprobar permisos de admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo los administradores pueden promocionar álbumes a colecciones';
  END IF;

  -- Obtener el álbum
  SELECT * INTO v_album FROM public.albums WHERE id = p_album_id;
  IF v_album.id IS NULL THEN
    RAISE EXCEPTION 'El álbum especificado no existe';
  END IF;

  -- Obtener creador del álbum
  SELECT * INTO v_owner FROM public.profiles WHERE id = v_album.user_id;

  -- Obtener tareas del álbum ordenadas
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'title', b.title,
        'description', COALESCE(b.description, ''),
        'priority', COALESCE(b.priority, 'medium')
      ) ORDER BY ai.position ASC, b.created_at ASC
    ),
    '[]'::jsonb
  ) INTO v_tasks
  FROM public.album_items ai
  JOIN public.buckets b ON b.id = ai.bucket_id
  WHERE ai.album_id = p_album_id;

  v_new_id := 'col-album-' || p_album_id::text;

  INSERT INTO public.collections (
    id,
    title,
    description,
    category,
    badge,
    emoji,
    gradient_colors,
    cover_path,
    author_name,
    is_official,
    author_avatar,
    user_id,
    tags,
    tasks,
    source_album_id
  )
  VALUES (
    v_new_id,
    v_album.title,
    COALESCE(v_album.description, 'Colección de la comunidad creada a partir de un álbum compartido.'),
    COALESCE(p_category, 'general'),
    COALESCE(p_badge, '⭐ Destacada'),
    COALESCE(p_emoji, '🌟'),
    '["#1E1E1E", "#333333"]'::jsonb,
    v_album.cover_path,
    COALESCE(v_owner.display_name, v_owner.username, 'Comunidad'),
    false,
    v_owner.avatar_url,
    v_album.user_id,
    ARRAY[]::text[],
    v_tasks,
    p_album_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    tasks = EXCLUDED.tasks,
    cover_path = EXCLUDED.cover_path,
    updated_at = now();

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_album_to_collection(uuid, text, text, text) TO authenticated;
