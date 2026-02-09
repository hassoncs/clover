import { beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../../router';
import {
  initTestDatabase,
  createAuthenticatedContext,
  TEST_USER,
  TEST_USER_2,
  createTestUser,
} from '@/__fixtures__/test-utils';

describe('Social Router - Bookmarks & Feed', () => {
  let gameId = '';

  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);

    const ctx = createAuthenticatedContext(TEST_USER);
    const caller = appRouter.createCaller(ctx);
    const game = await caller.games.create({
      title: `Bookmarks Test Game ${Date.now()}`,
      definition: '{}',
      isPublic: true,
    });
    gameId = game.id;
  });

  it('bookmark bookmarks a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.unbookmark({ gameId });
    const result = await caller.social.bookmark({ gameId });

    expect(result.bookmarked).toBe(true);
  });

  it('unbookmark unbookmarks a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.bookmark({ gameId });
    const result = await caller.social.unbookmark({ gameId });

    expect(result.unbookmarked).toBe(true);
  });

  it('isBookmarked checks bookmark status', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.bookmark({ gameId });
    const result = await caller.social.isBookmarked({ gameIds: [gameId] });

    expect(result[gameId]).toBe(true);
  });

  it('listBookmarks lists bookmarked games', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.unbookmark({ gameId });
    await caller.social.bookmark({ gameId });
    const result = await caller.social.listBookmarks({});

    expect(result).toContain(gameId);
  });

  it('feed gets global feed', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const result = await caller.social.feed({ limit: 10, offset: 0 });

    expect(result.games.length).toBeGreaterThan(0);
    expect(typeof result.hasMore).toBe('boolean');
  });
});
