-- Party Content Snapshots
-- Immutable point-in-time index of active content IDs at publish time

CREATE TABLE IF NOT EXISTS party_content_snapshots (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  published_by TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  content_count INTEGER NOT NULL,
  content_ids TEXT NOT NULL,
  metadata TEXT,
  UNIQUE(version)
);

CREATE INDEX IF NOT EXISTS idx_party_content_snapshots_version ON party_content_snapshots(version);
CREATE INDEX IF NOT EXISTS idx_party_content_snapshots_published_at ON party_content_snapshots(published_at);
