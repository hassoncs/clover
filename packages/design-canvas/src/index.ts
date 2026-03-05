// Host adapter contract
export type {
	DesignCanvasHost,
	PenCanvasHost,
	DesignPhase,
	DesignMode,
} from "./host/types";

// Core hit-test utilities (safe to import — no Skia at module level)
// DesignCanvasRenderer is intentionally NOT exported here: it imports Skia
// directly and must only be bundled inside the WithSkiaWeb lazy chunk on web.
export type { DesignCanvasRendererProps } from "./core/DesignCanvasRenderer";
export { hitTestDesignCanvas, screenToWorld } from "./core/designCanvasHitTest";

// Camera
export { useDesignCamera } from "./camera/useDesignCamera";
export type { UseDesignCameraResult } from "./camera/useDesignCamera";
export type { DesignCamera } from "./camera/useDesignCamera.shared";

// Interactions
export { useDesignInteractions } from "./interactions/useDesignInteractions";
export type { SnapLine, InteractionState } from "./interactions/useDesignInteractions";

// Assets
export { useDesignImageResolver } from "./assets/useDesignImageResolver";
export type { ImageResolutionMap } from "./assets/useDesignImageResolver";

// Panels (platform files resolve automatically via Metro)
export { DesignCanvasPanel } from "./panels/DesignCanvasPanel";
export type { DesignCanvasPanelProps } from "./panels/DesignCanvasPanel";

// Document lifecycle
export { useDesignDocument } from "./document/useDesignDocument";
export type {
	UseDesignDocumentIO,
	UseDesignDocumentOptions,
	UseDesignDocumentResult,
} from "./document/useDesignDocument";

// Canvas ops (for programmatic document mutations via MCP / AI)
export { applyCanvasOps } from "./ops/canvasOps";
export type { CanvasOp } from "./ops/canvasOps";

// Pen renderer (new .pen-native renderer)
// PenRenderer is intentionally NOT exported here — it imports Skia directly and
// must only be bundled inside the WithSkiaWeb lazy chunk on web.
export type { PenRendererProps } from "./pen/render/PenRenderer";
export { PenCanvasPanel } from "./panels/PenCanvasPanel";
export type { PenCanvasPanelProps } from "./panels/PenCanvasPanel";
export { hitTestLayoutTree, screenToWorldPen } from "./pen/hitTest";



// Resizable split utility
export { ResizableSplit } from './ResizableSplit';
export type { ResizableSplitProps } from './ResizableSplit';
