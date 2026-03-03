import { Group, Rect, RoundedRect } from "@shopify/react-native-skia";
import type { PenFrame } from "@slopcade/shared/types/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
	renderChildren?: (children: LayoutNode[]) => React.ReactNode;
}

export function FrameNode({ layoutNode, renderChildren }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenFrame;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	const cornerRadius = node.cornerRadius;
	const children = renderChildren?.(layoutNode.children);

	let shape: React.ReactNode;
	if (cornerRadius !== undefined && typeof cornerRadius === "number" && cornerRadius > 0) {
		shape = (
			<RoundedRect x={0} y={0} width={width} height={height} r={cornerRadius} color="transparent">
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</RoundedRect>
		);
	} else if (Array.isArray(cornerRadius) && cornerRadius.some((r) => r > 0)) {
		const [tl, tr, br, bl] = cornerRadius;
		const rrect = {
			rect: { x: 0, y: 0, width, height },
			topLeft: { x: tl, y: tl },
			topRight: { x: tr, y: tr },
			bottomRight: { x: br, y: br },
			bottomLeft: { x: bl, y: bl },
		};
		shape = (
			<RoundedRect rect={rrect} color="transparent">
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</RoundedRect>
		);
	} else {
		shape = (
			<Rect x={0} y={0} width={width} height={height} color="transparent">
				<PenFillRenderer fill={node.fill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Rect>
		);
	}

	if (layoutNode.clip) {
		return (
			<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
				{shape}
				<Group clip={{ x: 0, y: 0, width, height }}>
					{children}
				</Group>
			</Group>
		);
	}

	return (
		<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
			{shape}
			{children}
		</Group>
	);
}
