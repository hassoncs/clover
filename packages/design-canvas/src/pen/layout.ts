import type { PenFrame, PenGroup, PenNode, PenPadding, PenSizing, PenText } from "@slopcade/shared/types/pen";
import type { TextMeasureFn } from "./text-measure";

export interface LayoutRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutNode {
	node: PenNode;
	rect: LayoutRect;
	children: LayoutNode[];
	clip: boolean;
}

export type SizingSpec =
	| { kind: "fixed"; value: number }
	| { kind: "fill_container"; fallback: number | null }
	| { kind: "fit_content"; fallback: number | null }
	| { kind: "auto" };

export function parseSizing(s: PenSizing | undefined): SizingSpec {
	if (s === undefined) return { kind: "auto" };
	if (typeof s === "number") return { kind: "fixed", value: s };

	if (s === "fill_container") return { kind: "fill_container", fallback: null };
	if (s === "fit_content") return { kind: "fit_content", fallback: null };

	const fillMatch = s.match(/^fill_container\((\d+(?:\.\d+)?)\)$/);
	if (fillMatch) {
		return { kind: "fill_container", fallback: parseFloat(fillMatch[1]) };
	}

	const fitMatch = s.match(/^fit_content\((\d+(?:\.\d+)?)\)$/);
	if (fitMatch) {
		return { kind: "fit_content", fallback: parseFloat(fitMatch[1]) };
	}

	return { kind: "auto" };
}

export function parsePadding(p: PenPadding | undefined): [number, number, number, number] {
	if (p === undefined) return [0, 0, 0, 0];
	if (typeof p === "number") return [p, p, p, p];
	if (p.length === 2) return [p[0], p[1], p[0], p[1]];
	const q = p as [number, number, number, number];
	return [q[0], q[1], q[2], q[3]];
}

type ContainerNode = PenFrame | PenGroup;

function isContainer(node: PenNode): node is ContainerNode {
	return node.type === "frame" || node.type === "group";
}

function getTextContent(node: PenText): string {
	if (typeof node.content === "string") return node.content;
	return node.content.map((span) => span.content).join("");
}

function computeNodeSize(
	node: PenNode,
	parentWidth: number | null,
	parentHeight: number | null,
	textMeasure: TextMeasureFn,
): { width: number; height: number } {
	const wSpec = parseSizing((node as { width?: PenSizing }).width);
	const hSpec = parseSizing((node as { height?: PenSizing }).height);

	let width = resolveSize(wSpec, parentWidth, "width");
	let height = resolveSize(hSpec, parentHeight, "height");

	if (wSpec.kind === "fit_content" || hSpec.kind === "fit_content") {
		const fitSize = computeFitContentSize(node, textMeasure);
		if (wSpec.kind === "fit_content") width = fitSize.width;
		if (hSpec.kind === "fit_content") height = fitSize.height;
	}

	return { width, height };
}

function resolveSize(spec: SizingSpec, parentSize: number | null, _axis: string): number {
	switch (spec.kind) {
		case "fixed":
			return spec.value;
		case "fill_container":
			if (parentSize !== null) return parentSize;
			return spec.fallback ?? 200;
		case "fit_content":
			return spec.fallback ?? 100;
		case "auto":
			return 0;
	}
}

function computeFitContentSize(
	node: PenNode,
	textMeasure: TextMeasureFn,
): { width: number; height: number } {
	if (node.type === "text") {
		const text = getTextContent(node);
		const fontSize = node.fontSize ?? 16;
		const fontFamily = node.fontFamily ?? "sans-serif";
		const fontWeight = node.fontWeight;
		const maxWidth =
			(node as { width?: PenSizing }).width !== undefined
				? resolveSize(parseSizing((node as { width?: PenSizing }).width), null, "width") || undefined
				: undefined;
		return textMeasure(text, fontSize, fontFamily, fontWeight, maxWidth || undefined);
	}

	if (!isContainer(node)) {
		return { width: 100, height: 100 };
	}

	const children = node.children ?? [];
	if (children.length === 0) {
		return { width: 100, height: 100 };
	}

	const [pt, pr, pb, pl] = parsePadding(node.padding);
	const gap = node.gap ?? 0;
	const layout = node.layout ?? "none";

	if (layout === "horizontal") {
		let totalWidth = pl + pr;
		let maxChildHeight = 0;
		for (let i = 0; i < children.length; i++) {
			const childSize = computeNodeSize(children[i], null, null, textMeasure);
			totalWidth += childSize.width;
			if (i < children.length - 1) totalWidth += gap;
			if (childSize.height > maxChildHeight) maxChildHeight = childSize.height;
		}
		return { width: totalWidth, height: maxChildHeight + pt + pb };
	}

	if (layout === "vertical") {
		let totalHeight = pt + pb;
		let maxChildWidth = 0;
		for (let i = 0; i < children.length; i++) {
			const childSize = computeNodeSize(children[i], null, null, textMeasure);
			totalHeight += childSize.height;
			if (i < children.length - 1) totalHeight += gap;
			if (childSize.width > maxChildWidth) maxChildWidth = childSize.width;
		}
		return { width: maxChildWidth + pl + pr, height: totalHeight };
	}

	// layout === "none": size to bounding box of children
	let maxRight = 0;
	let maxBottom = 0;
	for (const child of children) {
		const childX = (child as { x?: number }).x ?? 0;
		const childY = (child as { y?: number }).y ?? 0;
		const childSize = computeNodeSize(child, null, null, textMeasure);
		const right = childX + childSize.width;
		const bottom = childY + childSize.height;
		if (right > maxRight) maxRight = right;
		if (bottom > maxBottom) maxBottom = bottom;
	}
	return { width: maxRight + pr, height: maxBottom + pb };
}

type JustifyContent = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
type AlignItems = "start" | "center" | "end" | "stretch";

function computeMainAxisOffsets(
	justifyContent: JustifyContent | undefined,
	totalContentSize: number,
	containerSize: number,
	childCount: number,
	gap: number,
): { startOffset: number; spaceBetween: number } {
	const freeSpace = containerSize - totalContentSize;

	// TODO: expand this with full justifyContent distribution logic
	switch (justifyContent) {
		case "center":
			return { startOffset: freeSpace / 2, spaceBetween: gap };
		case "end":
			return { startOffset: freeSpace, spaceBetween: gap };
		case "space-between":
			if (childCount <= 1) return { startOffset: 0, spaceBetween: gap };
			return { startOffset: 0, spaceBetween: gap + freeSpace / (childCount - 1) };
		case "space-around": {
			const space = freeSpace / childCount;
			return { startOffset: space / 2, spaceBetween: gap + space };
		}
		case "space-evenly": {
			const space = freeSpace / (childCount + 1);
			return { startOffset: space, spaceBetween: gap + space };
		}
		case "start":
		default:
			return { startOffset: 0, spaceBetween: gap };
	}
}

function computeCrossAxisOffset(
	alignItems: AlignItems | undefined,
	childCrossSize: number,
	containerCrossSize: number,
): number {
	switch (alignItems) {
		case "center":
			return (containerCrossSize - childCrossSize) / 2;
		case "end":
			return containerCrossSize - childCrossSize;
		case "start":
		default:
			return 0;
	}
}

function layoutChildren(
	container: ContainerNode,
	containerRect: LayoutRect,
	textMeasure: TextMeasureFn,
): LayoutNode[] {
	const children = container.children ?? [];
	if (children.length === 0) return [];

	const [pt, pr, pb, pl] = parsePadding(container.padding);
	const gap = container.gap ?? 0;
	const layout = container.layout ?? "none";
	const availableWidth = containerRect.width - pl - pr;
	const availableHeight = containerRect.height - pt - pb;
	const contentOriginX = containerRect.x + pl;
	const contentOriginY = containerRect.y + pt;

	if (layout === "none") {
		return children.map((child) => {
			const childRelX = (child as { x?: number }).x ?? 0;
			const childRelY = (child as { y?: number }).y ?? 0;
			const childSize = computeNodeSize(child, availableWidth, availableHeight, textMeasure);
			const childRect: LayoutRect = {
				x: contentOriginX + childRelX,
				y: contentOriginY + childRelY,
				width: childSize.width,
				height: childSize.height,
			};
			return buildLayoutNode(child, childRect, textMeasure);
		});
	}

	// Flex layout (horizontal or vertical)
	const isHorizontal = layout === "horizontal";
	const justifyContent = (container as PenFrame).justifyContent;
	const alignItems = (container as PenFrame).alignItems;

	// First pass: compute sizes for non-fill children
	type ChildInfo = {
		child: PenNode;
		wSpec: SizingSpec;
		hSpec: SizingSpec;
		width: number;
		height: number;
		isFillMain: boolean;
	};

	const childInfos: ChildInfo[] = children.map((child) => {
		const wSpec = parseSizing((child as { width?: PenSizing }).width);
		const hSpec = parseSizing((child as { height?: PenSizing }).height);
		const mainIsFill = isHorizontal ? wSpec.kind === "fill_container" : hSpec.kind === "fill_container";
		const crossIsFill = isHorizontal ? hSpec.kind === "fill_container" : wSpec.kind === "fill_container";

		let width = 0;
		let height = 0;

		if (!mainIsFill) {
			const parentW = isHorizontal ? null : availableWidth;
			const parentH = isHorizontal ? availableHeight : null;
			const size = computeNodeSize(child, parentW, parentH, textMeasure);
			width = size.width;
			height = size.height;
		}

		if (crossIsFill) {
			if (isHorizontal) height = availableHeight;
			else width = availableWidth;
		}

		return { child, wSpec, hSpec, width, height, isFillMain: mainIsFill };
	});

	// Calculate remaining space for fill_container children
	const fillCount = childInfos.filter((c) => c.isFillMain).length;
	const fixedMainTotal = childInfos
		.filter((c) => !c.isFillMain)
		.reduce((sum, c) => sum + (isHorizontal ? c.width : c.height), 0);
	const totalGap = (children.length - 1) * gap;
	const remainingMain = (isHorizontal ? availableWidth : availableHeight) - fixedMainTotal - totalGap;
	const fillMainSize = fillCount > 0 ? Math.max(0, remainingMain / fillCount) : 0;

	// Assign sizes to fill children
	for (const info of childInfos) {
		if (info.isFillMain) {
			if (isHorizontal) {
				info.width = fillMainSize;
				if (info.hSpec.kind === "fill_container") {
					info.height = availableHeight;
				} else {
					const size = computeNodeSize(info.child, info.width, availableHeight, textMeasure);
					info.height = size.height;
				}
			} else {
				info.height = fillMainSize;
				if (info.wSpec.kind === "fill_container") {
					info.width = availableWidth;
				} else {
					const size = computeNodeSize(info.child, availableWidth, info.height, textMeasure);
					info.width = size.width;
				}
			}
		}
	}

	// Compute main axis offsets with justifyContent
	const totalContentMain = childInfos.reduce(
		(sum, c) => sum + (isHorizontal ? c.width : c.height),
		0,
	);
	const containerMain = isHorizontal ? availableWidth : availableHeight;
	const { startOffset, spaceBetween } = computeMainAxisOffsets(
		justifyContent,
		totalContentMain + totalGap,
		containerMain,
		children.length,
		gap,
	);

	// Position children
	let mainCursor = (isHorizontal ? contentOriginX : contentOriginY) + startOffset;
	const crossOrigin = isHorizontal ? contentOriginY : contentOriginX;
	const containerCross = isHorizontal ? availableHeight : availableWidth;

	return childInfos.map((info, i) => {
		const childMain = isHorizontal ? info.width : info.height;
		const childCross = isHorizontal ? info.height : info.width;

		const crossOffset = computeCrossAxisOffset(alignItems, childCross, containerCross);

		const childRect: LayoutRect = isHorizontal
			? { x: mainCursor, y: crossOrigin + crossOffset, width: info.width, height: info.height }
			: { x: crossOrigin + crossOffset, y: mainCursor, width: info.width, height: info.height };

		mainCursor += childMain;
		if (i < childInfos.length - 1) mainCursor += spaceBetween;

		return buildLayoutNode(info.child, childRect, textMeasure);
	});
}

function buildLayoutNode(
	node: PenNode,
	rect: LayoutRect,
	textMeasure: TextMeasureFn,
): LayoutNode {
	const clip = node.type === "frame" ? (node.clip ?? false) : false;
	const children = isContainer(node) ? layoutChildren(node, rect, textMeasure) : [];
	return { node, rect, children, clip };
}

export function layoutTree(nodes: PenNode[], textMeasure: TextMeasureFn): LayoutNode[] {
	return nodes.map((node) => {
		const absX = (node as { x?: number }).x ?? 0;
		const absY = (node as { y?: number }).y ?? 0;
		const size = computeNodeSize(node, null, null, textMeasure);
		const rect: LayoutRect = { x: absX, y: absY, width: size.width, height: size.height };
		return buildLayoutNode(node, rect, textMeasure);
	});
}
