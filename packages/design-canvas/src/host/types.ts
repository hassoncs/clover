import type { DesignDocument } from "@slopcade/shared";

export type DesignPhase = "idle" | "designing" | "approved" | "implementing";
export type DesignMode = "idle" | "select" | "pan" | "draw";

/**
 * Host adapter interface — decouples the design canvas from any specific
 * host context (editor, standalone app, etc.).
 *
 * The canvas consumes this interface; hosts implement it however they like
 * (editor context, local state, tRPC, etc.).
 */
export interface DesignCanvasHost {
	// Document lifecycle
	document: DesignDocument | null;
	isLoadingDocument: boolean;
	saveDocument: (doc: DesignDocument) => void;

	// Selection state
	selectedFrameId: string | null;
	selectedElementId: string | null;
	selectedElementIds: string[];
	selectFrame: (id: string) => void;
	selectElement: (elementId: string, frameId: string) => void;
	clearSelection: () => void;

	// Interaction mode / phase
	designMode: DesignMode;
	setDesignMode: (mode: DesignMode) => void;
	designPhase: DesignPhase;
	setDesignPhase: (phase: DesignPhase) => void;
}
