-- Ajustes de perfil: visibilidad por defecto de las tareas nuevas.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_task_visibility text NOT NULL DEFAULT 'public'
  CHECK (default_task_visibility IN ('public', 'followers', 'private'));
