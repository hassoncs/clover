import { env } from 'cloudflare:test';
import { appRouter } from '../trpc/router';
import type { Context, AuthenticatedContext, User } from '../trpc/context';

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
  definition TEXT NOT NULL,
  thumbnail_url TEXT,
  is_public INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_install_id ON games(install_id);
CREATE INDEX IF NOT EXISTS idx_games_is_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

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
