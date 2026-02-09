import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

export class FollowService {
  constructor(private db: D1Database) {}

  async follow(followerId: string, targetType: 'user' | 'game', targetId: string): Promise<{ followed: boolean }> {
    if (targetType === 'user' && followerId === targetId) {
      return { followed: false };
    }

    const existing = await this.db
      .prepare('SELECT id FROM follows WHERE follower_id = ? AND target_type = ? AND target_id = ?')
      .bind(followerId, targetType, targetId)
      .first();

    if (existing) return { followed: false };

    const id = nanoid();
    const now = Date.now();

    const stmts = [
      this.db.prepare(`
        INSERT INTO follows (id, follower_id, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, followerId, targetType, targetId, now),
    ];

    if (targetType === 'game') {
      stmts.push(
        this.db.prepare('UPDATE games SET follower_count = follower_count + 1 WHERE id = ?').bind(targetId)
      );
    }

    await this.db.batch(stmts);
    return { followed: true };
  }

  async unfollow(followerId: string, targetType: 'user' | 'game', targetId: string): Promise<{ unfollowed: boolean }> {
    const existing = await this.db
      .prepare('SELECT id FROM follows WHERE follower_id = ? AND target_type = ? AND target_id = ?')
      .bind(followerId, targetType, targetId)
      .first();

    if (!existing) return { unfollowed: false };

    const stmts = [
      this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND target_type = ? AND target_id = ?')
        .bind(followerId, targetType, targetId),
    ];

    if (targetType === 'game') {
      stmts.push(
        this.db.prepare('UPDATE games SET follower_count = MAX(0, follower_count - 1) WHERE id = ?').bind(targetId)
      );
    }

    await this.db.batch(stmts);
    return { unfollowed: true };
  }

  async isFollowing(followerId: string, targetType: 'user' | 'game', targetIds: string[]): Promise<Record<string, boolean>> {
    if (targetIds.length === 0) return {};

    const placeholders = targetIds.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT target_id FROM follows WHERE follower_id = ? AND target_type = ? AND target_id IN (${placeholders})`)
      .bind(followerId, targetType, ...targetIds)
      .all<{ target_id: string }>();

    const followedSet = new Set((result.results ?? []).map(r => r.target_id));
    const status: Record<string, boolean> = {};
    for (const id of targetIds) {
      status[id] = followedSet.has(id);
    }
    return status;
  }

  async getUserFollowCounts(userId: string): Promise<FollowCounts> {
    const [followers, following] = await Promise.all([
      this.db
        .prepare("SELECT COUNT(*) as count FROM follows WHERE target_type = 'user' AND target_id = ?")
        .bind(userId)
        .first<{ count: number }>(),
      this.db
        .prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND target_type = 'user'")
        .bind(userId)
        .first<{ count: number }>(),
    ]);

    return {
      followerCount: followers?.count ?? 0,
      followingCount: following?.count ?? 0,
    };
  }

  async getFollowers(userId: string, limit = 20, offset = 0): Promise<{ id: string; displayName: string | null; avatarUrl: string | null }[]> {
    const result = await this.db
      .prepare(`
        SELECT u.id, u.display_name, u.avatar_url
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.target_type = 'user' AND f.target_id = ?
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all<{ id: string; display_name: string | null; avatar_url: string | null }>();

    return (result.results ?? []).map(r => ({
      id: r.id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
    }));
  }

  async getFollowing(userId: string, limit = 20, offset = 0): Promise<{ id: string; displayName: string | null; avatarUrl: string | null }[]> {
    const result = await this.db
      .prepare(`
        SELECT u.id, u.display_name, u.avatar_url
        FROM follows f
        JOIN users u ON f.target_id = u.id
        WHERE f.follower_id = ? AND f.target_type = 'user'
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all<{ id: string; display_name: string | null; avatar_url: string | null }>();

    return (result.results ?? []).map(r => ({
      id: r.id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
    }));
  }
}
