import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";

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

  beforeAll(async () => {
    driver = new GodotHeadlessDriver({ quiet: true });
    await driver.start();
  });

  afterAll(async () => {
    await driver.stop();
  });

  // -------------------------------------------------------------------------
  // Connectivity
  // -------------------------------------------------------------------------

  describe("connectivity", () => {
    it("responds to _ping with pong", async () => {
      const result = await driver.ping();
      expect(result).toBe("pong");
    });
  });

  // -------------------------------------------------------------------------
  // Bridge registry
  // -------------------------------------------------------------------------

  describe("bridge registry", () => {
    it("get_bridge_methods returns the full method registry", async () => {
      const result = await driver.call("get_bridge_methods");

      expect(result).toBeDefined();
      expect(result).toHaveProperty("methods");
      expect(result).toHaveProperty("byModule");
      expect(result).toHaveProperty("total");

      const registry = result as {
        methods: Array<{ name: string; owner: string }>;
        byModule: Record<string, string[]>;
        total: number;
      };

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

  // -------------------------------------------------------------------------
  // Game lifecycle
  // -------------------------------------------------------------------------

  describe("game lifecycle", () => {
    it("load_game_json loads a game definition", async () => {
      const result = await driver.call("load_game_json", [
        JSON.stringify(TEST_GAME),
      ]);
      expect(result).toBe(true);
    });

    it("clear_game resets all state", async () => {
      await driver.call("load_game_json", [JSON.stringify(TEST_GAME)]);
      await driver.call("spawn_entity", ["box", 0, 5, "clear-test-box"]);

      const transformBefore = await driver.call("get_entity_transform", [
        "clear-test-box",
      ]);
      expect(transformBefore).toHaveProperty("x");

      await driver.call("clear_game", []);

      // After clear, entity_registry is empty → get_entity_transform returns {}
      const transformAfter = await driver.call("get_entity_transform", [
        "clear-test-box",
      ]);
      expect(transformAfter).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Entity management
  // -------------------------------------------------------------------------

  describe("entity management", () => {
    beforeAll(async () => {
      await driver.call("load_game_json", [JSON.stringify(TEST_GAME)]);
    });

    it("spawn_entity creates an entity from a template", async () => {
      // args: [templateId, x, y, entityId]
      await driver.call("spawn_entity", ["box", 0, 5, "test-box-1"]);

      const transform = (await driver.call("get_entity_transform", [
        "test-box-1",
      ])) as { x: number; y: number; angle: number };

      expect(transform).toHaveProperty("x");
      expect(transform).toHaveProperty("y");
      expect(transform).toHaveProperty("angle");
      expect(transform.x).toBeCloseTo(0, 0);
      expect(transform.y).toBeCloseTo(5, 0);
    });

    it("get_entity_transform returns position and angle", async () => {
      await driver.call("spawn_entity", ["box", 3, 7, "test-box-transform"]);

      const transform = (await driver.call("get_entity_transform", [
        "test-box-transform",
      ])) as { x: number; y: number; angle: number };

      expect(typeof transform.x).toBe("number");
      expect(typeof transform.y).toBe("number");
      expect(typeof transform.angle).toBe("number");
      expect(transform.x).toBeCloseTo(3, 0);
      expect(transform.y).toBeCloseTo(7, 0);
    });

    it("destroy_entity removes an entity", async () => {
      await driver.call("spawn_entity", ["box", 0, 5, "test-box-destroy"]);

      const before = await driver.call("get_entity_transform", [
        "test-box-destroy",
      ]);
      expect(before).toHaveProperty("x");

      await driver.call("destroy_entity", ["test-box-destroy"]);
      await sleep(100);

      const after = await driver.call("get_entity_transform", [
        "test-box-destroy",
      ]);
      expect(after).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Physics
  // -------------------------------------------------------------------------

  describe("physics", () => {
    beforeAll(async () => {
      await driver.call("load_game_json", [JSON.stringify(TEST_GAME)]);
    });

    it("apply_impulse changes entity velocity", async () => {
      await driver.call("spawn_entity", ["box", 0, 5, "impulse-box"]);

      const velBefore = (await driver.call("get_linear_velocity", [
        "impulse-box",
      ])) as { x: number; y: number };
      expect(velBefore).toBeDefined();

      // args: [entityId, impulseX, impulseY]
      await driver.call("apply_impulse", ["impulse-box", 10, 0]);
      await sleep(100);

      const velAfter = (await driver.call("get_linear_velocity", [
        "impulse-box",
      ])) as { x: number; y: number };
      expect(velAfter).toBeDefined();
      expect(velAfter.x).toBeGreaterThan(0);
    });

    it("gravity affects dynamic bodies over time", async () => {
      await driver.call("spawn_entity", ["box", 0, 8, "gravity-box"]);

      const posBefore = (await driver.call("get_entity_transform", [
        "gravity-box",
      ])) as { x: number; y: number; angle: number };

      await sleep(500);

      const posAfter = (await driver.call("get_entity_transform", [
        "gravity-box",
      ])) as { x: number; y: number; angle: number };

      expect(posAfter.y).toBeLessThan(posBefore.y);
    });
  });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  describe("queries", () => {
    beforeAll(async () => {
      await driver.call("load_game_json", [JSON.stringify(TEST_GAME)]);
    });

    it("query_point finds an entity at its position", async () => {
      await driver.call("spawn_entity", ["box", 2, 2, "query-box"]);
      await sleep(100);

      // Box is 1x1 centered at (2,2) — query_point returns entity_id or null
      const result = await driver.call("query_point", [2, 2]);
      expect(result).toBe("query-box");
    });

    it("query_point returns null for empty space", async () => {
      const result = await driver.call("query_point", [-100, -100]);
      expect(result).toBeNull();
    });
  });
});
