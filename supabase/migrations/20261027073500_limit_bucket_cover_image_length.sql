-- Migration: limitar longitud de buckets.cover_image para frenar alto egress
--
-- Problema: algunas tareas tenían imágenes pesadas o data URIs en base64 guardadas
-- directamente en `cover_image`, lo que disparaba el consumo de ancho de banda (egress).
--
-- Solución:
-- 1. Añadir restricción CHECK (longitud máxima 2048 caracteres o null) sin validar de inmediato.
-- 2. Limpiar las portadas pesadas (> 2048 caracteres) poniéndolas a NULL.
-- 3. Validar la restricción para garantizar que ninguna fila futura o actual la incumpla.

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
