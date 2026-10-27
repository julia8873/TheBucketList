-- Evita guardar imágenes en base64 (o cualquier valor enorme) en buckets.cover_image.
-- Cada fila se descarga entera en el feed y en Explorar: portadas de 200 KB–1 MB generaban
-- cientos de MB de egress al día. `cover_image` solo debe contener una ruta o URL (< 2 KB).
--
-- 1. Añade la restricción como NOT VALID para no bloquear inmediatamente.
-- 2. Limpia las portadas existentes que excedan 2 KB poniéndolas a NULL.
-- 3. Valida la restricción para dejarla activa y verificada.

ALTER TABLE public.buckets
  DROP CONSTRAINT IF EXISTS buckets_cover_image_max_len;

ALTER TABLE public.buckets
  ADD CONSTRAINT buckets_cover_image_max_len
  CHECK (cover_image IS NULL OR length(cover_image) <= 2048) NOT VALID;

-- Vaciar las portadas pesadas (base64 data URIs) para detener el gasto excesivo de egress:
UPDATE public.buckets
SET cover_image = NULL
WHERE length(cover_image) > 2048;

-- Validar la restricción en la tabla limpia:
ALTER TABLE public.buckets VALIDATE CONSTRAINT buckets_cover_image_max_len;
