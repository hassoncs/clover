import { FREDOKA_REGULAR } from "../../assets/fontSources";
import { Group, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import type React from "react";
import type { LayoutNode } from "../layout";

interface FrameTitleProps {
	layoutNode: LayoutNode;
}

const TITLE_FONT_SIZE = 13;
const TITLE_COLOR = "#888888";
const TITLE_OFFSET_Y = 20;

export function FrameTitle({ layoutNode }: FrameTitleProps): React.ReactNode {
	const font = useFont(FREDOKA_REGULAR as Parameters<typeof useFont>[0], TITLE_FONT_SIZE);
	const { node } = layoutNode;

	if (node.type !== "frame" && node.type !== "group") return null;

	const title = node.name ?? node.id;
	const { x, y } = layoutNode.rect;

	if (!font) return null;

	return (
		<Group transform={[{ translateX: x }, { translateY: y - TITLE_OFFSET_Y }]}>
			<SkiaText x={0} y={0} text={title} font={font} color={TITLE_COLOR} />
		</Group>
	);
}
