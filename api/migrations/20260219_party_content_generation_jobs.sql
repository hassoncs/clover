CREATE TABLE IF NOT EXISTS party_content_generation_jobs (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  mode TEXT NOT NULL DEFAULT 'fill-to-target',
  requested_count INTEGER NOT NULL,
  target_count INTEGER,
  model TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 1.0,
  batch_size INTEGER NOT NULL DEFAULT 100,
  generated INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  moderation_rejected INTEGER NOT NULL DEFAULT 0,
  errors TEXT,
  started_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  completed_at INTEGER,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_gen_jobs_brand ON party_content_generation_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_status ON party_content_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_brand_game ON party_content_generation_jobs(brand_id, game_type);
