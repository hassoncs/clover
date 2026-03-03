import { DashPathEffect, Paint } from "@shopify/react-native-skia";
import type { PenStroke } from "@slopcade/shared/types/pen";
import type React from "react";

interface StrokeProps {
	stroke: PenStroke | undefined;
	width: number;
	height: number;
}

function resolveStrokeColor(fill: PenStroke["fill"]): string {
	if (!fill) return "#000000";
	if (Array.isArray(fill)) return "#000000";
	if (typeof fill === "string") return fill;
	if (fill.type === "color") return fill.color;
	return "#000000";
}

function resolveThickness(thickness: PenStroke["thickness"]): number {
	if (thickness === undefined) return 1;
	if (typeof thickness === "number") return thickness;
	return Math.max(thickness.top, thickness.right, thickness.bottom, thickness.left);
}

export function PenStrokeRenderer({ stroke }: StrokeProps): React.ReactNode {
	if (!stroke || stroke.enabled === false || !stroke.fill) return null;

	const color = resolveStrokeColor(stroke.fill);
	const strokeWidth = resolveThickness(stroke.thickness);

	// TODO: inside/outside alignment requires clip-based approach; center is implemented here
	return (
		<Paint
			style="stroke"
			color={color}
			strokeWidth={strokeWidth}
			strokeJoin={stroke.join ?? "miter"}
			strokeCap={stroke.cap ?? "butt"}
		>
			{stroke.dashPattern && stroke.dashPattern.length >= 2 && (
				<DashPathEffect intervals={stroke.dashPattern} />
			)}
		</Paint>
	);
}
