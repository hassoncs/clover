import type React from "react";
import type { PenCanvasPanelProps } from "../../../packages/design-canvas/src/panels/PenCanvasPanelImpl";

export type { PenCanvasPanelProps };

export const PencilCanvasPanel: React.FC<PenCanvasPanelProps> = () => {
	throw new Error(
		"PencilCanvasPanel: platform-specific implementation not loaded",
	);
};
