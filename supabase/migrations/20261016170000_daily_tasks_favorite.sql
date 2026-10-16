-- Migration: Add is_favorite to daily_tasks and daily_task_completions
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

ALTER TABLE public.daily_task_completions
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_favorite ON public.daily_tasks(user_id, is_favorite);
