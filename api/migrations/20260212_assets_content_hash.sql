-- Add content_hash column to assets table for content-addressed deduplication
ALTER TABLE assets ADD COLUMN content_hash TEXT;

-- Create unique index on content_hash (partial index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_content_hash ON assets(content_hash) WHERE content_hash IS NOT NULL;
