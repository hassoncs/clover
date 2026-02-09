import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../../router'
import {
  initTestDatabase,
  createAuthenticatedContext,
  createPublicContext,
  TEST_USER,
  TEST_USER_2,
  createTestUser,
} from '@/__fixtures__/test-utils'

const BASE_GAME_ID = `social-extra-base-game-${Date.now()}`;
const SEARCH_USER = {
  id: `social-extra-search-user-${Date.now()}`,
  email: 'social-extra-search@example.com',
  displayName: 'Social Extra Search Target',
};

async function createPublicGame(gameId: string, userId: string, title: string): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO games (
      id, user_id, install_id, title, description, r2_prefix, is_public, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      gameId,
      userId,
      'test-install-id',
      title,
      `${title} description`,
      `games/${gameId}`,
      1,
      now,
      now
    )
    .run();
}

describe('Social Extra Router', () => {
  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);
    await createTestUser(SEARCH_USER);
    await createPublicGame(BASE_GAME_ID, TEST_USER_2.id, 'Base Social Extra Game');
  });

  describe('followingFeed procedure', () => {
    it('returns feed games from followed users', async () => {
      const followerCtx = createAuthenticatedContext(TEST_USER);
      const followerCaller = appRouter.createCaller(followerCtx);

      await followerCaller.social.follow({
        targetType: 'user',
        targetId: TEST_USER_2.id,
      });

      const followedGameId = `social-extra-following-feed-${Date.now()}`;
      await createPublicGame(followedGameId, TEST_USER_2.id, 'Followed User Game');

      const feed = await followerCaller.socialExtra.followingFeed({
        limit: 20,
        offset: 0,
      });

      expect(feed.games.some((game) => game.id === followedGameId)).toBe(true);
      expect(feed.games.find((game) => game.id === followedGameId)?.creator.id).toBe(TEST_USER_2.id);
    });
  });

  describe('searchUsers procedure', () => {
    it('searches users by display name', async () => {
      const publicCtx = createPublicContext();
      const caller = appRouter.createCaller(publicCtx);

      const result = await caller.socialExtra.searchUsers({
        query: 'Search Target',
        limit: 20,
        offset: 0,
      });

      expect(result.users.some((user) => user.id === SEARCH_USER.id)).toBe(true);
    });
  });

  describe('suggestedUsers procedure', () => {
    it('returns suggested users for public callers', async () => {
      const publicCtx = createPublicContext();
      const caller = appRouter.createCaller(publicCtx);

      const result = await caller.socialExtra.suggestedUsers({ limit: 10 });

      expect(result.users.length).toBeGreaterThan(0);
      expect(result.users.some((user) => user.id === TEST_USER_2.id)).toBe(true);
    });
  });

  describe('getLikers procedure', () => {
    it('returns users who liked a game', async () => {
      const authCtx = createAuthenticatedContext(TEST_USER);
      const authCaller = appRouter.createCaller(authCtx);
      const gameId = `social-extra-likers-game-${Date.now()}`;

      await createPublicGame(gameId, TEST_USER_2.id, 'Likers Game');
      await authCaller.social.addReaction({
        targetType: 'game',
        targetId: gameId,
        reactionType: 'like',
      });

      const publicCtx = createPublicContext();
      const publicCaller = appRouter.createCaller(publicCtx);
      const result = await publicCaller.socialExtra.getLikers({
        targetType: 'game',
        targetId: gameId,
        limit: 20,
        offset: 0,
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.users.some((user) => user.id === TEST_USER.id)).toBe(true);
    });
  });

  describe('myLikedGames procedure', () => {
    it('returns games liked by the current user', async () => {
      const authCtx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(authCtx);
      const gameId = `social-extra-my-liked-game-${Date.now()}`;

      await createPublicGame(gameId, TEST_USER_2.id, 'My Liked Game');
      await caller.social.addReaction({
        targetType: 'game',
        targetId: gameId,
        reactionType: 'like',
      });

      const result = await caller.socialExtra.myLikedGames({
        limit: 20,
        offset: 0,
      });

      expect(result.games.some((game) => game.id === gameId)).toBe(true);
    });
  });

  describe('mySavedGames procedure', () => {
    it('returns games bookmarked by the current user', async () => {
      const authCtx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(authCtx);
      const gameId = `social-extra-my-saved-game-${Date.now()}`;

      await createPublicGame(gameId, TEST_USER_2.id, 'My Saved Game');
      await caller.social.bookmark({ gameId });

      const result = await caller.socialExtra.mySavedGames({
        limit: 20,
        offset: 0,
      });

      expect(result.games.some((game) => game.id === gameId)).toBe(true);
    });
  });
});
