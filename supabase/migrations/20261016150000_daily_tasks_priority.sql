-- Migration: Add priority to daily_tasks and daily_task_completions
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.daily_task_completions
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
