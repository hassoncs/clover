import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, ImageShader, Paint, Rect, useImage, } from "@shopify/react-native-skia";
import { PenEffectsRenderer } from "../effects";
import { buildNodeTransform } from "../nodeTransform";
export function ImageNode({ layoutNode }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const image = useImage(node.url ?? null);
    const fit = node.fit ?? "cover";
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: image && (_jsxs(Rect, { x: 0, y: 0, width: width, height: height, children: [_jsx(Paint, { style: "fill", children: _jsx(ImageShader, { image: image, fit: fit, tx: "decal", ty: "decal", rect: { x: 0, y: 0, width, height } }) }), _jsx(PenEffectsRenderer, { effects: node.effects })] })) }));
}
//# sourceMappingURL=ImageNode.js.map