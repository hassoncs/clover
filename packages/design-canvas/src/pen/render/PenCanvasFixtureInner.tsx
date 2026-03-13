import type { PenDocument } from "@slopcade/protocol/pen";
import type React from "react";
import { View } from "react-native";
import type { PenDrawingState } from "../../tools/penToolState";
import { PenRenderer } from "./PenRenderer";

export interface PenCanvasFixtureInnerProps {
	document: PenDocument;
	width?: number;
	height?: number;
	camera?: { translateX: number; translateY: number; scale: number };
	selectedNodePath?: string[];
	selectedNodePaths?: string[][];
	hoveredNodePath?: string[];
	penDrawingState?: PenDrawingState;
}

export const PenCanvasFixtureInner = ({
	document,
	width = 800,
	height = 600,
	camera = { translateX: 0, translateY: 0, scale: 1 },
	selectedNodePath,
	selectedNodePaths,
	hoveredNodePath,
	penDrawingState,
}: PenCanvasFixtureInnerProps) => {
	void selectedNodePaths;
	void hoveredNodePath;
	const PenRendererComponent: any = PenRenderer;

	return (
		<View style={{ width, height, borderWidth: 1, borderColor: "#cbd5e1" }}>
			<PenRendererComponent
				document={document}
				width={width}
				height={height}
				camera={camera}
				selectedNodePath={selectedNodePath}
				penDrawingState={penDrawingState}
			/>
		</View>
	);
};
