-- Rollback: Restore 'wager' and 'history' content_type values
--
-- This rollback undoes 20260226_normalize_content_types.sql.
-- The forward migration stored the original content_type in metadata JSON as
-- $.original_content_type for any row changed from wager/history to estimation.
--
-- Strategy:
--   - Rows changed by the migration: restore content_type from metadata $.original_content_type
--   - Rows unchanged: copy as-is, metadata unmodified
--   - Clean up $.original_content_type from metadata after restoring
--
-- Limitations:
--   - Only rows that passed through the forward migration have $.original_content_type set.
--   - Rows that were already 'estimation' before the migration are indistinguishable
--     from migrated rows after rollback — they stay as 'estimation' (correct behaviour).
--   - This rollback is only meaningful within the compatibility window before
--     $.original_content_type metadata is cleaned up.
--
-- IMPORTANT: If $.original_content_type metadata has been removed by a subsequent
--            cleanup migration, this rollback will not restore wager/history values.
--            In that case, restore from a database backup.

-- =============================================================================
-- PRE-ROLLBACK VALIDATION
-- Run this query to confirm rollback-able rows exist:
--
--   SELECT json_extract(metadata, '$.original_content_type') AS original_type,
--          COUNT(*) AS count
--   FROM party_content
--   WHERE json_extract(metadata, '$.original_content_type') IN ('wager', 'history')
--   GROUP BY original_type;
--
-- Expected: rows with original_type = 'wager' and/or 'history'.
-- If 0 rows: either the forward migration never ran, or metadata was cleaned up.
-- =============================================================================

-- Step 1: Create rollback table — CHECK includes 'wager' and 'history' (restores 20260219 state)
CREATE TABLE IF NOT EXISTS party_content_rollback_20260226 (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'quip', 'trivia', 'drawing', 'dilemma', 'wyr', 'estimation', 'fibbage',
    'caption', 'wordgame', 'wordlist', 'personal', 'FakeWord', 'ranking',
    'headsup', 'chroma', 'wager', 'history'
  )),
  body TEXT NOT NULL,
  category TEXT,
  difficulty INTEGER CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 5)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  source TEXT NOT NULL DEFAULT 'imported' CHECK (source IN ('imported', 'ai', 'human', 'curated')),
  content_hash TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Step 2: Copy all rows, restoring original content_type from metadata where available.
-- Also removes $.original_content_type from metadata to leave it clean.
INSERT OR IGNORE INTO party_content_rollback_20260226
SELECT
  id,
  brand_id,
  COALESCE(
    json_extract(metadata, '$.original_content_type'),
    content_type
  ) AS content_type,
  body,
  category,
  difficulty,
  status,
  source,
  content_hash,
  CASE
    WHEN json_extract(metadata, '$.original_content_type') IS NOT NULL THEN
      json_remove(metadata, '$.original_content_type')
    ELSE metadata
  END AS metadata,
  created_at,
  updated_at,
  deleted_at
FROM party_content;

-- Step 3: Drop normalized table
DROP TABLE party_content;

-- Step 4: Rename rollback table to party_content
ALTER TABLE party_content_rollback_20260226 RENAME TO party_content;

-- Step 5: Recreate indexes (matching 20260219 index set)
CREATE INDEX IF NOT EXISTS idx_party_content_brand_type ON party_content(brand_id, content_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_status ON party_content(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_category ON party_content(category) WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_deleted ON party_content(deleted_at);
CREATE INDEX IF NOT EXISTS idx_party_content_hash ON party_content(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_brand ON party_content(brand_id);
CREATE INDEX IF NOT EXISTS idx_party_content_type ON party_content(content_type);

-- =============================================================================
-- POST-ROLLBACK VALIDATION
-- Run this query to confirm rollback succeeded:
--
--   SELECT content_type, COUNT(*) AS count
--   FROM party_content
--   WHERE content_type IN ('wager', 'history', 'estimation')
--   GROUP BY content_type
--   ORDER BY content_type;
--
-- Expected: 'wager' and/or 'history' rows reappear with original counts.
-- =============================================================================
