import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DashPathEffect, Group, Paint, Rect, RoundedRect, } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { PenEffectsRenderer } from "../effects";
import { PenFillRenderer, resolveSolidFillColor } from "../fills";
import { PenStrokeRenderer } from "../strokes";
const AI_BORDER_COLOR = "#818cf8";
const AI_BORDER_WIDTH = 2;
const AI_DASH_TOTAL = 20;
function AiGeneratingBorder({ x, y, width, height, }) {
    const [phase, setPhase] = useState(0);
    useEffect(() => {
        let raf;
        let start = null;
        const animate = (time) => {
            if (start === null)
                start = time;
            const elapsed = time - start;
            setPhase(((elapsed / 400) * AI_DASH_TOTAL) % AI_DASH_TOTAL);
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, []);
    return (_jsx(Rect, { x: x - 1, y: y - 1, width: width + 2, height: height + 2, color: "transparent", children: _jsx(Paint, { style: "stroke", strokeWidth: AI_BORDER_WIDTH, color: AI_BORDER_COLOR, children: _jsx(DashPathEffect, { intervals: [6, 4], phase: phase }) }) }));
}
export function FrameNode({ layoutNode, renderChildren, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const opacity = node.opacity ?? 1;
    const solidFillColor = resolveSolidFillColor(node.fill);
    const decorativeFill = solidFillColor ? undefined : node.fill;
    const cornerRadius = node.cornerRadius;
    const children = renderChildren?.(layoutNode.children);
    let shape;
    if (cornerRadius !== undefined &&
        typeof cornerRadius === "number" &&
        cornerRadius > 0) {
        const safeRadius = Math.min(cornerRadius, width / 2, height / 2);
        shape = (_jsxs(RoundedRect, { x: x, y: y, width: width, height: height, r: safeRadius, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    else if (Array.isArray(cornerRadius) && cornerRadius.some((r) => r > 0)) {
        const safeR = (r) => Math.min(Math.max(0, r), width / 2, height / 2);
        const [tl, tr, br, bl] = cornerRadius;
        const rrect = {
            rect: { x, y, width, height },
            topLeft: { x: safeR(tl), y: safeR(tl) },
            topRight: { x: safeR(tr), y: safeR(tr) },
            bottomRight: { x: safeR(br), y: safeR(br) },
            bottomLeft: { x: safeR(bl), y: safeR(bl) },
        };
        shape = (_jsxs(RoundedRect, { rect: rrect, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    else {
        shape = (_jsxs(Rect, { x: x, y: y, width: width, height: height, color: solidFillColor ?? undefined, children: [_jsx(PenFillRenderer, { fill: decorativeFill, width: width, height: height }), _jsx(PenStrokeRenderer, { stroke: node.stroke, width: width, height: height }), _jsx(PenEffectsRenderer, { effects: node.effects })] }));
    }
    if (layoutNode.clip) {
        return (_jsxs(Group, { opacity: opacity, children: [shape, _jsx(Group, { clip: { x, y, width, height }, children: children }), node.aiGenerating && (_jsx(AiGeneratingBorder, { x: x, y: y, width: width, height: height }))] }));
    }
    return (_jsxs(Group, { opacity: opacity, children: [shape, children, node.aiGenerating && (_jsx(AiGeneratingBorder, { x: x, y: y, width: width, height: height }))] }));
}
//# sourceMappingURL=FrameNode.js.map