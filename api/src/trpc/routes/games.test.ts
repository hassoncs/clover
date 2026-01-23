import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { appRouter } from '../router';
import { type Context } from '../context';
import validProjectileGame from '../../__fixtures__/games/valid-projectile-game.json';

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

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const ctx = {
      env: env,
      authToken: null,
    } as any;
    const caller = appRouter.createCaller(ctx);

    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe('number');
  });
});

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
      authToken: 'mock-token',
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

  describe('analyze route', () => {
    it('should analyze a projectile game prompt', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.analyze({
        prompt: 'A game where I launch balls at stacked blocks',
      });

      expect(result.intent).toBeDefined();
      expect(result.intent.gameType).toBe('projectile');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should analyze a platformer prompt', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.analyze({
        prompt: 'A game where a cat jumps between platforms',
      });

      expect(result.intent.gameType).toBe('platformer');
    });

    it('should detect theme from prompt', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.analyze({
        prompt: 'A space game with rockets and aliens',
      });

      expect(result.intent.theme).toBe('space');
    });
  });

  describe('validate route', () => {
    it('should validate a correct game definition', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.validate({
        gameDefinition: JSON.stringify(validProjectileGame),
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid JSON', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.validate({
        gameDefinition: 'not valid json {{{',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_JSON')).toBe(true);
    });

    it('should return errors for game with no entities', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.validate({
        gameDefinition: JSON.stringify({
          metadata: { id: 'test' },
          world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
          entities: [],
        }),
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_ENTITIES')).toBe(true);
    });

    it('should return warnings for game missing win condition', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.validate({
        gameDefinition: JSON.stringify({
          metadata: { id: 'test', title: 'Test' },
          world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
          entities: [{
            id: 'player',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'dynamic', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0.5 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#FF0000' },
            behaviors: [{ type: 'control', controlType: 'tap_to_jump' }],
          }],
        }),
      });

      expect(result.warnings.some(w => w.code === 'NO_WIN_CONDITION')).toBe(true);
    });

    it('should include summary in response', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.games.validate({
        gameDefinition: JSON.stringify(validProjectileGame),
      });

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });
  });

  describe('incrementPlayCount route', () => {
    it('should increment play count for a game', async () => {
      const caller = appRouter.createCaller(ctx);

      const game = await caller.games.create({
        title: 'Play Count Game',
        definition: '{}',
        isPublic: true,
      });

      const initialGame = await caller.games.get({ id: game.id });
      expect(initialGame.playCount).toBe(0);

      await caller.games.incrementPlayCount({ id: game.id });
      await caller.games.incrementPlayCount({ id: game.id });
      await caller.games.incrementPlayCount({ id: game.id });

      const updatedGame = await caller.games.get({ id: game.id });
      expect(updatedGame.playCount).toBe(3);
    });
  });

  describe('listPublic route', () => {
    it('should list only public games', async () => {
      const caller = appRouter.createCaller(ctx);

      const publicGame = await caller.games.create({
        title: 'Public Game ' + Date.now(),
        definition: '{}',
        isPublic: true,
      });

      await caller.games.create({
        title: 'Private Game ' + Date.now(),
        definition: '{}',
        isPublic: false,
      });

      const publicGames = await caller.games.listPublic();
      expect(publicGames.some(g => g.id === publicGame.id)).toBe(true);
      expect(publicGames.every(g => g.isPublic === true)).toBe(true);
    });

    it('should support pagination', async () => {
      const caller = appRouter.createCaller(ctx);

      const games = await caller.games.listPublic({ limit: 5, offset: 0 });
      expect(games.length).toBeLessThanOrEqual(5);
    });

    it('should order by play count descending', async () => {
      const caller = appRouter.createCaller(ctx);

      const game1 = await caller.games.create({
        title: 'Low Play Game',
        definition: '{}',
        isPublic: true,
      });

      const game2 = await caller.games.create({
        title: 'High Play Game',
        definition: '{}',
        isPublic: true,
      });

      await caller.games.incrementPlayCount({ id: game2.id });
      await caller.games.incrementPlayCount({ id: game2.id });
      await caller.games.incrementPlayCount({ id: game2.id });

      const publicGames = await caller.games.listPublic();
      const game1Index = publicGames.findIndex(g => g.id === game1.id);
      const game2Index = publicGames.findIndex(g => g.id === game2.id);

      if (game1Index !== -1 && game2Index !== -1) {
        expect(game2Index).toBeLessThan(game1Index);
      }
    });
  });
});
