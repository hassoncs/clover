import type { PenSizing } from "@slopcade/shared/types/pen";
import Yoga, {
	Align,
	Direction,
	Edge,
	FlexDirection,
	Gutter,
	Justify,
	PositionType,
	Wrap,
	type Node as YogaNode,
} from "yoga-layout";
import { type LayoutRect, parsePadding, parseSizing } from "../layout-core";
import type { RuntimeNode, SceneGraph } from "./scene-graph";

export type { LayoutRect };

type YogaRuntime = typeof Yoga;
type LayoutMode = "none" | "horizontal" | "vertical" | "wrap";

class YogaTreeNode {
	readonly id: string;
	readonly yogaNode: YogaNode;
	readonly children: YogaTreeNode[] = [];

	constructor(id: string, yogaNode: YogaNode) {
		this.id = id;
		this.yogaNode = yogaNode;
	}
}

export class LayoutInitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LayoutInitError";
	}
}

let yogaFactory: (() => YogaRuntime) | null = () => Yoga;

export function computeLayout(
	graph: SceneGraph,
	rootId: string,
): Map<string, LayoutRect> {
	const runtime = resolveYogaRuntime();
	const root = graph.getNode(rootId);
	if (!root) {
		return new Map<string, LayoutRect>();
	}

	const tree = buildYogaTree(graph, root, runtime, null);
	try {
		tree.yogaNode.calculateLayout(undefined, undefined, Direction.LTR);
		const layout = new Map<string, LayoutRect>();
		collectComputedLayout(tree, layout, 0, 0);
		return layout;
	} finally {
		freeYogaTree(tree.yogaNode);
	}
}

export function __setYogaFactoryForTests(
	factory: (() => YogaRuntime) | null,
): void {
	yogaFactory = factory;
}

function resolveYogaRuntime(): YogaRuntime {
	if (yogaFactory === null) {
		throw new LayoutInitError(
			"Failed to initialize Yoga WASM: Yoga factory is not configured",
		);
	}

	try {
		const runtime = yogaFactory();
		if (!runtime?.Node?.create) {
			throw new Error("Yoga.Node.create is unavailable");
		}
		return runtime;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new LayoutInitError(`Failed to initialize Yoga WASM: ${message}`);
	}
}

function buildYogaTree(
	graph: SceneGraph,
	node: RuntimeNode,
	runtime: YogaRuntime,
	parent: RuntimeNode | null,
): YogaTreeNode {
	const yogaNode = runtime.Node.create();
	configureYogaNode(node, parent, yogaNode);

	const treeNode = new YogaTreeNode(node.id, yogaNode);
	for (const childId of node.childIds) {
		const child = graph.getNode(childId);
		if (!child) continue;
		const childTree = buildYogaTree(graph, child, runtime, node);
		treeNode.children.push(childTree);
		yogaNode.insertChild(childTree.yogaNode, yogaNode.getChildCount());
	}

	return treeNode;
}

function configureYogaNode(
	node: RuntimeNode,
	parent: RuntimeNode | null,
	yogaNode: YogaNode,
): void {
	const [paddingTop, paddingRight, paddingBottom, paddingLeft] = parsePadding(
		node.padding,
	);
	yogaNode.setPadding(Edge.Top, paddingTop);
	yogaNode.setPadding(Edge.Right, paddingRight);
	yogaNode.setPadding(Edge.Bottom, paddingBottom);
	yogaNode.setPadding(Edge.Left, paddingLeft);

	const mode = getLayoutMode(node);
	if (mode === "horizontal") {
		yogaNode.setFlexDirection(FlexDirection.Row);
		yogaNode.setFlexWrap(Wrap.NoWrap);
	} else if (mode === "vertical") {
		yogaNode.setFlexDirection(FlexDirection.Column);
		yogaNode.setFlexWrap(Wrap.NoWrap);
	} else if (mode === "wrap") {
		yogaNode.setFlexDirection(FlexDirection.Row);
		yogaNode.setFlexWrap(Wrap.Wrap);
	}

	if (mode !== "none") {
		const gap = node.gap ?? 0;
		yogaNode.setGap(Gutter.Row, gap);
		yogaNode.setGap(Gutter.Column, gap);
		yogaNode.setJustifyContent(mapJustifyContent(node.justifyContent));
		yogaNode.setAlignItems(mapAlignItems(node.alignItems));
	}

	applySizing(yogaNode, "width", node.width, parent, mode);
	applySizing(yogaNode, "height", node.height, parent, mode);

	if (parent && getLayoutMode(parent) === "none" && hasExplicitPosition(node)) {
		yogaNode.setPositionType(PositionType.Absolute);
		yogaNode.setPosition(Edge.Left, node.x ?? 0);
		yogaNode.setPosition(Edge.Top, node.y ?? 0);
	}
}

function applySizing(
	yogaNode: YogaNode,
	axis: "width" | "height",
	sizing: PenSizing | undefined,
	parent: RuntimeNode | null,
	mode: LayoutMode,
): void {
	const parsed = parseSizing(sizing);
	if (parsed.kind === "fixed") {
		setDimension(yogaNode, axis, parsed.value);
		return;
	}

	if (parsed.kind === "fit_content") {
		setDimension(yogaNode, axis, parsed.fallback ?? 100);
		return;
	}

	if (parsed.kind === "fill_container") {
		if (parent !== null && isFlexAxis(parent, axis)) {
			const grow = parsed.fallback ?? 1;
			yogaNode.setFlexGrow(grow);
			yogaNode.setFlexShrink(1);
			yogaNode.setFlexBasis(0);
			return;
		}
		if (parent !== null && isCrossAxis(parent, axis)) {
			yogaNode.setAlignSelf(Align.Stretch);
			return;
		}
		setDimension(yogaNode, axis, parsed.fallback ?? 200);
		return;
	}

	if (mode === "none") {
		setDimension(yogaNode, axis, 0);
	}
}

function setDimension(
	yogaNode: YogaNode,
	axis: "width" | "height",
	value: number,
): void {
	if (axis === "width") {
		yogaNode.setWidth(value);
		return;
	}
	yogaNode.setHeight(value);
}

function isFlexAxis(parent: RuntimeNode, axis: "width" | "height"): boolean {
	const mode = getLayoutMode(parent);
	if (mode === "horizontal" || mode === "wrap") return axis === "width";
	if (mode === "vertical") return axis === "height";
	return false;
}

function isCrossAxis(parent: RuntimeNode, axis: "width" | "height"): boolean {
	const mode = getLayoutMode(parent);
	if (mode === "horizontal" || mode === "wrap") return axis === "height";
	if (mode === "vertical") return axis === "width";
	return false;
}

function hasExplicitPosition(node: RuntimeNode): boolean {
	return typeof node.x === "number" || typeof node.y === "number";
}

function getLayoutMode(node: RuntimeNode): LayoutMode {
	const layout = node.layout as string | undefined;
	if (layout === "horizontal" || layout === "vertical" || layout === "wrap") {
		return layout;
	}
	return "none";
}

function collectComputedLayout(
	node: YogaTreeNode,
	layout: Map<string, LayoutRect>,
	offsetX: number,
	offsetY: number,
): void {
	const computed = node.yogaNode.getComputedLayout();
	const absoluteX = offsetX + computed.left;
	const absoluteY = offsetY + computed.top;
	layout.set(node.id, {
		x: absoluteX,
		y: absoluteY,
		width: computed.width,
		height: computed.height,
	});

	for (const child of node.children) {
		collectComputedLayout(child, layout, absoluteX, absoluteY);
	}
}

function freeYogaTree(node: YogaNode): void {
	for (let index = node.getChildCount() - 1; index >= 0; index--) {
		freeYogaTree(node.getChild(index));
	}
	node.free();
}

function mapJustifyContent(value: RuntimeNode["justifyContent"]): Justify {
	switch (value) {
		case "center":
			return Justify.Center;
		case "end":
			return Justify.FlexEnd;
		case "space-between":
			return Justify.SpaceBetween;
		case "space-around":
			return Justify.SpaceAround;
		case "space-evenly":
			return Justify.SpaceEvenly;
		case "start":
		default:
			return Justify.FlexStart;
	}
}

function mapAlignItems(value: RuntimeNode["alignItems"]): Align {
	switch (value) {
		case "center":
			return Align.Center;
		case "end":
			return Align.FlexEnd;
		case "stretch":
			return Align.Stretch;
		case "start":
		default:
			return Align.FlexStart;
	}
}
