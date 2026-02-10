import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ChatEventStore } from '../chat-event-store';
import { createAuthenticatedContext, createTestUser, initTestDatabase, TEST_USER } from '../../__fixtures__/test-utils';

describe('ChatEventStore', () => {
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

  it('appends events with incrementing seq', async () => {
    const now = Date.now();
    const gameId = crypto.randomUUID();
    const threadId = crypto.randomUUID();

    await testEnv.DB.prepare(
      'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(gameId, TEST_USER.id, 'Test Game', `games/${gameId}`, now, now).run();

    await testEnv.DB.prepare(
      `INSERT INTO chat_threads (id, user_id, game_id, title, status, last_event_seq, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 0, ?, ?)`
    ).bind(threadId, TEST_USER.id, gameId, 'Test Thread', now, now).run();

    const store = new ChatEventStore(testEnv.DB);

    const first = await store.appendEvent({
      threadId,
      eventType: 'user_message',
      role: 'user',
      payload: { version: 1, type: 'user_message', text: 'Hello' },
    });

    const second = await store.appendEvent({
      threadId,
      eventType: 'assistant_message',
      role: 'assistant',
      payload: { version: 1, type: 'assistant_message', text: 'Hi there' },
    });

    expect(first.seq).toBe(1);
    expect(second.seq).toBe(2);

    const thread = await testEnv.DB
      .prepare('SELECT last_event_seq FROM chat_threads WHERE id = ?')
      .bind(threadId)
      .first<{ last_event_seq: number }>();

    expect(thread?.last_event_seq).toBe(2);

    const events = await store.getEventsAfter(threadId, 0, 10);
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('user_message');
    expect(events[1].eventType).toBe('assistant_message');
  });
});
