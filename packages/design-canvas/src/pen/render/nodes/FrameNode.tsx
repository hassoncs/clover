import {
	DashPathEffect,
	Group,
	Paint,
	Rect,
	RoundedRect,
} from "@shopify/react-native-skia";
import type { PenFrame } from "@slopcade/protocol/pen";
import type React from "react";
import { useEffect, useState } from "react";
import type { LayoutNode } from "../../layout";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { PenStrokeRenderer } from "../strokes";

interface NodeRendererProps {
	layoutNode: LayoutNode;
	renderChildren?: (children: LayoutNode[]) => React.ReactNode;
}

const AI_BORDER_COLOR = "#818cf8";
const AI_BORDER_WIDTH = 2;
const AI_DASH_TOTAL = 20;

function AiGeneratingBorder({
	x,
	y,
	width,
	height,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
}): React.ReactNode {
	const [phase, setPhase] = useState(0);

	useEffect(() => {
		let raf: ReturnType<typeof requestAnimationFrame>;
		let start: number | null = null;
		const animate = (time: number) => {
			if (start === null) start = time;
			const elapsed = time - start;
			setPhase(((elapsed / 400) * AI_DASH_TOTAL) % AI_DASH_TOTAL);
			raf = requestAnimationFrame(animate);
		};
		raf = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<Rect
			x={x - 1}
			y={y - 1}
			width={width + 2}
			height={height + 2}
			color="transparent"
		>
			<Paint
				style="stroke"
				strokeWidth={AI_BORDER_WIDTH}
				color={AI_BORDER_COLOR}
			>
				<DashPathEffect intervals={[6, 4]} phase={phase} />
			</Paint>
		</Rect>
	);
}

export function FrameNode({
	layoutNode,
	renderChildren,
}: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenFrame;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;
	const solidFillColor = resolveSolidFillColor(node.fill);
	const decorativeFill = solidFillColor ? undefined : node.fill;

	const cornerRadius = node.cornerRadius;
	const children = renderChildren?.(layoutNode.children);

	let shape: React.ReactNode;
	if (
		cornerRadius !== undefined &&
		typeof cornerRadius === "number" &&
		cornerRadius > 0
	) {
		const safeRadius = Math.min(cornerRadius, width / 2, height / 2);
		shape = (
			<RoundedRect
				x={x}
				y={y}
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
	} else if (Array.isArray(cornerRadius) && cornerRadius.some((r) => r > 0)) {
		const safeR = (r: number) =>
			Math.min(Math.max(0, r), width / 2, height / 2);
		const [tl, tr, br, bl] = cornerRadius;
		const rrect = {
			rect: { x, y, width, height },
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
				x={x}
				y={y}
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

	if (layoutNode.clip) {
		return (
			<Group opacity={opacity}>
				{shape}
				<Group clip={{ x, y, width, height }}>{children}</Group>
				{node.aiGenerating && (
					<AiGeneratingBorder x={x} y={y} width={width} height={height} />
				)}
			</Group>
		);
	}

	return (
		<Group opacity={opacity}>
			{shape}
			{children}
			{node.aiGenerating && (
				<AiGeneratingBorder x={x} y={y} width={width} height={height} />
			)}
		</Group>
	);
}
