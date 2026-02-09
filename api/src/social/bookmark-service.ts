import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export class BookmarkService {
  constructor(private db: D1Database) {}

  async bookmark(userId: string, gameId: string): Promise<{ bookmarked: boolean }> {
    const existing = await this.db
      .prepare('SELECT id FROM bookmarks WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId)
      .first();

    if (existing) return { bookmarked: false };

    const id = nanoid();
    const now = Date.now();

    await this.db.prepare(`
      INSERT INTO bookmarks (id, user_id, game_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, userId, gameId, now).run();

    return { bookmarked: true };
  }

  async unbookmark(userId: string, gameId: string): Promise<{ unbookmarked: boolean }> {
    const existing = await this.db
      .prepare('SELECT id FROM bookmarks WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId)
      .first();

    if (!existing) return { unbookmarked: false };

    await this.db
      .prepare('DELETE FROM bookmarks WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId)
      .run();

    return { unbookmarked: true };
  }

  async isBookmarked(userId: string, gameIds: string[]): Promise<Record<string, boolean>> {
    if (gameIds.length === 0) return {};

    const placeholders = gameIds.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT game_id FROM bookmarks WHERE user_id = ? AND game_id IN (${placeholders})`)
      .bind(userId, ...gameIds)
      .all<{ game_id: string }>();

    const bookmarkedSet = new Set((result.results ?? []).map(r => r.game_id));
    const status: Record<string, boolean> = {};
    for (const id of gameIds) {
      status[id] = bookmarkedSet.has(id);
    }
    return status;
  }

  async listBookmarks(userId: string, limit = 20, offset = 0): Promise<string[]> {
    const result = await this.db
      .prepare(`
        SELECT game_id FROM bookmarks
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all<{ game_id: string }>();

    return (result.results ?? []).map(r => r.game_id);
  }
}
