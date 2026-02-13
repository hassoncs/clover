import type { GameRule } from "@slopcade/shared";
import type { GodotBridge } from "@/lib/godot/types";

export interface HotReloadContext {
	mode: "author" | "live";
	activeScene: string | null;
	bridge: GodotBridge;
	runtime: {
		applyRules: (rules: GameRule[]) => void;
		applyScript: (source: string) => Promise<void>;
	};
}

export interface TagHotReloadHandler<TPayload = unknown> {
	canHotSwap(
		oldHash: string,
		newHash: string,
		context: HotReloadContext,
	): boolean;
	hotSwap(
		oldPayload: TPayload,
		newPayload: TPayload,
		context: HotReloadContext,
	): Promise<void>;
	fullReload(payload: TPayload, context: HotReloadContext): Promise<void>;
}
