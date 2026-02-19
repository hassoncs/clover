-- Add 'chroma' content type for Chroma Clues game (slopcade-only)
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we
-- recreate party_content with the updated constraint.

CREATE TABLE IF NOT EXISTS party_content_new (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('quip', 'trivia', 'drawing', 'dilemma', 'wyr', 'estimation', 'fibbage', 'caption', 'wordgame', 'wordlist', 'personal', 'FakeWord', 'ranking', 'headsup', 'chroma')),
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

INSERT INTO party_content_new SELECT * FROM party_content;
DROP TABLE party_content;
ALTER TABLE party_content_new RENAME TO party_content;

CREATE INDEX IF NOT EXISTS idx_party_content_brand_type ON party_content(brand_id, content_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_status ON party_content(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_category ON party_content(category) WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_deleted ON party_content(deleted_at);
CREATE INDEX IF NOT EXISTS idx_party_content_hash ON party_content(content_hash) WHERE content_hash IS NOT NULL;
