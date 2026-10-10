-- Emoji opcional para cada etiqueta (el color ya existe en `color`).
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS emoji text;

-- Índices para contar tareas por etiqueta y filtrar por etiqueta.
CREATE INDEX IF NOT EXISTS item_tags_tag_id_idx ON public.item_tags (tag_id);
CREATE INDEX IF NOT EXISTS item_tags_item_id_idx ON public.item_tags (item_id);
