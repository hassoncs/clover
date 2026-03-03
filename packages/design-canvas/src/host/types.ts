import type { PenDocument } from "@slopcade/shared/types/pen";

export type DesignPhase = "idle" | "designing" | "approved" | "implementing";
export type DesignMode = "idle" | "select" | "pan" | "draw";

/**
 * Host adapter for the .pen-native renderer.
 */
export interface PenCanvasHost {
	document: PenDocument | null;
	isLoadingDocument: boolean;
	activeTheme: Record<string, string>;
	setActiveTheme: (theme: Record<string, string>) => void;
	selectedNodePath: string[] | null;
	selectNode: (path: string[]) => void;
	clearSelection: () => void;
	designMode: DesignMode;
	setDesignMode: (mode: DesignMode) => void;
}

