import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { appRouter } from '../router'
import { type Context } from '../context'

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

-- Themes table
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

CREATE INDEX IF NOT EXISTS idx_themes_creator_user_id ON themes(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_themes_is_public ON themes(is_public);
`;

describe('Themes Router', () => {
  let ctx: Context;
  let otherUserCtx: Context;

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

    await env.DB.prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).bind('other-user-id', 'other@example.com', 'Other User', Date.now(), Date.now()).run();
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

    otherUserCtx = {
      env: env,
      authToken: 'mock-token-other',
      user: {
        id: 'other-user-id',
        email: 'other@example.com',
      }
    } as any;
  });

  describe('create', () => {
    it('should create a theme successfully', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.assetSystem.themes.create({
        name: 'Space Theme',
        promptModifier: 'futuristic space setting with stars and planets',
      });

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.createdAt).toBe('number');
    });

    it('should create a theme without style', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.assetSystem.themes.create({
        name: 'Fantasy Theme',
        promptModifier: 'medieval fantasy with castles and dragons',
      });

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should reject theme with empty name', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.create({
          name: '',
          promptModifier: 'some prompt',
        })
      ).rejects.toThrow();
    });

    it('should reject theme with empty promptModifier', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.create({
          name: 'Test Theme',
          promptModifier: '',
        })
      ).rejects.toThrow();
    });

    it('should reject theme with name exceeding 100 characters', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.create({
          name: 'a'.repeat(101),
          promptModifier: 'some prompt',
        })
      ).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get a theme by id', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Ocean Theme',
        promptModifier: 'underwater ocean scene with fish and coral',
      });

      const theme = await caller.assetSystem.themes.get({ id: created.id });
      
      expect(theme.id).toBe(created.id);
      expect(theme.name).toBe('Ocean Theme');
      expect(theme.promptModifier).toBe('underwater ocean scene with fish and coral');
      expect(theme.creatorUserId).toBe('test-user-id');
      expect(theme.isPublic).toBe(false);
      expect(theme.createdAt).toBeDefined();
    });

    it('should throw NOT_FOUND for non-existent theme', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.get({ id: 'non-existent-id' })
      ).rejects.toThrow('Theme not found');
    });

    it('should not return deleted themes', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Deleted Theme',
        promptModifier: 'will be deleted',
      });

      await caller.assetSystem.themes.delete({ id: created.id });

      await expect(
        caller.assetSystem.themes.get({ id: created.id })
      ).rejects.toThrow('Theme not found');
    });
  });

  describe('update', () => {
    it('should update theme name', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Original Name',
        promptModifier: 'original prompt',
      });

      await caller.assetSystem.themes.update({
        id: created.id,
        name: 'Updated Name',
      });

      const updated = await caller.assetSystem.themes.get({ id: created.id });
      expect(updated.name).toBe('Updated Name');
      expect(updated.promptModifier).toBe('original prompt');
    });

    it('should update theme promptModifier', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Test Theme',
        promptModifier: 'original prompt',
      });

      await caller.assetSystem.themes.update({
        id: created.id,
        promptModifier: 'updated prompt modifier',
      });

      const updated = await caller.assetSystem.themes.get({ id: created.id });
      expect(updated.promptModifier).toBe('updated prompt modifier');
    });

    it('should update multiple fields at once', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Original',
        promptModifier: 'original',
      });

      await caller.assetSystem.themes.update({
        id: created.id,
        name: 'Updated',
        promptModifier: 'updated prompt',
      });

      const updated = await caller.assetSystem.themes.get({ id: created.id });
      expect(updated.name).toBe('Updated');
      expect(updated.promptModifier).toBe('updated prompt');
    });

    it('should fail to update theme owned by another user', async () => {
      const caller = appRouter.createCaller(ctx);
      const otherCaller = appRouter.createCaller(otherUserCtx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'My Theme',
        promptModifier: 'my prompt',
      });

      await expect(
        otherCaller.assetSystem.themes.update({
          id: created.id,
          name: 'Hacked Name',
        })
      ).rejects.toThrow('Theme not found or not owned by you');
    });

    it('should fail to update non-existent theme', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.update({
          id: 'non-existent-id',
          name: 'New Name',
        })
      ).rejects.toThrow('Theme not found or not owned by you');
    });

    it('should fail to update with no fields provided', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Test Theme',
        promptModifier: 'test prompt',
      });

      await expect(
        caller.assetSystem.themes.update({
          id: created.id,
        })
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should soft delete a theme', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'To Delete',
        promptModifier: 'will be deleted',
      });

      const result = await caller.assetSystem.themes.delete({ id: created.id });
      expect(result.success).toBe(true);

      await expect(
        caller.assetSystem.themes.get({ id: created.id })
      ).rejects.toThrow('Theme not found');
    });

    it('should fail to delete theme owned by another user', async () => {
      const caller = appRouter.createCaller(ctx);
      const otherCaller = appRouter.createCaller(otherUserCtx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'My Theme',
        promptModifier: 'my prompt',
      });

      await expect(
        otherCaller.assetSystem.themes.delete({ id: created.id })
      ).rejects.toThrow('Theme not found or not owned by you');
    });

    it('should fail to delete non-existent theme', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.delete({ id: 'non-existent-id' })
      ).rejects.toThrow('Theme not found or not owned by you');
    });
  });

  describe('list', () => {
    it('should list themes for current user', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await caller.assetSystem.themes.create({
        name: 'Theme 1',
        promptModifier: 'prompt 1',
      });

      await caller.assetSystem.themes.create({
        name: 'Theme 2',
        promptModifier: 'prompt 2',
      });

      const themes = await caller.assetSystem.themes.list();
      
      expect(themes.length).toBeGreaterThanOrEqual(2);
      expect(themes.every(t => t.creatorUserId === 'test-user-id')).toBe(true);
    });

    it('should not list themes from other users', async () => {
      const caller = appRouter.createCaller(ctx);
      const otherCaller = appRouter.createCaller(otherUserCtx);
      
      await otherCaller.assetSystem.themes.create({
        name: 'Other User Theme',
        promptModifier: 'other prompt',
      });

      const themes = await caller.assetSystem.themes.list();
      
      expect(themes.every(t => t.creatorUserId === 'test-user-id')).toBe(true);
      expect(themes.find(t => t.name === 'Other User Theme')).toBeUndefined();
    });

    it('should support pagination with limit', async () => {
      const caller = appRouter.createCaller(ctx);
      
      for (let i = 0; i < 5; i++) {
        await caller.assetSystem.themes.create({
          name: `Theme ${i}`,
          promptModifier: `prompt ${i}`,
        });
      }

      const themes = await caller.assetSystem.themes.list({ limit: 3 });
      expect(themes.length).toBeLessThanOrEqual(3);
    });

    it('should support pagination with offset', async () => {
      const caller = appRouter.createCaller(ctx);
      
      for (let i = 0; i < 5; i++) {
        await caller.assetSystem.themes.create({
          name: `Offset Theme ${i}`,
          promptModifier: `prompt ${i}`,
        });
      }

      const firstPage = await caller.assetSystem.themes.list({ limit: 2, offset: 0 });
      const secondPage = await caller.assetSystem.themes.list({ limit: 2, offset: 2 });
      
      expect(firstPage.length).toBe(2);
      expect(secondPage.length).toBe(2);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    it('should support search by name', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await caller.assetSystem.themes.create({
        name: 'Space Adventure',
        promptModifier: 'space theme',
      });

      await caller.assetSystem.themes.create({
        name: 'Ocean Quest',
        promptModifier: 'ocean theme',
      });

      const themes = await caller.assetSystem.themes.list({ query: 'space' });
      
      expect(themes.some(t => t.name === 'Space Adventure')).toBe(true);
      expect(themes.every(t => 
        t.name.toLowerCase().includes('space') || 
        t.promptModifier.toLowerCase().includes('space')
      )).toBe(true);
    });

    it('should support search by promptModifier', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await caller.assetSystem.themes.create({
        name: 'Theme A',
        promptModifier: 'futuristic cyberpunk setting',
      });

      await caller.assetSystem.themes.create({
        name: 'Theme B',
        promptModifier: 'medieval fantasy setting',
      });

      const themes = await caller.assetSystem.themes.list({ query: 'cyberpunk' });
      
      expect(themes.some(t => t.promptModifier.includes('cyberpunk'))).toBe(true);
    });

    it('should return empty array when no themes match search', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const themes = await caller.assetSystem.themes.list({ query: 'nonexistent-search-term-xyz' });
      expect(themes).toEqual([]);
    });

    it('should not list deleted themes', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const created = await caller.assetSystem.themes.create({
        name: 'Will Be Deleted',
        promptModifier: 'deleted prompt',
      });

      await caller.assetSystem.themes.delete({ id: created.id });

      const themes = await caller.assetSystem.themes.list();
      expect(themes.find(t => t.id === created.id)).toBeUndefined();
    });

    it('should order by created_at DESC', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const first = await caller.assetSystem.themes.create({
        name: 'First Theme',
        promptModifier: 'first',
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await caller.assetSystem.themes.create({
        name: 'Second Theme',
        promptModifier: 'second',
      });

      const themes = await caller.assetSystem.themes.list();
      
      const firstIndex = themes.findIndex(t => t.id === first.id);
      const secondIndex = themes.findIndex(t => t.id === second.id);
      
      if (firstIndex !== -1 && secondIndex !== -1) {
        expect(secondIndex).toBeLessThan(firstIndex);
      }
    });
  });

  describe('listPublic', () => {
    it('should list only public themes', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const privateTheme = await caller.assetSystem.themes.create({
        name: 'Private Theme',
        promptModifier: 'private prompt',
      });

      // Manually set a theme as public for testing
      await env.DB.prepare(
        'UPDATE themes SET is_public = 1 WHERE id = ?'
      ).bind(privateTheme.id).run();

      const publicThemes = await caller.assetSystem.themes.listPublic();
      
      expect(publicThemes.every(t => t.isPublic === true)).toBe(true);
    });

    it('should support pagination', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const themes = await caller.assetSystem.themes.listPublic({ limit: 5, offset: 0 });
      expect(themes.length).toBeLessThanOrEqual(5);
    });

    it('should support search by name', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const theme = await caller.assetSystem.themes.create({
        name: 'Public Space Theme',
        promptModifier: 'space setting',
      });

      await env.DB.prepare(
        'UPDATE themes SET is_public = 1 WHERE id = ?'
      ).bind(theme.id).run();

      const themes = await caller.assetSystem.themes.listPublic({ query: 'space' });
      
      expect(themes.some(t => t.name.toLowerCase().includes('space'))).toBe(true);
    });

    it('should support search by promptModifier', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const theme = await caller.assetSystem.themes.create({
        name: 'Public Theme',
        promptModifier: 'unique-search-term-xyz',
      });

      await env.DB.prepare(
        'UPDATE themes SET is_public = 1 WHERE id = ?'
      ).bind(theme.id).run();

      const themes = await caller.assetSystem.themes.listPublic({ query: 'unique-search-term-xyz' });
      
      expect(themes.some(t => t.promptModifier.includes('unique-search-term-xyz'))).toBe(true);
    });

    it('should not list deleted public themes', async () => {
      const caller = appRouter.createCaller(ctx);
      
      const theme = await caller.assetSystem.themes.create({
        name: 'Public Deleted',
        promptModifier: 'will be deleted',
      });

      await env.DB.prepare(
        'UPDATE themes SET is_public = 1 WHERE id = ?'
      ).bind(theme.id).run();

      await caller.assetSystem.themes.delete({ id: theme.id });

      const themes = await caller.assetSystem.themes.listPublic();
      expect(themes.find(t => t.id === theme.id)).toBeUndefined();
    });
  });

  describe('enhancePrompt', () => {
    it('should return enhanced prompt when API is configured', async () => {
      // Skip if OPENROUTER_API_KEY is not configured
      if (!env.OPENROUTER_API_KEY) {
        console.log('Skipping enhancePrompt test - OPENROUTER_API_KEY not configured');
        return;
      }

      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.assetSystem.themes.enhancePrompt({
        prompt: 'space theme',
        name: 'Space Adventure',
      });

      expect(result.enhancedPrompt).toBeDefined();
      expect(typeof result.enhancedPrompt).toBe('string');
      expect(result.enhancedPrompt.length).toBeGreaterThan(0);
    });

    it('should work without name parameter', async () => {
      // Skip if OPENROUTER_API_KEY is not configured
      if (!env.OPENROUTER_API_KEY) {
        console.log('Skipping enhancePrompt test - OPENROUTER_API_KEY not configured');
        return;
      }

      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.assetSystem.themes.enhancePrompt({
        prompt: 'medieval fantasy',
      });

      expect(result.enhancedPrompt).toBeDefined();
      expect(typeof result.enhancedPrompt).toBe('string');
    });

    it('should throw error when API is not configured', async () => {
      // Temporarily remove API key
      const originalKey = env.OPENROUTER_API_KEY;
      env.OPENROUTER_API_KEY = undefined as any;

      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.enhancePrompt({
          prompt: 'test prompt',
        })
      ).rejects.toThrow('AI enhancement is not configured');

      // Restore API key
      env.OPENROUTER_API_KEY = originalKey;
    });

    it('should reject empty prompt', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.enhancePrompt({
          prompt: '',
        })
      ).rejects.toThrow();
    });

    it('should reject prompt exceeding 1000 characters', async () => {
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.assetSystem.themes.enhancePrompt({
          prompt: 'a'.repeat(1001),
        })
      ).rejects.toThrow();
    });
  });
});
