/**
 * Factory-default panel layout configuration
 *
 * This defines the initial arrangement of panels in the workspace editor.
 * - Web: Used as factory default; Dockview also persists to localStorage
 * - Native: Always used (no layout persistence on mobile/tablet)
 */

export interface LayoutConfig {
	left: { panels: string[]; width: number };
	center: { panels: string[] };
	right: { panels: string[]; width: number };
	bottom?: { panels: string[]; height: number };
}

export const DEFAULT_LAYOUT: LayoutConfig = {
	left: {
		panels: ["explorer", "hierarchy", "properties", "debug"],
		width: 320,
	},
	center: {
		panels: ["stage"],
	},
	right: {
		panels: ["design-canvas", "chat"],
		width: 400,
	},
};
