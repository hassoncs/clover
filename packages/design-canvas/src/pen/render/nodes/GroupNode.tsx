import { Group } from "@shopify/react-native-skia";
import type { PenGroup } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";

interface NodeRendererProps {
	layoutNode: LayoutNode;
	renderChildren?: (children: LayoutNode[]) => React.ReactNode;
}

export function GroupNode({ layoutNode, renderChildren }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenGroup;
	const { x, y } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	return (
		<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
			{renderChildren?.(layoutNode.children)}
		</Group>
	);
}
