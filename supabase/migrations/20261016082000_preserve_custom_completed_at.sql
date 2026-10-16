-- Migration: Allow past completion dates and preserve custom completed_at
-- When completed_at is set, ensure task is marked completed and custom date is not overwritten by now()

CREATE OR REPLACE FUNCTION public.handle_bucket_before()
RETURNS trigger AS $$
BEGIN
  -- If completed_at is set to a non-null date, ensure status is completed
  IF NEW.completed_at IS NOT NULL AND (NEW.status IS NULL OR NEW.status = 'pending') THEN
    NEW.status := 'completed';
  END IF;

  -- If status is completed and no completed_at was provided, default to now()
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  -- If status is changed back to pending and completed_at wasn't explicitly changed, clear it
  IF NEW.status = 'pending' AND (OLD.status = 'completed' AND NEW.completed_at = OLD.completed_at) THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
