import type { EventListener, UnsubscribeFn } from '@slopcade/shared';

export interface QueuedEvent {
  event: string;
  data?: unknown;
}

export interface EventQueue {
  emit(event: string, data?: unknown): void;
  flush(): QueuedEvent[];
  subscribe(event: string, handler: EventListener): UnsubscribeFn;
  clear(): void;
}

export class EventQueueImpl implements EventQueue {
  private queue: QueuedEvent[] = [];
  private listeners = new Map<string, Set<EventListener>>();

  emit(event: string, data?: unknown): void {
    this.queue.push({ event, data });
  }

  flush(): QueuedEvent[] {
    const events = [...this.queue];
    this.queue = [];
    
    for (const { event, data } of events) {
      const handlers = this.listeners.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    }
    
    return events;
  }

  subscribe(event: string, handler: EventListener): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.unsubscribe(event, handler);
  }

  private unsubscribe(event: string, handler: EventListener): void {
    this.listeners.get(event)?.delete(handler);
  }

  clear(): void {
    this.queue = [];
    this.listeners.clear();
  }
}
