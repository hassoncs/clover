import { Group, Path, Skia } from "@shopify/react-native-skia";
import type { PenPolygon } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

function buildPolygonPath(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	sides: number,
): string {
	const path = Skia.Path.Make();
	for (let i = 0; i < sides; i++) {
		const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
		const px = cx + rx * Math.cos(angle);
		const py = cy + ry * Math.sin(angle);
		if (i === 0) {
			path.moveTo(px, py);
		} else {
			path.lineTo(px, py);
		}
	}
	path.close();
	return path.toSVGString();
}

export function PolygonNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenPolygon;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const sides = node.polygonCount ?? 3;
	const pathData = buildPolygonPath(width / 2, height / 2, width / 2, height / 2, sides);

	return (
		<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
			<Path path={pathData} color="transparent">
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Path>
		</Group>
	);
}
