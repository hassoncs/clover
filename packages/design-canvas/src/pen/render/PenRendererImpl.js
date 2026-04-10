import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Canvas, Group, Paint, Rect, Skia } from "@shopify/react-native-skia";
import { Fragment, useEffect, useMemo, useState } from "react";
import { buildComponentRegistry, resolveAllRefs } from "../components";
import { layoutTree } from "../layout";
import { estimateTextSize } from "../text-measure";
import { resolveTreeVariables } from "../variables";
import { BuildChrome } from "./BuildChrome";
import { FrameTitle } from "./FrameTitle";
import { EffectNode } from "./nodes/EffectNode";
import { EllipseNode } from "./nodes/EllipseNode";
import { FrameNode } from "./nodes/FrameNode";
import { GroupNode } from "./nodes/GroupNode";
import { IconFontNode } from "./nodes/IconFontNode";
import { ImageNode } from "./nodes/ImageNode";
import { LineNode } from "./nodes/LineNode";
import { NoteNode } from "./nodes/NoteNode";
import { PathNode } from "./nodes/PathNode";
import { PolygonNode } from "./nodes/PolygonNode";
import { RectangleNode } from "./nodes/RectangleNode";
import { TextNode } from "./nodes/TextNode";
import { PenToolOverlay } from "./PenToolOverlay";
/** Statically bundled fonts available at /fonts/ in the dev server. */
const LOCAL_FONTS = {
    Fredoka: ["/fonts/Fredoka-Regular.ttf"],
    Inter: [
        "/fonts/Inter-Regular.ttf",
        "/fonts/Inter-Bold.ttf",
        "/fonts/Inter-Medium.ttf",
    ],
    "JetBrains Mono": [
        "/fonts/JetBrainsMono-400.ttf",
        "/fonts/JetBrainsMono-700.ttf",
    ],
    Geist: ["/fonts/Geist-400.ttf", "/fonts/Geist-700.ttf"],
};
/**
 * Walk a layout tree to collect all unique fontFamily values.
 */
function collectFontFamilies(nodes) {
    const families = new Set();
    function walk(ln) {
        const node = ln.node;
        if (node.type === "text") {
            const text = node;
            if (text.fontFamily)
                families.add(text.fontFamily);
            // Also check spans in rich text content
            if (Array.isArray(text.content)) {
                for (const span of text.content) {
                    if (span.fontFamily)
                        families.add(span.fontFamily);
                }
            }
        }
        for (const child of ln.children)
            walk(child);
    }
    for (const ln of nodes)
        walk(ln);
    return families;
}
function renderLayoutNode(layoutNode, fontMgr) {
    const { node } = layoutNode;
    if (node.enabled === false || node.visible === false)
        return null;
    const renderChildren = (children) => children.map((child) => renderLayoutNode(child, fontMgr));
    switch (node.type) {
        case "frame":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(FrameNode, { layoutNode: layoutNode, renderChildren: renderChildren }) }, node.id));
        case "group":
            return (_jsx(GroupNode, { layoutNode: layoutNode, renderChildren: renderChildren }, node.id));
        case "rectangle":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(RectangleNode, { layoutNode: layoutNode }) }, node.id));
        case "ellipse":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(EllipseNode, { layoutNode: layoutNode }) }, node.id));
        case "text":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(TextNode, { layoutNode: layoutNode, fontMgr: fontMgr }) }, node.id));
        case "path":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(PathNode, { layoutNode: layoutNode }) }, node.id));
        case "line":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(LineNode, { layoutNode: layoutNode }) }, node.id));
        case "polygon":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(PolygonNode, { layoutNode: layoutNode }) }, node.id));
        case "icon_font":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(IconFontNode, { layoutNode: layoutNode }) }, node.id));
        case "note":
            return _jsx(NoteNode, { layoutNode: layoutNode }, node.id);
        case "image":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(ImageNode, { layoutNode: layoutNode }) }, node.id));
        case "effect":
            return (_jsx(BuildChrome, { layoutNode: layoutNode, children: _jsx(EffectNode, { layoutNode: layoutNode }) }, node.id));
        case "ref":
            return null;
        case "connection":
            return null;
        default:
            return null;
    }
}
function findLayoutNode(nodes, id) {
    for (const ln of nodes) {
        if (ln.node.id === id)
            return ln;
        const found = findLayoutNode(ln.children, id);
        if (found)
            return found;
    }
    return null;
}
const SELECTION_COLOR = "#4F86FF";
const HANDLE_SIZE = 6;
const HANDLE_HALF = HANDLE_SIZE / 2;
function SelectionChrome({ layoutNode, }) {
    const { x, y, width, height } = layoutNode.rect;
    const corners = [
        { cx: x, cy: y },
        { cx: x + width, cy: y },
        { cx: x, cy: y + height },
        { cx: x + width, cy: y + height },
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Rect, { x: x, y: y, width: width, height: height, children: _jsx(Paint, { color: SELECTION_COLOR, style: "stroke", strokeWidth: 1.5 }) }), corners.map((corner) => (_jsx(Rect, { x: corner.cx - HANDLE_HALF, y: corner.cy - HANDLE_HALF, width: HANDLE_SIZE, height: HANDLE_SIZE, color: "white", children: _jsx(Paint, { color: SELECTION_COLOR, style: "stroke", strokeWidth: 1 }) }, `${corner.cx}-${corner.cy}`)))] }));
}
export default function PenRenderer({ document, camera, width, height, selectedNodePath, penDrawingState, }) {
    const layoutNodes = useMemo(() => {
        const registry = buildComponentRegistry(document.children);
        const resolved = resolveAllRefs(document.children, registry);
        const withVariables = resolveTreeVariables(resolved, document.variables, document.themes);
        return layoutTree(withVariables, estimateTextSize);
    }, [document]);
    const selectedLayoutNode = useMemo(() => {
        if (!selectedNodePath || selectedNodePath.length === 0)
            return null;
        const id = selectedNodePath[selectedNodePath.length - 1];
        return findLayoutNode(layoutNodes, id);
    }, [layoutNodes, selectedNodePath]);
    const [fontMgr, setFontMgr] = useState(null);
    // Collect all font families from the resolved layout tree
    const requiredFonts = useMemo(() => {
        const families = collectFontFamilies(layoutNodes);
        // Always include the default fallback
        families.add("Fredoka");
        families.add("Inter");
        return Array.from(families);
    }, [layoutNodes]);
    useEffect(() => {
        let cancelled = false;
        async function loadFonts() {
            // Defensive guard for Skia availability
            if (!Skia?.TypefaceFontProvider?.Make)
                return;
            const mgr = Skia.TypefaceFontProvider.Make();
            for (const family of requiredFonts) {
                const urls = LOCAL_FONTS[family] ?? [];
                if (urls.length === 0)
                    continue;
                for (const url of urls) {
                    try {
                        const res = await fetch(url);
                        if (!res.ok)
                            continue;
                        const buf = await res.arrayBuffer();
                        const data = Skia.Data.fromBytes(new Uint8Array(buf));
                        const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
                        if (tf)
                            mgr.registerFont(tf, family);
                    }
                    catch {
                        // Font file not available — skip
                    }
                }
            }
            if (!cancelled)
                setFontMgr(mgr);
        }
        loadFonts();
        return () => {
            cancelled = true;
        };
    }, [requiredFonts]);
    return (_jsx(Canvas, { style: { width, height }, children: _jsxs(Group, { transform: [
                { translateX: camera.translateX },
                { translateY: camera.translateY },
                { scale: camera.scale },
            ], children: [layoutNodes.map((ln) => (_jsxs(Fragment, { children: [_jsx(FrameTitle, { layoutNode: ln }), renderLayoutNode(ln, fontMgr)] }, ln.node.id))), selectedLayoutNode && (_jsx(SelectionChrome, { layoutNode: selectedLayoutNode })), penDrawingState && _jsx(PenToolOverlay, { drawingState: penDrawingState })] }) }));
}
//# sourceMappingURL=PenRendererImpl.js.map