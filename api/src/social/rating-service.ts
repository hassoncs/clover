import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface RatingRow {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  created_at: number;
  updated_at: number;
}

export interface RatingSummary {
  averageScore: number;
  totalRatings: number;
  distribution: Record<number, number>;
  userRating: number | null;
}

export class RatingService {
  constructor(private db: D1Database) {}

  async rate(gameId: string, userId: string, score: number): Promise<RatingSummary> {
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new RatingValidationError('Score must be an integer between 1 and 5');
    }

    const now = Date.now();
    const existing = await this.db
      .prepare('SELECT id FROM ratings WHERE game_id = ? AND user_id = ?')
      .bind(gameId, userId)
      .first<{ id: string }>();

    if (existing) {
      await this.db.prepare(`
        UPDATE ratings SET score = ?, updated_at = ? WHERE id = ?
      `).bind(score, now, existing.id).run();
    } else {
      const id = nanoid();
      await this.db.prepare(`
        INSERT INTO ratings (id, game_id, user_id, score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, gameId, userId, score, now, now).run();
    }

    await this.updateGameAverages(gameId);
    return this.getSummary(gameId, userId);
  }

  async getSummary(gameId: string, userId?: string): Promise<RatingSummary> {
    const stats = await this.db
      .prepare('SELECT AVG(score) as avg_score, COUNT(*) as total FROM ratings WHERE game_id = ?')
      .bind(gameId)
      .first<{ avg_score: number | null; total: number }>();

    const distRows = await this.db
      .prepare('SELECT score, COUNT(*) as count FROM ratings WHERE game_id = ? GROUP BY score')
      .bind(gameId)
      .all<{ score: number; count: number }>();

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows.results ?? []) {
      distribution[row.score] = row.count;
    }

    let userRating: number | null = null;
    if (userId) {
      const row = await this.db
        .prepare('SELECT score FROM ratings WHERE game_id = ? AND user_id = ?')
        .bind(gameId, userId)
        .first<{ score: number }>();
      userRating = row?.score ?? null;
    }

    return {
      averageScore: Math.round((stats?.avg_score ?? 0) * 10) / 10,
      totalRatings: stats?.total ?? 0,
      distribution,
      userRating,
    };
  }

  async removeRating(gameId: string, userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM ratings WHERE game_id = ? AND user_id = ?')
      .bind(gameId, userId)
      .run();
    await this.updateGameAverages(gameId);
  }

  private async updateGameAverages(gameId: string): Promise<void> {
    const stats = await this.db
      .prepare('SELECT AVG(score) as avg_score, COUNT(*) as total FROM ratings WHERE game_id = ?')
      .bind(gameId)
      .first<{ avg_score: number | null; total: number }>();

    await this.db.prepare(`
      UPDATE games SET rating_average = ?, rating_count = ? WHERE id = ?
    `).bind(
      Math.round((stats?.avg_score ?? 0) * 10) / 10,
      stats?.total ?? 0,
      gameId
    ).run();
  }
}

export class RatingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatingValidationError';
  }
}
