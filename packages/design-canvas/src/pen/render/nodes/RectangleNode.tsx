import { Group, Rect, RoundedRect } from "@shopify/react-native-skia";
import type { PenRectangle } from "@slopcade/protocol/pen";
import type React from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function RectangleNode({
	layoutNode,
}: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenRectangle;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const solidFillColor = resolveSolidFillColor(node.fill);
	const decorativeFill = solidFillColor ? undefined : node.fill;

	const cornerRadius = node.cornerRadius;

	let shape: React.ReactNode;
	if (
		cornerRadius !== undefined &&
		typeof cornerRadius === "number" &&
		cornerRadius > 0
	) {
		const safeRadius = Math.min(cornerRadius, width / 2, height / 2);
		shape = (
			<RoundedRect
				x={0}
				y={0}
				width={width}
				height={height}
				r={safeRadius}
				color={solidFillColor ?? undefined}
			>
				<PenFillRenderer fill={decorativeFill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</RoundedRect>
		);
	} else if (
		Array.isArray(cornerRadius) &&
		(cornerRadius as number[]).some((r) => r > 0)
	) {
		const safeR = (r: number) =>
			Math.min(Math.max(0, r), width / 2, height / 2);
		const [tl, tr, br, bl] = cornerRadius as [number, number, number, number];
		const rrect = {
			rect: { x: 0, y: 0, width, height },
			topLeft: { x: safeR(tl), y: safeR(tl) },
			topRight: { x: safeR(tr), y: safeR(tr) },
			bottomRight: { x: safeR(br), y: safeR(br) },
			bottomLeft: { x: safeR(bl), y: safeR(bl) },
		};
		shape = (
			<RoundedRect rect={rrect} color={solidFillColor ?? undefined}>
				<PenFillRenderer fill={decorativeFill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</RoundedRect>
		);
	} else {
		shape = (
			<Rect
				x={0}
				y={0}
				width={width}
				height={height}
				color={solidFillColor ?? undefined}
			>
				<PenFillRenderer fill={decorativeFill} width={width} height={height} />
				<PenStrokeRenderer stroke={node.stroke} width={width} height={height} />
				<PenEffectsRenderer effects={node.effects} />
			</Rect>
		);
	}

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
			{shape}
		</Group>
	);
}
