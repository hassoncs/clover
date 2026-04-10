import { jsx as _jsx } from "react/jsx-runtime";
import { ImageShader, LinearGradient, Paint, RadialGradient, SweepGradient, useImage, vec, } from "@shopify/react-native-skia";
export function resolveSolidFillColor(fill) {
    if (!fill || Array.isArray(fill))
        return null;
    if (typeof fill === "string")
        return fill;
    if (fill.enabled === false)
        return null;
    if (fill.type === "color")
        return fill.color;
    return null;
}
function GradientFill({ fill, width, height, }) {
    const colors = fill.stops.map((s) => s.color);
    const positions = fill.stops.map((s) => s.position);
    if (fill.gradientType === "linear") {
        const angle = fill.angle ?? 0;
        const rad = (angle * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.max(width, height) / 2;
        return (_jsx(LinearGradient, { start: vec(cx - Math.cos(rad) * r, cy - Math.sin(rad) * r), end: vec(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r), colors: colors, positions: positions }));
    }
    if (fill.gradientType === "radial") {
        const cx = (fill.centerX ?? 0.5) * width;
        const cy = (fill.centerY ?? 0.5) * height;
        return (_jsx(RadialGradient, { c: vec(cx, cy), r: Math.max(width, height) / 2, colors: colors, positions: positions }));
    }
    if (fill.gradientType === "angular" || fill.gradientType === "mesh") {
        return (_jsx(SweepGradient, { c: vec(width / 2, height / 2), colors: colors, positions: positions }));
    }
    return null;
}
function ImageFill({ fill, width, height }) {
    const image = useImage(fill.url);
    if (!image)
        return null;
    const fitMode = fill.fit ?? "cover";
    const tx = fitMode === "tile" ? "repeat" : "decal";
    return (_jsx(ImageShader, { image: image, fit: fitMode === "tile" ? "none" : fitMode, tx: tx, ty: tx, rect: { x: 0, y: 0, width, height } }));
}
function renderSingleFill(fill, width, height, key) {
    if (typeof fill === "string") {
        return _jsx(Paint, { color: fill, style: "fill" }, key);
    }
    if (fill.enabled === false)
        return null;
    if (fill.type === "color") {
        return (_jsx(Paint, { color: fill.color, style: "fill", opacity: fill.opacity }, key));
    }
    if (fill.type === "gradient") {
        return (_jsx(Paint, { style: "fill", children: _jsx(GradientFill, { fill: fill, width: width, height: height }) }, key));
    }
    if (fill.type === "image") {
        return (_jsx(Paint, { style: "fill", opacity: fill.opacity, children: _jsx(ImageFill, { fill: fill, width: width, height: height }) }, key));
    }
    return null;
}
export function PenFillRenderer({ fill, width, height, }) {
    if (!fill)
        return null;
    if (Array.isArray(fill)) {
        const rendered = [];
        for (const nestedFill of fill) {
            const fillKey = `fill-${JSON.stringify(nestedFill)}`;
            if (Array.isArray(nestedFill)) {
                rendered.push(_jsx(PenFillRenderer, { fill: nestedFill, width: width, height: height }, fillKey));
            }
            else {
                rendered.push(renderSingleFill(nestedFill, width, height, fillKey));
            }
        }
        return rendered;
    }
    return renderSingleFill(fill, width, height, "fill-0");
}
//# sourceMappingURL=fills.js.map