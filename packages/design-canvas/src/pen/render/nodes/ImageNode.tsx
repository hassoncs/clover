import {
	Group,
	ImageShader,
	Paint,
	Rect,
	useImage,
} from "@shopify/react-native-skia";
import type { PenImage } from "@slopcade/protocol/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { buildNodeTransform } from "../nodeTransform";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function ImageNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenImage;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const image = useImage(node.url ?? null);

	const fit = node.fit ?? "cover";

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
			{image && (
				<Rect x={0} y={0} width={width} height={height}>
					<Paint style="fill">
						<ImageShader
							image={image}
							fit={fit}
							tx="decal"
							ty="decal"
							rect={{ x: 0, y: 0, width, height }}
						/>
					</Paint>
					<PenEffectsRenderer effects={node.effects} />
				</Rect>
			)}
		</Group>
	);
}
