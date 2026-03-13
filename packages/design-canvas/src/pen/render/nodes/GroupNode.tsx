import { Group } from "@shopify/react-native-skia";
import type { PenGroup } from "@slopcade/protocol/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { buildNodeTransform } from "../nodeTransform";

interface NodeRendererProps {
	layoutNode: LayoutNode;
	renderChildren?: (children: LayoutNode[]) => React.ReactNode;
}

export function GroupNode({ layoutNode, renderChildren }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenGroup;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	// The outer Group translates to (x, y). Children have absolute coords from the layout,
	// so we need a counter-translate to bring the origin back before rendering them.
	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			<Group transform={[{ translateX: -x }, { translateY: -y }]}>
				{renderChildren?.(layoutNode.children)}
			</Group>
		</Group>
	);
}
