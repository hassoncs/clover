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
export declare class EventBus {
    private listeners;
    emit<T = unknown>(eventName: string, data?: T): void;
    on<T = unknown>(eventName: string, handler: EventListener<T>): UnsubscribeFn;
    off<T = unknown>(eventName: string, handler: EventListener<T>): void;
    clear(): void;
}
//# sourceMappingURL=EventBus.d.ts.map