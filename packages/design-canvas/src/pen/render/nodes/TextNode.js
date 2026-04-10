import { jsx as _jsx } from "react/jsx-runtime";
import { Group, Paragraph, Skia, TextAlign } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { buildNodeTransform } from "../nodeTransform";
function resolveTextColor(fill) {
    if (!fill)
        return "#000000";
    if (Array.isArray(fill))
        return "#000000";
    if (typeof fill === "string")
        return fill;
    if (fill.type === "color")
        return fill.color;
    return "#000000";
}
const TEXT_ALIGN_MAP = {
    left: TextAlign.Left,
    center: TextAlign.Center,
    right: TextAlign.Right,
    justify: TextAlign.Justify,
};
export function TextNode({ layoutNode, fontMgr }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const paragraph = useMemo(() => {
        if (!fontMgr)
            return null;
        if (!Skia?.ParagraphBuilder?.Make)
            return null;
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
        }
        else {
            for (const span of node.content) {
                const spanWeight = span.fontWeight === "bold" || span.fontWeight === "700" ? 700 : fontWeight;
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
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: paragraph && _jsx(Paragraph, { paragraph: paragraph, x: 0, y: 0, width: width }) }));
}
//# sourceMappingURL=TextNode.js.map