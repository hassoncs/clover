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

describe('Social Router - Comments', () => {
  let gameId = '';

  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);

    const ctx = createAuthenticatedContext(TEST_USER);
    const caller = appRouter.createCaller(ctx);
    const game = await caller.games.create({
      title: `Comments Test Game ${Date.now()}`,
      definition: '{}',
      isPublic: true,
    });
    gameId = game.id;
  });

  it('addComment adds a top-level comment', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const result = await caller.social.addComment({ gameId, body: 'Top-level comment' });

    expect(result.gameId).toBe(gameId);
    expect(result.userId).toBe(TEST_USER.id);
    expect(result.body).toBe('Top-level comment');
    expect(result.parentId).toBeNull();
  });

  it('listComments lists comments on a game', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    await caller.social.addComment({ gameId, body: 'List me' });

    const pubCaller = appRouter.createCaller(createPublicContext());
    const result = await pubCaller.social.listComments({ gameId });

    expect(result.comments.some(c => c.body === 'List me')).toBe(true);
  });

  it('editComment edits own comment', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const comment = await caller.social.addComment({ gameId, body: 'Original' });
    const result = await caller.social.editComment({ commentId: comment.id, body: 'Edited' });

    expect(result.body).toBe('Edited');
    expect(result.isEdited).toBe(true);
  });

  it('deleteComment deletes own comment', async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
    const comment = await caller.social.addComment({ gameId, body: 'Delete me' });
    const result = await caller.social.deleteComment({ commentId: comment.id });

    expect(result.deleted).toBe(true);
  });
});
