import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../router';
import {
  initTestDatabase,
  createAuthenticatedContext,
  TEST_USER,
  TEST_USER_2,
} from '../../__fixtures__/test-utils';

describe('Users Router', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  describe('me route', () => {
    it('should return current user info', async () => {
      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const user = await caller.users.me();

      expect(user.id).toBe(TEST_USER.id);
      expect(user.email).toBe(TEST_USER.email);
      expect(user.displayName).toBe(TEST_USER.displayName);
    });

    it('should return different user for different context', async () => {
      const ctx = createAuthenticatedContext(TEST_USER_2);
      const caller = appRouter.createCaller(ctx);

      const user = await caller.users.me();

      expect(user.id).toBe(TEST_USER_2.id);
      expect(user.email).toBe(TEST_USER_2.email);
    });
  });

  describe('syncFromAuth route', () => {
    it('should sync user to database', async () => {
      const newUser = {
        id: 'sync-test-user-' + Date.now(),
        email: 'sync-test@example.com',
        displayName: 'Sync Test User',
      };

      const ctx = createAuthenticatedContext(newUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.users.syncFromAuth();

      expect(result.synced).toBe(true);

      const dbUser = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(newUser.id).first();

      expect(dbUser).toBeDefined();
      expect(dbUser!.email).toBe(newUser.email);
      expect(dbUser!.display_name).toBe(newUser.displayName);
    });

    it('should update existing user on sync', async () => {
      const userId = 'update-sync-user-' + Date.now();
      const initialUser = {
        id: userId,
        email: 'initial@example.com',
        displayName: 'Initial Name',
      };

      const ctx1 = createAuthenticatedContext(initialUser);
      const caller1 = appRouter.createCaller(ctx1);
      await caller1.users.syncFromAuth();

      const updatedUser = {
        id: userId,
        email: 'updated@example.com',
        displayName: 'Updated Name',
      };

      const ctx2 = createAuthenticatedContext(updatedUser);
      const caller2 = appRouter.createCaller(ctx2);
      await caller2.users.syncFromAuth();

      const dbUser = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(userId).first();

      expect(dbUser!.email).toBe('updated@example.com');
      expect(dbUser!.display_name).toBe('Updated Name');
    });
  });
});
