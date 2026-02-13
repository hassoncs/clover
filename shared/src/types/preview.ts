import type { PartyRoomState } from "./party";

/**
 * Runtime intent mode for preview contexts.
 * - 'author': Editing/authoring mode (inspector, editor)
 * - 'live': Live gameplay mode (runtime, player-facing)
 */
export type RuntimeIntentMode = "author" | "live";

/**
 * Preview mode determines what is being previewed.
 * - 'scene': Full scene/level preview
 * - 'prefab': Single prefab preview (isolated entity)
 */
export type PreviewMode = "scene" | "prefab";

/**
 * Preview context shared between editor, runtime, and inspector.
 * Defines what is being previewed and how it should be rendered.
 */
export interface PreviewContext {
	/** Unique identifier for this preview context */
	id: string;

	/** Human-readable label for this preview */
	label: string;

	/** What is being previewed */
	mode: PreviewMode;

	/** Runtime intent (authoring vs live gameplay) */
	runtimeIntent?: RuntimeIntentMode;

	/** Variable overrides for this preview (e.g., score: 100) */
	variableOverrides?: Record<string, number | string | boolean>;

	/** Mock party room state for multiplayer preview */
	roomMock?: PartyRoomState;

	/** For 'prefab' mode: which prefab to preview */
	prefabId?: string;
}
