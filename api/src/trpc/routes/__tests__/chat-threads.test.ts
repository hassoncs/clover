import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createAuthenticatedCaller,
  createAuthenticatedContext,
  createTestUser,
  initTestDatabase,
  TEST_USER,
} from '../../../__fixtures__/test-utils';

describe('Chat Threads Router', () => {
  const testEnv = createAuthenticatedContext(TEST_USER).env;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    await testEnv.DB.prepare('DELETE FROM chat_events').run();
    await testEnv.DB.prepare('DELETE FROM chat_threads').run();
    await testEnv.DB.prepare('DELETE FROM games').run();
    await testEnv.DB.prepare('DELETE FROM users').run();

    await createTestUser(TEST_USER);
  });

  it('creates a thread for owned game', async () => {
    const caller = createAuthenticatedCaller(TEST_USER);
    const now = Date.now();
    const gameId = crypto.randomUUID();

    await testEnv.DB.prepare(
      'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(gameId, TEST_USER.id, 'Test Game', `games/${gameId}`, now, now).run();

    const result = await caller.chatThreads.createThread({
      gameId,
      title: 'Test Thread',
    });

    expect(result.threadId).toBeDefined();

    const row = await testEnv.DB
      .prepare('SELECT * FROM chat_threads WHERE id = ?')
      .bind(result.threadId)
      .first<{ user_id: string; game_id: string; title: string | null; last_event_seq: number }>();

    expect(row?.user_id).toBe(TEST_USER.id);
    expect(row?.game_id).toBe(gameId);
    expect(row?.title).toBe('Test Thread');
    expect(row?.last_event_seq).toBe(0);
  });

  it('appends user messages and reads events', async () => {
    const caller = createAuthenticatedCaller(TEST_USER);
    const now = Date.now();
    const gameId = crypto.randomUUID();

    await testEnv.DB.prepare(
      'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(gameId, TEST_USER.id, 'Test Game', `games/${gameId}`, now, now).run();

    const { threadId } = await caller.chatThreads.createThread({ gameId });

    const event = await caller.chatThreads.appendUserMessage({
      threadId,
      text: 'Hello there',
    });

    expect(event.eventType).toBe('user_message');
    expect(event.seq).toBe(1);

    const eventsResult = await caller.chatThreads.getEvents({
      threadId,
      afterSeq: 0,
    });

    expect(eventsResult.events).toHaveLength(1);
    expect(eventsResult.events[0].seq).toBe(1);
    expect(eventsResult.events[0].payload.type).toBe('user_message');
  });
});
