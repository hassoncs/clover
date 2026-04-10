export const EMPTY_PEN_STATE = {
    anchors: [],
    cursorDocX: null,
    cursorDocY: null,
    isDraggingHandle: false,
};
export function screenToDoc(screenX, screenY, camera) {
    return [
        (screenX - camera.translateX) / camera.scale,
        (screenY - camera.translateY) / camera.scale,
    ];
}
function r(n) {
    return Math.round(n * 100) / 100;
}
export function buildPathGeometry(anchors, closed) {
    if (anchors.length === 0)
        return "";
    const parts = [`M ${r(anchors[0].docX)} ${r(anchors[0].docY)}`];
    for (let i = 1; i < anchors.length; i++) {
        const prev = anchors[i - 1];
        const curr = anchors[i];
        const isLine = prev.handleOutDocX === prev.docX &&
            prev.handleOutDocY === prev.docY &&
            curr.handleInDocX === curr.docX &&
            curr.handleInDocY === curr.docY;
        if (isLine) {
            parts.push(`L ${r(curr.docX)} ${r(curr.docY)}`);
        }
        else {
            parts.push(`C ${r(prev.handleOutDocX)} ${r(prev.handleOutDocY)} ` +
                `${r(curr.handleInDocX)} ${r(curr.handleInDocY)} ` +
                `${r(curr.docX)} ${r(curr.docY)}`);
        }
    }
    if (closed && anchors.length > 1)
        parts.push("Z");
    return parts.join(" ");
}
export function buildPathNode(anchors, closed) {
    if (anchors.length < 2)
        return null;
    return {
        id: `path-${Date.now()}`,
        type: "path",
        geometry: buildPathGeometry(anchors, closed),
        fill: "transparent",
        stroke: { fill: "#818cf8", thickness: 2, cap: "round", join: "round" },
    };
}
//# sourceMappingURL=penToolState.js.map