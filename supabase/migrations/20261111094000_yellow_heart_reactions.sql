-- 20261111094000_yellow_heart_reactions.sql
-- Actualizar constraint de reactions para permitir el corazón amarillo 💛 y migrar los corazones existentes a 💛

ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_emoji_check;
ALTER TABLE public.reactions ADD CONSTRAINT reactions_emoji_check
  CHECK (emoji = ANY (ARRAY['🔥'::text, '💛'::text, '❤️'::text, '👏'::text, '🎉'::text, '✈️'::text, '🌟'::text]));

UPDATE public.reactions SET emoji = '💛' WHERE emoji = '❤️';
UPDATE public.album_reactions SET emoji = '💛' WHERE emoji = '❤️';

