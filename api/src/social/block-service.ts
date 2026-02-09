import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export class BlockService {
  constructor(private db: D1Database) {}

  async block(blockerId: string, blockedId: string): Promise<{ blocked: true }> {
    if (blockerId === blockedId) {
      throw new BlockValidationError('Cannot block yourself');
    }

    const existing = await this.db
      .prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
      .bind(blockerId, blockedId)
      .first();

    if (existing) return { blocked: true };

    const id = nanoid();
    const now = Date.now();

    await this.db.prepare(`
      INSERT INTO blocks (id, blocker_id, blocked_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, blockerId, blockedId, now).run();

    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string): Promise<{ unblocked: true }> {
    await this.db
      .prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
      .bind(blockerId, blockedId)
      .run();

    return { unblocked: true };
  }

  async isBlocked(blockerId: string, blockedIds: string[]): Promise<Record<string, boolean>> {
    if (blockedIds.length === 0) return {};

    const placeholders = blockedIds.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT blocked_id FROM blocks WHERE blocker_id = ? AND blocked_id IN (${placeholders})`)
      .bind(blockerId, ...blockedIds)
      .all<{ blocked_id: string }>();

    const blockedSet = new Set((result.results ?? []).map(r => r.blocked_id));
    const status: Record<string, boolean> = {};
    for (const id of blockedIds) {
      status[id] = blockedSet.has(id);
    }
    return status;
  }

  async getBlockedIds(blockerId: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ? ORDER BY created_at DESC')
      .bind(blockerId)
      .all<{ blocked_id: string }>();

    return (result.results ?? []).map(r => r.blocked_id);
  }

  async listBlocked(
    blockerId: string,
    limit: number,
    offset: number
  ): Promise<{
    blocked: Array<{ id: string; displayName: string | null; avatarUrl: string | null; blockedAt: number }>;
    total: number;
  }> {
    const [result, countResult] = await Promise.all([
      this.db.prepare(`
        SELECT u.id, u.display_name, u.avatar_url, b.created_at as blocked_at
        FROM blocks b
        JOIN users u ON b.blocked_id = u.id
        WHERE b.blocker_id = ?
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(blockerId, limit, offset).all<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        blocked_at: number;
      }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM blocks WHERE blocker_id = ?')
        .bind(blockerId)
        .first<{ count: number }>(),
    ]);

    return {
      blocked: (result.results ?? []).map(r => ({
        id: r.id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        blockedAt: r.blocked_at,
      })),
      total: countResult?.count ?? 0,
    };
  }
}

export class BlockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockValidationError';
  }
}
