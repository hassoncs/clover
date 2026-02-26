import type { GameDefinition } from "@slopcade/shared";

export interface LayoutZone {
	id: string;
	type: "header" | "footer" | "center" | "sidebar" | "overlay" | "entity";
	bounds: { x: number; y: number; width: number; height: number };
	rotation?: number;
	label?: string;
	subLabel?: string;
	shape?: "box" | "circle";
}

export interface ScreenLayout {
	id: string;
	zones: LayoutZone[];
	worldBounds?: { width: number; height: number };
}

export interface LayoutContext {
	document: GameDefinition;
	screenIndex?: number;
	mode: "structural" | "production";
}

export interface LayoutAdapter {
	getLayout(context: LayoutContext): ScreenLayout | null;
}

export function createEntityLayoutAdapter(): LayoutAdapter {
	return {
		getLayout(context) {
			const { document } = context;
			const zones: LayoutZone[] = [];

			if (document.entities) {
				for (const entity of document.entities) {
					const prefab = entity.prefab ? document.prefabs[entity.prefab] : null;

					let width = 1;
					let height = 1;
					let shape: "box" | "circle" = "box";

					const collider =
						(entity as any).collider || (prefab as any)?.collider;
					const visual = (entity as any).visual || (prefab as any)?.visual;

					if (collider) {
						if (collider.shape === "box") {
							width = collider.width ?? 1;
							height = collider.height ?? 1;
						} else if (collider.shape === "circle") {
							width = (collider.radius ?? 0.5) * 2;
							height = (collider.radius ?? 0.5) * 2;
							shape = "circle";
						}
					} else if (visual) {
						if (visual.type === "rect") {
							width = visual.width ?? 1;
							height = visual.height ?? 1;
						} else if (visual.type === "circle") {
							width = (visual.radius ?? 0.5) * 2;
							height = (visual.radius ?? 0.5) * 2;
							shape = "circle";
						}
					}

					width *= entity.transform.scaleX ?? 1;
					height *= entity.transform.scaleY ?? 1;

					const angle =
						"angle" in entity.transform
							? entity.transform.angle
							: (entity.transform as any).rotationZ || 0;

					zones.push({
						id: entity.id,
						type: "entity",
						bounds: {
							x: entity.transform.x,
							y: entity.transform.y,
							width,
							height,
						},
						rotation: angle,
						label: entity.name || entity.id,
						subLabel: entity.prefab ? `(${entity.prefab})` : undefined,
						shape,
					});
				}
			}

			return {
				id: "main",
				zones,
				worldBounds: document.world.bounds,
			};
		},
	};
}
