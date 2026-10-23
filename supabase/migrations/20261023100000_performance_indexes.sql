-- ============================================================
-- Performance indexes
-- 20261023100000_performance_indexes.sql
--
-- Proposito: reducir el tiempo de respuesta de las queries
-- mas frecuentes de la app (carga de lista, albumes, feed...).
-- ============================================================

-- --- buckets ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_buckets_user_id
  ON public.buckets (user_id);

CREATE INDEX IF NOT EXISTS idx_buckets_status
  ON public.buckets (status);

CREATE INDEX IF NOT EXISTS idx_buckets_visibility
  ON public.buckets (visibility);

CREATE INDEX IF NOT EXISTS idx_buckets_created_at
  ON public.buckets (created_at DESC);

-- --- bucket_collaborators ------------------------------------
CREATE INDEX IF NOT EXISTS idx_bucket_collaborators_user_status
  ON public.bucket_collaborators (user_id, status);

-- --- bucket_photos -------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bucket_photos_bucket_id
  ON public.bucket_photos (bucket_id);

CREATE INDEX IF NOT EXISTS idx_bucket_photos_bucket_created
  ON public.bucket_photos (bucket_id, created_at DESC);

-- --- album_items --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_album_items_album_id
  ON public.album_items (album_id);

CREATE INDEX IF NOT EXISTS idx_album_items_bucket_id
  ON public.album_items (bucket_id);

-- --- album_members ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_album_members_user_status
  ON public.album_members (user_id, status);

-- --- albums -------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_albums_owner_id
  ON public.albums (owner_id);

-- --- follows ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_follows_follower_status
  ON public.follows (follower_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON public.follows (following_id);

-- --- item_tags ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id
  ON public.item_tags (item_id);

-- --- reactions ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reactions_bucket_id
  ON public.reactions (bucket_id);

-- --- notifications ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
  ON public.notifications (recipient_id);
