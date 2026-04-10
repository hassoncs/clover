import { useCallback, useEffect, useRef, useState } from "react";
import { hitTestDesignCanvas, screenToWorld } from "../core/designCanvasHitTest";
export function useDesignInteractions(params) {
    const { document, camera, selectedFrameId, selectedElementId, selectedElementIds, saveDesignDocument, cameraHandlers, } = params;
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [snapLines, setSnapLines] = useState([]);
    const [showGrid, setShowGrid] = useState(false);
    const [liveDocument, setLiveDocument] = useState(null);
    const interactionState = useRef({
        type: "idle",
        startX: 0,
        startY: 0,
        initialElement: null,
        initialFrame: null,
        initialElements: {},
    });
    // Keyboard nudge and grid toggle
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (window.document.activeElement?.tagName === "INPUT" ||
                window.document.activeElement?.tagName === "TEXTAREA") {
                return;
            }
            if (e.key.toLowerCase() === "g") {
                setShowGrid((prev) => !prev);
                return;
            }
            if (!selectedFrameId || !selectedElementId || !document)
                return;
            let dx = 0;
            let dy = 0;
            const amount = e.shiftKey ? 10 : 1;
            if (e.key === "ArrowUp")
                dy = -amount;
            else if (e.key === "ArrowDown")
                dy = amount;
            else if (e.key === "ArrowLeft")
                dx = -amount;
            else if (e.key === "ArrowRight")
                dx = amount;
            else
                return;
            e.preventDefault();
            const newDoc = JSON.parse(JSON.stringify(document));
            const frame = newDoc.frames.find((f) => f.id === selectedFrameId);
            const element = frame?.elements.find((el) => el.id === selectedElementId);
            if (frame && element) {
                if (element.type === "line") {
                    element.x1 += dx;
                    element.y1 += dy;
                    element.x2 += dx;
                    element.y2 += dy;
                }
                else {
                    element.x += dx;
                    element.y += dy;
                }
                saveDesignDocument(newDoc);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [document, selectedFrameId, selectedElementId, saveDesignDocument]);
    const getElementBounds = (element, frame) => {
        let selX, selY, selW, selH;
        if (element.type === "line") {
            selX = frame.position.x + Math.min(element.x1, element.x2);
            selY = frame.position.y + Math.min(element.y1, element.y2);
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
        return { selX, selY, selW, selH };
    };
    const hitTestHandles = (worldX, worldY) => {
        if (!document || !selectedFrameId || !selectedElementId)
            return null;
        const frame = document.frames.find((f) => f.id === selectedFrameId);
        const element = frame?.elements.find((e) => e.id === selectedElementId);
        if (!frame || !element)
            return null;
        const { selX, selY, selW, selH } = getElementBounds(element, frame);
        const hitRadius = 10 / camera.scale;
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
        for (const h of handles) {
            if (Math.abs(worldX - h.x) <= hitRadius &&
                Math.abs(worldY - h.y) <= hitRadius) {
                return { type: "resize", handle: h.id };
            }
        }
        const rotX = selX + selW / 2;
        const rotY = selY - 24;
        if (Math.abs(worldX - rotX) <= hitRadius &&
            Math.abs(worldY - rotY) <= hitRadius) {
            return { type: "rotate" };
        }
        return null;
    };
    const onMouseDown = useCallback((e) => {
        if (!document)
            return;
        // Only handle left click
        if (e.button !== 0) {
            cameraHandlers.onMouseDown(e);
            return;
        }
        const { clientX, clientY } = e;
        const { worldX, worldY } = screenToWorld(clientX, clientY, camera);
        // 1. Check handles if an element is selected
        const handleHit = hitTestHandles(worldX, worldY);
        if (handleHit) {
            const frame = document.frames.find((f) => f.id === selectedFrameId);
            const element = frame?.elements.find((el) => el.id === selectedElementId);
            if (frame && element) {
                interactionState.current = {
                    type: handleHit.type,
                    handle: handleHit.handle,
                    startX: worldX,
                    startY: worldY,
                    initialElement: JSON.parse(JSON.stringify(element)),
                    initialFrame: frame,
                    initialElements: {},
                };
                if (handleHit.type === "resize")
                    setIsResizing(true);
                if (handleHit.type === "rotate")
                    setIsRotating(true);
                e.stopPropagation();
                return;
            }
        }
        const hit = hitTestDesignCanvas(document.frames, worldX, worldY);
        if (hit.elementId &&
            selectedElementIds &&
            selectedElementIds.length >= 2 &&
            selectedElementIds.includes(hit.elementId)) {
            const frame = document.frames.find((f) => f.id === hit.frameId);
            if (frame) {
                const initialElements = {};
                for (const el of frame.elements) {
                    if (selectedElementIds.includes(el.id)) {
                        initialElements[el.id] = JSON.parse(JSON.stringify(el));
                    }
                }
                interactionState.current = {
                    type: "multi-drag",
                    startX: worldX,
                    startY: worldY,
                    initialElement: null,
                    initialFrame: frame,
                    initialElements,
                };
                setIsDragging(true);
                e.stopPropagation();
                return;
            }
        }
        if (hit.elementId && hit.elementId === selectedElementId) {
            const frame = document.frames.find((f) => f.id === hit.frameId);
            const element = frame?.elements.find((el) => el.id === hit.elementId);
            if (frame && element) {
                interactionState.current = {
                    type: "drag",
                    startX: worldX,
                    startY: worldY,
                    initialElement: JSON.parse(JSON.stringify(element)),
                    initialFrame: frame,
                    initialElements: {},
                };
                setIsDragging(true);
                e.stopPropagation();
                return;
            }
        }
        cameraHandlers.onMouseDown(e);
    }, [
        document,
        camera,
        selectedFrameId,
        selectedElementId,
        selectedElementIds,
        cameraHandlers,
    ]);
    const onMouseMove = useCallback((e) => {
        const state = interactionState.current;
        if (state.type === "idle") {
            cameraHandlers.onMouseMove(e);
            return;
        }
        if (!document)
            return;
        const { clientX, clientY } = e;
        const { worldX, worldY } = screenToWorld(clientX, clientY, camera);
        const dx = worldX - state.startX;
        const dy = worldY - state.startY;
        if (state.type === "multi-drag") {
            if (!state.initialFrame)
                return;
            const newDoc = JSON.parse(JSON.stringify(document));
            const frame = newDoc.frames.find((f) => f.id === state.initialFrame.id);
            if (!frame)
                return;
            for (const el of frame.elements) {
                const initEl = state.initialElements[el.id];
                if (!initEl)
                    continue;
                if (el.type === "line") {
                    el.x1 = initEl.x1 + dx;
                    el.y1 = initEl.y1 + dy;
                    el.x2 = initEl.x2 + dx;
                    el.y2 = initEl.y2 + dy;
                }
                else {
                    el.x = initEl.x + dx;
                    el.y = initEl.y + dy;
                }
            }
            setLiveDocument(newDoc);
            return;
        }
        if (!state.initialElement || !state.initialFrame)
            return;
        const newDoc = JSON.parse(JSON.stringify(document));
        const frame = newDoc.frames.find((f) => f.id === state.initialFrame.id);
        const element = frame?.elements.find((el) => el.id === state.initialElement.id);
        if (!frame || !element)
            return;
        const newSnapLines = [];
        if (state.type === "drag") {
            if (element.type === "line") {
                const initEl = state.initialElement;
                element.x1 = initEl.x1 + dx;
                element.y1 = initEl.y1 + dy;
                element.x2 = initEl.x2 + dx;
                element.y2 = initEl.y2 + dy;
            }
            else {
                const initEl = state.initialElement;
                let newX = initEl.x + dx;
                let newY = initEl.y + dy;
                // Snapping logic
                if (!e.shiftKey) {
                    const SNAP_DIST = 8 / camera.scale;
                    const frameX = frame.position.x;
                    const frameY = frame.position.y;
                    const elW = element.type === "path" ? 40 : element.width;
                    const elH = element.type === "path" ? 40 : element.height;
                    const worldElX = frameX + newX;
                    const worldElY = frameY + newY;
                    const worldElCX = worldElX + elW / 2;
                    const worldElCY = worldElY + elH / 2;
                    const worldElR = worldElX + elW;
                    const worldElB = worldElY + elH;
                    const xTargets = [
                        frameX,
                        frameX + frame.width / 2,
                        frameX + frame.width,
                    ];
                    const yTargets = [
                        frameY,
                        frameY + frame.height / 2,
                        frameY + frame.height,
                    ];
                    for (const other of frame.elements) {
                        if (other.id === element.id)
                            continue;
                        const { selX, selY, selW, selH } = getElementBounds(other, frame);
                        xTargets.push(selX, selX + selW / 2, selX + selW);
                        yTargets.push(selY, selY + selH / 2, selY + selH);
                    }
                    let bestXSnap = null;
                    let minXDist = SNAP_DIST;
                    for (const target of xTargets) {
                        if (Math.abs(worldElX - target) < minXDist) {
                            minXDist = Math.abs(worldElX - target);
                            bestXSnap = { target, offset: 0 };
                        }
                        if (Math.abs(worldElCX - target) < minXDist) {
                            minXDist = Math.abs(worldElCX - target);
                            bestXSnap = { target, offset: elW / 2 };
                        }
                        if (Math.abs(worldElR - target) < minXDist) {
                            minXDist = Math.abs(worldElR - target);
                            bestXSnap = { target, offset: elW };
                        }
                    }
                    let bestYSnap = null;
                    let minYDist = SNAP_DIST;
                    for (const target of yTargets) {
                        if (Math.abs(worldElY - target) < minYDist) {
                            minYDist = Math.abs(worldElY - target);
                            bestYSnap = { target, offset: 0 };
                        }
                        if (Math.abs(worldElCY - target) < minYDist) {
                            minYDist = Math.abs(worldElCY - target);
                            bestYSnap = { target, offset: elH / 2 };
                        }
                        if (Math.abs(worldElB - target) < minYDist) {
                            minYDist = Math.abs(worldElB - target);
                            bestYSnap = { target, offset: elH };
                        }
                    }
                    if (bestXSnap) {
                        newX = bestXSnap.target - bestXSnap.offset - frameX;
                        newSnapLines.push({ axis: "x", position: bestXSnap.target });
                    }
                    if (bestYSnap) {
                        newY = bestYSnap.target - bestYSnap.offset - frameY;
                        newSnapLines.push({ axis: "y", position: bestYSnap.target });
                    }
                }
                element.x = newX;
                element.y = newY;
            }
        }
        else if (state.type === "resize") {
            if (element.type !== "line" && element.type !== "path") {
                const initEl = state.initialElement;
                let newX = initEl.x;
                let newY = initEl.y;
                let newW = initEl.width;
                let newH = initEl.height;
                if (state.handle?.includes("l")) {
                    newX = initEl.x + dx;
                    newW = initEl.width - dx;
                }
                if (state.handle?.includes("r")) {
                    newW = initEl.width + dx;
                }
                if (state.handle?.includes("t")) {
                    newY = initEl.y + dy;
                    newH = initEl.height - dy;
                }
                if (state.handle?.includes("b")) {
                    newH = initEl.height + dy;
                }
                if (newW < 4) {
                    if (state.handle?.includes("l"))
                        newX -= 4 - newW;
                    newW = 4;
                }
                if (newH < 4) {
                    if (state.handle?.includes("t"))
                        newY -= 4 - newH;
                    newH = 4;
                }
                element.x = newX;
                element.y = newY;
                element.width = newW;
                element.height = newH;
            }
        }
        else if (state.type === "rotate") {
            const { selX, selY, selW, selH } = getElementBounds(state.initialElement, state.initialFrame);
            const cx = selX + selW / 2;
            const cy = selY + selH / 2;
            const angle = Math.atan2(worldY - cy, worldX - cx);
            let deg = (angle + Math.PI / 2) * (180 / Math.PI);
            if (e.shiftKey) {
                deg = Math.round(deg / 15) * 15;
            }
            element.rotation = deg;
        }
        setSnapLines(newSnapLines);
        setLiveDocument(newDoc);
    }, [document, camera, cameraHandlers]);
    const onMouseUp = useCallback((e) => {
        const state = interactionState.current;
        if (state.type === "idle") {
            cameraHandlers.onMouseUp(e);
            return;
        }
        setLiveDocument((prev) => {
            if (prev) {
                saveDesignDocument(prev);
            }
            return null;
        });
        setIsDragging(false);
        setIsResizing(false);
        setIsRotating(false);
        setSnapLines([]);
        interactionState.current.type = "idle";
    }, [cameraHandlers, saveDesignDocument]);
    return {
        isDragging,
        isResizing,
        isRotating,
        snapLines,
        showGrid,
        liveDocument,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave: onMouseUp,
    };
}
//# sourceMappingURL=useDesignInteractions.js.map