declare module "@slopcade/game-runtime" {
	export * from "@slopcade/game-runtime/*";
}

declare module "@slopcade/game-runtime/*" {
	import type { ComponentType } from "react";

	export interface TransformComponent {
		x: number;
		y: number;
		angle: number;
		scaleX: number;
		scaleY: number;
	}

	export interface RuntimeEntity {
		id: string;
		name: string;
		prefab?: string;
		parentId?: string;
		children: string[];
		localTransform: TransformComponent;
		worldTransform: TransformComponent;
		transform: TransformComponent;
		tags: string[];
		tagBits: Set<number>;
		layer: number;
		visible: boolean;
		active: boolean;
		colliderId: number | null;
		[key: string]: unknown;
	}

	export interface ReactGameState {
		variables: Record<string, unknown>;
		state?: unknown;
	}

	export type WorkspaceSnapshotQueryClient = {
		chatThreads: {
			getWorkspaceSnapshot: {
				query: (input: {
					gameId: string;
					sinceRevision?: string;
				}) => Promise<unknown>;
			};
		};
	};

	export class LivePreviewController {
		static getInstance(): LivePreviewController;
		static destroy(): void;
		static configure(queryClient: WorkspaceSnapshotQueryClient): void;
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

	export interface GameRuntimeConfig {
		apiUrl: string;
		getAuthToken: () => Promise<string | null>;
		getStorageItem: <T>(key: string, defaultValue: T) => Promise<T>;
		setStorageItem: <T>(key: string, value: T) => Promise<void>;
	}

	export function configureGameRuntime(config: GameRuntimeConfig): void;
}
