import type { DesignDocument } from "@slopcade/shared";

export type HitTestResult =
	| { frameId: string; elementId: string }
	| { frameId: string; elementId: null }
	| { frameId: null; elementId: null };

export function hitTestDesignCanvas(
	frames: DesignDocument["frames"],
	worldX: number,
	worldY: number,
): HitTestResult {
	for (let i = frames.length - 1; i >= 0; i--) {
		const frame = frames[i];

		const inFrame =
			worldX >= frame.position.x &&
			worldX <= frame.position.x + frame.width &&
			worldY >= frame.position.y &&
			worldY <= frame.position.y + frame.height;

		if (!inFrame) continue;

		const sortedElements = [...frame.elements].sort(
			(a, b) => b.zIndex - a.zIndex,
		);

		for (const element of sortedElements) {
			const elX = frame.position.x + element.x;
			const elY = frame.position.y + element.y;

			if (
				worldX >= elX &&
				worldX <= elX + element.width &&
				worldY >= elY &&
				worldY <= elY + element.height
			) {
				return { frameId: frame.id, elementId: element.id };
			}
		}

		return { frameId: frame.id, elementId: null };
	}

	return { frameId: null, elementId: null };
}

export function screenToWorld(
	screenX: number,
	screenY: number,
	camera: { translateX: number; translateY: number; scale: number },
): { worldX: number; worldY: number } {
	return {
		worldX: (screenX - camera.translateX) / camera.scale,
		worldY: (screenY - camera.translateY) / camera.scale,
	};
}
