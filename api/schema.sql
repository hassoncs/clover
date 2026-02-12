-- Clover D1 Database Schema
-- Run with: pnpm --filter @slopcade/api db:push

-- Users table (synced from Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Email Invites - Replaces signup_codes with invite-by-email system
-- Any authenticated user can invite others by email
CREATE TABLE IF NOT EXISTS email_invites (
  id TEXT PRIMARY KEY,
  inviter_user_id TEXT REFERENCES users(id),  -- who sent the invite (nullable for admin)
  invitee_email TEXT NOT NULL,                -- normalized lowercase email
  status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'redeemed' | 'revoked'
  redeemed_user_id TEXT REFERENCES users(id), -- set when invitee logs in
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  UNIQUE(invitee_email)                       -- one invite per email
);

CREATE INDEX IF NOT EXISTS idx_email_invites_email ON email_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_email_invites_status ON email_invites(status);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  install_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  r2_prefix TEXT NOT NULL,  -- "games/{gameId}" — definition.json lives at this prefix in R2
  is_public INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  rating_average REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  -- Lineage tracking for forks and remixes
  base_game_id TEXT REFERENCES games(id),  -- Points to root game; self-referential for originals
  forked_from_id TEXT REFERENCES games(id), -- Immediate parent; NULL for originals
  validation_report TEXT,
  validation_score INTEGER,
  validation_critical_count INTEGER DEFAULT 0,
  validation_warning_count INTEGER DEFAULT 0,
  validation_valid INTEGER DEFAULT 0,
  validation_updated_at INTEGER,
  validator_version TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_install_id ON games(install_id);
CREATE INDEX IF NOT EXISTS idx_games_is_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_base_game ON games(base_game_id);
CREATE INDEX IF NOT EXISTS idx_games_forked_from ON games(forked_from_id);
CREATE INDEX IF NOT EXISTS idx_games_validation_valid ON games(validation_valid);
CREATE INDEX IF NOT EXISTS idx_games_validation_score ON games(validation_score);
CREATE INDEX IF NOT EXISTS idx_games_browse ON games(is_public, validation_valid, validation_score, play_count, created_at);

-- Themes table (must be before assets due to FK)
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

CREATE TABLE IF NOT EXISTS assets (
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

CREATE INDEX IF NOT EXISTS idx_assets_theme ON assets(theme_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_creator ON assets(creator_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_r2_key ON assets(r2_key) WHERE deleted_at IS NULL;

-- Remixes - Fork-level customization bundles (variables, assets, shaders, sounds)
-- A remix is a complete "skin" for a base game
CREATE TABLE IF NOT EXISTS remixes (
  id TEXT PRIMARY KEY,
  base_game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,
  description TEXT,
  creator_user_id TEXT REFERENCES users(id),
  variable_overrides_json TEXT,        -- JSON: Record<variablePath, value>
  asset_overrides_json TEXT,           -- JSON: Record<templateId, { assetId, assetUrl, placement? }>
  shader_param_overrides_json TEXT,    -- JSON: Record<shaderId, Record<param, value>>
  sound_overrides_json TEXT,           -- JSON: Record<soundId, { url, volume? }>
  theme_id TEXT REFERENCES themes(id),
  theme_prompt TEXT,
  style TEXT,
  is_complete INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  UNIQUE(base_game_id, name)
);

CREATE INDEX IF NOT EXISTS idx_remixes_base_game ON remixes(base_game_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remixes_creator ON remixes(creator_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remixes_theme ON remixes(theme_id) WHERE deleted_at IS NULL;

-- Generation jobs - Batch generation requests
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  remix_id TEXT,
  theme_id TEXT REFERENCES themes(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  style TEXT,
  theme_plan_json TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_remix ON generation_jobs(remix_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status) WHERE status IN ('queued', 'running');

-- Generation tasks - Per-template generation tracking
CREATE TABLE IF NOT EXISTS generation_tasks (
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

CREATE INDEX IF NOT EXISTS idx_generation_tasks_job ON generation_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status) WHERE status IN ('queued', 'running');

-- =============================================================================
-- ECONOMY SYSTEM TABLES
-- Storage: All monetary values in MICRODOLLARS (1,000,000 = $1.00)
-- =============================================================================

-- User Wallets - One per user, tracks current balance
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance_micros INTEGER NOT NULL DEFAULT 0,     -- Current balance in microdollars
  lifetime_earned_micros INTEGER NOT NULL DEFAULT 0,  -- Total ever credited
  lifetime_spent_micros INTEGER NOT NULL DEFAULT 0,   -- Total ever debited
  last_daily_claim_at INTEGER,                   -- Timestamp of last daily bonus
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance_micros >= 0)  -- CRITICAL: Prevent negative balances at DB level
);

-- Transaction Ledger - Immutable audit trail of all balance changes
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Transaction Details
  type TEXT NOT NULL CHECK (type IN (
    'signup_code_grant',  -- Initial grant when using signup code
    'promo_code_grant',   -- Promo code redemption
    'purchase',           -- IAP purchase (RevenueCat)
    'generation_debit',   -- AI asset generation cost
    'generation_refund',  -- Refund for failed generation
    'admin_adjustment',   -- Manual adjustment by admin
    'agent_reservation_hold',    -- Reserve max budget before run starts
    'agent_step_settlement',     -- Step-level settlement record marker
    'agent_reservation_release'  -- Release unspent reservation at run end
    -- 'daily_bonus' - DISABLED for launch
  )),
  amount_micros INTEGER NOT NULL,  -- Positive = credit, Negative = debit
  
  -- Balance Snapshot (CRITICAL for auditing)
  balance_before_micros INTEGER NOT NULL,
  balance_after_micros INTEGER NOT NULL,
  
  -- Reference to source operation
  reference_type TEXT,  -- 'generation_job', 'generation_task', 'purchase', etc.
  reference_id TEXT,    -- ID of the related entity
  
  -- Idempotency (prevents duplicate processing)
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  description TEXT,
  metadata_json TEXT,   -- JSON: { model_id, prompt, cost_breakdown, etc. }
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- Cost Tracking - Per-operation cost records for analytics
CREATE TABLE IF NOT EXISTS operation_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Operation Details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'scenario_txt2img',
    'scenario_img2img', 
    'scenario_remove_bg',
    'scenario_layered',
    'openrouter_game_gen',
    'openrouter_chat'
  )),
  
  -- Cost Breakdown (all in microdollars)
  estimated_cost_micros INTEGER NOT NULL,  -- What we estimated before
  actual_cost_micros INTEGER,              -- What it actually cost (if known)
  charged_cost_micros INTEGER NOT NULL,    -- What we charged the user
  
  -- Reference
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  
  -- Metadata
  metadata_json TEXT,  -- JSON: { model_id, dimensions, tokens, etc. }
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_costs_user ON operation_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_costs_type ON operation_costs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_costs_created ON operation_costs(created_at);

-- IAP Products - Define purchasable credit packs
CREATE TABLE IF NOT EXISTS iap_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,              -- RevenueCat product ID
  name TEXT NOT NULL,                    -- "Starter Pack"
  description TEXT,
  
  -- Pricing
  price_cents INTEGER NOT NULL,          -- $4.99 = 499
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- What user gets
  credit_amount_micros INTEGER NOT NULL, -- How many microdollars
  bonus_percent INTEGER DEFAULT 0,       -- 10 = 10% bonus
  
  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  platform TEXT,                         -- 'ios', 'android', 'all'
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- IAP Purchases - Record of completed purchases
CREATE TABLE IF NOT EXISTS iap_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES iap_products(id),
  
  -- Platform Info
  platform TEXT NOT NULL,                     -- 'ios', 'android'
  revenuecat_transaction_id TEXT UNIQUE,      -- RevenueCat's ID
  store_transaction_id TEXT,                  -- Apple/Google's ID
  
  -- Amounts
  price_cents INTEGER NOT NULL,
  credits_granted_micros INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  
  -- Timestamps
  purchased_at INTEGER NOT NULL,
  processed_at INTEGER,
  refunded_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_iap_purchases_user ON iap_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_status ON iap_purchases(status);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_revenuecat ON iap_purchases(revenuecat_transaction_id);

-- Rate Limiting - Track usage for abuse prevention
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,          -- 'generation', 'daily_claim', etc.
  window_start INTEGER NOT NULL,      -- Start of current window (epoch)
  count INTEGER NOT NULL DEFAULT 0,   -- Actions in current window
  PRIMARY KEY (user_id, action_type)
);

-- =============================================================================
-- GEMS SYSTEM (Soft Currency - Engagement/Retention)
-- Earned through gameplay, spent on cosmetics/unlocks
-- Design TBD - see .sisyphus/plans/gems-economy-brainstorm.md
-- =============================================================================

-- User Gems - Soft currency balance (separate from Sparks/microdollars)
CREATE TABLE IF NOT EXISTS user_gems (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,           -- Current gem balance
  lifetime_earned INTEGER NOT NULL DEFAULT 0,   -- Total ever earned
  lifetime_spent INTEGER NOT NULL DEFAULT 0,    -- Total ever spent
  lifetime_purchased INTEGER NOT NULL DEFAULT 0, -- Total bought with real money
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance >= 0)
);

-- Gem Transactions - Audit trail for gem changes
CREATE TABLE IF NOT EXISTS gem_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Transaction Details
  type TEXT NOT NULL CHECK (type IN (
    'signup_bonus',       -- Initial grant on signup
    'daily_login',        -- Daily login reward
    'game_played',        -- Earned by playing a game
    'game_created_bonus', -- Bonus for publishing a game
    'creator_reward',     -- Earned when others play your game
    'achievement',        -- Unlocked an achievement
    'level_up',           -- Leveled up
    'purchase',           -- Bought with real money (IAP)
    'sparks_conversion',  -- Converted Sparks to Gems (if enabled)
    'cosmetic_purchase',  -- Spent on cosmetics
    'game_play_cost',     -- Cost to play a premium game (if enabled)
    'tip_sent',           -- Tipped another creator
    'tip_received',       -- Received a tip
    'admin_adjustment'    -- Manual adjustment
  )),
  amount INTEGER NOT NULL,  -- Positive = credit, Negative = debit
  
  -- Balance Snapshot
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Reference
  reference_type TEXT,  -- 'game', 'achievement', 'cosmetic', 'tip', etc.
  reference_id TEXT,
  
  -- Idempotency
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  description TEXT,
  metadata_json TEXT,
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gem_transactions_user ON gem_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_type ON gem_transactions(type);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created ON gem_transactions(created_at);

-- Gem Products - IAP products for purchasing gems
CREATE TABLE IF NOT EXISTS gem_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,              -- RevenueCat product ID
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- What user gets
  gem_amount INTEGER NOT NULL,
  bonus_percent INTEGER DEFAULT 0,
  
  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  platform TEXT,
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- =============================================================================
-- SIGNUP CODE SYSTEM (Waitlist/Invite)
-- Users cannot sign up without a valid code
-- =============================================================================

-- Signup Codes - Required to create an account
CREATE TABLE IF NOT EXISTS signup_codes (
  code TEXT PRIMARY KEY,              -- The actual code (e.g., "LAUNCH2026")
  name TEXT NOT NULL,                 -- Friendly name for admin ("Launch Party Invite")
  
  -- Usage Limits
  max_uses INTEGER,                   -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  
  -- Grants
  grant_amount_micros INTEGER NOT NULL DEFAULT 1000000, -- $1.00 = 1000 Sparks
  
  -- Validity
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER,                 -- NULL = never expires
  
  -- Metadata
  created_by TEXT,                    -- Admin user ID who created it
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Signup Code Redemptions - Track who used which code
CREATE TABLE IF NOT EXISTS signup_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES signup_codes(code),
  user_id TEXT NOT NULL REFERENCES users(id),
  grant_amount_micros INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id)  -- Each user can only redeem ONE signup code (during signup)
);

CREATE INDEX IF NOT EXISTS idx_signup_code_redemptions_code ON signup_code_redemptions(code);

-- =============================================================================
-- PROMO CODE SYSTEM (Grants for existing users)
-- Idempotent: one use per user per code
-- =============================================================================

-- Promo Codes - Grant Sparks to existing users
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,              -- The actual code (e.g., "HAPPYNEWYEAR")
  name TEXT NOT NULL,                 -- Friendly name ("New Year 2026 Promo")
  
  -- Usage Limits
  max_uses INTEGER,                   -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  
  -- Grants
  grant_amount_micros INTEGER NOT NULL, -- How many microdollars to grant
  
  -- Validity
  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at INTEGER,                  -- NULL = immediately active
  expires_at INTEGER,                 -- NULL = never expires
  
  -- Restrictions
  min_account_age_days INTEGER,       -- Minimum days since signup (anti-abuse)
  requires_purchase_history INTEGER DEFAULT 0, -- Must have made a purchase
  
  -- Metadata
  created_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Promo Code Redemptions - Track who redeemed which promo code
-- CRITICAL: UNIQUE(user_id, code) ensures one use per user per code
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES promo_codes(code),
  user_id TEXT NOT NULL REFERENCES users(id),
  grant_amount_micros INTEGER NOT NULL,
  transaction_id TEXT REFERENCES credit_transactions(id),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, code)  -- IDEMPOTENT: One redemption per user per code
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_code ON promo_code_redemptions(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON promo_code_redemptions(user_id);

-- =============================================================================
-- UI GEN ADMIN (Developer Tool for UI Component Experimentation)
-- Stores generated UI component experiments for debugging and iteration
-- =============================================================================

CREATE TABLE IF NOT EXISTS ui_gen_results (
  id TEXT PRIMARY KEY,
  
  -- Generation Parameters
  control_type TEXT NOT NULL,
  state TEXT NOT NULL,
  theme TEXT NOT NULL,
  strength REAL NOT NULL,
  prompt_modifier TEXT,
  
  -- Prompts (for debugging)
  prompt_positive TEXT NOT NULL,
  prompt_negative TEXT NOT NULL,
  
  -- Timing (milliseconds)
  silhouette_ms INTEGER NOT NULL,
  generation_ms INTEGER NOT NULL,
  total_ms INTEGER NOT NULL,
  
  -- R2 Storage Keys
  silhouette_r2_key TEXT NOT NULL,
  generated_r2_key TEXT NOT NULL,
  
  -- Metadata
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ui_gen_results_created ON ui_gen_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ui_gen_results_control ON ui_gen_results(control_type);
CREATE INDEX IF NOT EXISTS idx_ui_gen_results_deleted ON ui_gen_results(deleted_at);

-- =============================================================================
-- CHAT SYSTEM: Threads & Messages (Tambo-inspired)
-- Unified thread/message model for AI orchestration
-- =============================================================================

-- Threads - Stable conversation identity
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  generation_stage TEXT DEFAULT 'idle',
  status_message TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_game ON threads(game_id);

-- Messages - Append-only message log with tool calls and billing
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  role TEXT NOT NULL,
  content_json TEXT NOT NULL,
  component_name TEXT,
  component_props_json TEXT,
  component_state_json TEXT,
  tool_call_id TEXT,
  tool_name TEXT,
  model TEXT,
  cost_micros INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  error_json TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, seq);

-- =============================================================================
-- SOCIAL SYSTEM: Comments, Reactions, Follows
-- =============================================================================

-- Comments - Threaded comments on games (depth-limited to 2 levels)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_json TEXT,                      -- JSON: rich content (mentions, links, images)
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

-- Reactions - On games and comments (one per user per target per type)
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

-- Follows - Follow users or games
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

-- Ratings - Star ratings on games (one per user per game)
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

-- Bookmarks - Save games for later
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
-- MODERATION: Reports, Blocks
-- =============================================================================

-- Reports - User-submitted content reports
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

-- Blocks - User-to-user blocking
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

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
-- PACKAGE READINESS (Build Validation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS package_readiness (
  game_id TEXT NOT NULL,
  build_id TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, build_id)
);

CREATE INDEX IF NOT EXISTS idx_package_readiness_game ON package_readiness(game_id, checked_at DESC);

-- =============================================================================
-- DEV SEED DATA
-- =============================================================================

INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'dev@localhost', 'Dev User', 1700000000000, 1700000000000);

INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 999999999, 999999999, 0, 1700000000000, 1700000000000);
