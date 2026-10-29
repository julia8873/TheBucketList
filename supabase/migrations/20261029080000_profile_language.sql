-- 20261029080000_profile_language.sql
--
-- Guarda el idioma elegido en la app ('es' | 'en') para que el servidor (Edge Function
-- `push-notifications`) envíe las notificaciones push en el idioma de cada usuario.
-- La app lo actualiza al cambiar de idioma y al registrar el token push.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_check CHECK (language IN ('es', 'en'));

NOTIFY pgrst, 'reload schema';
