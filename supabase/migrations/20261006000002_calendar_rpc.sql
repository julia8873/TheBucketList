-- 1. Calendar RPC
CREATE OR REPLACE FUNCTION calendar_month(p_user_id uuid, p_year int, p_month int, p_tz text DEFAULT 'UTC')
RETURNS jsonb AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_result jsonb;
BEGIN
  -- First and last day of the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := v_start_date + interval '1 month' - interval '1 day';

  WITH days AS (
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS d
  ),
  month_buckets AS (
    SELECT 
      (deadline AT TIME ZONE p_tz)::date as task_date,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'status', status,
          'visibility', visibility,
          'urgency', CASE 
            WHEN status = 'completed' THEN 'none'
            WHEN deadline < now() THEN 'expired'
            WHEN (deadline AT TIME ZONE p_tz)::date = (now() AT TIME ZONE p_tz)::date THEN 'today'
            ELSE 'normal'
          END
        ) ORDER BY created_at
      ) as tasks
    FROM buckets
    WHERE user_id = p_user_id
      AND deadline IS NOT NULL
      AND (deadline AT TIME ZONE p_tz)::date >= v_start_date
      AND (deadline AT TIME ZONE p_tz)::date <= v_end_date
    GROUP BY (deadline AT TIME ZONE p_tz)::date
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', d.d,
      'tasks', COALESCE(mb.tasks, '[]'::jsonb)
    ) ORDER BY d.d
  ) INTO v_result
  FROM days d
  LEFT JOIN month_buckets mb ON d.d = mb.task_date;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
