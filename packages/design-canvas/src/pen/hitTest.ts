import type { DesignCamera } from "../camera/useDesignCamera.shared";
import type { LayoutNode } from "./layout";

export function hitTestLayoutTree(
	layoutNodes: LayoutNode[],
	worldX: number,
	worldY: number,
): string[] | null {
	for (let i = layoutNodes.length - 1; i >= 0; i--) {
		const path = hitTestNode(layoutNodes[i], worldX, worldY);
		if (path) return path;
	}
	return null;
}

function hitTestNode(
	layoutNode: LayoutNode,
	worldX: number,
	worldY: number,
): string[] | null {
	const { rect, node } = layoutNode;
	if (
		worldX < rect.x ||
		worldX > rect.x + rect.width ||
		worldY < rect.y ||
		worldY > rect.y + rect.height
	) {
		return null;
	}

	for (let i = layoutNode.children.length - 1; i >= 0; i--) {
		const childPath = hitTestNode(layoutNode.children[i], worldX, worldY);
		if (childPath) return [node.id, ...childPath];
	}

	return [node.id];
}

export function screenToWorldPen(
	screenX: number,
	screenY: number,
	camera: DesignCamera,
): { x: number; y: number } {
	return {
		x: (screenX - camera.translateX) / camera.scale,
		y: (screenY - camera.translateY) / camera.scale,
	};
}
