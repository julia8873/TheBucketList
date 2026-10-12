-- 20261013000000_bucket_photos_position.sql
-- Orden manual de las fotos de una tarea (se arrastran igual que las tareas de un álbum).
-- Las fotos existentes se numeran por fecha de subida (la más antigua primero);
-- las nuevas se añaden al final desde la app (max(position) + 1).

ALTER TABLE public.bucket_photos
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY bucket_id ORDER BY created_at ASC, id ASC) - 1) AS rn
  FROM public.bucket_photos
)
UPDATE public.bucket_photos p
SET position = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_bucket_photos_position ON public.bucket_photos(bucket_id, position);
