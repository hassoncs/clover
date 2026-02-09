type D1Database = import('@cloudflare/workers-types').D1Database;

interface CreateNotificationParams {
  userId: string;
  type: string;
  actorId: string;
  targetType?: string;
  targetId?: string;
  gameId?: string;
  message: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  actor_id: string;
  target_type: string | null;
  target_id: string | null;
  game_id: string | null;
  message: string | null;
  is_read: number;
  created_at: number;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NotificationWithActor {
  id: string;
  type: string;
  actorId: string;
  actorName: string | null;
  actorAvatarUrl: string | null;
  targetType: string | null;
  targetId: string | null;
  gameId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: number;
}

export class NotificationService {
  constructor(private db: D1Database) {}

  async createNotification(params: CreateNotificationParams): Promise<void> {
    if (params.actorId === params.userId) return;

    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(`
        INSERT INTO notifications (id, user_id, type, actor_id, target_type, target_id, game_id, message, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `)
      .bind(
        id,
        params.userId,
        params.type,
        params.actorId,
        params.targetType ?? null,
        params.targetId ?? null,
        params.gameId ?? null,
        params.message,
        now,
      )
      .run();
  }

  async listNotifications(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ notifications: NotificationWithActor[]; total: number }> {
    const [result, countResult] = await Promise.all([
      this.db
        .prepare(`
          SELECT n.*, u.display_name, u.avatar_url
          FROM notifications n
          LEFT JOIN users u ON n.actor_id = u.id
          WHERE n.user_id = ?
          ORDER BY n.created_at DESC
          LIMIT ? OFFSET ?
        `)
        .bind(userId, limit, offset)
        .all<NotificationRow>(),
      this.db
        .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?')
        .bind(userId)
        .first<{ count: number }>(),
    ]);

    const rows = result.results ?? [];

    return {
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        actorId: row.actor_id,
        actorName: row.display_name,
        actorAvatarUrl: row.avatar_url,
        targetType: row.target_type,
        targetId: row.target_id,
        gameId: row.game_id,
        message: row.message,
        isRead: row.is_read === 1,
        createdAt: row.created_at,
      })),
      total: countResult?.count ?? 0,
    };
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map(() => '?').join(',');
    await this.db
      .prepare(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      )
      .bind(userId, ...notificationIds)
      .run();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .run();
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .first<{ count: number }>();

    return { count: result?.count ?? 0 };
  }
}
