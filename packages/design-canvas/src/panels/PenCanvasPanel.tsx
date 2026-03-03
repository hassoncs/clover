// Cross-platform default — the real implementation lives in PenCanvasPanelImpl.
// On web, PenCanvasPanel.web.tsx overrides this with the WithSkiaWeb gate.
// On native, PenCanvasPanel.native.tsx overrides with gesture-handler version.
export {
	PenCanvasPanel,
	type PenCanvasPanelProps,
} from "./PenCanvasPanelImpl";
