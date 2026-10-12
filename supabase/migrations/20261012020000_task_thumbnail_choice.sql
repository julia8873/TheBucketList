-- 20261012020000_task_thumbnail_choice.sql
-- Imagen que representa a una tarea en listas, feed y explorar.
--
--   thumbnail_mode = 'auto'  → la foto subida más reciente; si no hay, la portada; si no, degradado.
--   thumbnail_mode = 'cover' → siempre la portada (cover_image).
--   thumbnail_mode = 'photo' → la foto indicada en thumbnail_photo_id.
--
-- Si se borra la foto elegida, thumbnail_photo_id pasa a NULL y la app vuelve a la regla automática.
-- Las políticas RLS de UPDATE sobre buckets ya cubren estas columnas (dueño y colaboradores).
-- Solo añade columnas: no modifica datos. Las tareas existentes quedan en 'auto'.

ALTER TABLE buckets
  ADD COLUMN IF NOT EXISTS thumbnail_mode text NOT NULL DEFAULT 'auto'
    CHECK (thumbnail_mode IN ('auto', 'cover', 'photo')),
  ADD COLUMN IF NOT EXISTS thumbnail_photo_id uuid
    REFERENCES bucket_photos(id) ON DELETE SET NULL;
