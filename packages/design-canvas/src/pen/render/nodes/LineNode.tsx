import { Group, Line, vec } from "@shopify/react-native-skia";
import type { PenLine } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function LineNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenLine;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const strokeColor =
		node.stroke?.fill && typeof node.stroke.fill === "string"
			? node.stroke.fill
			: "#000000";
	const strokeWidth =
		node.stroke?.thickness && typeof node.stroke.thickness === "number"
			? node.stroke.thickness
			: 1;

	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			<Line
				p1={vec(0, 0)}
				p2={vec(width, height)}
				color={strokeColor}
				style="stroke"
				strokeWidth={strokeWidth}
			>
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
			</Line>
		</Group>
	);
}
