import { Group, Rect } from "@shopify/react-native-skia";
import type { PenIconFont } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenFillRenderer } from "../fills";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function IconFontNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenIconFont;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const w = width || 24;
	const h = height || 24;

	// TODO: render actual icon glyph once icon fonts are bundled.
	return (
		<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
			<Rect x={0} y={0} width={w} height={h} color="transparent">
				<PenFillRenderer fill={node.fill ?? "#888888"} width={w} height={h} />
			</Rect>
		</Group>
	);
}
