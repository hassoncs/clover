import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { appRouter } from '../router';
import { type Context } from '../context';

const schema = `
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
`;

describe('Games Router', () => {
  let ctx: Context;

  beforeAll(async () => {
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }

    await env.DB.prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).bind('test-user-id', 'test@example.com', 'Test User', Date.now(), Date.now()).run();
  });

  beforeEach(() => {
    ctx = {
      env: env,
      installId: 'test-install-id',
      authToken: null,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      }
    } as any;
  });

  it('should list games for user', async () => {
    const caller = appRouter.createCaller(ctx);
    
    const newGame = await caller.games.create({
      title: 'Test Game',
      definition: JSON.stringify({ entities: [] }),
      isPublic: false
    });

    const games = await caller.games.list();
    expect(games).toHaveLength(1);
    expect(games[0].id).toBe(newGame.id);
    expect(games[0].title).toBe('Test Game');
  });

  it('should get a single game', async () => {
    const caller = appRouter.createCaller(ctx);
    
    const newGame = await caller.games.create({
      title: 'Single Game',
      definition: '{}',
    });

    const game = await caller.games.get({ id: newGame.id });
    expect(game).toBeDefined();
    expect(game.id).toBe(newGame.id);
  });

  it('should update a game', async () => {
    const caller = appRouter.createCaller(ctx);
    
    const newGame = await caller.games.create({
      title: 'Original Title',
      definition: '{}',
    });

    await caller.games.update({
      id: newGame.id,
      title: 'Updated Title'
    });

    const updatedGame = await caller.games.get({ id: newGame.id });
    expect(updatedGame.title).toBe('Updated Title');
  });

  it('should soft delete a game', async () => {
    const caller = appRouter.createCaller(ctx);
    
    const newGame = await caller.games.create({
      title: 'To Delete',
      definition: '{}',
    });

    await caller.games.delete({ id: newGame.id });

    const games = await caller.games.list();
    expect(games.find(g => g.id === newGame.id)).toBeUndefined();
    
    await expect(caller.games.get({ id: newGame.id }))
      .rejects.toThrow('Game not found');
  });
});
