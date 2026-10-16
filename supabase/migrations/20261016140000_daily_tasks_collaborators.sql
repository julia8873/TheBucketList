-- Migration: Add collaborator_ids to daily_tasks and daily_task_completions
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS collaborator_ids text[] DEFAULT '{}'::text[];

ALTER TABLE public.daily_task_completions
ADD COLUMN IF NOT EXISTS collaborator_ids text[] DEFAULT '{}'::text[];

-- Allow mentioned collaborators to view the daily tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_tasks' AND policyname = 'Collaborators can view daily tasks'
  ) THEN
    CREATE POLICY "Collaborators can view daily tasks"
      ON public.daily_tasks FOR SELECT
      USING (auth.uid()::text = ANY(collaborator_ids));
  END IF;
END $$;
