import type { GameEventBus } from './types';
import type { GameState } from '../BehaviorContext';

/**
 * Extended GameState that includes legacy score and lives properties
 * used by GameRuntime for React state updates.
 */
export interface ReactGameState extends GameState {
  score?: number;
  lives?: number;
}

export interface GameEventSubscriberOptions {
  onGameStateChange?: (state: 'won' | 'lost') => void;
  onScoreChange?: (score: number) => void;
  setGameState: (updater: (prev: ReactGameState) => ReactGameState) => void;
  debug?: boolean;
}

/**
 * Subscribes to game events and updates React state.
 * Returns an unsubscribe function.
 */
export function subscribeToGameEvents(
  eventBus: GameEventBus,
  options: GameEventSubscriberOptions
): () => void {
  const { onGameStateChange, onScoreChange, setGameState, debug } = options;

  console.log("[GameEventSubscriber] Setting up subscription");

  return eventBus.subscribe((event) => {
    console.log(`[GameEventSubscriber] Received event: ${event.type}`);
    switch (event.type) {
      case 'gameStateChanged':
        console.log(`[GameEventSubscriber] gameStateChanged to: ${event.state}`);
        setGameState((s) => {
          console.log(`[GameEventSubscriber] setGameState updater called: ${s.state} -> ${event.state}`);
          return { ...s, state: event.state };
        });
        console.log(`[GameEventSubscriber] setGameState call returned`);
        if (event.state === 'won' || event.state === 'lost') {
          console.log(`[GameEventSubscriber] Game ended, calling onGameStateChange`);
          onGameStateChange?.(event.state);
        }
        console.log(`[GameEventSubscriber] gameStateChanged handling complete`);
        break;
      case 'varChanged':
        console.log(`[GameEventSubscriber] varChanged: ${event.key} = ${event.value}`);
        if (event.key === 'score') {
          setGameState((s) => ({ ...s, score: event.value as number }));
          onScoreChange?.(event.value as number);
        } else if (event.key === 'lives') {
          setGameState((s) => ({ ...s, lives: event.value as number }));
        } else {
          setGameState((s) => ({
            ...s,
            variables: { ...s.variables, [event.key]: event.value }
          }));
        }
        console.log(`[GameEventSubscriber] varChanged handling complete`);
        break;
    }
    console.log(`[GameEventSubscriber] Event handling complete`);
  });
}
