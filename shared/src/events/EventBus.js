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
export class EventBus {
    listeners = new Map();
    emit(eventName, data) {
        const handlers = this.listeners.get(eventName);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(handler);
        return () => this.off(eventName, handler);
    }
    off(eventName, handler) {
        this.listeners.get(eventName)?.delete(handler);
    }
    clear() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=EventBus.js.map