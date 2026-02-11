-- Production Catch-up Migration
-- Brings production D1 in sync with schema.sql
-- Date: 2026-02-10

-- =============================================================================
-- 1. ALTER existing tables to add missing columns
-- =============================================================================

-- users: add bio column
ALTER TABLE users ADD COLUMN bio TEXT;

-- games: add social counters, r2_prefix, validation columns
-- NOTE: Cannot drop 'definition' column in SQLite, but new code uses r2_prefix
ALTER TABLE games ADD COLUMN r2_prefix TEXT NOT NULL DEFAULT '';
ALTER TABLE games ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN rating_average REAL NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN validation_report TEXT;
ALTER TABLE games ADD COLUMN validation_score INTEGER;
ALTER TABLE games ADD COLUMN validation_critical_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN validation_warning_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN validation_valid INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN validation_updated_at INTEGER;
ALTER TABLE games ADD COLUMN validator_version TEXT;

-- games: add missing indexes
CREATE INDEX IF NOT EXISTS idx_games_validation_valid ON games(validation_valid);
CREATE INDEX IF NOT EXISTS idx_games_validation_score ON games(validation_score);
CREATE INDEX IF NOT EXISTS idx_games_browse ON games(is_public, validation_valid, validation_score, play_count, created_at);

-- =============================================================================
-- 2. CREATE new tables that don't exist in production
-- =============================================================================

-- Email Invites
CREATE TABLE IF NOT EXISTS email_invites (
  id TEXT PRIMARY KEY,
  inviter_user_id TEXT REFERENCES users(id),
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_user_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  UNIQUE(invitee_email)
);
CREATE INDEX IF NOT EXISTS idx_email_invites_email ON email_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_email_invites_status ON email_invites(status);

-- Themes
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_modifier TEXT NOT NULL,
  thumbnail_url TEXT,
  creator_user_id TEXT REFERENCES users(id),
  is_public INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_themes_creator ON themes(creator_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_themes_public ON themes(is_public) WHERE deleted_at IS NULL AND is_public = 1;

-- UI Gen Results
CREATE TABLE IF NOT EXISTS ui_gen_results (
  id TEXT PRIMARY KEY,
  control_type TEXT NOT NULL,
  state TEXT NOT NULL,
  theme TEXT NOT NULL,
  strength REAL NOT NULL,
  prompt_modifier TEXT,
  prompt_positive TEXT NOT NULL,
  prompt_negative TEXT NOT NULL,
  silhouette_ms INTEGER NOT NULL,
  generation_ms INTEGER NOT NULL,
  total_ms INTEGER NOT NULL,
  silhouette_r2_key TEXT NOT NULL,
  generated_r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_ui_gen_results_created ON ui_gen_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ui_gen_results_control ON ui_gen_results(control_type);
CREATE INDEX IF NOT EXISTS idx_ui_gen_results_deleted ON ui_gen_results(deleted_at);

-- =============================================================================
-- 3. AGENT / CHAT SYSTEM (the core new feature)
-- =============================================================================

-- Chat Threads
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parent_thread_id TEXT REFERENCES chat_threads(id),
  parent_event_seq INTEGER,
  last_event_seq INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_game ON chat_threads(game_id);

-- Chat Events
CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  role TEXT,
  content_json TEXT NOT NULL,
  run_id TEXT REFERENCES agent_runs(id),
  parent_event_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(thread_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_chat_events_thread_seq ON chat_events(thread_id, seq);

-- Chat Summaries
CREATE TABLE IF NOT EXISTS chat_summaries (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  covers_through_seq INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  token_count INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_thread ON chat_summaries(thread_id);

-- Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  thread_id TEXT REFERENCES chat_threads(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  source TEXT NOT NULL CHECK (source IN ('scratch', 'fork')),
  source_game_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'standard', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('planning', 'queued', 'running', 'waiting_for_input', 'paused', 'succeeded', 'failed', 'canceled')),
  planning_doc_json TEXT,
  estimated_cost_micros INTEGER,
  actual_cost_micros INTEGER NOT NULL DEFAULT 0,
  reserved_micros INTEGER NOT NULL DEFAULT 0,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_game ON agent_runs(game_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status) WHERE status IN ('planning', 'queued', 'running', 'waiting_for_input', 'paused');

-- Agent Steps
CREATE TABLE IF NOT EXISTS agent_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('planning', 'build', 'refine', 'theme', 'asset', 'chat')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  input_hash TEXT,
  output_artifact_key TEXT,
  cost_micros INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  UNIQUE(run_id, step_index)
);
CREATE INDEX IF NOT EXISTS idx_agent_steps_run ON agent_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status) WHERE status IN ('queued', 'running');

-- Agent Events
CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(run_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_agent_events_run_seq ON agent_events(run_id, seq);

-- Agent Checkpoints
CREATE TABLE IF NOT EXISTS agent_checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  artifact_keys_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_run ON agent_checkpoints(run_id);

-- Agent Costs
CREATE TABLE IF NOT EXISTS agent_costs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_id TEXT REFERENCES agent_steps(id),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micros INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_costs_run ON agent_costs(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_costs_idempotency ON agent_costs(idempotency_key);

-- =============================================================================
-- 4. SOCIAL SYSTEM
-- =============================================================================

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_json TEXT,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth <= 2),
  reply_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  is_edited INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id) WHERE deleted_at IS NULL;

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('game', 'comment')),
  target_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, target_type, target_id, reaction_type)
);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'game')),
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(follower_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, target_type);
CREATE INDEX IF NOT EXISTS idx_follows_target ON follows(target_type, target_id);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(game_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_game ON bookmarks(game_id);

-- =============================================================================
-- 5. MODERATION & NOTIFICATIONS
-- =============================================================================

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  game_id TEXT,
  message TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- =============================================================================
-- 6. Pack entries table (new schema — replaces asset_pack_entries)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES asset_packs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  placement_json TEXT,
  UNIQUE(pack_id, template_id)
);
CREATE INDEX IF NOT EXISTS idx_pack_entries_pack ON pack_entries(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_entries_asset ON pack_entries(asset_id);
