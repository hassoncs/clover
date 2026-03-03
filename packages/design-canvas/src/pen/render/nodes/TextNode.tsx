import { Group, Paragraph, Skia, TextAlign, useFonts } from "@shopify/react-native-skia";
import type { PenFill, PenText } from "@slopcade/shared/types/pen";
import type React from "react";
import { useMemo } from "react";
import type { LayoutNode } from "../../layout";

interface NodeRendererProps {
	layoutNode: LayoutNode;
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

export function TextNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenText;
	const { x, y, width } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	const fontMgr = useFonts({
		Fredoka: [],
	});

	const paragraph = useMemo(() => {
		if (!fontMgr) return null;

		const textAlign = TEXT_ALIGN_MAP[node.textAlign ?? "left"] ?? TextAlign.Left;
		const builder = Skia.ParagraphBuilder.Make({ textAlign }, fontMgr);

		const fontWeight = node.fontWeight === "bold" || node.fontWeight === "700" ? 700 : 400;

		if (typeof node.content === "string") {
			builder.pushStyle({
				color: Skia.Color(resolveTextColor(node.fill)),
				fontSize: node.fontSize ?? 16,
				fontFamilies: node.fontFamily ? [node.fontFamily] : [],
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
					fontFamilies: span.fontFamily
						? [span.fontFamily]
						: node.fontFamily
							? [node.fontFamily]
							: [],
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
		<Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
			{paragraph && <Paragraph paragraph={paragraph} x={0} y={0} width={width} />}
		</Group>
	);
}
