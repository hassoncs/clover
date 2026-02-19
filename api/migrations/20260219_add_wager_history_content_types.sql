-- SQLite doesn't support ALTER CHECK constraints directly.
-- We need to recreate the table to add 'wager' and 'history' to the content_type CHECK.
-- However, this is a large table with data. Instead, we'll drop the CHECK constraint
-- by recreating with a more permissive check.

-- Step 1: Create new table with updated CHECK
CREATE TABLE IF NOT EXISTS party_content_new (
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

-- Step 2: Copy data
INSERT OR IGNORE INTO party_content_new SELECT * FROM party_content;

-- Step 3: Drop old table
DROP TABLE IF EXISTS party_content;

-- Step 4: Rename new table
ALTER TABLE party_content_new RENAME TO party_content;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_party_content_brand ON party_content(brand_id);
CREATE INDEX IF NOT EXISTS idx_party_content_type ON party_content(content_type);
CREATE INDEX IF NOT EXISTS idx_party_content_brand_type ON party_content(brand_id, content_type);
CREATE INDEX IF NOT EXISTS idx_party_content_hash ON party_content(content_hash);
CREATE INDEX IF NOT EXISTS idx_party_content_status ON party_content(status);
