import type { GameEventBus, GameEventHandler, GameEventType } from './types';

export function createGameEventBus(): GameEventBus {
  const handlers = new Set<GameEventHandler>();

  return {
    subscribe(handler: GameEventHandler): () => void {
      console.log(`[GameEventBus] subscribe called, handler count: ${handlers.size + 1}`);
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    emit(event: GameEventType): void {
      console.log(`[GameEventBus] emit: ${event.type}`, event);
      console.log(`[GameEventBus] notifying ${handlers.size} handlers`);
      let i = 0;
      for (const handler of handlers) {
        console.log(`[GameEventBus] calling handler ${i++}`);
        handler(event);
        console.log(`[GameEventBus] handler ${i - 1} complete`);
      }
      console.log(`[GameEventBus] emit complete`);
    },

    flush(): void {
    },
  };
}
