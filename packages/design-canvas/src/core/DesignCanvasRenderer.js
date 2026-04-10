import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Canvas, Circle, DashPathEffect, Group, Image, Line, LinearGradient, Paragraph, Path, RadialGradient, Rect, Shadow, Skia, Text as SkiaText, TextAlign, useFont, useFonts, useImage, vec, } from "@shopify/react-native-skia";
import { useCallback, useMemo, useRef } from "react";
import { TouchableWithoutFeedback, View } from "react-native";
import { FREDOKA_REGULAR } from "../assets/fontSources";
import { useDesignImageResolver } from "../assets/useDesignImageResolver";
import { hitTestDesignCanvas, screenToWorld } from "./designCanvasHitTest";
function getElementWorldBounds(element, framePosition) {
    if (element.type === "line") {
        return {
            left: framePosition.x + Math.min(element.x1, element.x2),
            top: framePosition.y + Math.min(element.y1, element.y2),
            right: framePosition.x + Math.max(element.x1, element.x2),
            bottom: framePosition.y + Math.max(element.y1, element.y2),
        };
    }
    if (element.type === "path") {
        return {
            left: framePosition.x + element.x,
            top: framePosition.y + element.y,
            right: framePosition.x + element.x + 40,
            bottom: framePosition.y + element.y + 40,
        };
    }
    return {
        left: framePosition.x + element.x,
        top: framePosition.y + element.y,
        right: framePosition.x + element.x + element.width,
        bottom: framePosition.y + element.y + element.height,
    };
}
function isOutsideViewport(bounds, viewport) {
    return (bounds.right < viewport.worldLeft ||
        bounds.left > viewport.worldRight ||
        bounds.bottom < viewport.worldTop ||
        bounds.top > viewport.worldBottom);
}
function applyEffects(element, children) {
    const opacity = element.opacity ?? 1;
    let content = children;
    if (element.shadow) {
        content = (_jsxs(Group, { children: [_jsx(Shadow, { dx: element.shadow.offsetX, dy: element.shadow.offsetY, blur: element.shadow.blur, color: element.shadow.color }), content] }));
    }
    return _jsx(Group, { opacity: opacity, children: content });
}
function renderGradient(element, elX, elY) {
    if (!element.gradient)
        return null;
    const { type, stops, angle = 0 } = element.gradient;
    const colors = stops.map((s) => s.color);
    const positions = stops.map((s) => s.position);
    if (type === "linear") {
        // Calculate start/end based on angle and bounding box
        // For simplicity, just doing horizontal/vertical for now
        const rad = (angle * Math.PI) / 180;
        const cx = elX + element.width / 2;
        const cy = elY + element.height / 2;
        const r = Math.max(element.width, element.height) / 2;
        const startX = cx - Math.cos(rad) * r;
        const startY = cy - Math.sin(rad) * r;
        const endX = cx + Math.cos(rad) * r;
        const endY = cy + Math.sin(rad) * r;
        return (_jsx(LinearGradient, { start: vec(startX, startY), end: vec(endX, endY), colors: colors, positions: positions }));
    }
    else if (type === "radial") {
        return (_jsx(RadialGradient, { c: vec(elX + element.width / 2, elY + element.height / 2), r: Math.max(element.width, element.height) / 2, colors: colors, positions: positions }));
    }
    return null;
}
function renderRectElement(element, framePosition) {
    const elX = framePosition.x + element.x;
    const elY = framePosition.y + element.y;
    return applyEffects(element, _jsxs(Group, { children: [_jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: element.fill || "#E0E0E0", children: renderGradient(element, elX, elY) }), element.stroke && (_jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: element.stroke, style: "stroke", strokeWidth: element.strokeWidth || 1 }))] }, element.id));
}
function renderImageElement(element, framePosition, font, resolvedUrl) {
    return (_jsx(ImageElementRenderer, { element: element, framePosition: framePosition, font: font, resolvedUrl: resolvedUrl }, element.id));
}
function ImageElementRenderer({ element, framePosition, font, resolvedUrl, }) {
    const elX = framePosition.x + element.x;
    const elY = framePosition.y + element.y;
    const image = useImage(resolvedUrl || undefined);
    const fallback = (_jsxs(Group, { children: [_jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: "#E0E0E0" }), _jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: "#FF3333", style: "stroke", strokeWidth: 2 }), font && (_jsx(SkiaText, { x: elX + element.width / 2 - 20, y: elY + element.height / 2 + 4, text: "\u26A0 IMG", font: font, color: "#FF3333" }))] }));
    return applyEffects(element, _jsx(Group, { children: image ? (_jsx(Image, { image: image, x: elX, y: elY, width: element.width, height: element.height, fit: element.fit || "contain" })) : (fallback) }));
}
function TextElementRenderer({ element, framePosition, fontMgr, }) {
    const elX = framePosition.x + element.x;
    const elY = framePosition.y + element.y;
    const paragraph = useMemo(() => {
        if (!fontMgr)
            return null;
        const textAlignMap = {
            left: TextAlign.Left,
            center: TextAlign.Center,
            right: TextAlign.Right,
        };
        const textAlign = textAlignMap[element.align ?? "left"] ?? TextAlign.Left;
        const builder = Skia.ParagraphBuilder.Make({ textAlign }, fontMgr);
        const fontStyle = {};
        if (element.fontWeight === "bold" || element.fontWeight === "700") {
            fontStyle.weight = 700;
        }
        builder.pushStyle({
            color: Skia.Color(element.color || "#333333"),
            fontSize: element.fontSize,
            fontFamilies: ["Fredoka"],
            fontStyle,
        });
        builder.addText(element.content);
        builder.pop();
        return builder.build();
    }, [
        fontMgr,
        element.content,
        element.color,
        element.fontSize,
        element.fontWeight,
        element.align,
    ]);
    if (!fontMgr) {
        return applyEffects(element, _jsxs(Group, { children: [_jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: "#E0E0E0" }), _jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: "#FF3333", style: "stroke", strokeWidth: 2 })] }));
    }
    return applyEffects(element, _jsxs(Group, { children: [_jsx(Rect, { x: elX, y: elY, width: element.width, height: element.height, color: "transparent" }), paragraph && (_jsx(Paragraph, { paragraph: paragraph, x: elX, y: elY, width: element.width }))] }));
}
function renderCircleElement(element, framePosition) {
    const elX = framePosition.x + element.x;
    const elY = framePosition.y + element.y;
    const cx = elX + element.width / 2;
    const cy = elY + element.height / 2;
    const r = Math.min(element.width, element.height) / 2;
    return applyEffects(element, _jsxs(Group, { children: [_jsx(Circle, { cx: cx, cy: cy, r: r, color: element.fill || "#E0E0E0", children: renderGradient(element, elX, elY) }), element.stroke && (_jsx(Circle, { cx: cx, cy: cy, r: r, color: element.stroke, style: "stroke", strokeWidth: element.strokeWidth || 1 }))] }, element.id));
}
function renderLineElement(element, framePosition) {
    const elX1 = framePosition.x + element.x1;
    const elY1 = framePosition.y + element.y1;
    const elX2 = framePosition.x + element.x2;
    const elY2 = framePosition.y + element.y2;
    return applyEffects(element, _jsx(Group, { children: _jsx(Line, { p1: vec(elX1, elY1), p2: vec(elX2, elY2), color: element.stroke || "#000000", style: "stroke", strokeWidth: element.strokeWidth || 1 }) }, element.id));
}
function renderPathElement(element, framePosition, font) {
    const elX = framePosition.x + element.x;
    const elY = framePosition.y + element.y;
    if (!element.data) {
        return applyEffects(element, _jsxs(Group, { children: [_jsx(Rect, { x: elX, y: elY, width: 40, height: 40, color: "#E0E0E0" }), _jsx(Rect, { x: elX, y: elY, width: 40, height: 40, color: "#FF3333", style: "stroke", strokeWidth: 2 }), font && (_jsx(SkiaText, { x: elX + 4, y: elY + 24, text: "\u26A0 PATH", font: font, color: "#FF3333" }))] }, element.id));
    }
    return applyEffects(element, _jsxs(Group, { transform: [{ translateX: elX }, { translateY: elY }], children: [_jsx(Path, { path: element.data, color: element.fill || "#E0E0E0", children: renderGradient(element, 0, 0) }), element.stroke && (_jsx(Path, { path: element.data, color: element.stroke, style: "stroke", strokeWidth: element.strokeWidth || 1 }))] }, element.id));
}
export function DesignCanvasRenderer({ document, camera, selectedFrameId, selectedElementId, selectedElementIds, onElementTap, width, height, snapLines = [], showGrid = false, }) {
    const font = useFont(FREDOKA_REGULAR, 12);
    const fontMgr = useFonts({
        Fredoka: [FREDOKA_REGULAR],
    });
    const renderCount = useRef(0);
    const viewportBounds = useMemo(() => {
        const worldLeft = -camera.translateX / camera.scale;
        const worldTop = -camera.translateY / camera.scale;
        return {
            worldLeft,
            worldTop,
            worldRight: worldLeft + width / camera.scale,
            worldBottom: worldTop + height / camera.scale,
        };
    }, [camera.translateX, camera.translateY, camera.scale, width, height]);
    const sortedElementsByFrameId = useMemo(() => {
        const map = new Map();
        for (const frame of document.frames) {
            map.set(frame.id, frame.elements.slice().sort((a, b) => a.zIndex - b.zIndex));
        }
        return map;
    }, [document.frames]);
    if (__DEV__) {
        renderCount.current += 1;
        let totalCount = 0;
        let culledCount = 0;
        for (const frame of document.frames) {
            const elements = sortedElementsByFrameId.get(frame.id) ?? [];
            for (const el of elements) {
                totalCount++;
                if (isOutsideViewport(getElementWorldBounds(el, frame.position), viewportBounds)) {
                    culledCount++;
                }
            }
        }
        console.log(`[DesignCanvas] Render #${renderCount.current}: ${totalCount - culledCount} visible / ${totalCount} total (${culledCount} culled)`);
    }
    const handlePress = useCallback((event) => {
        if (!onElementTap)
            return;
        const { locationX, locationY } = event.nativeEvent;
        const { worldX, worldY } = screenToWorld(locationX, locationY, camera);
        const hit = hitTestDesignCanvas(document.frames, worldX, worldY);
        const shiftKey = event.nativeEvent.shiftKey ?? false;
        onElementTap(hit.frameId ?? "", hit.elementId, shiftKey);
    }, [document.frames, camera, onElementTap]);
    const allElements = useMemo(() => {
        return document.frames.flatMap((f) => f.elements);
    }, [document.frames]);
    const resolvedImages = useDesignImageResolver(allElements);
    const canvasContent = (_jsx(View, { style: { width, height }, children: _jsx(Canvas, { style: { width, height }, children: _jsxs(Group, { transform: [
                    { translateX: camera.translateX },
                    { translateY: camera.translateY },
                    { scale: camera.scale },
                ], children: [document.frames.map((frame) => {
                        const frameBounds = {
                            left: frame.position.x,
                            top: frame.position.y,
                            right: frame.position.x + frame.width,
                            bottom: frame.position.y + frame.height,
                        };
                        if (isOutsideViewport(frameBounds, viewportBounds))
                            return null;
                        const sortedElements = sortedElementsByFrameId.get(frame.id) ?? [];
                        return (_jsxs(Group, { children: [_jsx(Rect, { x: frame.position.x, y: frame.position.y, width: frame.width, height: frame.height, color: "#FFFFFF" }), _jsx(Rect, { x: frame.position.x, y: frame.position.y, width: frame.width, height: frame.height, color: "#CCCCCC", style: "stroke", strokeWidth: 1 }), font && (_jsx(SkiaText, { x: frame.position.x, y: frame.position.y - 8, text: frame.title, font: font, color: "#666666" })), sortedElements.map((element) => {
                                    if (isOutsideViewport(getElementWorldBounds(element, frame.position), viewportBounds)) {
                                        return null;
                                    }
                                    if (element.type === "rect") {
                                        return renderRectElement(element, frame.position);
                                    }
                                    if (element.type === "image") {
                                        return renderImageElement(element, frame.position, font, resolvedImages.get(element.id) ?? null);
                                    }
                                    if (element.type === "text") {
                                        return (_jsx(TextElementRenderer, { element: element, framePosition: frame.position, fontMgr: fontMgr }, element.id));
                                    }
                                    if (element.type === "circle") {
                                        return renderCircleElement(element, frame.position);
                                    }
                                    if (element.type === "line") {
                                        return renderLineElement(element, frame.position);
                                    }
                                    if (element.type === "path") {
                                        return renderPathElement(element, frame.position, font);
                                    }
                                    if (element.type === "group") {
                                        return (_jsx(Group, { opacity: element.opacity ?? 1 }, element.id));
                                    }
                                    if (__DEV__) {
                                        console.warn(`[DesignCanvas] Unknown element type: ${element.type}`);
                                    }
                                    return null;
                                }), selectedFrameId === frame.id && !selectedElementId && (_jsx(Rect, { x: frame.position.x, y: frame.position.y, width: frame.width, height: frame.height, color: "#2563EB", style: "stroke", strokeWidth: 2 })), selectedFrameId === frame.id && selectedElementId && (_jsx(Group, { children: frame.elements
                                        .filter((e) => e.id === selectedElementId)
                                        .map((element) => {
                                        let selX, selY, selW, selH;
                                        if (element.type === "line") {
                                            selX =
                                                frame.position.x + Math.min(element.x1, element.x2);
                                            selY =
                                                frame.position.y + Math.min(element.y1, element.y2);
                                            selW = Math.abs(element.x2 - element.x1);
                                            selH = Math.abs(element.y2 - element.y1);
                                        }
                                        else if (element.type === "path") {
                                            selX = frame.position.x + element.x;
                                            selY = frame.position.y + element.y;
                                            selW = 40;
                                            selH = 40;
                                        }
                                        else {
                                            selX = frame.position.x + element.x;
                                            selY = frame.position.y + element.y;
                                            selW = element.width;
                                            selH = element.height;
                                        }
                                        const HANDLE_SIZE = 12;
                                        const HANDLE_OFFSET = HANDLE_SIZE / 2;
                                        const handles = [
                                            { id: "tl", x: selX, y: selY },
                                            { id: "tc", x: selX + selW / 2, y: selY },
                                            { id: "tr", x: selX + selW, y: selY },
                                            { id: "rc", x: selX + selW, y: selY + selH / 2 },
                                            { id: "br", x: selX + selW, y: selY + selH },
                                            { id: "bc", x: selX + selW / 2, y: selY + selH },
                                            { id: "bl", x: selX, y: selY + selH },
                                            { id: "lc", x: selX, y: selY + selH / 2 },
                                        ];
                                        return (_jsxs(Group, { children: [_jsx(Rect, { x: selX, y: selY, width: selW, height: selH, color: "#2563EB", style: "stroke", strokeWidth: 2 }), _jsx(Line, { p1: vec(selX + selW / 2, selY), p2: vec(selX + selW / 2, selY - 24), color: "#2563EB", style: "stroke", strokeWidth: 2 }), _jsx(Circle, { cx: selX + selW / 2, cy: selY - 24, r: 6, color: "#FFFFFF" }), _jsx(Circle, { cx: selX + selW / 2, cy: selY - 24, r: 6, color: "#2563EB", style: "stroke", strokeWidth: 2 }), handles.map((h) => (_jsxs(Group, { children: [_jsx(Rect, { x: h.x - HANDLE_OFFSET, y: h.y - HANDLE_OFFSET, width: HANDLE_SIZE, height: HANDLE_SIZE, color: "#FFFFFF" }), _jsx(Rect, { x: h.x - HANDLE_OFFSET, y: h.y - HANDLE_OFFSET, width: HANDLE_SIZE, height: HANDLE_SIZE, color: "#2563EB", style: "stroke", strokeWidth: 2 })] }, `handle-${h.id}`)))] }, `sel-group-${element.id}`));
                                    }) }))] }, frame.id));
                    }), snapLines.map((line, i) => {
                        if (line.axis === "x") {
                            return (_jsx(Line, { p1: vec(line.position, viewportBounds.worldTop), p2: vec(line.position, viewportBounds.worldBottom), color: "#2563EB", style: "stroke", strokeWidth: 1 / camera.scale }, `snap-x-${i}-${line.position}`));
                        }
                        else {
                            return (_jsx(Line, { p1: vec(viewportBounds.worldLeft, line.position), p2: vec(viewportBounds.worldRight, line.position), color: "#2563EB", style: "stroke", strokeWidth: 1 / camera.scale }, `snap-y-${i}-${line.position}`));
                        }
                    }), selectedElementIds &&
                        selectedElementIds.length >= 2 &&
                        (() => {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            for (const frame of document.frames) {
                                for (const el of frame.elements) {
                                    if (!selectedElementIds.includes(el.id))
                                        continue;
                                    const bounds = getElementWorldBounds(el, frame.position);
                                    minX = Math.min(minX, bounds.left);
                                    minY = Math.min(minY, bounds.top);
                                    maxX = Math.max(maxX, bounds.right);
                                    maxY = Math.max(maxY, bounds.bottom);
                                }
                            }
                            if (minX === Infinity)
                                return null;
                            const pad = 4 / camera.scale;
                            const bx = minX - pad;
                            const by = minY - pad;
                            const bw = maxX - minX + pad * 2;
                            const bh = maxY - minY + pad * 2;
                            const sw = 2 / camera.scale;
                            const dashLen = 6 / camera.scale;
                            const gapLen = 3 / camera.scale;
                            const pathStr = `M ${bx} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + bh} L ${bx} ${by + bh} Z`;
                            return (_jsx(Path, { path: pathStr, color: "#2563EB", style: "stroke", strokeWidth: sw, children: _jsx(DashPathEffect, { intervals: [dashLen, gapLen] }) }, "multi-select-bbox"));
                        })()] }) }) }));
    if (onElementTap) {
        return (_jsx(TouchableWithoutFeedback, { onPress: handlePress, children: canvasContent }));
    }
    return canvasContent;
}
// Default export for React.lazy() consumers
export default DesignCanvasRenderer;
//# sourceMappingURL=DesignCanvasRenderer.js.map