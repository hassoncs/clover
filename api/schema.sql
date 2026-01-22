-- Clover D1 Database Schema
-- Run with: pnpm --filter @slopcade/api db:push

-- Users table (synced from Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  install_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,  -- JSON blob containing GameDefinition
  thumbnail_url TEXT,
  is_public INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_install_id ON games(install_id);
CREATE INDEX IF NOT EXISTS idx_games_is_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Assets table (AI-generated sprites stored in R2)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  install_id TEXT,
  entity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  style TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  scenario_job_id TEXT,
  scenario_asset_id TEXT,
  width INTEGER,
  height INTEGER,
  is_animated INTEGER DEFAULT 0,
  frame_count INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_install_id ON assets(install_id);
CREATE INDEX IF NOT EXISTS idx_assets_entity_type ON assets(entity_type);

-- =============================================================================
-- NEW ASSET SYSTEM TABLES (v2)
-- Replaces embedded assetPacks in GameDefinition with proper relational model
-- =============================================================================

-- Game assets (v2) - Independent, reusable image records
-- Can be generated via AI or uploaded by user
CREATE TABLE IF NOT EXISTS game_assets (
  id TEXT PRIMARY KEY,
  owner_game_id TEXT REFERENCES games(id),
  source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded')),
  image_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  content_hash TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_game_assets_owner ON game_assets(owner_game_id);
CREATE INDEX IF NOT EXISTS idx_game_assets_source ON game_assets(source);

-- Asset packs - Named collections of assets per game
-- Each pack maps template slots to specific assets
CREATE TABLE IF NOT EXISTS asset_packs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,
  description TEXT,
  prompt_defaults_json TEXT,  -- JSON: { themePrompt, styleOverride, modelId, negativePrompt }
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_asset_packs_game ON asset_packs(game_id);

-- Asset pack entries - Which asset fills each template slot in a pack
-- Includes placement data (scale, offset) for aligning with physics bodies
CREATE TABLE IF NOT EXISTS asset_pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES asset_packs(id),
  template_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES game_assets(id),
  placement_json TEXT,         -- JSON: { scale, offsetX, offsetY, anchor }
  last_generation_json TEXT,   -- JSON: { jobId, taskId, compiledPrompt, createdAt }
  UNIQUE(pack_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_pack_entries_pack ON asset_pack_entries(pack_id);
CREATE INDEX IF NOT EXISTS idx_asset_pack_entries_asset ON asset_pack_entries(asset_id);

-- Generation jobs - Batch generation requests
-- Tracks overall status of generating assets for multiple templates
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  pack_id TEXT REFERENCES asset_packs(id),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  prompt_defaults_json TEXT,   -- JSON: snapshot of PromptDefaults used
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_game ON generation_jobs(game_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_pack ON generation_jobs(pack_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

-- Generation tasks - Per-template generation tracking
-- Each task generates one asset for one template
CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id),
  template_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  prompt_components_json TEXT, -- JSON: { themePrompt, entityPrompt, styleOverride, negativePrompt, positioningHint }
  compiled_prompt TEXT,
  compiled_negative_prompt TEXT,
  model_id TEXT,
  target_width INTEGER,
  target_height INTEGER,
  aspect_ratio TEXT,
  physics_context_json TEXT,   -- JSON: { shape, width, height, radius }
  scenario_request_id TEXT,
  asset_id TEXT REFERENCES game_assets(id),
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  UNIQUE(job_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_job ON generation_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_asset ON generation_tasks(asset_id);
