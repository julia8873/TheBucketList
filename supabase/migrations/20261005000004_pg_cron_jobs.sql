-- 004_pg_cron_jobs.sql
-- Create scheduled tasks via pg_cron (requires pg_cron extension)

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Auto-expire buckets whose deadline has passed
SELECT cron.schedule(
  'expire_buckets',
  '0 0 * * *', -- Run daily at midnight
  $$
    UPDATE buckets
    SET status = 'expired'
    WHERE deadline < CURRENT_DATE
      AND status NOT IN ('completed', 'archived', 'expired');
  $$
);

-- Job 2: Create deadline reminders 3 days before
SELECT cron.schedule(
  'deadline_reminders',
  '0 6 * * *', -- Run daily at 6 AM
  $$
    INSERT INTO notifications (recipient_id, type, bucket_id)
    SELECT user_id, 'deadline_reminder', id
    FROM buckets
    WHERE deadline = CURRENT_DATE + INTERVAL '3 days'
      AND status IN ('pending', 'in_progress')
      AND EXISTS (
        SELECT 1 FROM notification_prefs np 
        WHERE np.user_id = buckets.user_id 
          AND np.deadline_push = true
      );
  $$
);
