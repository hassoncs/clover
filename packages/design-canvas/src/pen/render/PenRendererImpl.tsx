import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import { Canvas, Group, Paint, Rect, Skia } from "@shopify/react-native-skia";
import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { PenDrawingState } from "../../tools/penToolState";
import { buildComponentRegistry, resolveAllRefs } from "../components";
import type { LayoutNode } from "../layout";
import { layoutTree } from "../layout";
import { estimateTextSize } from "../text-measure";
import { resolveTreeVariables } from "../variables";
import { BuildChrome } from "./BuildChrome";
import { FrameTitle } from "./FrameTitle";
import { EffectNode } from "./nodes/EffectNode";
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

/** Statically bundled fonts available at /fonts/ in the dev server. */
const LOCAL_FONTS: Record<string, string[]> = {
	Fredoka: ["/fonts/Fredoka-Regular.ttf"],
	Inter: [
		"/fonts/Inter-Regular.ttf",
		"/fonts/Inter-Bold.ttf",
		"/fonts/Inter-Medium.ttf",
	],
	"JetBrains Mono": [
		"/fonts/JetBrainsMono-400.ttf",
		"/fonts/JetBrainsMono-700.ttf",
	],
	Geist: ["/fonts/Geist-400.ttf", "/fonts/Geist-700.ttf"],
};

/**
 * Walk a layout tree to collect all unique fontFamily values.
 */
function collectFontFamilies(nodes: LayoutNode[]): Set<string> {
	const families = new Set<string>();
	function walk(ln: LayoutNode) {
		const node = ln.node;
		if (node.type === "text") {
			const text = node as { fontFamily?: string; content?: unknown };
			if (text.fontFamily) families.add(text.fontFamily);
			// Also check spans in rich text content
			if (Array.isArray(text.content)) {
				for (const span of text.content as Array<{ fontFamily?: string }>) {
					if (span.fontFamily) families.add(span.fontFamily);
				}
			}
		}
		for (const child of ln.children) walk(child);
	}
	for (const ln of nodes) walk(ln);
	return families;
}

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
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<FrameNode layoutNode={layoutNode} renderChildren={renderChildren} />
				</BuildChrome>
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
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<RectangleNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "ellipse":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<EllipseNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "text":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<TextNode layoutNode={layoutNode} fontMgr={fontMgr} />
				</BuildChrome>
			);
		case "path":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<PathNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "line":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<LineNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "polygon":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<PolygonNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "icon_font":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<IconFontNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "note":
			return <NoteNode key={node.id} layoutNode={layoutNode} />;
		case "image":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<ImageNode layoutNode={layoutNode} />
				</BuildChrome>
			);
		case "effect":
			return (
				<BuildChrome key={node.id} layoutNode={layoutNode}>
					<EffectNode layoutNode={layoutNode} />
				</BuildChrome>
			);
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
			<Rect x={x} y={y} width={width} height={height}>
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

export default function PenRenderer({
	document,
	camera,
	width,
	height,
	selectedNodePath,
	penDrawingState,
}: PenRendererProps): React.ReactNode {
	const layoutNodes = useMemo(() => {
		const registry = buildComponentRegistry(document.children);
		const resolved = resolveAllRefs(document.children, registry);
		const withVariables = resolveTreeVariables(
			resolved,
			document.variables,
			document.themes,
		);
		return layoutTree(withVariables, estimateTextSize);
	}, [document]);

	const selectedLayoutNode = useMemo(() => {
		if (!selectedNodePath || selectedNodePath.length === 0) return null;
		const id = selectedNodePath[selectedNodePath.length - 1];
		return findLayoutNode(layoutNodes, id);
	}, [layoutNodes, selectedNodePath]);

	const [fontMgr, setFontMgr] = useState<SkTypefaceFontProvider | null>(null);

	// Collect all font families from the resolved layout tree
	const requiredFonts = useMemo(() => {
		const families = collectFontFamilies(layoutNodes);
		// Always include the default fallback
		families.add("Fredoka");
		families.add("Inter");
		return Array.from(families);
	}, [layoutNodes]);

	useEffect(() => {
		let cancelled = false;
		async function loadFonts() {
			// Defensive guard for Skia availability
			if (!Skia?.TypefaceFontProvider?.Make) return;

			const mgr = Skia.TypefaceFontProvider.Make();

			for (const family of requiredFonts) {
				const urls = LOCAL_FONTS[family] ?? [];
				if (urls.length === 0) continue;

				for (const url of urls) {
					try {
						const res = await fetch(url);
						if (!res.ok) continue;
						const buf = await res.arrayBuffer();
						const data = Skia.Data.fromBytes(new Uint8Array(buf));
						const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
						if (tf) mgr.registerFont(tf, family);
					} catch {
						// Font file not available — skip
					}
				}
			}

			if (!cancelled) setFontMgr(mgr);
		}

		loadFonts();
		return () => {
			cancelled = true;
		};
	}, [requiredFonts]);

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
