const PATH_DEFAULT_SIZE = 40;
const LINE_MIN_TOLERANCE = 4;
function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}
function hitTestElement(element, frameX, frameY, worldX, worldY) {
    switch (element.type) {
        case "rect":
        case "text":
        case "image":
        case "group": {
            const elX = frameX + element.x;
            const elY = frameY + element.y;
            return (worldX >= elX &&
                worldX <= elX + element.width &&
                worldY >= elY &&
                worldY <= elY + element.height);
        }
        case "circle": {
            const cx = frameX + element.x + element.width / 2;
            const cy = frameY + element.y + element.height / 2;
            const rx = element.width / 2;
            const ry = element.height / 2;
            if (rx <= 0 || ry <= 0)
                return false;
            const nx = (worldX - cx) / rx;
            const ny = (worldY - cy) / ry;
            return nx * nx + ny * ny <= 1;
        }
        case "line": {
            const ax = frameX + element.x1;
            const ay = frameY + element.y1;
            const bx = frameX + element.x2;
            const by = frameY + element.y2;
            const tolerance = Math.max((element.strokeWidth ?? 1) / 2, LINE_MIN_TOLERANCE);
            return (pointToSegmentDistance(worldX, worldY, ax, ay, bx, by) <= tolerance);
        }
        case "path": {
            const elX = frameX + element.x;
            const elY = frameY + element.y;
            return (worldX >= elX &&
                worldX <= elX + PATH_DEFAULT_SIZE &&
                worldY >= elY &&
                worldY <= elY + PATH_DEFAULT_SIZE);
        }
    }
}
export function hitTestDesignCanvas(frames, worldX, worldY) {
    for (let i = frames.length - 1; i >= 0; i--) {
        const frame = frames[i];
        const inFrame = worldX >= frame.position.x &&
            worldX <= frame.position.x + frame.width &&
            worldY >= frame.position.y &&
            worldY <= frame.position.y + frame.height;
        if (!inFrame)
            continue;
        const sortedElements = [...frame.elements].sort((a, b) => b.zIndex - a.zIndex);
        for (const element of sortedElements) {
            if (hitTestElement(element, frame.position.x, frame.position.y, worldX, worldY)) {
                return { frameId: frame.id, elementId: element.id };
            }
        }
        return { frameId: frame.id, elementId: null };
    }
    return { frameId: null, elementId: null };
}
export function screenToWorld(screenX, screenY, camera) {
    return {
        worldX: (screenX - camera.translateX) / camera.scale,
        worldY: (screenY - camera.translateY) / camera.scale,
    };
}
//# sourceMappingURL=designCanvasHitTest.js.map