-- 20261007000001_bucket_cover.sql
-- Portada única por tarea.
--
-- cover_image admite dos formatos:
--   · 'preset:<clave>'            → portada por defecto (restaurante, coches, degradados...)
--   · '<usuario>/<tarea>/<ts>.jpg' → foto propia subida al bucket de storage 'photos'
--   · NULL                        → portada automática según categoría / título
--
-- Las políticas RLS de UPDATE sobre buckets ya cubren esta columna (solo el dueño).

ALTER TABLE buckets
  ADD COLUMN IF NOT EXISTS cover_image text;