import { afterAll, beforeAll, describe, expect, it } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./generated/TypedBridgeClient.js";

const TEST_GAME = {
	metadata: { id: "test-game", title: "Test Game", version: "1.0.0" },
	world: {
		gravity: { x: 0, y: -9.8 },
		pixelsPerMeter: 50,
		bounds: { width: 10, height: 20 },
	},
	prefabs: {
		box: {
			id: "box",
			physics: { bodyType: "dynamic", density: 1 },
			collider: { shape: "box", width: 1, height: 1 },
		},
	},
	entities: [],
} satisfies import("@slopcade/shared").GameDefinition;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Godot Bridge E2E", () => {
	let driver: GodotHeadlessDriver;
	let bridge: TypedBridgeClient;

	beforeAll(async () => {
		driver = new GodotHeadlessDriver({ quiet: true });
		await driver.start();
		bridge = new TypedBridgeClient(driver);
	});

	afterAll(async () => {
		await driver.stop();
	});

	describe("connectivity", () => {
		it("responds to _ping with pong", async () => {
			const result = await driver.ping();
			expect(result).toBe("pong");
		});
	});

	describe("bridge registry", () => {
		it("get_bridge_methods returns the full method registry", async () => {
			const registry = await bridge.callRpc("get_bridge_methods");

			expect(registry).toBeDefined();
			expect(registry.methods).toBeDefined();
			expect(registry.byModule).toBeDefined();
			expect(registry.total).toBeGreaterThan(50);
			expect(registry.methods.length).toBeGreaterThan(50);

			const methodNames = registry.methods.map((m) => m.name);
			expect(methodNames).toContain("spawn_entity");
			expect(methodNames).toContain("destroy_entity");
			expect(methodNames).toContain("get_entity_transform");
			expect(methodNames).toContain("apply_impulse");
			expect(methodNames).toContain("get_linear_velocity");
			expect(methodNames).toContain("query_point");
			expect(methodNames).toContain("load_game_json");
			expect(methodNames).toContain("clear_game");
		});
	});

	describe("game lifecycle", () => {
		it("load_game_json loads a game definition", async () => {
			await bridge.loadGame(TEST_GAME);
		});

		it("clear_game resets all state", async () => {
			await bridge.loadGame(TEST_GAME);
			await bridge.spawnEntity({
				entityId: "clear-test-box",
				prefabId: "box",
				position: { x: 0, y: 5 },
			});

			const transformBefore = await bridge.getEntityTransform("clear-test-box");
			expect(transformBefore).toHaveProperty("x");

			await bridge.clearGame();

			const transformAfter = await bridge.getEntityTransform("clear-test-box");
			expect(transformAfter).toBeNull();
		});
	});

	describe("entity management", () => {
		beforeAll(async () => {
			await bridge.loadGame(TEST_GAME);
		});

		it("spawn_entity creates an entity from a template", async () => {
			await bridge.spawnEntity({
				entityId: "test-box-1",
				prefabId: "box",
				position: { x: 0, y: 5 },
			});

			const transform = await bridge.getEntityTransform("test-box-1");

			expect(transform).not.toBeNull();
			if (transform) {
				expect(transform).toHaveProperty("x");
				expect(transform).toHaveProperty("y");
				expect(transform).toHaveProperty("angle");
				expect(transform.x).toBeCloseTo(0, 0);
				expect(transform.y).toBeCloseTo(5, 0);
			}
		});

		it("get_entity_transform returns position and angle", async () => {
			await bridge.spawnEntity({
				entityId: "test-box-transform",
				prefabId: "box",
				position: { x: 3, y: 7 },
			});

			const transform = await bridge.getEntityTransform("test-box-transform");

			if (transform) {
				expect(typeof transform.x).toBe("number");
				expect(typeof transform.y).toBe("number");
				expect(typeof transform.angle).toBe("number");
				expect(transform.x).toBeCloseTo(3, 0);
				expect(transform.y).toBeCloseTo(7, 0);
			}
		});

		it("destroy_entity removes an entity", async () => {
			await bridge.spawnEntity({
				entityId: "test-box-destroy",
				prefabId: "box",
				position: { x: 0, y: 5 },
			});

			const before = await bridge.getEntityTransform("test-box-destroy");
			expect(before).not.toBeNull();

			await bridge.destroyEntity("test-box-destroy");
			await sleep(100);

			const after = await bridge.getEntityTransform("test-box-destroy");
			expect(after).toBeNull();
		});
	});

	describe("physics", () => {
		beforeAll(async () => {
			await bridge.loadGame(TEST_GAME);
		});

		it("apply_impulse changes entity velocity", async () => {
			await bridge.spawnEntity({
				entityId: "impulse-box",
				prefabId: "box",
				position: { x: 0, y: 5 },
			});

			const velBefore = await bridge.getLinearVelocity("impulse-box");
			expect(velBefore).toBeDefined();

			await bridge.applyImpulse("impulse-box", { x: 10, y: 0 });
			await sleep(100);

			const velAfter = await bridge.getLinearVelocity("impulse-box");
			expect(velAfter).toBeDefined();
			expect(velAfter?.x).toBeGreaterThan(0);
		});

		it("gravity affects dynamic bodies over time", async () => {
			await bridge.spawnEntity({
				entityId: "gravity-box",
				prefabId: "box",
				position: { x: 0, y: 8 },
			});

			const posBefore = await bridge.getEntityTransform("gravity-box");

			await sleep(500);

			const posAfter = await bridge.getEntityTransform("gravity-box");

			if (posBefore && posAfter) {
				expect(posAfter.y).toBeLessThan(posBefore.y);
			}
		});
	});

	describe("queries", () => {
		beforeAll(async () => {
			await bridge.loadGame(TEST_GAME);
		});

		it("query_point finds an entity at its position", async () => {
			await bridge.spawnEntity({
				entityId: "query-box",
				prefabId: "box",
				position: { x: 2, y: 2 },
			});
			await sleep(100);

			const result = await bridge.queryPointEntity({ x: 2, y: 2 });
			expect(result).toBe("query-box");
		});

		it("query_point returns null for empty space", async () => {
			const result = await bridge.queryPointEntity({ x: -100, y: -100 });
			expect(result).toBeNull();
		});
	});
});
