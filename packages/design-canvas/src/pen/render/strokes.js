import { jsx as _jsx } from "react/jsx-runtime";
import { DashPathEffect, Paint } from "@shopify/react-native-skia";
function resolveStrokeColor(fill) {
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
function resolveThickness(thickness) {
    if (thickness === undefined)
        return 1;
    if (typeof thickness === "number")
        return thickness;
    return Math.max(thickness.top, thickness.right, thickness.bottom, thickness.left);
}
export function PenStrokeRenderer({ stroke }) {
    if (!stroke || stroke.enabled === false || !stroke.fill)
        return null;
    const color = resolveStrokeColor(stroke.fill);
    const strokeWidth = resolveThickness(stroke.thickness);
    // TODO: inside/outside alignment requires clip-based approach; center is implemented here
    return (_jsx(Paint, { style: "stroke", color: color, strokeWidth: strokeWidth, strokeJoin: stroke.join ?? "miter", strokeCap: stroke.cap ?? "butt", children: stroke.dashPattern && stroke.dashPattern.length >= 2 && (_jsx(DashPathEffect, { intervals: stroke.dashPattern })) }));
}
//# sourceMappingURL=strokes.js.map