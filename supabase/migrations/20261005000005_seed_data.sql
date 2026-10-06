-- 005_seed_data.sql
-- Initial configuration and categorization data

INSERT INTO app_config (key, value, note) VALUES
  ('storage_quota_bytes', '52428800', '50 MB per user'),
  ('photo_max_bytes', '204800', '200 KB per photo'),
  ('thumb_max_bytes', '40960', '40 KB per thumbnail'),
  ('total_storage_alert_ratio', '0.70', 'Alert admins at 70% of 1 GB limit')
ON CONFLICT (key) DO NOTHING;

INSERT INTO categories (slug, name_es, name_en, icon, color) VALUES
  ('travel', 'Viajes', 'Travel', 'MapPin', '#3b82f6'),
  ('food', 'Gastronomía', 'Food', 'Coffee', '#f59e0b'),
  ('sport', 'Deportes', 'Sport', 'Activity', '#10b981'),
  ('creative', 'Creatividad', 'Creative', 'Palette', '#8b5cf6'),
  ('social', 'Social', 'Social', 'Users', '#ec4899'),
  ('other', 'Otros', 'Other', 'Star', '#6b7280')
ON CONFLICT (slug) DO NOTHING;
