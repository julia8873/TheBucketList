-- Language-neutral default badge for collections.
-- The app shows a translated fallback ("✨ Collection" / "✨ Colección"...) when the badge is empty,
-- so the database no longer needs a default text in a specific language.
ALTER TABLE public.collections ALTER COLUMN badge SET DEFAULT '';

UPDATE public.collections SET badge = '' WHERE badge = '✨ Colección';
