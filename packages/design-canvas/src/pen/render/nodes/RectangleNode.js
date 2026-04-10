import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Rect, RoundedRect } from "@shopify/react-native-skia";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";
export function RectangleNode({ layoutNode, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const solidFillColor = resolveSolidFillColor(node.fill);
    const decorativeFill = solidFillColor ? undefined : node.fill;
    const cornerRadius = node.cornerRadius;
    let shape;
    if (cornerRadius !== undefined &&
        typeof cornerRadius === "number" &&
        cornerRadius > 0) {
        const safeRadius = Math.min(cornerRadius, width / 2, height / 2);
        shape = (_jsxs(RoundedRect, { x: 0, y: 0, width: width, height: height, r: safeRadius, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    else if (Array.isArray(cornerRadius) &&
        cornerRadius.some((r) => r > 0)) {
        const safeR = (r) => Math.min(Math.max(0, r), width / 2, height / 2);
        const [tl, tr, br, bl] = cornerRadius;
        const rrect = {
            rect: { x: 0, y: 0, width, height },
            topLeft: { x: safeR(tl), y: safeR(tl) },
            topRight: { x: safeR(tr), y: safeR(tr) },
            bottomRight: { x: safeR(br), y: safeR(br) },
            bottomLeft: { x: safeR(bl), y: safeR(bl) },
        };
        shape = (_jsxs(RoundedRect, { rect: rrect, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    else {
        shape = (_jsxs(Rect, { x: 0, y: 0, width: width, height: height, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: shape }));
}
//# sourceMappingURL=RectangleNode.js.map