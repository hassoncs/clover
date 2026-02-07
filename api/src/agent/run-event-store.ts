import type { AgentEventPayload } from '@slopcade/shared/types/agent-run';
import type { AgentEvent, ServerMessage } from './types';
import type { RunState } from './run-state-machine';
import { EVENT_KEY_PREFIX, MAX_REPLAY_EVENTS, eventKey } from './run-state-machine';

type DurableObjectStorage = import('@cloudflare/workers-types').DurableObjectStorage;
type D1Database = import('@cloudflare/workers-types').D1Database;

export class RunEventStore {
  constructor(
    private storage: DurableObjectStorage,
    private db: D1Database,
  ) {}

  async append(
    state: RunState,
    eventType: AgentEvent['eventType'],
    payload: AgentEventPayload,
  ): Promise<AgentEvent> {
    const nextSeq = state.lastSeq + 1;
    const stateVersion = state.stateVersion;
    const event: AgentEvent = {
      seq: nextSeq,
      stateVersion,
      eventType,
      payload,
      timestamp: Date.now(),
    };

    state.lastSeq = nextSeq;
    state.updatedAt = event.timestamp;

    await this.storage.put(eventKey(nextSeq), event);
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO agent_events (id, run_id, seq, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `${state.runId}:event:${event.seq}`,
        state.runId,
        event.seq,
        event.eventType,
        JSON.stringify(event.payload),
        event.timestamp
      )
      .run();

    return event;
  }

  async getAfter(lastSeq: number): Promise<AgentEvent[]> {
    const allEvents = await this.storage.list<AgentEvent>({ prefix: EVENT_KEY_PREFIX });
    const events: AgentEvent[] = [];
    for (const [, value] of allEvents) {
      if (value.seq > lastSeq) {
        events.push(value);
      }
    }
    return events.sort((a, b) => a.seq - b.seq);
  }

  async prune(lastSeq: number): Promise<void> {
    const cutoff = Math.max(1, lastSeq - MAX_REPLAY_EVENTS + 1);
    const allEvents = await this.storage.list<AgentEvent>({ prefix: EVENT_KEY_PREFIX });
    const keysToDelete: string[] = [];

    for (const [key, value] of allEvents) {
      if (value.seq < cutoff) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.storage.delete(keysToDelete);
    }
  }

  toServerMessage(event: AgentEvent): ServerMessage {
    return {
      type: 'event',
      seq: event.seq,
      stateVersion: event.stateVersion,
      eventType: event.eventType,
      payload: event.payload,
      timestamp: event.timestamp,
    };
  }
}
