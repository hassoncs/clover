import {
	PenCanvasPanel as DesignCanvasPenCanvasPanel,
	type PenCanvasPanelProps,
} from "@slopcade/design-canvas";

export type { PenCanvasPanelProps };

export function PencilCanvasPanelInner(props: PenCanvasPanelProps) {
	return <DesignCanvasPenCanvasPanel {...props} />;
}
