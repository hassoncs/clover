/**
 * Type definitions for PenCanvasPanel.
 * 
 * Implementation is platform-specific:
 * - web: PenCanvasPanel.web.tsx (lazy loads with WithSkiaWeb)
 * - native: PenCanvasPanel.native.tsx (direct implementation)
 * 
 * This file exists for TypeScript type resolution only.
 * Metro/webpack will use platform-specific files at runtime.
 */

import type { PenDocument } from "@slopcade/protocol/pen";

export interface PenCanvasPanelProps {
	document: PenDocument;
	isLoading?: boolean;
}

/**
 * Platform-specific implementation.
 * Import from './PenCanvasPanel' - bundler will resolve to .web.tsx or .native.tsx
 */
export const PenCanvasPanel: React.FC<PenCanvasPanelProps> = () => {
	throw new Error("PenCanvasPanel: Platform-specific implementation not loaded");
};
