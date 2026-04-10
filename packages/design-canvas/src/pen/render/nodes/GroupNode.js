import { jsx as _jsx } from "react/jsx-runtime";
import { Group } from "@shopify/react-native-skia";
import { buildNodeTransform } from "../nodeTransform";
export function GroupNode({ layoutNode, renderChildren }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    // The outer Group translates to (x, y). Children have absolute coords from the layout,
    // so we need a counter-translate to bring the origin back before rendering them.
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: _jsx(Group, { transform: [{ translateX: -x }, { translateY: -y }], children: renderChildren?.(layoutNode.children) }) }));
}
//# sourceMappingURL=GroupNode.js.map