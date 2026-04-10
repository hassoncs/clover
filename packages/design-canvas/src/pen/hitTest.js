export function hitTestLayoutTree(layoutNodes, worldX, worldY) {
    for (let i = layoutNodes.length - 1; i >= 0; i--) {
        const path = hitTestNode(layoutNodes[i], worldX, worldY);
        if (path)
            return path;
    }
    return null;
}
function hitTestNode(layoutNode, worldX, worldY) {
    const { rect, node } = layoutNode;
    if (worldX < rect.x ||
        worldX > rect.x + rect.width ||
        worldY < rect.y ||
        worldY > rect.y + rect.height) {
        return null;
    }
    for (let i = layoutNode.children.length - 1; i >= 0; i--) {
        const childPath = hitTestNode(layoutNode.children[i], worldX, worldY);
        if (childPath)
            return [node.id, ...childPath];
    }
    return [node.id];
}
export function screenToWorldPen(screenX, screenY, camera) {
    return {
        x: (screenX - camera.translateX) / camera.scale,
        y: (screenY - camera.translateY) / camera.scale,
    };
}
//# sourceMappingURL=hitTest.js.map