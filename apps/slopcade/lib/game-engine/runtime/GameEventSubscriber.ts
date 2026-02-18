import type { GameState } from "../BehaviorContext";
import type { GameEventBus } from "./types";

/**
 * Extended GameState that includes legacy score and lives properties
 * used by GameRuntime for React state updates.
 */
export interface ReactGameState extends GameState {
	score?: number;
	lives?: number;
}

export interface GameEventSubscriberOptions {
	onGameStateChange?: (state: "won" | "lost") => void;
	onScoreChange?: (score: number) => void;
	setGameState: (updater: (prev: ReactGameState) => ReactGameState) => void;
}

/**
 * Subscribes to game events and updates React state.
 * Returns an unsubscribe function.
 */
export function subscribeToGameEvents(
	eventBus: GameEventBus,
	options: GameEventSubscriberOptions,
): () => void {
	const { onGameStateChange, onScoreChange, setGameState } = options;

	return eventBus.subscribe((event) => {
		switch (event.type) {
			case "gameStateChanged":
				setGameState((s) => ({ ...s, state: event.state }));
				if (event.state === "won" || event.state === "lost") {
					onGameStateChange?.(event.state);
				}
				break;
			case "varChanged":
				if (event.key === "score") {
					setGameState((s) => ({ ...s, score: event.value as number }));
					onScoreChange?.(event.value as number);
				} else if (event.key === "lives") {
					setGameState((s) => ({ ...s, lives: event.value as number }));
				} else {
					setGameState((s) => ({
						...s,
						variables: { ...s.variables, [event.key]: event.value },
					}));
				}
				break;
		}
	});
}
