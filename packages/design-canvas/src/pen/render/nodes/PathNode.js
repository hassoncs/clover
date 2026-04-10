import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Path } from "@shopify/react-native-skia";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer } from "../fills";
import { buildNodeTransform } from "../nodeTransform";
import { PenStrokeRenderer } from "../strokes";
export function PathNode({ layoutNode }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: _jsxs(Path, { path: node.geometry, children: [_jsx(PenFillRenderer, { fill: node.fill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }) }));
}
//# sourceMappingURL=PathNode.js.map