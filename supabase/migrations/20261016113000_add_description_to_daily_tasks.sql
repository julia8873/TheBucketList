-- Migration: Add description column to daily_tasks table
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS description text;
