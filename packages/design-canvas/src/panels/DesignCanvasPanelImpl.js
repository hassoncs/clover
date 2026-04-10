import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@slopcade/theme";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View, } from "react-native";
import { useDesignCamera } from "../camera/useDesignCamera";
import { useDesignInteractions } from "../interactions/useDesignInteractions";
const DesignCanvasRenderer = lazy(() => import("../core/DesignCanvasRenderer"));
export function DesignCanvasPanel({ host }) {
    const { editorColors: c } = useTheme();
    const { width, height } = useWindowDimensions();
    const { document: designDocument, isLoadingDocument: isLoadingDesign, saveDocument: saveDesignDocument, selectedFrameId: selectedDesignFrameId, selectedElementId: selectedDesignElementId, selectedElementIds, selectFrame: selectDesignFrame, selectElement: selectDesignElement, clearSelection: clearDesignSelection, setDesignMode, designPhase, setDesignPhase, } = host;
    const { camera, zoomToFit, onWheel, onMouseDown, onMouseMove, onMouseUp } = useDesignCamera();
    const [localSelectedElementIds, setLocalSelectedElementIds] = useState(selectedElementIds);
    useEffect(() => {
        setLocalSelectedElementIds(selectedElementIds);
    }, [selectedElementIds]);
    const { isDragging, isResizing, isRotating, snapLines, showGrid, liveDocument, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseLeave, } = useDesignInteractions({
        document: designDocument,
        camera,
        selectedFrameId: selectedDesignFrameId,
        selectedElementId: selectedDesignElementId,
        selectedElementIds: localSelectedElementIds,
        saveDesignDocument,
        cameraHandlers: {
            onMouseDown: onMouseDown ?? (() => { }),
            onMouseMove: onMouseMove ?? (() => { }),
            onMouseUp: onMouseUp ?? (() => { }),
        },
    });
    const [showFrameList, setShowFrameList] = useState(false);
    const [dismissedWarning, setDismissedWarning] = useState(false);
    const frames = designDocument?.frames || [];
    const totalFrames = frames.length;
    const selectedFrameIndex = frames.findIndex((f) => f.id === selectedDesignFrameId);
    const selectedFrame = frames[selectedFrameIndex];
    const selectedElement = selectedFrame?.elements.find((e) => e.id === selectedDesignElementId);
    const warningCount = useMemo(() => {
        if (!designDocument)
            return 0;
        let count = 0;
        for (const frame of designDocument.frames) {
            for (const el of frame.elements) {
                if (el.type === "image" && !el.imageUrl && !el.assetRef) {
                    count++;
                }
                else if (el.type === "path" && !el.data) {
                    count++;
                }
            }
        }
        return count;
    }, [designDocument]);
    useEffect(() => {
        if (designDocument && designPhase === "idle") {
            setDesignPhase("designing");
        }
    }, [designDocument, designPhase, setDesignPhase]);
    const handleZoomToFit = useCallback(() => {
        if (frames.length > 0) {
            zoomToFit(frames, width, height - 48);
        }
    }, [frames, zoomToFit, width, height]);
    const goPrevFrame = useCallback(() => {
        if (selectedFrameIndex > 0) {
            selectDesignFrame(frames[selectedFrameIndex - 1].id);
        }
    }, [selectedFrameIndex, frames, selectDesignFrame]);
    const goNextFrame = useCallback(() => {
        if (selectedFrameIndex >= 0 && selectedFrameIndex < totalFrames - 1) {
            selectDesignFrame(frames[selectedFrameIndex + 1].id);
        }
        else if (selectedFrameIndex === -1 && totalFrames > 0) {
            selectDesignFrame(frames[0].id);
        }
    }, [selectedFrameIndex, totalFrames, frames, selectDesignFrame]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA") {
                return;
            }
            if (e.key === "[") {
                goPrevFrame();
            }
            else if (e.key === "]") {
                goNextFrame();
            }
            else if (e.key.toLowerCase() === "f") {
                handleZoomToFit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleZoomToFit, goPrevFrame, goNextFrame]);
    useEffect(() => {
        setLocalSelectedElementIds([]);
    }, [selectedDesignFrameId]);
    const handleElementTap = useCallback((frameId, elementId, shiftKey) => {
        if (elementId && shiftKey) {
            setLocalSelectedElementIds((prev) => {
                const next = prev.includes(elementId)
                    ? prev.filter((id) => id !== elementId)
                    : [...prev, elementId];
                if (next.length >= 2) {
                    clearDesignSelection();
                }
                return next;
            });
            return;
        }
        setLocalSelectedElementIds([]);
        if (elementId) {
            selectDesignElement(elementId, frameId);
            setDesignMode("select");
        }
        else if (frameId) {
            selectDesignFrame(frameId);
            setDesignMode("select");
        }
        else {
            clearDesignSelection();
        }
    }, [
        clearDesignSelection,
        selectDesignElement,
        selectDesignFrame,
        setDesignMode,
    ]);
    const handleGroup = useCallback(() => {
        if (!designDocument ||
            !selectedDesignFrameId ||
            localSelectedElementIds.length < 2)
            return;
        const newDoc = JSON.parse(JSON.stringify(designDocument));
        const frame = newDoc.frames.find((f) => f.id === selectedDesignFrameId);
        if (!frame)
            return;
        const toGroup = frame.elements.filter((el) => localSelectedElementIds.includes(el.id));
        if (toGroup.length < 2)
            return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of toGroup) {
            if (el.type === "line") {
                minX = Math.min(minX, Math.min(el.x1, el.x2));
                minY = Math.min(minY, Math.min(el.y1, el.y2));
                maxX = Math.max(maxX, Math.max(el.x1, el.x2));
                maxY = Math.max(maxY, Math.max(el.y1, el.y2));
            }
            else if (el.type === "path") {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + 40);
                maxY = Math.max(maxY, el.y + 40);
            }
            else {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
            }
        }
        const maxZIndex = Math.max(...frame.elements.map((e) => e.zIndex), 0);
        const groupId = `group-${Date.now()}`;
        const groupEl = {
            id: groupId,
            type: "group",
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            zIndex: maxZIndex + 1,
            childIds: [...localSelectedElementIds],
        };
        frame.elements = frame.elements.filter((el) => !localSelectedElementIds.includes(el.id));
        frame.elements.push(groupEl);
        saveDesignDocument(newDoc);
        setLocalSelectedElementIds([]);
        selectDesignElement(groupId, selectedDesignFrameId);
        setDesignMode("select");
    }, [
        designDocument,
        selectedDesignFrameId,
        localSelectedElementIds,
        saveDesignDocument,
        selectDesignElement,
        setDesignMode,
    ]);
    const handleUngroup = useCallback(() => {
        if (!designDocument || !selectedDesignFrameId || !selectedDesignElementId)
            return;
        const newDoc = JSON.parse(JSON.stringify(designDocument));
        const frame = newDoc.frames.find((f) => f.id === selectedDesignFrameId);
        const groupEl = frame?.elements.find((el) => el.id === selectedDesignElementId);
        if (!frame || !groupEl || groupEl.type !== "group")
            return;
        const rectEl = {
            id: groupEl.id,
            type: "rect",
            x: groupEl.x,
            y: groupEl.y,
            width: groupEl.width,
            height: groupEl.height,
            zIndex: groupEl.zIndex,
            fill: "#E0E0E0",
        };
        const idx = frame.elements.findIndex((el) => el.id === selectedDesignElementId);
        if (idx !== -1)
            frame.elements.splice(idx, 1, rectEl);
        saveDesignDocument(newDoc);
    }, [
        designDocument,
        selectedDesignFrameId,
        selectedDesignElementId,
        saveDesignDocument,
    ]);
    const breadcrumbText = useMemo(() => {
        if (!selectedFrame)
            return null;
        if (selectedElement) {
            return `${selectedFrame.title} > ${selectedElement.type} (${selectedElement.id.substring(0, 4)})`;
        }
        return selectedFrame.title;
    }, [selectedFrame, selectedElement]);
    return (_jsxs(View, { style: [styles.container, { backgroundColor: c.panelBg }], accessibilityLabel: "Design Canvas Panel", testID: "editor-design-canvas-panel", children: [_jsxs(View, { style: [styles.header, { borderBottomColor: c.border }], children: [_jsxs(View, { style: styles.headerLeft, children: [_jsx(Text, { style: [styles.title, { color: c.text }], children: "DESIGN CANVAS" }), breadcrumbText && (_jsxs(_Fragment, { children: [_jsx(Ionicons, { name: "chevron-forward", size: 12, color: c.textSecondary, style: { marginHorizontal: 4 } }), _jsx(Text, { style: [styles.breadcrumb, { color: c.textSecondary }], numberOfLines: 1, children: breadcrumbText })] }))] }), _jsxs(View, { style: styles.headerRight, children: [designPhase !== "idle" && (_jsx(View, { style: [
                                    styles.phaseBadge,
                                    { backgroundColor: c.surfaceHover, borderColor: c.border },
                                ], children: _jsx(Text, { style: [styles.phaseText, { color: c.textSecondary }], children: designPhase.toUpperCase() }) })), designPhase === "designing" && (_jsx(Pressable, { style: [styles.actionButton, { backgroundColor: "#3b82f6" }], onPress: () => setDesignPhase("approved"), children: _jsx(Text, { style: [styles.actionButtonText, { color: "#fff" }], children: "\u2713 Approve Design" }) })), designPhase === "approved" && (_jsx(Pressable, { style: [styles.actionButton, { backgroundColor: "#10b981" }], onPress: () => setDesignPhase("implementing"), children: _jsx(Text, { style: [styles.actionButtonText, { color: "#fff" }], children: "\uD83D\uDE80 Start Implementation" }) })), designPhase === "implementing" && (_jsx(View, { style: [
                                    styles.actionButton,
                                    { backgroundColor: c.surfaceHover, opacity: 0.7 },
                                ], children: _jsx(Text, { style: [styles.actionButtonText, { color: c.textSecondary }], children: "Implementing..." }) })), localSelectedElementIds.length >= 2 && (_jsx(Pressable, { style: [
                                    styles.actionButton,
                                    {
                                        backgroundColor: c.surfaceHover,
                                        borderWidth: 1,
                                        borderColor: c.border,
                                    },
                                ], onPress: handleGroup, children: _jsx(Text, { style: [styles.actionButtonText, { color: c.text }], children: "Group" }) })), selectedDesignElementId && selectedElement?.type === "group" && (_jsx(Pressable, { style: [
                                    styles.actionButton,
                                    {
                                        backgroundColor: c.surfaceHover,
                                        borderWidth: 1,
                                        borderColor: c.border,
                                    },
                                ], onPress: handleUngroup, children: _jsx(Text, { style: [styles.actionButtonText, { color: c.text }], children: "Ungroup" }) })), _jsxs(View, { style: [styles.navControls, { backgroundColor: c.surface }], children: [_jsx(Pressable, { onPress: handleZoomToFit, style: styles.navButton, children: _jsx(Ionicons, { name: "expand", size: 14, color: c.text }) }), _jsxs(Text, { style: [styles.counterText, { color: c.textSecondary }], children: [Math.round(camera.scale * 100), "%"] })] }), totalFrames > 0 && (_jsxs(View, { style: [styles.navControls, { backgroundColor: c.surface }], children: [_jsx(Pressable, { onPress: goPrevFrame, disabled: selectedFrameIndex <= 0, style: ({ pressed }) => [
                                            styles.navButton,
                                            { opacity: pressed || selectedFrameIndex <= 0 ? 0.3 : 1 },
                                        ], children: _jsx(Ionicons, { name: "chevron-back", size: 14, color: c.text }) }), _jsxs(Pressable, { onPress: () => setShowFrameList(!showFrameList), style: styles.frameSelector, children: [_jsx(Text, { style: [styles.counterText, { color: c.textSecondary }], children: selectedFrameIndex >= 0
                                                    ? `${selectedFrameIndex + 1} / ${totalFrames}`
                                                    : `0 / ${totalFrames}` }), _jsx(Ionicons, { name: "chevron-down", size: 12, color: c.textSecondary })] }), _jsx(Pressable, { onPress: goNextFrame, disabled: selectedFrameIndex === -1 ||
                                            selectedFrameIndex >= totalFrames - 1, style: ({ pressed }) => [
                                            styles.navButton,
                                            {
                                                opacity: pressed ||
                                                    selectedFrameIndex === -1 ||
                                                    selectedFrameIndex >= totalFrames - 1
                                                    ? 0.3
                                                    : 1,
                                            },
                                        ], children: _jsx(Ionicons, { name: "chevron-forward", size: 14, color: c.text }) })] }))] })] }), _jsxs(View, { style: styles.content, children: [warningCount > 0 && !dismissedWarning && (_jsx(Pressable, { style: styles.warningBanner, onPress: () => setDismissedWarning(true), children: _jsxs(Text, { style: styles.warningText, children: ["\u26A0 ", warningCount, " element(s) may not render correctly"] }) })), isLoadingDesign ? (_jsx(Text, { style: [styles.message, { color: c.textSecondary }], children: "Loading design..." })) : designDocument ? (_jsx(View, { style: { flex: 1, width: "100%" }, ...{
                            onWheel,
                            onMouseDown: handleMouseDown,
                            onMouseMove: handleMouseMove,
                            onMouseUp: handleMouseUp,
                            onMouseLeave: handleMouseLeave,
                        }, children: _jsx(Suspense, { fallback: _jsx(View, { style: styles.rendererFallback, children: _jsx(ActivityIndicator, { color: "#818cf8" }) }), children: _jsx(DesignCanvasRenderer, { document: liveDocument || designDocument, camera: camera, selectedFrameId: selectedDesignFrameId, selectedElementId: selectedDesignElementId, selectedElementIds: localSelectedElementIds, onElementTap: handleElementTap, width: width, height: height - 48, snapLines: snapLines, showGrid: showGrid }) }) })) : (_jsx(Text, { style: [styles.message, { color: c.textSecondary }], children: "No design document found." })), showFrameList && totalFrames > 0 && (_jsx(View, { style: [
                            styles.frameListDropdown,
                            { backgroundColor: c.panelBg, borderColor: c.border },
                        ], children: frames.map((f, i) => (_jsx(Pressable, { style: [
                                styles.frameListItem,
                                f.id === selectedDesignFrameId && {
                                    backgroundColor: c.surfaceHover,
                                },
                            ], onPress: () => {
                                selectDesignFrame(f.id);
                                setShowFrameList(false);
                            }, children: _jsxs(Text, { style: [
                                    styles.frameListText,
                                    {
                                        color: f.id === selectedDesignFrameId
                                            ? c.text
                                            : c.textSecondary,
                                    },
                                ], numberOfLines: 1, children: [i + 1, ". ", f.title] }) }, f.id))) }))] })] }));
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        height: 48,
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    title: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    breadcrumb: {
        fontSize: 12,
        fontWeight: "500",
        flexShrink: 1,
    },
    navControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 6,
        padding: 2,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    navButton: {
        padding: 4,
        borderRadius: 4,
    },
    frameSelector: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    counterText: {
        fontSize: 11,
        fontVariant: ["tabular-nums"],
        minWidth: 32,
        textAlign: "center",
        fontWeight: "500",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    message: {
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
    },
    frameListDropdown: {
        position: "absolute",
        top: 8,
        right: 16,
        width: 200,
        maxHeight: 300,
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        zIndex: 100,
    },
    frameListItem: {
        padding: 8,
        borderRadius: 4,
    },
    frameListText: {
        fontSize: 12,
        fontWeight: "500",
    },
    phaseBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    phaseText: {
        fontSize: 10,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: "600",
    },
    warningBanner: {
        position: "absolute",
        top: 8,
        alignSelf: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#F59E0B",
        zIndex: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    warningText: {
        color: "#92400E",
        fontSize: 12,
        fontWeight: "500",
    },
    rendererFallback: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#050310",
    },
});
//# sourceMappingURL=DesignCanvasPanelImpl.js.map