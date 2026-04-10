import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Oval } from "@shopify/react-native-skia";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";
export function EllipseNode({ layoutNode, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const solidFillColor = resolveSolidFillColor(node.fill);
    const decorativeFill = solidFillColor ? undefined : node.fill;
    // TODO: support arc (startAngle/sweepAngle) and donut (innerRadius) shapes
    // using Skia.Path with addOval and boolean operations when needed.
    // For now, render a full ellipse.
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: _jsxs(Oval, { rect: { x: 0, y: 0, width, height }, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }) }));
}
//# sourceMappingURL=EllipseNode.js.map