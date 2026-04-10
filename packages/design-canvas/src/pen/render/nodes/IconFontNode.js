import { jsx as _jsx } from "react/jsx-runtime";
import { Group, Rect } from "@shopify/react-native-skia";
import { PenFillRenderer } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
export function IconFontNode({ layoutNode, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const w = width || 24;
    const h = height || 24;
    // TODO: render actual icon glyph once icon fonts are bundled.
    return (_jsx(Group, { transform: buildNodeTransform(x, y, w, h, node.flipX, node.flipY), opacity: opacity, children: _jsx(Rect, { x: 0, y: 0, width: w, height: h, children: _jsx(PenFillRenderer, { fill: node.fill ?? "#888888", width: w, height: h }) }) }));
}
//# sourceMappingURL=IconFontNode.js.map