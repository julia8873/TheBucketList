-- Migration: Add recurrence columns to daily_tasks and daily_task_completions
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_unit TEXT DEFAULT 'days';

ALTER TABLE public.daily_task_completions
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_unit TEXT DEFAULT 'days';
