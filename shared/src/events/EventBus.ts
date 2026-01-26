/**
 * EventBus - System-to-system decoupled communication primitive.
 * Part of the 5 core engine primitives (Unity-validated architecture).
 * 
 * Usage:
 *   const bus = new EventBus();
 *   const unsub = bus.on("match_found", (data) => console.log(data));
 *   bus.emit("match_found", { size: 3 });
 *   unsub(); // or bus.off("match_found", handler)
 */

export type EventListener<T = unknown> = (data: T) => void;
export type UnsubscribeFn = () => void;

export class EventBus {
  private listeners = new Map<string, Set<EventListener<unknown>>>();

  emit<T = unknown>(eventName: string, data?: T): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  on<T = unknown>(eventName: string, handler: EventListener<T>): UnsubscribeFn {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler as EventListener<unknown>);
    return () => this.off(eventName, handler);
  }

  off<T = unknown>(eventName: string, handler: EventListener<T>): void {
    this.listeners.get(eventName)?.delete(handler as EventListener<unknown>);
  }

  clear(): void {
    this.listeners.clear();
  }
}
