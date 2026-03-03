import { Group } from "@shopify/react-native-skia";
import type { PenGroup } from "@slopcade/shared/types/pen";
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

	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			{renderChildren?.(layoutNode.children)}
		</Group>
	);
}
