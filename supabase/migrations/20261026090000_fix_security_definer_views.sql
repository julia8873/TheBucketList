-- Migration: Fix Supabase Security Advisor Critical warnings on Views
-- Problem: Views created without security_invoker run with the permissions of the view owner (postgres/superuser),
-- effectively acting as SECURITY DEFINER and bypassing Row Level Security (RLS) on underlying tables.
-- Solution: Set security_invoker = true so PostgreSQL enforces the querying user's RLS policies.

-- 1. Fix album_progress view to enforce RLS on albums, album_items, and buckets
ALTER VIEW public.album_progress SET (security_invoker = true);

-- 2. Fix entity_notification_suscribers alias view to enforce RLS on entity_notification_subscribers
ALTER VIEW public.entity_notification_suscribers SET (security_invoker = true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
