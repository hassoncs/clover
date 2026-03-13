import { Group, Path } from "@shopify/react-native-skia";
import type { PenPolygon } from "@slopcade/protocol/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

function buildPolygonPathSVG(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	sides: number,
): string {
	const pts = Array.from({ length: sides }, (_, i) => {
		const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
		return `${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`;
	});
	return `M${pts.join(" L")} Z`;
}

export function PolygonNode({
	layoutNode,
}: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenPolygon;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const sides = node.polygonCount ?? 3;
	const pathData = buildPolygonPathSVG(
		width / 2,
		height / 2,
		width / 2,
		height / 2,
		sides,
	);

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
			<Path path={pathData}>
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Path>
		</Group>
	);
}
