import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface CommentRow {
  id: string;
  game_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  body_json: string | null;
  depth: number;
  reply_count: number;
  reaction_count: number;
  is_edited: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface CommentWithAuthor extends CommentRow {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ReactionRow {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  reaction_type: string;
  created_at: number;
}

interface CreateCommentParams {
  gameId: string;
  userId: string;
  body: string;
  bodyJson?: string;
  parentId?: string;
}

interface ListCommentsParams {
  gameId: string;
  parentId?: string | null;
  limit?: number;
  cursor?: number;
  userId?: string;
}

export interface CommentWithMeta {
  id: string;
  gameId: string;
  userId: string;
  parentId: string | null;
  body: string;
  bodyJson: string | null;
  depth: number;
  replyCount: number;
  reactionCount: number;
  isEdited: boolean;
  createdAt: number;
  updatedAt: number;
  author: {
    displayName: string | null;
    avatarUrl: string | null;
  };
  userReacted: boolean;
}

const MAX_COMMENT_DEPTH = 2;

export class CommentService {
  constructor(private db: D1Database) {}

  async createComment(params: CreateCommentParams): Promise<CommentWithMeta> {
    const { gameId, userId, body, bodyJson, parentId } = params;
    const now = Date.now();
    const id = nanoid();

    let depth = 0;
    if (parentId) {
      const parent = await this.db
        .prepare('SELECT depth, game_id FROM comments WHERE id = ? AND deleted_at IS NULL')
        .bind(parentId)
        .first<{ depth: number; game_id: string }>();

      if (!parent) {
        throw new CommentNotFoundError(parentId);
      }
      if (parent.game_id !== gameId) {
        throw new CommentValidationError('Parent comment belongs to a different game');
      }
      if (parent.depth >= MAX_COMMENT_DEPTH) {
        throw new CommentValidationError(`Maximum reply depth of ${MAX_COMMENT_DEPTH} exceeded`);
      }
      depth = parent.depth + 1;
    }

    const stmts = [
      this.db.prepare(`
        INSERT INTO comments (id, game_id, user_id, parent_id, body, body_json, depth, reply_count, reaction_count, is_edited, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).bind(id, gameId, userId, parentId ?? null, body, bodyJson ?? null, depth, now, now),

      this.db.prepare(`
        UPDATE games SET comment_count = comment_count + 1 WHERE id = ?
      `).bind(gameId),
    ];

    if (parentId) {
      stmts.push(
        this.db.prepare('UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?').bind(parentId)
      );
    }

    await this.db.batch(stmts);

    const author = await this.db
      .prepare('SELECT display_name, avatar_url FROM users WHERE id = ?')
      .bind(userId)
      .first<{ display_name: string | null; avatar_url: string | null }>();

    return {
      id,
      gameId,
      userId,
      parentId: parentId ?? null,
      body,
      bodyJson: bodyJson ?? null,
      depth,
      replyCount: 0,
      reactionCount: 0,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
      author: {
        displayName: author?.display_name ?? null,
        avatarUrl: author?.avatar_url ?? null,
      },
      userReacted: false,
    };
  }

  async listComments(params: ListCommentsParams): Promise<{ comments: CommentWithMeta[]; nextCursor: number | null }> {
    const { gameId, parentId = null, limit = 20, cursor, userId } = params;

    let sql: string;
    const binds: (string | number | null)[] = [];

    if (parentId) {
      sql = `
        SELECT c.*, u.display_name, u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ? AND c.deleted_at IS NULL
      `;
      binds.push(parentId);
    } else {
      sql = `
        SELECT c.*, u.display_name, u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.game_id = ? AND c.parent_id IS NULL AND c.deleted_at IS NULL
      `;
      binds.push(gameId);
    }

    if (cursor) {
      sql += ' AND c.created_at < ?';
      binds.push(cursor);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ?';
    binds.push(limit + 1);

    const result = await this.db
      .prepare(sql)
      .bind(...binds)
      .all<CommentWithAuthor>();

    const rows = result.results ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    let userReactionSet = new Set<string>();
    if (userId && page.length > 0) {
      const commentIds = page.map(c => c.id);
      const placeholders = commentIds.map(() => '?').join(',');
      const reactionResult = await this.db
        .prepare(`SELECT target_id FROM reactions WHERE user_id = ? AND target_type = 'comment' AND target_id IN (${placeholders})`)
        .bind(userId, ...commentIds)
        .all<{ target_id: string }>();
      userReactionSet = new Set((reactionResult.results ?? []).map(r => r.target_id));
    }

    return {
      comments: page.map(row => this.toCommentWithMeta(row, userReactionSet.has(row.id))),
      nextCursor,
    };
  }

  async editComment(commentId: string, userId: string, body: string, bodyJson?: string): Promise<CommentWithMeta> {
    const existing = await this.db
      .prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL')
      .bind(commentId)
      .first<CommentRow>();

    if (!existing) throw new CommentNotFoundError(commentId);
    if (existing.user_id !== userId) throw new CommentPermissionError();

    const now = Date.now();
    await this.db.prepare(`
      UPDATE comments SET body = ?, body_json = ?, is_edited = 1, updated_at = ? WHERE id = ?
    `).bind(body, bodyJson ?? null, now, commentId).run();

    const author = await this.db
      .prepare('SELECT display_name, avatar_url FROM users WHERE id = ?')
      .bind(userId)
      .first<{ display_name: string | null; avatar_url: string | null }>();

    return {
      ...this.rowToMeta(existing),
      body,
      bodyJson: bodyJson ?? null,
      isEdited: true,
      updatedAt: now,
      author: {
        displayName: author?.display_name ?? null,
        avatarUrl: author?.avatar_url ?? null,
      },
      userReacted: false,
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL')
      .bind(commentId)
      .first<CommentRow>();

    if (!existing) throw new CommentNotFoundError(commentId);
    if (existing.user_id !== userId) throw new CommentPermissionError();

    const now = Date.now();
    const stmts = [
      this.db.prepare('UPDATE comments SET deleted_at = ? WHERE id = ?').bind(now, commentId),
      this.db.prepare('UPDATE games SET comment_count = MAX(0, comment_count - 1) WHERE id = ?').bind(existing.game_id),
    ];

    if (existing.parent_id) {
      stmts.push(
        this.db.prepare('UPDATE comments SET reply_count = MAX(0, reply_count - 1) WHERE id = ?').bind(existing.parent_id)
      );
    }

    await this.db.batch(stmts);
  }

  async addReaction(userId: string, targetType: 'game' | 'comment', targetId: string, reactionType = 'like'): Promise<{ added: boolean }> {
    const id = nanoid();
    const now = Date.now();

    const existing = await this.db
      .prepare('SELECT id FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND reaction_type = ?')
      .bind(userId, targetType, targetId, reactionType)
      .first();

    if (existing) return { added: false };

    const stmts = [
      this.db.prepare(`
        INSERT INTO reactions (id, user_id, target_type, target_id, reaction_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, userId, targetType, targetId, reactionType, now),
    ];

    if (targetType === 'game') {
      stmts.push(
        this.db.prepare('UPDATE games SET like_count = like_count + 1 WHERE id = ?').bind(targetId)
      );
    } else {
      stmts.push(
        this.db.prepare('UPDATE comments SET reaction_count = reaction_count + 1 WHERE id = ?').bind(targetId)
      );
    }

    await this.db.batch(stmts);
    return { added: true };
  }

  async removeReaction(userId: string, targetType: 'game' | 'comment', targetId: string, reactionType = 'like'): Promise<{ removed: boolean }> {
    const existing = await this.db
      .prepare('SELECT id FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND reaction_type = ?')
      .bind(userId, targetType, targetId, reactionType)
      .first();

    if (!existing) return { removed: false };

    const stmts = [
      this.db.prepare('DELETE FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND reaction_type = ?')
        .bind(userId, targetType, targetId, reactionType),
    ];

    if (targetType === 'game') {
      stmts.push(
        this.db.prepare('UPDATE games SET like_count = MAX(0, like_count - 1) WHERE id = ?').bind(targetId)
      );
    } else {
      stmts.push(
        this.db.prepare('UPDATE comments SET reaction_count = MAX(0, reaction_count - 1) WHERE id = ?').bind(targetId)
      );
    }

    await this.db.batch(stmts);
    return { removed: true };
  }

  async getReactionStatus(userId: string, targetType: 'game' | 'comment', targetIds: string[]): Promise<Record<string, boolean>> {
    if (targetIds.length === 0) return {};

    const placeholders = targetIds.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT target_id FROM reactions WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`)
      .bind(userId, targetType, ...targetIds)
      .all<{ target_id: string }>();

    const reacted = new Set((result.results ?? []).map(r => r.target_id));
    const status: Record<string, boolean> = {};
    for (const id of targetIds) {
      status[id] = reacted.has(id);
    }
    return status;
  }

  private toCommentWithMeta(row: CommentWithAuthor, userReacted: boolean): CommentWithMeta {
    return {
      id: row.id,
      gameId: row.game_id,
      userId: row.user_id,
      parentId: row.parent_id,
      body: row.body,
      bodyJson: row.body_json,
      depth: row.depth,
      replyCount: row.reply_count,
      reactionCount: row.reaction_count,
      isEdited: row.is_edited === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
      userReacted,
    };
  }

  private rowToMeta(row: CommentRow): Omit<CommentWithMeta, 'author' | 'userReacted'> {
    return {
      id: row.id,
      gameId: row.game_id,
      userId: row.user_id,
      parentId: row.parent_id,
      body: row.body,
      bodyJson: row.body_json,
      depth: row.depth,
      replyCount: row.reply_count,
      reactionCount: row.reaction_count,
      isEdited: row.is_edited === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class CommentNotFoundError extends Error {
  constructor(commentId: string) {
    super(`Comment not found: ${commentId}`);
    this.name = 'CommentNotFoundError';
  }
}

export class CommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentValidationError';
  }
}

export class CommentPermissionError extends Error {
  constructor() {
    super('You do not have permission to modify this comment');
    this.name = 'CommentPermissionError';
  }
}
