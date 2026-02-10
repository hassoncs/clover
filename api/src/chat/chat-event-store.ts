import type { ChatEvent, ChatEventPayload, ChatEventType } from '@slopcade/shared/types/chat';

type D1Database = import('@cloudflare/workers-types').D1Database;

export class ChatEventStore {
  constructor(private db: D1Database) {}

  async appendEvent(params: {
    threadId: string;
    eventType: ChatEventType;
    role: string | null;
    payload: ChatEventPayload;
    runId?: string;
    parentEventId?: string;
  }): Promise<ChatEvent> {
    const now = Date.now();
    const id = crypto.randomUUID();

    const thread = await this.db
      .prepare(
        'UPDATE chat_threads SET last_event_seq = last_event_seq + 1, updated_at = ? WHERE id = ? RETURNING last_event_seq'
      )
      .bind(now, params.threadId)
      .first<{ last_event_seq: number }>();

    if (!thread) {
      throw new Error(`Thread ${params.threadId} not found`);
    }

    const seq = thread.last_event_seq;

    await this.db
      .prepare(
        `INSERT INTO chat_events (id, thread_id, seq, event_type, role, content_json, run_id, parent_event_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        params.threadId,
        seq,
        params.eventType,
        params.role,
        JSON.stringify(params.payload),
        params.runId ?? null,
        params.parentEventId ?? null,
        now
      )
      .run();

    return {
      id,
      threadId: params.threadId,
      seq,
      eventType: params.eventType,
      role: params.role,
      payload: params.payload,
      runId: params.runId ?? null,
      parentEventId: params.parentEventId ?? null,
      createdAt: now,
    };
  }

  async getEventsAfter(threadId: string, afterSeq: number, limit = 100): Promise<ChatEvent[]> {
    const result = await this.db
      .prepare('SELECT * FROM chat_events WHERE thread_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?')
      .bind(threadId, afterSeq, limit)
      .all<{
        id: string;
        thread_id: string;
        seq: number;
        event_type: string;
        role: string | null;
        content_json: string;
        run_id: string | null;
        parent_event_id: string | null;
        created_at: number;
      }>();

    return result.results.map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      seq: row.seq,
      eventType: row.event_type as ChatEvent['eventType'],
      role: row.role,
      payload: JSON.parse(row.content_json),
      runId: row.run_id,
      parentEventId: row.parent_event_id,
      createdAt: row.created_at,
    }));
  }

  async getAllEvents(threadId: string, limit = 500): Promise<ChatEvent[]> {
    return this.getEventsAfter(threadId, 0, limit);
  }
}
