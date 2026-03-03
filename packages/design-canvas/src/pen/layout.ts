import type { PenDocument, PenNode, PenText } from "@slopcade/shared/types/pen";
import type { LayoutNode, LayoutRect, SizingSpec } from "./layout-core";
import { parsePadding, parseSizing } from "./layout-core";
import { penDocumentToSceneGraph } from "./runtime/adapters";
import type { RuntimeNode, SceneGraph } from "./runtime/scene-graph";
import {
	computeLayout,
	isYogaRuntimeReady,
	subscribeYogaRuntimeReady,
} from "./runtime/yoga-layout";
import type { TextMeasureFn } from "./text-measure";

export type { LayoutNode, LayoutRect, SizingSpec } from "./layout-core";
export { parsePadding, parseSizing } from "./layout-core";

export function subscribeLayoutReady(fn: () => void): () => void {
	if (isYogaRuntimeReady()) {
		fn();
		return () => {};
	}

	return subscribeYogaRuntimeReady(fn);
}

export function layoutTree(
	nodes: PenNode[],
	textMeasure: TextMeasureFn,
): LayoutNode[] {
	const originalNodes = indexNodes(nodes);
	const graph = penDocumentToSceneGraph(makeDocument(nodes));
	resolveFitContentSizing(graph, textMeasure);
	const layout = computeLayout(graph, graph.rootId);

	return graph
		.getChildren(graph.rootId)
		.map((rootNode) =>
			buildLayoutNode(graph, rootNode.id, originalNodes, layout),
		);
}

function buildLayoutNode(
	graph: SceneGraph,
	nodeId: string,
	originalNodes: Map<string, PenNode>,
	layout: Map<string, LayoutRect>,
): LayoutNode {
	const runtimeNode = requireNode(graph, nodeId);
	const sourceNode = originalNodes.get(nodeId);
	if (!sourceNode) {
		throw new Error(`Layout source node not found: ${nodeId}`);
	}

	const rect = layout.get(nodeId) ?? fallbackRect(runtimeNode);
	const children = graph
		.getChildren(nodeId)
		.map((child) => buildLayoutNode(graph, child.id, originalNodes, layout));

	return {
		node: sourceNode,
		rect,
		children,
		clip: sourceNode.type === "frame" ? (sourceNode.clip ?? false) : false,
	};
}

function resolveFitContentSizing(
	graph: SceneGraph,
	textMeasure: TextMeasureFn,
): void {
	for (const node of graph.nodes.values()) {
		if (node.id === graph.rootId) continue;

		const widthSpec = parseSizing(node.width);
		if (widthSpec.kind === "fit_content") {
			graph.updateNode(node.id, {
				width: computeFitContentDimension(
					node,
					"width",
					widthSpec,
					textMeasure,
				),
			});
		}

		const heightSpec = parseSizing(node.height);
		if (heightSpec.kind === "fit_content") {
			graph.updateNode(node.id, {
				height: computeFitContentDimension(
					node,
					"height",
					heightSpec,
					textMeasure,
				),
			});
		}
	}
}

function computeFitContentDimension(
	node: RuntimeNode,
	axis: "width" | "height",
	spec: Extract<SizingSpec, { kind: "fit_content" }>,
	textMeasure: TextMeasureFn,
): number {
	if (node.type !== "text") {
		return spec.fallback ?? 100;
	}

	const content = getTextContent(node);
	const fontSize = node.fontSize ?? 16;
	const fontFamily = node.fontFamily ?? "sans-serif";
	const measured = textMeasure(content, fontSize, fontFamily, node.fontWeight);
	return axis === "width" ? measured.width : measured.height;
}

function getTextContent(node: RuntimeNode): string {
	if (typeof node.content === "string") {
		return node.content;
	}
	if (Array.isArray(node.content)) {
		return node.content
			.map((span) => (isTextSpan(span) ? span.content : ""))
			.join("");
	}
	return "";
}

type PenTextSpan = Extract<PenText["content"], Array<unknown>>[number];

function isTextSpan(value: unknown): value is PenTextSpan {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	if (!("content" in value)) {
		return false;
	}
	return typeof (value as { content: unknown }).content === "string";
}

function fallbackRect(node: RuntimeNode): LayoutRect {
	const width = typeof node.width === "number" ? node.width : 0;
	const height = typeof node.height === "number" ? node.height : 0;
	return {
		x: node.x ?? 0,
		y: node.y ?? 0,
		width,
		height,
	};
}

function requireNode(graph: SceneGraph, nodeId: string): RuntimeNode {
	const node = graph.getNode(nodeId);
	if (!node) {
		throw new Error(`Runtime node not found: ${nodeId}`);
	}
	return node;
}

function makeDocument(nodes: PenNode[]): PenDocument {
	return {
		version: 1,
		children: nodes,
	};
}

function indexNodes(nodes: PenNode[]): Map<string, PenNode> {
	const map = new Map<string, PenNode>();
	for (const node of nodes) {
		visitNode(node, map);
	}
	return map;
}

function visitNode(node: PenNode, map: Map<string, PenNode>): void {
	map.set(node.id, node);
	if (node.type !== "frame" && node.type !== "group") {
		return;
	}
	for (const child of node.children ?? []) {
		visitNode(child, map);
	}
}
