-- 20261021000000_add_table_grants.sql
-- Explicit GRANT statements for all public schema tables.
-- Required from October 30, 2026: Supabase stops auto-granting Data API access
-- to new tables. This migration ensures db reset / new projects / preview branches
-- work correctly.
-- RLS policies are still the actual security layer — these grants just allow
-- supabase-js / PostgREST / GraphQL to reach the tables.

-- ============================================================
-- INITIAL SCHEMA TABLES (from 20261005000001_initial_schema)
-- ============================================================

-- app_config (public read only via RLS)
GRANT SELECT ON public.app_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO service_role;

-- profiles
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- categories (public read only via RLS)
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;

-- templates (public read only via RLS)
GRANT SELECT ON public.templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO service_role;

-- buckets
GRANT SELECT ON public.buckets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buckets TO service_role;

-- item_subtasks
GRANT SELECT ON public.item_subtasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_subtasks TO service_role;

-- bucket_photos
GRANT SELECT ON public.bucket_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_photos TO service_role;

-- shared_lists / shared_list_members: eliminadas en 20261006000001_albums.sql (DROP TABLE),
-- por eso ya no se les concede nada aquí.

-- follows
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO service_role;

-- feed_events (authenticated only via RLS)
GRANT SELECT ON public.feed_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_events TO service_role;

-- reactions
GRANT SELECT ON public.reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactions TO service_role;

-- comments
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;

-- reports (access controlled via RLS)
GRANT SELECT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO service_role;

-- notification_prefs (authenticated own only via RLS)
GRANT SELECT ON public.notification_prefs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO service_role;

-- notifications (authenticated own only via RLS)
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

-- push_tokens (authenticated own only via RLS)
GRANT SELECT ON public.push_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO service_role;

-- ============================================================
-- ALBUMS (from 20261006000001_albums)
-- ============================================================

GRANT SELECT ON public.albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.albums TO service_role;

GRANT SELECT ON public.album_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_items TO service_role;

GRANT SELECT ON public.album_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_members TO service_role;

-- ============================================================
-- TAGS (from 20261010143500_create_tags_tables)
-- ============================================================

GRANT SELECT ON public.tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO service_role;

GRANT SELECT ON public.item_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_tags TO service_role;

-- ============================================================
-- BUCKET COLLABORATORS (from 20261010200000_bucket_collaborators)
-- ============================================================

GRANT SELECT ON public.bucket_collaborators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_collaborators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_collaborators TO service_role;

-- ============================================================
-- USER FAVORITES (from 20261011153000_create_user_favorites)
-- ============================================================

GRANT SELECT ON public.user_favorites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO service_role;

-- ============================================================
-- BUCKET MENTIONS (from 20261013010000_bucket_mentions)
-- ============================================================

GRANT SELECT ON public.bucket_mentions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_mentions TO service_role;

-- ============================================================
-- DAILY TASKS (from 20261016083000_create_daily_tasks)
-- ============================================================

GRANT SELECT ON public.daily_tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO service_role;

-- ============================================================
-- DAILY TAGS & COMPLETIONS (from 20261016120000_daily_tags_and_completion_stats)
-- ============================================================

GRANT SELECT ON public.daily_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tags TO service_role;

GRANT SELECT ON public.daily_task_completions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_task_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_task_completions TO service_role;

-- ============================================================
-- ENTITY NOTIFICATION SUBSCRIBERS
-- (from 20261016130000_entity_notification_subscribers)
-- Note: already has GRANT ALL via 20261016160000_entity_notification_suscribers_alias
-- included here for completeness on fresh db resets
-- ============================================================

GRANT SELECT ON public.entity_notification_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_notification_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_notification_subscribers TO service_role;

-- ============================================================
-- COMMENT LIKES (from 20261017095000_comment_likes_and_replies)
-- ============================================================

GRANT SELECT ON public.comment_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_likes TO service_role;

-- ============================================================
-- ALBUM TAGS (from 20261018100000_album_tags)
-- ============================================================

GRANT SELECT ON public.album_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_tags TO service_role;

-- ============================================================
-- ALBUM REACTIONS & SAVED ALBUMS
-- (from 20261018170000_album_reactions_and_saved_albums)
-- ============================================================

GRANT SELECT ON public.album_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_reactions TO service_role;

GRANT SELECT ON public.user_saved_albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_albums TO service_role;

-- ============================================================
-- USER SAVED BUCKETS (from 20261018190000_user_saved_buckets)
-- ============================================================

GRANT SELECT ON public.user_saved_buckets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_buckets TO service_role;

-- ============================================================
-- COLLECTIONS (from 20261018200000_admin_roles_and_collections)
-- ============================================================

GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO service_role;

-- ============================================================
-- BLOCKED USERS (from 20261018210000_user_blocks_and_reports)
-- ============================================================

GRANT SELECT ON public.blocked_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO service_role;
