-- Party Content CMS Schema
-- Canonical storage for party game content with R2 asset links and review metadata

-- party_content: canonical textual content for party games
CREATE TABLE IF NOT EXISTS party_content (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('quip', 'trivia', 'drawing', 'dilemma', 'wyr', 'estimation', 'fibbage', 'caption', 'wordgame', 'wordlist', 'personal', 'FakeWord', 'ranking', 'headsup')),
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

CREATE INDEX IF NOT EXISTS idx_party_content_brand_type ON party_content(brand_id, content_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_status ON party_content(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_category ON party_content(category) WHERE deleted_at IS NULL AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_deleted ON party_content(deleted_at);
CREATE INDEX IF NOT EXISTS idx_party_content_hash ON party_content(content_hash) WHERE content_hash IS NOT NULL;

-- party_content_assets: R2 asset links for party content (1..N per content)
CREATE TABLE IF NOT EXISTS party_content_assets (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES party_content(id) ON DELETE CASCADE,
  r2_key TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('audio', 'image')),
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'alt', 'background')),
  mime_type TEXT,
  duration_ms INTEGER,
  file_size INTEGER,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_party_content_assets_content ON party_content_assets(content_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_assets_type ON party_content_assets(asset_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_content_assets_deleted ON party_content_assets(deleted_at);

-- party_content_reviews: quality/humor ratings from reviewers
CREATE TABLE IF NOT EXISTS party_content_reviews (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES party_content(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  quality_score INTEGER NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  humor_score INTEGER NOT NULL CHECK (humor_score >= 1 AND humor_score <= 5),
  notes TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(content_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_party_content_reviews_content ON party_content_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_party_content_reviews_reviewer ON party_content_reviews(reviewer_user_id);

-- party_content_status_transitions: audit trail for status changes
CREATE TABLE IF NOT EXISTS party_content_status_transitions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES party_content(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_party_content_transitions_content ON party_content_status_transitions(content_id);
CREATE INDEX IF NOT EXISTS idx_party_content_transitions_actor ON party_content_status_transitions(actor_id) WHERE actor_id IS NOT NULL;
