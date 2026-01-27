import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { appRouter } from '../router';
import {
  initTestDatabase,
  createAuthenticatedContext,
  createPublicContext,
  createTestUser,
  TEST_USER,
} from '../../__fixtures__/test-utils';

describe('Assets Router', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  describe('status route', () => {
    it('should return configuration status', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.assets.status();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('timestamp');
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.timestamp).toBe('number');
    });

    it('should return false when Scenario API is not configured', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.assets.status();

      expect(status.configured).toBe(false);
    });
  });

  describe('list route', () => {
    let installId: string;
    let assetId1: string;
    let assetId2: string;

    beforeEach(async () => {
      installId = 'asset-test-install-' + Date.now();
      assetId1 = crypto.randomUUID();
      assetId2 = crypto.randomUUID();

      // Create test user first (required for foreign key constraint)
      await createTestUser();

      await env.DB.prepare(
        `INSERT INTO assets (id, user_id, install_id, entity_type, description, style, r2_key, width, height, is_animated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        assetId1,
        TEST_USER.id,
        installId,
        'character',
        'A hero sprite',
        'pixel',
        'assets/test-1.png',
        64,
        64,
        0,
        Date.now()
      ).run();

      await env.DB.prepare(
        `INSERT INTO assets (id, user_id, install_id, entity_type, description, style, r2_key, width, height, is_animated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        assetId2,
        TEST_USER.id,
        installId,
        'enemy',
        'A monster sprite',
        'cartoon',
        'assets/test-2.png',
        128,
        128,
        0,
        Date.now()
      ).run();
    });

    it('should list assets for user', async () => {
      const ctx = createAuthenticatedContext(TEST_USER, installId);
      const caller = appRouter.createCaller(ctx);

      const assets = await caller.assets.list();

      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.some(a => a.id === assetId1)).toBe(true);
      expect(assets.some(a => a.id === assetId2)).toBe(true);
    });

    it('should filter assets by entity type', async () => {
      const ctx = createAuthenticatedContext(TEST_USER, installId);
      const caller = appRouter.createCaller(ctx);

      const characterAssets = await caller.assets.list({ entityType: 'character' });

      expect(characterAssets.some(a => a.entityType === 'character')).toBe(true);
      expect(characterAssets.every(a => a.entityType === 'character')).toBe(true);
    });

    it('should support pagination', async () => {
      const ctx = createAuthenticatedContext(TEST_USER, installId);
      const caller = appRouter.createCaller(ctx);

      const page1 = await caller.assets.list({ limit: 1, offset: 0 });
      expect(page1.length).toBeLessThanOrEqual(1);
    });

    it('should return asset with correct structure', async () => {
      const ctx = createAuthenticatedContext(TEST_USER, installId);
      const caller = appRouter.createCaller(ctx);

      const assets = await caller.assets.list();
      const asset = assets.find(a => a.id === assetId1);

      expect(asset).toBeDefined();
      expect(asset!.entityType).toBe('character');
      expect(asset!.description).toBe('A hero sprite');
      expect(asset!.style).toBe('pixel');
      expect(asset!.width).toBe(64);
      expect(asset!.height).toBe(64);
      expect(asset!.isAnimated).toBe(false);
      expect(asset!.assetUrl).toContain('assets/test-1.png');
    });
  });

  describe('get route', () => {
    let assetId: string;

    beforeEach(async () => {
      assetId = crypto.randomUUID();

      await env.DB.prepare(
        `INSERT INTO assets (id, user_id, install_id, entity_type, description, style, r2_key, width, height, is_animated, frame_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        assetId,
        null,
        'test-install',
        'item',
        'A collectible coin',
        'flat',
        'assets/coin.png',
        32,
        32,
        1,
        4,
        Date.now()
      ).run();
    });

    it('should get asset by ID', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const asset = await caller.assets.get({ id: assetId });

      expect(asset.id).toBe(assetId);
      expect(asset.entityType).toBe('item');
      expect(asset.description).toBe('A collectible coin');
      expect(asset.style).toBe('flat');
      expect(asset.width).toBe(32);
      expect(asset.height).toBe(32);
      expect(asset.isAnimated).toBe(true);
      expect(asset.frameCount).toBe(4);
    });

    it('should throw NOT_FOUND for non-existent asset', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.assets.get({ id: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toThrow('Asset not found');
    });
  });

});
