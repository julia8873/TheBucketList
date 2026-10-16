-- Migration: Add subtasks column to daily_tasks and daily_task_completions
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.daily_task_completions
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
