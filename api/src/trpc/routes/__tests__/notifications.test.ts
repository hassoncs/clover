import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { appRouter } from '../../router'
import {
  initTestDatabase,
  createAuthenticatedContext,
  TEST_USER,
  TEST_USER_2,
  createTestUser,
} from '@/__fixtures__/test-utils'

async function insertNotification(params: {
  id: string;
  userId: string;
  actorId: string;
  createdAt: number;
}): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO notifications (id, user_id, type, actor_id, target_type, target_id, game_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
  )
    .bind(
      params.id,
      params.userId,
      'comment',
      params.actorId,
      'game',
      `target-${params.id}`,
      `game-${params.id}`,
      `message-${params.id}`,
      params.createdAt,
    )
    .run();
}

describe('Notifications Router', () => {
  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);
  });

  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM notifications').run();
  });

  describe('list procedure', () => {
    it('lists notifications for authenticated user', async () => {
      const notificationId = `notif-list-${Date.now()}`;
      await insertNotification({
        id: notificationId,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });

      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.list({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.id).toBe(notificationId);
      expect(result.notifications[0]?.actorId).toBe(TEST_USER_2.id);
      expect(result.notifications[0]?.isRead).toBe(false);
    });
  });

  describe('markAsRead procedure', () => {
    it('marks specific notifications as read', async () => {
      const notificationId = `notif-read-${Date.now()}`;
      await insertNotification({
        id: notificationId,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });

      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.markAsRead({
        notificationIds: [notificationId],
      });

      expect(result).toEqual({ success: true });

      const updated = await env.DB.prepare(
        'SELECT is_read FROM notifications WHERE id = ?'
      ).bind(notificationId).first<{ is_read: number }>();

      expect(updated?.is_read).toBe(1);
    });
  });

  describe('markAllAsRead procedure', () => {
    it('marks all unread notifications as read', async () => {
      await insertNotification({
        id: `notif-all-1-${Date.now()}`,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });
      await insertNotification({
        id: `notif-all-2-${Date.now()}`,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });

      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.markAllAsRead();

      expect(result).toEqual({ success: true });

      const unread = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
      ).bind(TEST_USER.id).first<{ count: number }>();

      expect(unread?.count).toBe(0);
    });
  });

  describe('unreadCount procedure', () => {
    it('returns unread notification count', async () => {
      const unreadOne = `notif-unread-1-${Date.now()}`;
      const unreadTwo = `notif-unread-2-${Date.now()}`;
      const readOne = `notif-read-1-${Date.now()}`;

      await insertNotification({
        id: unreadOne,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });
      await insertNotification({
        id: unreadTwo,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });
      await insertNotification({
        id: readOne,
        userId: TEST_USER.id,
        actorId: TEST_USER_2.id,
        createdAt: Date.now(),
      });
      await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')
        .bind(readOne)
        .run();

      const ctx = createAuthenticatedContext(TEST_USER);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.unreadCount();

      expect(result).toEqual({ count: 2 });
    });
  });
});
