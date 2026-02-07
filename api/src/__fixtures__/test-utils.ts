import { env as cloudflareEnv } from 'cloudflare:test';
import { appRouter } from '../trpc/router'
import type { Context, AuthenticatedContext, User, Env } from '../trpc/context'

// Cast the cloudflare test env to our Env type
const env = cloudflareEnv as Env;

export const TEST_SCHEMA = `
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
  thumbnail_url TEXT,
  r2_prefix TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  base_game_id TEXT REFERENCES games(id),
  forked_from_id TEXT REFERENCES games(id),
  validation_report TEXT,
  validation_score INTEGER,
  validation_critical_count INTEGER DEFAULT 0,
  validation_warning_count INTEGER DEFAULT 0,
  validation_valid INTEGER DEFAULT 0,
  validation_updated_at INTEGER,
  validator_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_install_id ON games(install_id);
CREATE INDEX IF NOT EXISTS idx_games_is_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_validation_valid ON games(validation_valid);
CREATE INDEX IF NOT EXISTS idx_games_validation_score ON games(validation_score);

-- Assets table
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

-- Economy tables for WalletService tests
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance_micros INTEGER NOT NULL DEFAULT 0,
  lifetime_earned_micros INTEGER NOT NULL DEFAULT 0,
  lifetime_spent_micros INTEGER NOT NULL DEFAULT 0,
  last_daily_claim_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance_micros >= 0)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN (
    'signup_code_grant',
    'promo_code_grant',
    'purchase',
    'generation_debit',
    'generation_refund',
    'admin_adjustment',
    'agent_reservation_hold',
    'agent_step_settlement',
    'agent_reservation_release'
  )),
  amount_micros INTEGER NOT NULL,
  balance_before_micros INTEGER NOT NULL,
  balance_after_micros INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT,
  description TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_idempotency ON credit_transactions(user_id, idempotency_key);

-- Signup codes table
CREATE TABLE IF NOT EXISTS signup_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  grant_amount_micros INTEGER NOT NULL,
  expires_at INTEGER,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_signup_codes_code ON signup_codes(code);
CREATE INDEX IF NOT EXISTS idx_signup_codes_is_active ON signup_codes(is_active);

-- Signup code redemptions table
CREATE TABLE IF NOT EXISTS signup_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES signup_codes(code),
  user_id TEXT NOT NULL,
  grant_amount_micros INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_signup_code_redemptions_user ON signup_code_redemptions(user_id);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  grant_amount_micros INTEGER NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  starts_at INTEGER,
  expires_at INTEGER,
  is_active INTEGER DEFAULT 1,
  min_account_age_days INTEGER,
  requires_purchase_history INTEGER DEFAULT 0,
  created_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

-- Promo code redemptions table
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES promo_codes(code),
  user_id TEXT NOT NULL,
  grant_amount_micros INTEGER NOT NULL,
  transaction_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON promo_code_redemptions(user_id);

-- Economy tables for GemService tests
CREATE TABLE IF NOT EXISTS user_gems (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS gem_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT,
  description TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gem_transactions_user ON gem_transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gem_transactions_idempotency ON gem_transactions(user_id, idempotency_key);

-- IAP purchases table
CREATE TABLE IF NOT EXISTS iap_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iap_purchases_user ON iap_purchases(user_id);

-- Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
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
  stage TEXT NOT NULL CHECK (stage IN ('planning', 'build', 'refine', 'theme', 'asset')),
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
CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status);

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
`;

export async function initTestDatabase(): Promise<void> {
  const statements = TEST_SCHEMA
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await env.DB.prepare(statement).run();
  }
}

export const TEST_USER: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

export const TEST_USER_2: User = {
  id: 'test-user-2-id',
  email: 'test2@example.com',
  displayName: 'Test User 2',
};

export async function createTestUser(user: User = TEST_USER): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(user.id, user.email, user.displayName ?? null, now, now).run();
}

export function createPublicContext(installId?: string): Context {
  return {
    env: env,
    installId: installId ?? null,
    authToken: null,
  } as Context;
}

export function createInstalledContext(installId: string = 'test-install-id'): Context {
  return {
    env: env,
    installId,
    authToken: null,
  } as Context;
}

export function createAuthenticatedContext(
  user: User = TEST_USER,
  installId: string = 'test-install-id'
): AuthenticatedContext {
  return {
    env: env,
    installId,
    authToken: 'test-token',
    user,
  } as AuthenticatedContext;
}

export function createCaller(ctx: Context) {
  return appRouter.createCaller(ctx);
}

export function createAuthenticatedCaller(user: User = TEST_USER, installId?: string) {
  return appRouter.createCaller(createAuthenticatedContext(user, installId));
}

export function createInstalledCaller(installId: string = 'test-install-id') {
  return appRouter.createCaller(createInstalledContext(installId));
}

export function createPublicCaller() {
  return appRouter.createCaller(createPublicContext());
}
