import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Path } from "@shopify/react-native-skia";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";
function buildPolygonPathSVG(cx, cy, rx, ry, sides) {
    const pts = Array.from({ length: sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return `${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`;
    });
    return `M${pts.join(" L")} Z`;
}
export function PolygonNode({ layoutNode, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const sides = node.polygonCount ?? 3;
    const pathData = buildPolygonPathSVG(width / 2, height / 2, width / 2, height / 2, sides);
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: _jsxs(Path, { path: pathData, children: [_jsx(PenFillRenderer, { fill: node.fill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }) }));
}
//# sourceMappingURL=PolygonNode.js.map