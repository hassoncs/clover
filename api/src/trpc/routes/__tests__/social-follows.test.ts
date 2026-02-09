import { beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../../router';
import {
  initTestDatabase,
  createAuthenticatedContext,
  createPublicContext,
  TEST_USER,
  TEST_USER_2,
  createTestUser,
} from '@/__fixtures__/test-utils';

describe('Social Router - Follows & Profile', () => {
  let gameId = '';

  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);

    const ctx = createAuthenticatedContext(TEST_USER);
    const caller = appRouter.createCaller(ctx);
    const game = await caller.games.create({
      title: `Follows Test Game ${Date.now()}`,
      definition: '{}',
      isPublic: true,
    });
    gameId = game.id;
  });

  it('follow follows a user', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const result = await caller.social.follow({ targetType: 'user', targetId: TEST_USER_2.id });

    expect(result.followed).toBe(true);
  });

  it('unfollow unfollows a user', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.follow({ targetType: 'user', targetId: TEST_USER_2.id });
    const result = await caller.social.unfollow({ targetType: 'user', targetId: TEST_USER_2.id });

    expect(result.unfollowed).toBe(true);
  });

  it('isFollowing checks follow status', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.follow({ targetType: 'user', targetId: TEST_USER_2.id });
    const result = await caller.social.isFollowing({ targetType: 'user', targetIds: [TEST_USER_2.id] });

    expect(result[TEST_USER_2.id]).toBe(true);
  });

  it('getUserProfile gets user profile', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER_2));
    const result = await caller.social.getUserProfile({ userId: TEST_USER.id });

    expect(result.id).toBe(TEST_USER.id);
    expect(result.gameCount).toBeGreaterThanOrEqual(1);
  });

  it('getFollowers lists followers', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.follow({ targetType: 'user', targetId: TEST_USER_2.id });

    const pubCaller = appRouter.createCaller(createPublicContext());
    const result = await pubCaller.social.getFollowers({ userId: TEST_USER_2.id });

    expect(result.map(u => u.id)).toContain(TEST_USER.id);
  });

  it('getFollowing lists following', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.follow({ targetType: 'user', targetId: TEST_USER_2.id });

    const pubCaller = appRouter.createCaller(createPublicContext());
    const result = await pubCaller.social.getFollowing({ userId: TEST_USER.id });

    expect(result.map(u => u.id)).toContain(TEST_USER_2.id);
  });
});
