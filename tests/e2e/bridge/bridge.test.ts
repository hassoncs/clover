import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./TypedBridgeClient.js";

const TEST_GAME = {
  world: { gravity: { x: 0, y: -9.8 }, width: 10, height: 20 },
  templates: {
    box: {
      physics: { bodyType: "dynamic", density: 1 },
      collider: { shape: "box", width: 1, height: 1 },
    },
  },
  entities: [],
};

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
      const registry = await bridge.getBridgeMethods();

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
      const result = await bridge.loadGameJson(JSON.stringify(TEST_GAME));
      expect(result).toBe(true);
    });

    it("clear_game resets all state", async () => {
      await bridge.loadGameJson(JSON.stringify(TEST_GAME));
      await bridge.spawnEntity("box", 0, 5, "clear-test-box");

      const transformBefore = await bridge.getEntityTransform("clear-test-box");
      expect(transformBefore).toHaveProperty("x");

      await bridge.clearGame();

      const transformAfter = await bridge.getEntityTransform("clear-test-box");
      expect(transformAfter).toEqual({});
    });
  });

  describe("entity management", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(TEST_GAME));
    });

    it("spawn_entity creates an entity from a template", async () => {
      await bridge.spawnEntity("box", 0, 5, "test-box-1");

      const transform = await bridge.getEntityTransform("test-box-1");

      expect(transform).toHaveProperty("x");
      expect(transform).toHaveProperty("y");
      expect(transform).toHaveProperty("angle");
      if ("x" in transform) {
        expect(transform.x).toBeCloseTo(0, 0);
        expect(transform.y).toBeCloseTo(5, 0);
      }
    });

    it("get_entity_transform returns position and angle", async () => {
      await bridge.spawnEntity("box", 3, 7, "test-box-transform");

      const transform = await bridge.getEntityTransform("test-box-transform");

      if ("x" in transform) {
        expect(typeof transform.x).toBe("number");
        expect(typeof transform.y).toBe("number");
        expect(typeof transform.angle).toBe("number");
        expect(transform.x).toBeCloseTo(3, 0);
        expect(transform.y).toBeCloseTo(7, 0);
      }
    });

    it("destroy_entity removes an entity", async () => {
      await bridge.spawnEntity("box", 0, 5, "test-box-destroy");

      const before = await bridge.getEntityTransform("test-box-destroy");
      expect(before).toHaveProperty("x");

      await bridge.destroyEntity("test-box-destroy");
      await sleep(100);

      const after = await bridge.getEntityTransform("test-box-destroy");
      expect(after).toEqual({});
    });
  });

  describe("physics", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(TEST_GAME));
    });

    it("apply_impulse changes entity velocity", async () => {
      await bridge.spawnEntity("box", 0, 5, "impulse-box");

      const velBefore = await bridge.getLinearVelocity("impulse-box");
      expect(velBefore).toBeDefined();

      await bridge.applyImpulse("impulse-box", 10, 0);
      await sleep(100);

      const velAfter = await bridge.getLinearVelocity("impulse-box");
      expect(velAfter).toBeDefined();
      expect(velAfter!.x).toBeGreaterThan(0);
    });

    it("gravity affects dynamic bodies over time", async () => {
      await bridge.spawnEntity("box", 0, 8, "gravity-box");

      const posBefore = await bridge.getEntityTransform("gravity-box");

      await sleep(500);

      const posAfter = await bridge.getEntityTransform("gravity-box");

      if ("y" in posBefore && "y" in posAfter) {
        expect(posAfter.y).toBeLessThan(posBefore.y);
      }
    });
  });

  describe("queries", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(TEST_GAME));
    });

    it("query_point finds an entity at its position", async () => {
      await bridge.spawnEntity("box", 2, 2, "query-box");
      await sleep(100);

      const result = await bridge.queryPoint(2, 2);
      expect(result).toBe("query-box");
    });

    it("query_point returns null for empty space", async () => {
      const result = await bridge.queryPoint(-100, -100);
      expect(result).toBeNull();
    });
  });
});
