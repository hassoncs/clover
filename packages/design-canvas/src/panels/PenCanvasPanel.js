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
/**
 * Platform-specific implementation.
 * Import from './PenCanvasPanel' - bundler will resolve to .web.tsx or .native.tsx
 */
export const PenCanvasPanel = () => {
    throw new Error("PenCanvasPanel: Platform-specific implementation not loaded");
};
//# sourceMappingURL=PenCanvasPanel.js.map