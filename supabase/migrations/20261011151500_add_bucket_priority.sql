-- Migration: Add priority column to buckets
ALTER TABLE buckets ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
CREATE INDEX IF NOT EXISTS idx_buckets_priority ON buckets(priority);

-- Update existing buckets without priority to 'medium'
UPDATE buckets SET priority = 'medium' WHERE priority IS NULL;
