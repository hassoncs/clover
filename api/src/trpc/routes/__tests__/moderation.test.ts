import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appRouter } from '../../router'
import {
  initTestDatabase,
  createAuthenticatedContext,
  TEST_USER,
  TEST_USER_2,
  createTestUser,
} from '@/__fixtures__/test-utils'

const GAME_ID = `moderation-game-${Date.now()}`;
const TEST_USER_3 = {
  id: `test-user-3-${Date.now()}`,
  email: 'test3@example.com',
  displayName: 'Test User 3',
};

describe('Moderation Router', () => {
  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);
    await createTestUser(TEST_USER_3);

    const now = Date.now();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO games (
        id, user_id, install_id, title, description, r2_prefix, is_public, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        GAME_ID,
        TEST_USER_2.id,
        'test-install-id',
        'Moderation Test Game',
        'Game for moderation tests',
        'games/moderation-test',
        1,
        now,
        now
      )
      .run();
  });

  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM reports').run();
    await env.DB.prepare('DELETE FROM blocks').run();
  });

  describe('report procedure', () => {
    it('creates a report for a game', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.moderation.report({
        targetType: 'game',
        targetId: GAME_ID,
        reason: 'spam',
        description: 'Looks like spam content',
      });

      expect(result.created).toBe(true);

      const report = await env.DB.prepare(
        'SELECT reporter_id, target_type, target_id, reason FROM reports WHERE id = ?'
      )
        .bind(result.id)
        .first<{
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
        }>();

      expect(report).toBeDefined();
      expect(report?.reporter_id).toBe(TEST_USER.id);
      expect(report?.target_type).toBe('game');
      expect(report?.target_id).toBe(GAME_ID);
      expect(report?.reason).toBe('spam');
    });
  });

  describe('block procedure', () => {
    it('blocks another user', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.moderation.block({ userId: TEST_USER_2.id });

      expect(result).toEqual({ blocked: true });
    });

    it('rejects self-blocking', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.moderation.block({ userId: TEST_USER.id })
      ).rejects.toThrow('Cannot block yourself');
    });
  });

  describe('unblock procedure', () => {
    it('unblocks a previously blocked user', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      await caller.moderation.block({ userId: TEST_USER_3.id });
      const result = await caller.moderation.unblock({ userId: TEST_USER_3.id });

      expect(result).toEqual({ unblocked: true });

      const block = await env.DB.prepare(
        'SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?'
      )
        .bind(TEST_USER.id, TEST_USER_3.id)
        .first();

      expect(block).toBeNull();
    });
  });

  describe('listBlocked procedure', () => {
    it('lists blocked users', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      await caller.moderation.block({ userId: TEST_USER_3.id });
      const result = await caller.moderation.listBlocked({ limit: 20, offset: 0 });

      expect(result.total).toBeGreaterThan(0);
      expect(result.blocked.some((user: { id: string }) => user.id === TEST_USER_3.id)).toBe(true);
    });
  });

  describe('isBlocked procedure', () => {
    it('returns block status by user id list', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      await caller.moderation.block({ userId: TEST_USER_2.id });
      const result = await caller.moderation.isBlocked({
        userIds: [TEST_USER_2.id, TEST_USER_3.id],
      });

      expect(result[TEST_USER_2.id]).toBe(true);
      expect(result[TEST_USER_3.id]).toBe(false);
    });
  });
});
