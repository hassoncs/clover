import { Canvas, Group } from "@shopify/react-native-skia";
import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import { Fragment, useMemo } from "react";
import { buildComponentRegistry, resolveAllRefs } from "../components";
import type { LayoutNode } from "../layout";
import { layoutTree } from "../layout";
import { estimateTextSize } from "../text-measure";
import { resolveTreeVariables } from "../variables";
import { FrameTitle } from "./FrameTitle";
import { EllipseNode } from "./nodes/EllipseNode";
import { FrameNode } from "./nodes/FrameNode";
import { GroupNode } from "./nodes/GroupNode";
import { IconFontNode } from "./nodes/IconFontNode";
import { LineNode } from "./nodes/LineNode";
import { NoteNode } from "./nodes/NoteNode";
import { PathNode } from "./nodes/PathNode";
import { PolygonNode } from "./nodes/PolygonNode";
import { RectangleNode } from "./nodes/RectangleNode";
import { TextNode } from "./nodes/TextNode";

export interface PenRendererProps {
	document: PenDocument;
	camera: { translateX: number; translateY: number; scale: number };
	width: number;
	height: number;
	selectedNodePath?: string[];
	onNodeTap?: (nodePath: string[]) => void;
}

function renderLayoutNode(layoutNode: LayoutNode): React.ReactNode {
	const { node } = layoutNode;
	if (node.enabled === false || node.visible === false) return null;

	const renderChildren = (children: LayoutNode[]) =>
		children.map((child) => renderLayoutNode(child));

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
			return <TextNode key={node.id} layoutNode={layoutNode} />;
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
		case "ref":
			return null;
		case "image":
			return null;
		case "connection":
			return null;
		default:
			return null;
	}
}

export function PenRenderer({
	document,
	camera,
	width,
	height,
}: PenRendererProps): React.ReactNode {
	const layoutNodes = useMemo(() => {
		const registry = buildComponentRegistry(document.children);
		const resolved = resolveAllRefs(document.children, registry);
		const withVariables = resolveTreeVariables(resolved, document.variables, document.themes);
		return layoutTree(withVariables, estimateTextSize);
	}, [document]);

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
						{renderLayoutNode(ln)}
					</Fragment>
				))}
			</Group>
		</Canvas>
	);
}
