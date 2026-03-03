// Host adapter contract
export type {
	PenCanvasHost,
	DesignPhase,
	DesignMode,
} from "./host/types";

// Pen renderer (new .pen-native renderer)
// PenRenderer is intentionally NOT exported here — it imports Skia directly and
// must only be bundled inside the WithSkiaWeb lazy chunk on web.
export type { PenRendererProps } from "./pen/render/PenRenderer";
export { PenCanvasPanel } from "./panels/PenCanvasPanel";
export type { PenCanvasPanelProps } from "./panels/PenCanvasPanel";
export { hitTestLayoutTree, screenToWorldPen } from "./pen/hitTest";

// Pen runtime context (SceneGraph-backed editor state)
export { PenRuntimeProvider, usePenRuntime } from "./panels/PenRuntimeContext";
export type { PenRuntimeProviderProps } from "./panels/PenRuntimeContext";