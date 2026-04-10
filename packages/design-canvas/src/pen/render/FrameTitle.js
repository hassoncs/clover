import { jsx as _jsx } from "react/jsx-runtime";
import { Group, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import { FREDOKA_REGULAR } from "../../assets/fontSources";
const TITLE_FONT_SIZE = 13;
const TITLE_COLOR = "#888888";
const REUSABLE_TITLE_COLOR = "#a78bfa";
const TITLE_OFFSET_Y = 20;
export function FrameTitle({ layoutNode }) {
    const font = useFont(FREDOKA_REGULAR, TITLE_FONT_SIZE);
    const { node } = layoutNode;
    if (node.type !== "frame" && node.type !== "group")
        return null;
    const rawTitle = node.name ?? node.id;
    const isReusable = node.reusable === true;
    const title = isReusable ? `◆ ${rawTitle}` : rawTitle;
    const color = isReusable ? REUSABLE_TITLE_COLOR : TITLE_COLOR;
    const { x, y } = layoutNode.rect;
    if (!font)
        return null;
    return (_jsx(Group, { transform: [{ translateX: x }, { translateY: y - TITLE_OFFSET_Y }], children: _jsx(SkiaText, { x: 0, y: 0, text: title, font: font, color: color }) }));
}
//# sourceMappingURL=FrameTitle.js.map