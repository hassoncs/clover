DROP TABLE IF EXISTS generation_tasks;
DROP TABLE IF EXISTS generation_jobs;
DROP TABLE IF EXISTS asset_pack_entries;
DROP TABLE IF EXISTS pack_entries;
DROP TABLE IF EXISTS asset_packs;
DROP TABLE IF EXISTS game_asset_selections;
DROP TABLE IF EXISTS game_assets;
DROP TABLE IF EXISTS assets;

ALTER TABLE themes ADD COLUMN style TEXT;
ALTER TABLE themes ADD COLUMN is_public INTEGER DEFAULT 0;
ALTER TABLE themes ADD COLUMN deleted_at INTEGER;

DROP INDEX IF EXISTS idx_themes_creator;
CREATE INDEX idx_themes_creator ON themes(creator_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_themes_public ON themes(is_public) WHERE deleted_at IS NULL AND is_public = 1;

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  width INTEGER,
  height INTEGER,
  creator_user_id TEXT REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'uploaded')),
  theme_id TEXT REFERENCES themes(id),
  compiled_prompt TEXT,
  model_id TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX idx_assets_theme ON assets(theme_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_creator ON assets(creator_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_r2_key ON assets(r2_key) WHERE deleted_at IS NULL;

CREATE TABLE asset_packs (
  id TEXT PRIMARY KEY,
  base_game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,
  description TEXT,
  theme_id TEXT REFERENCES themes(id),
  creator_user_id TEXT REFERENCES users(id),
  is_complete INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  UNIQUE(base_game_id, name)
);

CREATE INDEX idx_asset_packs_game ON asset_packs(base_game_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_packs_theme ON asset_packs(theme_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_packs_creator ON asset_packs(creator_user_id) WHERE deleted_at IS NULL;

CREATE TABLE pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES asset_packs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  placement_json TEXT,
  UNIQUE(pack_id, template_id)
);

CREATE INDEX idx_pack_entries_pack ON pack_entries(pack_id);
CREATE INDEX idx_pack_entries_asset ON pack_entries(asset_id);

CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  pack_id TEXT NOT NULL REFERENCES asset_packs(id),
  theme_id TEXT REFERENCES themes(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  style TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE INDEX idx_generation_jobs_pack ON generation_jobs(pack_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status) WHERE status IN ('queued', 'running');

CREATE TABLE generation_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  compiled_prompt TEXT,
  compiled_negative_prompt TEXT,
  model_id TEXT,
  target_width INTEGER,
  target_height INTEGER,
  asset_id TEXT REFERENCES assets(id),
  error_message TEXT,
  scenario_request_id TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  UNIQUE(job_id, template_id)
);

CREATE INDEX idx_generation_tasks_job ON generation_tasks(job_id);
CREATE INDEX idx_generation_tasks_status ON generation_tasks(status) WHERE status IN ('queued', 'running');
