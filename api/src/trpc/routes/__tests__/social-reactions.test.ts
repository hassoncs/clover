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

describe('Social Router - Reactions & Ratings', () => {
  let gameId = '';

  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);

    const ctx = createAuthenticatedContext(TEST_USER);
    const caller = appRouter.createCaller(ctx);
    const game = await caller.games.create({
      title: `Reactions Test Game ${Date.now()}`,
      definition: '{}',
      isPublic: true,
    });
    gameId = game.id;
  });

  it('addReaction likes a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER_2));
    await caller.social.removeReaction({ targetType: 'game', targetId: gameId });
    const result = await caller.social.addReaction({ targetType: 'game', targetId: gameId });

    expect(result.added).toBe(true);
  });

  it('removeReaction unlikes a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER_2));
    await caller.social.addReaction({ targetType: 'game', targetId: gameId });
    const result = await caller.social.removeReaction({ targetType: 'game', targetId: gameId });

    expect(result.removed).toBe(true);
  });

  it('getReactionStatus checks reaction status', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.addReaction({ targetType: 'game', targetId: gameId });
    const result = await caller.social.getReactionStatus({ targetType: 'game', targetIds: [gameId] });

    expect(result[gameId]).toBe(true);
  });

  it('rateGame rates a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const result = await caller.social.rateGame({ gameId, score: 4 });

    expect(result.averageScore).toBeGreaterThan(0);
    expect(result.userRating).toBe(4);
  });

  it('getRating gets rating summary', async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.social.getRating({ gameId });

    expect(result.totalRatings).toBeGreaterThanOrEqual(0);
    expect(typeof result.averageScore).toBe('number');
  });
});
