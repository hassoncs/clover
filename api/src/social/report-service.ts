import { nanoid } from 'nanoid';

type D1Database = import('@cloudflare/workers-types').D1Database;

export class ReportService {
  constructor(private db: D1Database) {}

  async createReport(
    reporterId: string,
    targetType: string,
    targetId: string,
    reason: string,
    description?: string
  ): Promise<{ id: string; created: true }> {
    const id = nanoid();
    const now = Date.now();

    await this.db.prepare(`
      INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(id, reporterId, targetType, targetId, reason, description ?? null, now).run();

    return { id, created: true };
  }
}
