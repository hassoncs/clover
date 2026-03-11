import { Group, Oval } from "@shopify/react-native-skia";
import type { PenEllipse } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function EllipseNode({
	layoutNode,
}: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenEllipse;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const solidFillColor = resolveSolidFillColor(node.fill);
	const decorativeFill = solidFillColor ? undefined : node.fill;

	// TODO: support arc (startAngle/sweepAngle) and donut (innerRadius) shapes
	// using Skia.Path with addOval and boolean operations when needed.
	// For now, render a full ellipse.
	return (
		<Group
			transform={buildNodeTransform(
				x,
				y,
				width,
				height,
				node.flipX,
				node.flipY,
			)}
			opacity={opacity}
		>
			<Oval
				rect={{ x: 0, y: 0, width, height }}
				color={solidFillColor ?? undefined}
			>
				<PenFillRenderer fill={decorativeFill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Oval>
		</Group>
	);
}
