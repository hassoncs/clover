import { jsx as _jsx } from "react/jsx-runtime";
import { Group, Line, vec } from "@shopify/react-native-skia";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";
export function LineNode({ layoutNode }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const strokeColor = node.stroke?.fill && typeof node.stroke.fill === "string"
        ? node.stroke.fill
        : "#000000";
    const strokeWidth = node.stroke?.thickness && typeof node.stroke.thickness === "number"
        ? node.stroke.thickness
        : 1;
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: _jsx(Line, { p1: vec(0, 0), p2: vec(width, height), color: strokeColor, style: "stroke", strokeWidth: strokeWidth, children: _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }) }) }));
}
//# sourceMappingURL=LineNode.js.map