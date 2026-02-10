import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./generated/TypedBridgeClient.js";
import { DebugBridgeClient } from "./DebugBridgeClient.js";

const DEBUG_TEST_GAME = {
  world: { gravity: { x: 0, y: -9.8 }, width: 20, height: 20 },
  templates: {
    box: {
      physics: { bodyType: "dynamic", density: 1 },
      collider: { shape: "box", width: 1, height: 1 },
    },
    staticBox: {
      physics: { bodyType: "static" },
      collider: { shape: "box", width: 2, height: 2 },
    },
  },
  entities: [],
};

describe("Debug Bridge Tests", () => {
  let driver: GodotHeadlessDriver;
  let bridge: TypedBridgeClient;
  let debug: DebugBridgeClient;

  beforeAll(async () => {
    driver = new GodotHeadlessDriver({ quiet: true });
    await driver.start();
    bridge = new TypedBridgeClient(driver);
    debug = new DebugBridgeClient(driver);
    await bridge.loadGame(DEBUG_TEST_GAME);

    const result = await bridge.callRpc("enable_debug");
    expect(result.ok).toBe(true);
  });

  afterAll(async () => {
    await driver.stop();
  });

  describe("Debug Control", () => {
    it("isDebugEnabled returns true after enableDebug", async () => {
      const enabled = await bridge.callRpc("is_debug_enabled");
      expect(enabled).toBe(true);
    });

    it("enableDebug returns wasAlreadyEnabled on second call", async () => {
      const result = await bridge.callRpc("enable_debug");
      expect(result.ok).toBe(true);
      expect(result.wasAlreadyEnabled).toBe(true);
    });
  });

  describe("Time Control", () => {
    it("getTimeState returns current time state", async () => {
      const state = await debug.getTimeState();
      expect(state).toBeDefined();
      expect(typeof state).toBe("object");
    });

    it("step advances physics frames", async () => {
      const result = await debug.step(10);
      expect(result).toBeDefined();
    });

    it("setTimeScale changes simulation speed", async () => {
      const result = await debug.setTimeScale(0.5);
      expect(result).toBeDefined();
      await debug.setTimeScale(1.0);
    });
  });

  describe("Snapshots and Inspection", () => {
    it("getSceneSnapshot returns scene data", async () => {
      await bridge.spawnEntity({
        entityId: "snapshot-test-1",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      const snapshot = await debug.getSceneSnapshot();
      expect(snapshot).toBeDefined();
      expect(typeof snapshot.timestamp).toBe("number");
      expect(Array.isArray(snapshot.entities)).toBe(true);
    });

    it("getEntityDetails returns entity info", async () => {
      await bridge.spawnEntity({
        entityId: "details-test",
        templateId: "box",
        position: { x: 1, y: 1 },
      });
      const details = await debug.getEntityDetails("details-test");
      expect(details).toBeDefined();
    });

    it("getEntityCount returns totals", async () => {
      const count = await debug.getEntityCount();
      expect(count).toBeDefined();
      expect(typeof count.total).toBe("number");
    });
  });

  describe("Entity Queries", () => {
    beforeAll(async () => {
      await bridge.loadGame(DEBUG_TEST_GAME);
      await bridge.spawnEntity({
        entityId: "query-test-1",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      await bridge.spawnEntity({
        entityId: "query-test-2",
        templateId: "box",
        position: { x: 2, y: 2 },
      });
    });

    it("findEntities returns matching entity IDs", async () => {
      const entities = await debug.findEntities({ template: "box" });
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThanOrEqual(2);
    });

    it("getEntitiesAtPoint finds entities at coordinates", async () => {
      const entities = await debug.getEntitiesAtPoint(0, 0);
      expect(Array.isArray(entities)).toBe(true);
    });

    it("getEntitiesInRect finds entities in rectangle", async () => {
      const entities = await debug.getEntitiesInRect(-1, -1, 3, 3);
      expect(Array.isArray(entities)).toBe(true);
    });

    it("query with CSS-like selector", async () => {
      const result = await debug.query("[template=box]");
      expect(result).toBeDefined();
      expect(typeof result.count).toBe("number");
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });

  describe("Properties", () => {
    beforeAll(async () => {
      await bridge.spawnEntity({
        entityId: "props-test",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
    });

    it("getProps returns specific properties", async () => {
      const props = await debug.getProps("props-test", ["transform.position.x", "transform.position.y"]);
      expect(props).toBeDefined();
    });

    it("getAllProps returns all properties", async () => {
      const props = await debug.getAllProps("props-test");
      expect(props).toBeDefined();
      expect(typeof props).toBe("object");
    });

    it("setProps modifies properties", async () => {
      const result = await debug.setProps("props-test", { "transform.position.x": 5 });
      expect(result).toBeDefined();
    });
  });

  describe("Lifecycle via Debug Bridge", () => {
    it("spawn creates entity via debug bridge", async () => {
      const result = await debug.spawn("box", 0, 0, { entityId: "debug-spawn-test" });
      expect(result).toBeDefined();
    });

    it("destroy removes entity via debug bridge", async () => {
      await debug.spawn("box", 0, 0, { entityId: "debug-destroy-test" });
      const result = await debug.destroy("debug-destroy-test");
      expect(result).toBeDefined();
    });

    it("clone duplicates entity", async () => {
      await bridge.spawnEntity({
        entityId: "clone-source",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      const result = await debug.clone("clone-source", { position: { x: 1, y: 1 } });
      expect(result).toBeDefined();
    });
  });

  describe("Physics Queries", () => {
    beforeAll(async () => {
      await bridge.spawnEntity({
        entityId: "physics-static",
        templateId: "staticBox",
        position: { x: 0, y: 0 },
      });
      await bridge.spawnEntity({
        entityId: "physics-dynamic",
        templateId: "box",
        position: { x: 5, y: 5 },
      });
    });

    it("getShapes returns collision shapes", async () => {
      const shapes = await debug.getShapes("physics-static");
      expect(shapes).toBeDefined();
    });

    it("raycast returns result", async () => {
      const result = await debug.raycast({ x: -10, y: 0 }, { x: 10, y: 0 });
      expect(result).toBeDefined();
    });

    it("getOverlaps returns result", async () => {
      const result = await debug.getOverlaps("physics-static");
      expect(result).toBeDefined();
    });

    it("queryPoint returns result", async () => {
      const result = await debug.queryPoint(0, 0);
      expect(result).toBeDefined();
    });
  });

  describe("Events", () => {
    it("subscribe creates event subscription", async () => {
      const result = await debug.subscribe({ types: ["collision"] });
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
      expect(typeof result.subId).toBe("string");
    });

    it("pollEvents returns queued events", async () => {
      const sub = await debug.subscribe({ types: ["collision"] });
      const result = await debug.pollEvents(sub.subId);
      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(typeof result.count).toBe("number");
    });
  });
});
