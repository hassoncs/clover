import type { GameEventBus, GameEventHandler, GameEventType } from './types';

export function createGameEventBus(): GameEventBus {
  const handlers = new Set<GameEventHandler>();

  return {
    subscribe(handler: GameEventHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    emit(event: GameEventType): void {
      for (const handler of handlers) {
        handler(event);
      }
    },

    flush(): void {
    },
  };
}
