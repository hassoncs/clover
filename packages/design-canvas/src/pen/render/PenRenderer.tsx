import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import { Canvas, Group, Paint, Rect, Skia } from "@shopify/react-native-skia";
import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { PenDrawingState } from "../../tools/penToolState";
import { buildComponentRegistry, resolveAllRefs } from "../components";
import type { LayoutNode } from "../layout";
import { layoutTree, subscribeLayoutReady } from "../layout";
import { estimateTextSize } from "../text-measure";
import { resolveTreeVariables } from "../variables";
import { FrameTitle } from "./FrameTitle";
import { EllipseNode } from "./nodes/EllipseNode";
import { FrameNode } from "./nodes/FrameNode";
import { GroupNode } from "./nodes/GroupNode";
import { IconFontNode } from "./nodes/IconFontNode";
import { ImageNode } from "./nodes/ImageNode";
import { LineNode } from "./nodes/LineNode";
import { NoteNode } from "./nodes/NoteNode";
import { PathNode } from "./nodes/PathNode";
import { PolygonNode } from "./nodes/PolygonNode";
import { RectangleNode } from "./nodes/RectangleNode";
import { TextNode } from "./nodes/TextNode";
import { PenToolOverlay } from "./PenToolOverlay";

export interface PenRendererProps {
	document: PenDocument;
	camera: { translateX: number; translateY: number; scale: number };
	width: number;
	height: number;
	selectedNodePath?: string[];
	onNodeTap?: (nodePath: string[]) => void;
	penDrawingState?: PenDrawingState;
}

const FONT_DEFS: Array<{ path: string; family: string }> = [
	{ path: "/fonts/Fredoka-Regular.ttf", family: "Fredoka" },
	{ path: "/fonts/Inter-Regular.ttf", family: "Inter" },
	{ path: "/fonts/Inter-Bold.ttf", family: "Inter" },
	{ path: "/fonts/Inter-Medium.ttf", family: "Inter" },
];

function renderLayoutNode(
	layoutNode: LayoutNode,
	fontMgr: SkTypefaceFontProvider | null,
): React.ReactNode {
	const { node } = layoutNode;
	if (node.enabled === false || node.visible === false) return null;

	const renderChildren = (children: LayoutNode[]) =>
		children.map((child) => renderLayoutNode(child, fontMgr));

	switch (node.type) {
		case "frame":
			return (
				<FrameNode
					key={node.id}
					layoutNode={layoutNode}
					renderChildren={renderChildren}
				/>
			);
		case "group":
			return (
				<GroupNode
					key={node.id}
					layoutNode={layoutNode}
					renderChildren={renderChildren}
				/>
			);
		case "rectangle":
			return <RectangleNode key={node.id} layoutNode={layoutNode} />;
		case "ellipse":
			return <EllipseNode key={node.id} layoutNode={layoutNode} />;
		case "text":
			return (
				<TextNode key={node.id} layoutNode={layoutNode} fontMgr={fontMgr} />
			);
		case "path":
			return <PathNode key={node.id} layoutNode={layoutNode} />;
		case "line":
			return <LineNode key={node.id} layoutNode={layoutNode} />;
		case "polygon":
			return <PolygonNode key={node.id} layoutNode={layoutNode} />;
		case "icon_font":
			return <IconFontNode key={node.id} layoutNode={layoutNode} />;
		case "note":
			return <NoteNode key={node.id} layoutNode={layoutNode} />;
		case "image":
			return <ImageNode key={node.id} layoutNode={layoutNode} />;
		case "ref":
			return null;
		case "connection":
			return null;
		default:
			return null;
	}
}

function findLayoutNode(nodes: LayoutNode[], id: string): LayoutNode | null {
	for (const ln of nodes) {
		if (ln.node.id === id) return ln;
		const found = findLayoutNode(ln.children, id);
		if (found) return found;
	}
	return null;
}

const SELECTION_COLOR = "#4F86FF";
const HANDLE_SIZE = 6;
const HANDLE_HALF = HANDLE_SIZE / 2;

function SelectionChrome({
	layoutNode,
}: {
	layoutNode: LayoutNode;
}): React.ReactNode {
	const { x, y, width, height } = layoutNode.rect;

	const corners = [
		{ cx: x, cy: y },
		{ cx: x + width, cy: y },
		{ cx: x, cy: y + height },
		{ cx: x + width, cy: y + height },
	];

	return (
		<>
			<Rect x={x} y={y} width={width} height={height} color="transparent">
				<Paint color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
			</Rect>
			{corners.map((corner) => (
				<Rect
					key={`${corner.cx}-${corner.cy}`}
					x={corner.cx - HANDLE_HALF}
					y={corner.cy - HANDLE_HALF}
					width={HANDLE_SIZE}
					height={HANDLE_SIZE}
					color="white"
				>
					<Paint color={SELECTION_COLOR} style="stroke" strokeWidth={1} />
				</Rect>
			))}
		</>
	);
}

export function PenRenderer({
	document,
	camera,
	width,
	height,
	selectedNodePath,
	penDrawingState,
}: PenRendererProps): React.ReactNode {
	const [layoutReadyRevision, setLayoutReadyRevision] = useState(0);
	useEffect(() => {
		return subscribeLayoutReady(() => {
			setLayoutReadyRevision((value) => value + 1);
		});
	}, []);

	const layoutNodes = useMemo(() => {
		void layoutReadyRevision;
		const registry = buildComponentRegistry(document.children);
		const resolved = resolveAllRefs(document.children, registry);
		const withVariables = resolveTreeVariables(
			resolved,
			document.variables,
			document.themes,
		);
		return layoutTree(withVariables, estimateTextSize);
	}, [document, layoutReadyRevision]);

	const selectedLayoutNode = useMemo(() => {
		if (!selectedNodePath || selectedNodePath.length === 0) return null;
		const id = selectedNodePath[selectedNodePath.length - 1];
		return findLayoutNode(layoutNodes, id);
	}, [layoutNodes, selectedNodePath]);

	const [fontMgr, setFontMgr] = useState<SkTypefaceFontProvider | null>(null);
	useEffect(() => {
		const mgr = Skia.TypefaceFontProvider.Make();
		const pending = FONT_DEFS.map(({ path, family }) =>
			fetch(path)
				.then((res) => res.arrayBuffer())
				.then((buf) => {
					const data = Skia.Data.fromBytes(new Uint8Array(buf));
					const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
					if (tf) mgr.registerFont(tf, family);
				})
				.catch(() => {
					// Font not available — skip silently
				}),
		);
		Promise.allSettled(pending).then(() => setFontMgr(mgr));
	}, []);

	return (
		<Canvas style={{ width, height }}>
			<Group
				transform={[
					{ translateX: camera.translateX },
					{ translateY: camera.translateY },
					{ scale: camera.scale },
				]}
			>
				{layoutNodes.map((ln) => (
					<Fragment key={ln.node.id}>
						<FrameTitle layoutNode={ln} />
						{renderLayoutNode(ln, fontMgr)}
					</Fragment>
				))}
				{selectedLayoutNode && (
					<SelectionChrome layoutNode={selectedLayoutNode} />
				)}
				{penDrawingState && <PenToolOverlay drawingState={penDrawingState} />}
			</Group>
		</Canvas>
	);
}
