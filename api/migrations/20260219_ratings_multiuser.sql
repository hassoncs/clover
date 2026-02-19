-- Multi-user rating support for party_content_reviews
-- Changes:
--   1. Drop FK constraint on reviewer_user_id (allows bot: prefix IDs like "bot:gemini-2.0-flash")
--   2. Make quality_score and humor_score nullable (independent per-dimension rating)
--   3. Add reviewer_type column ('human' | 'bot')
--   4. Add model column (which LLM model for bot reviewers)
--
-- SQLite doesn't support ALTER COLUMN, so we recreate the table.

-- Step 1: Create new table without FK, nullable scores, new columns
CREATE TABLE IF NOT EXISTS party_content_reviews_new (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES party_content(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL,
  reviewer_type TEXT NOT NULL DEFAULT 'human' CHECK (reviewer_type IN ('human', 'bot')),
  model TEXT,
  quality_score INTEGER CHECK (quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 5)),
  humor_score INTEGER CHECK (humor_score IS NULL OR (humor_score >= 1 AND humor_score <= 5)),
  notes TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(content_id, reviewer_user_id)
);

-- Step 2: Copy existing data (existing scores map directly, reviewer_type defaults to 'human')
INSERT OR IGNORE INTO party_content_reviews_new
  (id, content_id, reviewer_user_id, reviewer_type, model, quality_score, humor_score, notes, created_at)
SELECT
  id, content_id, reviewer_user_id, 'human', NULL, quality_score, humor_score, notes, created_at
FROM party_content_reviews;

-- Step 3: Drop old table
DROP TABLE IF EXISTS party_content_reviews;

-- Step 4: Rename new table
ALTER TABLE party_content_reviews_new RENAME TO party_content_reviews;

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_party_content_reviews_unique ON party_content_reviews(content_id, reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_party_content_reviews_content ON party_content_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_party_content_reviews_reviewer ON party_content_reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_party_content_reviews_type ON party_content_reviews(reviewer_type);
