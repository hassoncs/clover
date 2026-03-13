import {
	PenCanvasPanel as DesignCanvasPenCanvasPanel,
	type PenCanvasPanelProps,
} from "@pencil/design-canvas";

export type { PenCanvasPanelProps };

export function PencilCanvasPanelInner(props: PenCanvasPanelProps) {
	return <DesignCanvasPenCanvasPanel {...props} />;
}
