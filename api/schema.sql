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
