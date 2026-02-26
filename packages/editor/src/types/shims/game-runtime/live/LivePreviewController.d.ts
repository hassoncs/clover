import type { GodotBridge } from "../../godot-bridge-types";

export type PreviewLoadState = "idle" | "loading" | "ready" | "error";
export type PreviewMode = "author" | "live";

export class LivePreviewController {
	static getInstance(): LivePreviewController;
	static destroy(): void;
	initialize(gameId: string, bridge: GodotBridge): Promise<void>;
	isInitialized(): boolean;
	getGameId(): string | null;
	getState(): {
		loadState: PreviewLoadState;
		mode: PreviewMode;
		revision: string | null;
		lastError: string | null;
	};
	setMode(mode: PreviewMode): Promise<void>;
	reset(): Promise<void>;
}
