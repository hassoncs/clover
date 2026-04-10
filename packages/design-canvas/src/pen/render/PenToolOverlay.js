import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Circle, DashPathEffect, Group, Paint, Path, } from "@shopify/react-native-skia";
import { buildPathGeometry } from "../../tools/penToolState";
const CURVE_COLOR = "#818cf8";
const PREVIEW_COLOR = "#818cf8";
const ANCHOR_FILL = "#ffffff";
const ANCHOR_RADIUS = 4;
const HANDLE_RADIUS = 3;
const CURSOR_RADIUS = 4;
export function PenToolOverlay({ drawingState }) {
    const { anchors, cursorDocX, cursorDocY, isDraggingHandle } = drawingState;
    const committedPath = anchors.length >= 2 ? buildPathGeometry(anchors, false) : null;
    let previewPath = null;
    if (anchors.length > 0 && cursorDocX !== null && cursorDocY !== null && !isDraggingHandle) {
        const last = anchors[anchors.length - 1];
        previewPath = buildPathGeometry([
            last,
            {
                docX: cursorDocX,
                docY: cursorDocY,
                handleInDocX: cursorDocX,
                handleInDocY: cursorDocY,
                handleOutDocX: cursorDocX,
                handleOutDocY: cursorDocY,
            },
        ], false);
    }
    return (_jsxs(Group, { children: [committedPath && (_jsx(Path, { path: committedPath, color: "transparent", children: _jsx(Paint, { style: "stroke", color: CURVE_COLOR, strokeWidth: 1.5, strokeJoin: "round", strokeCap: "round" }) })), previewPath && (_jsx(Path, { path: previewPath, color: "transparent", children: _jsx(Paint, { style: "stroke", color: PREVIEW_COLOR, strokeWidth: 1, strokeJoin: "round", strokeCap: "round", children: _jsx(DashPathEffect, { intervals: [4, 4] }) }) })), anchors.map((anchor, i) => (_jsx(AnchorVis, { anchor: anchor }, i))), cursorDocX !== null && cursorDocY !== null && (_jsxs(Circle, { cx: cursorDocX, cy: cursorDocY, r: CURSOR_RADIUS, color: "transparent", children: [_jsx(Paint, { style: "fill", color: CURVE_COLOR, opacity: 0.25 }), _jsx(Paint, { style: "stroke", color: CURVE_COLOR, strokeWidth: 1.5 })] }))] }));
}
function AnchorVis({ anchor }) {
    const hasOut = anchor.handleOutDocX !== anchor.docX || anchor.handleOutDocY !== anchor.docY;
    const hasIn = anchor.handleInDocX !== anchor.docX || anchor.handleInDocY !== anchor.docY;
    return (_jsxs(Group, { children: [hasOut && (_jsxs(_Fragment, { children: [_jsx(Path, { path: `M ${anchor.docX} ${anchor.docY} L ${anchor.handleOutDocX} ${anchor.handleOutDocY}`, color: "transparent", children: _jsx(Paint, { style: "stroke", color: CURVE_COLOR, strokeWidth: 1, opacity: 0.6 }) }), _jsx(Circle, { cx: anchor.handleOutDocX, cy: anchor.handleOutDocY, r: HANDLE_RADIUS, color: CURVE_COLOR })] })), hasIn && (_jsxs(_Fragment, { children: [_jsx(Path, { path: `M ${anchor.docX} ${anchor.docY} L ${anchor.handleInDocX} ${anchor.handleInDocY}`, color: "transparent", children: _jsx(Paint, { style: "stroke", color: CURVE_COLOR, strokeWidth: 1, opacity: 0.6 }) }), _jsx(Circle, { cx: anchor.handleInDocX, cy: anchor.handleInDocY, r: HANDLE_RADIUS, color: CURVE_COLOR })] })), _jsx(Circle, { cx: anchor.docX, cy: anchor.docY, r: ANCHOR_RADIUS, color: ANCHOR_FILL, children: _jsx(Paint, { style: "stroke", color: CURVE_COLOR, strokeWidth: 1.5 }) })] }));
}
//# sourceMappingURL=PenToolOverlay.js.map