declare module "@slopcade/game-runtime/*" {
	import type { ComponentType } from "react";

	export interface RuntimeEntity {
		id: string;
		name: string;
		transform: { x: number; y: number };
	}

	export interface ReactGameState {
		variables: Record<string, unknown>;
		state?: unknown;
	}

	export class LivePreviewController {
		static getInstance(): LivePreviewController;
		static destroy(): void;
		initialize(gameId: string, bridge: unknown): Promise<void>;
		isInitialized(): boolean;
		getGameId(): string | null;
		getState(): {
			loadState: "idle" | "loading" | "ready" | "error";
			mode: "author" | "live";
			revision: string | null;
			lastError: string | null;
		};
		setMode(mode: "author" | "live"): Promise<void>;
		reset(): Promise<void>;
	}

	export type PreviewLoadState = "idle" | "loading" | "ready" | "error";
	export type PreviewMode = "author" | "live";

	export interface EntityManager {
		getAllEntities: () => RuntimeEntity[];
	}

	export const GameRuntimeGodot: ComponentType<Record<string, unknown>>;
}
