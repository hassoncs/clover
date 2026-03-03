import { Group, Path } from "@shopify/react-native-skia";
import type { PenPath } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function PathNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenPath;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			<Path path={node.geometry} color="transparent">
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Path>
		</Group>
	);
}
