import { Group, Paragraph, Skia, TextAlign } from "@shopify/react-native-skia";
import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import type { PenFill, PenText } from "@slopcade/shared/types/pen";
import type React from "react";
import { useMemo } from "react";
import type { LayoutNode } from "../../layout";
import { buildNodeTransform } from "../nodeTransform";

interface NodeRendererProps {
	layoutNode: LayoutNode;
	fontMgr: SkTypefaceFontProvider | null;
}

function resolveTextColor(fill: PenFill | undefined): string {
	if (!fill) return "#000000";
	if (Array.isArray(fill)) return "#000000";
	if (typeof fill === "string") return fill;
	if (fill.type === "color") return fill.color;
	return "#000000";
}

const TEXT_ALIGN_MAP: Record<string, TextAlign> = {
	left: TextAlign.Left,
	center: TextAlign.Center,
	right: TextAlign.Right,
	justify: TextAlign.Justify,
};

export function TextNode({ layoutNode, fontMgr }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenText;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	const paragraph = useMemo(() => {
		if (!fontMgr) return null;
		if (!Skia?.ParagraphBuilder?.Make) return null;

		const textAlign = TEXT_ALIGN_MAP[node.textAlign ?? "left"] ?? TextAlign.Left;
		const builder = Skia.ParagraphBuilder.Make({ textAlign }, fontMgr);

		const fontWeight = node.fontWeight === "bold" || node.fontWeight === "700" ? 700 : 400;

		const defaultFamily = node.fontFamily || "Fredoka";

		if (typeof node.content === "string") {
			builder.pushStyle({
				color: Skia.Color(resolveTextColor(node.fill)),
				fontSize: node.fontSize ?? 16,
				fontFamilies: [defaultFamily],
				fontStyle: { weight: fontWeight },
			});
			builder.addText(node.content);
			builder.pop();
		} else {
			for (const span of node.content) {
				const spanWeight =
					span.fontWeight === "bold" || span.fontWeight === "700" ? 700 : fontWeight;
				builder.pushStyle({
					color: Skia.Color(resolveTextColor(span.fill ?? node.fill)),
					fontSize: span.fontSize ?? node.fontSize ?? 16,
					fontFamilies: [span.fontFamily || defaultFamily],
					fontStyle: { weight: spanWeight },
				});
				builder.addText(span.content);
				builder.pop();
			}
		}

		return builder.build();
	}, [
		fontMgr,
		node.content,
		node.fill,
		node.fontSize,
		node.fontWeight,
		node.fontFamily,
		node.textAlign,
	]);

	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			{paragraph && <Paragraph paragraph={paragraph} x={0} y={0} width={width} />}
		</Group>
	);
}
