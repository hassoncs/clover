-- Normalize party_content content_type: migrate 'wager' and 'history' -> 'estimation'
--
-- Background:
--   'wager' and 'history' were added as legacy aliases (20260219) to accept content
--   from amen-branded game types (amen-wager, amen-history). Both are semantically
--   equivalent to 'estimation'. This migration:
--     1. Normalizes all 'wager' and 'history' rows to 'estimation'
--     2. Removes 'wager' and 'history' from the CHECK constraint
--     3. Preserves original content_type in metadata JSON for rollback traceability
--
-- SQLite (D1) does not support ALTER TABLE to modify CHECK constraints.
-- We must recreate the table — same pattern as 20260219_add_wager_history_content_types.sql.
--
-- IMPORTANT: Do NOT execute until the compatibility window (T7) is deployed.
--            This migration is prepared in T4 and executed in T8.
--
-- Rollback: See 20260226_normalize_content_types_rollback.sql

-- =============================================================================
-- PRE-MIGRATION VALIDATION
-- Run this query before executing to confirm affected row counts:
--
--   SELECT content_type, COUNT(*) AS count
--   FROM party_content
--   WHERE content_type IN ('wager', 'history')
--   GROUP BY content_type;
--
-- Expected: returns 0-N rows for 'wager' and/or 'history'.
-- If 0 rows: migration is a no-op (safe to run, CHECK constraint still updated).
-- =============================================================================

-- Step 1: Create new table — CHECK constraint excludes 'wager' and 'history'
CREATE TABLE IF NOT EXISTS party_content_migration_20260226 (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'quip', 'trivia', 'drawing', 'dilemma', 'wyr', 'estimation', 'fibbage',
    'caption', 'wordgame', 'wordlist', 'personal', 'FakeWord', 'ranking',
    'headsup', 'chroma'
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

-- Step 2: Copy all rows, normalizing wager/history -> estimation.
-- For rows being changed, store original content_type in metadata JSON under
-- $.original_content_type so the rollback migration can restore exact values.
INSERT OR IGNORE INTO party_content_migration_20260226
SELECT
  id,
  brand_id,
  CASE
    WHEN content_type IN ('wager', 'history') THEN 'estimation'
    ELSE content_type
  END AS content_type,
  body,
  category,
  difficulty,
  status,
  source,
  content_hash,
  CASE
    WHEN content_type IN ('wager', 'history') THEN
      json_set(COALESCE(metadata, '{}'), '$.original_content_type', content_type)
    ELSE metadata
  END AS metadata,
  created_at,
  updated_at,
  deleted_at
FROM party_content;

-- Step 3: Drop old table (had 'wager' and 'history' in CHECK)
DROP TABLE party_content;

-- Step 4: Rename temp table to party_content
ALTER TABLE party_content_migration_20260226 RENAME TO party_content;

-- Step 5: Recreate indexes (matching 20260219 index set)
CREATE INDEX IF NOT EXISTS idx_party_content_brand_type ON party_content(brand_id, content_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_status ON party_content(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_category ON party_content(category) WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_deleted ON party_content(deleted_at);
CREATE INDEX IF NOT EXISTS idx_party_content_hash ON party_content(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_brand ON party_content(brand_id);
CREATE INDEX IF NOT EXISTS idx_party_content_type ON party_content(content_type);

-- =============================================================================
-- POST-MIGRATION VALIDATION
-- Run this query after executing to confirm no wager/history rows remain:
--
--   SELECT content_type, COUNT(*) AS count
--   FROM party_content
--   GROUP BY content_type
--   ORDER BY content_type;
--
-- Expected: 'wager' and 'history' do NOT appear in results.
-- =============================================================================
