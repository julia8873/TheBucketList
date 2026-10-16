-- Migration: Create daily_tags and daily_task_completions tables for isolated daily task tags and statistics

-- 1. Daily Tags Table (independent from long-term task tags)
CREATE TABLE IF NOT EXISTS public.daily_tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    color text NOT NULL DEFAULT '#D4B13A',
    emoji text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_tags_user_id_lower_name_idx ON public.daily_tags (user_id, lower(name));

ALTER TABLE public.daily_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily tags" ON public.daily_tags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily tags" ON public.daily_tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily tags" ON public.daily_tags
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily tags" ON public.daily_tags
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Daily Task Completions Table (stores completed daily tasks for stats after task is deleted from daily_tasks)
CREATE TABLE IF NOT EXISTS public.daily_task_completions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_title text NOT NULL,
    completed_at timestamptz DEFAULT now() NOT NULL,
    completed_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    tag_ids text[] DEFAULT '{}'::text[]
);

ALTER TABLE public.daily_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions" ON public.daily_task_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions" ON public.daily_task_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions" ON public.daily_task_completions
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_completions_user_date ON public.daily_task_completions(user_id, completed_date);
