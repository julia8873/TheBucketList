-- Migration: Add due_date and tag_ids to daily_tasks table
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS due_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS tag_ids text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_daily_tasks_due_date ON public.daily_tasks(user_id, due_date);
