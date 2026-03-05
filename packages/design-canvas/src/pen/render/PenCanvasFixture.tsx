import { Canvas } from "@shopify/react-native-skia";
import { PenRenderer } from "@slopcade/design-canvas";
import type { PenDocument } from "@slopcade/shared/types/pen";
import React from "react";

export const PenCanvasFixture = ({
	document,
	width = 800,
	height = 600,
	camera = { translateX: 0, translateY: 0, scale: 1 },
}: {
	document: PenDocument;
	width?: number;
	height?: number;
	camera?: { translateX: number; translateY: number; scale: number };
}) => {
	return (
		<div style={{ width, height, border: "1px solid #ccc" }}>
			<PenRenderer
				document={document}
				width={width}
				height={height}
				camera={camera}
			/>
		</div>
	);
};
