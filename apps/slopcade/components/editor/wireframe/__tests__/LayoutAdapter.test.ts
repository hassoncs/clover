import type { GameDefinition } from "@slopcade/shared";
import { describe, expect, it } from "vitest";
import { createEntityLayoutAdapter } from "../LayoutAdapter";

const mockDocument: GameDefinition = {
	metadata: { id: "test-game", title: "Test Game", version: "1.0.0" },
	world: {
		bounds: { width: 20, height: 12 },
		gravity: { x: 0, y: 9.8 },
		pixelsPerMeter: 50,
	},
	prefabs: {
		player: {
			id: "player",
			collider: { shape: "box", width: 1, height: 2 },
		},
		circle: {
			id: "circle",
			collider: { shape: "circle", radius: 0.5 },
		},
	},
	entities: [
		{
			id: "e1",
			name: "Hero",
			prefab: "player",
			transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "e2",
			name: "Ball",
			prefab: "circle",
			transform: { x: -5, y: -5, angle: Math.PI / 4, scaleX: 2, scaleY: 2 },
		},
	],
	modules: {},
};

describe("LayoutAdapter", () => {
	it("createEntityLayoutAdapter returns valid adapter", () => {
		const adapter = createEntityLayoutAdapter();
		expect(adapter.getLayout).toBeDefined();
	});

	it("getLayout returns zones for entities", () => {
		const adapter = createEntityLayoutAdapter();
		const layout = adapter.getLayout({
			document: mockDocument,
			mode: "structural",
		});

		expect(layout).not.toBeNull();
		expect(layout?.zones).toHaveLength(2);
		expect(layout?.worldBounds).toEqual(mockDocument.world.bounds);
	});

	it("zones have correct bounds and labels", () => {
		const adapter = createEntityLayoutAdapter();
		const layout = adapter.getLayout({
			document: mockDocument,
			mode: "structural",
		});

		const heroZone = layout?.zones.find((z) => z.id === "e1");
		expect(heroZone).toBeDefined();
		expect(heroZone?.label).toBe("Hero");
		expect(heroZone?.subLabel).toBe("(player)");
		expect(heroZone?.bounds).toEqual({ x: 5, y: 5, width: 1, height: 2 });
		expect(heroZone?.shape).toBe("box");

		const ballZone = layout?.zones.find((z) => z.id === "e2");
		expect(ballZone).toBeDefined();
		expect(ballZone?.label).toBe("Ball");
		expect(ballZone?.bounds).toEqual({ x: -5, y: -5, width: 2, height: 2 });
		expect(ballZone?.shape).toBe("circle");
		expect(ballZone?.rotation).toBe(Math.PI / 4);
	});
});
