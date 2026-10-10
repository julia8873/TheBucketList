-- Añadir la columna emoji a la tabla tags
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS emoji text;

-- Crear índices
CREATE INDEX IF NOT EXISTS item_tags_tag_id_idx ON public.item_tags (tag_id);
CREATE INDEX IF NOT EXISTS item_tags_item_id_idx ON public.item_tags (item_id);

-- Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';