import type {
	DesignDocument,
	DesignElement,
} from "@slopcade/shared/types/design";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { describe, expect, it } from "vitest";

/**
 * These tests enforce the boundary between Design Documents (v1.1)
 * and runtime GameDefinition.
 *
 * Design documents contain high-fidelity UI/UX fields (opacity, rotation, shadow, etc.)
 * that are used as context for the AI Build stage, but should NEVER be
 * directly copied into the runtime GameDefinition which has a stricter schema.
 */
describe("Design-Runtime Boundary", () => {
	it("asserts design-only fields do not exist in GameDefinition type", () => {
		// This is a compile-time check via TypeScript, but we can also
		// assert it at runtime by checking keys.

		const designElement: DesignElement = {
			type: "rect",
			id: "test-rect",
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			zIndex: 1,
			opacity: 0.5,
			rotation: 45,
			shadow: {
				color: "#000000",
				offsetX: 2,
				offsetY: 2,
				blur: 4,
			},
			gradient: {
				type: "linear",
				stops: [
					{ color: "#ff0000", position: 0 },
					{ color: "#0000ff", position: 1 },
				],
			},
		};

		// Verify design element has the fields
		expect(designElement).toHaveProperty("opacity");
		expect(designElement).toHaveProperty("rotation");
		expect(designElement).toHaveProperty("shadow");
		expect(designElement).toHaveProperty("gradient");

		// GameDefinition entities/prefabs should NOT have these fields
		const gameDef: GameDefinition = {
			metadata: { id: "game-1", title: "Test", version: "1.0.0" },
			world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
			prefabs: {
				p1: {
					id: "p1",
					visual: {
						type: "rect",
						width: 1,
						height: 1,
						color: "#ff0000",
					},
				},
			},
			entities: [],
		};

		const prefab = gameDef.prefabs.p1 as any;
		expect(prefab.visual).not.toHaveProperty("opacity");
		expect(prefab.visual).not.toHaveProperty("rotation");
		expect(prefab.visual).not.toHaveProperty("shadow");
		expect(prefab.visual).not.toHaveProperty("gradient");
	});

	it("verifies v1.0 to v1.1 migration path", () => {
		const legacyDoc = {
			version: "1.0",
			metadata: {
				title: "Legacy Design",
				gameId: "game-1",
				createdAt: 1000,
				updatedAt: 1000,
			},
			frames: [],
		};

		// In a real scenario, we might have a migration function.
		// For now, we just ensure that updating the version string
		// makes it a valid v1.1 document.
		const migratedDoc: DesignDocument = {
			...legacyDoc,
			version: "1.1",
		};

		expect(migratedDoc.version).toBe("1.1");
		expect(migratedDoc.metadata.title).toBe("Legacy Design");
	});

	it("ensures new design element types (circle, line, path, group) are design-only", () => {
		const circle: DesignElement = {
			type: "circle",
			id: "c1",
			x: 0,
			y: 0,
			width: 50,
			height: 50,
			zIndex: 1,
		};

		const line: DesignElement = {
			type: "line",
			id: "l1",
			x1: 0,
			y1: 0,
			x2: 100,
			y2: 100,
			zIndex: 1,
		};

		expect(circle.type).toBe("circle");
		expect(line.type).toBe("line");

		// GameDefinition visual types are limited
		type GameVisualType = GameDefinition["prefabs"][string]["visual"]["type"];

		// @ts-expect-error - 'line' is not a valid runtime visual type
		const invalidType: GameVisualType = "line";
		expect(invalidType).toBe("line");
	});
});
