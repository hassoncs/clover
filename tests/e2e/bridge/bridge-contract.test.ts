import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./TypedBridgeClient.js";

const CONTRACT_GAME = {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Bridge Contract Smoke Tests", () => {
  let driver: GodotHeadlessDriver;
  let bridge: TypedBridgeClient;

  beforeAll(async () => {
    driver = new GodotHeadlessDriver({ quiet: true });
    await driver.start();
    bridge = new TypedBridgeClient(driver);
    await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
  });

  afterAll(async () => {
    await driver.stop();
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe("lifecycle", () => {
    it("loadGameJson", async () => {
      const result = await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      expect(result).toBe(true);
    });

    it("clearGame", async () => {
      await bridge.clearGame();
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
    });

    it("setInspectMode", async () => {
      await bridge.setInspectMode(true);
      await bridge.setInspectMode(false);
    });

    it("pausePhysics", async () => {
      await bridge.pausePhysics();
    });

    it("resumePhysics", async () => {
      await bridge.resumePhysics();
    });

    it("loadCustomScene", async () => {
      const result = await bridge.loadCustomScene("res://nonexistent.tscn");
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Entity Management
  // =========================================================================

  describe("entity management", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
    });

    it("spawnEntity", async () => {
      await bridge.spawnEntity("box", 0, 0, "contract-entity-1");
    });

    it("spawnEntityWithId", async () => {
      const result = await bridge.spawnEntityWithId("box", 1, 1, "contract-entity-2");
      expect(result).toBeDefined();
    });

    it("getAllBodies", async () => {
      const result = await bridge.getAllBodies();
      expect(result).toBeDefined();
    });

    it("getEntityTransform", async () => {
      const result = await bridge.getEntityTransform("contract-entity-1");
      expect(result).toBeDefined();
    });

    it("destroyEntity", async () => {
      await bridge.spawnEntity("box", 0, 0, "contract-entity-destroy");
      await sleep(50);
      await bridge.destroyEntity("contract-entity-destroy");
    });

    it("setUserData", async () => {
      await bridge.setUserData(0, { test: true });
    });

    it("getUserData", async () => {
      const result = await bridge.getUserData(0);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Transform
  // =========================================================================

  describe("transform", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 0, "transform-box");
    });

    it("setTransform", async () => {
      await bridge.setTransform("transform-box", 1, 2, 0.5);
    });

    it("setPosition", async () => {
      await bridge.setPosition("transform-box", 3, 4);
    });

    it("setRotation", async () => {
      await bridge.setRotation("transform-box", 1.0);
    });

    it("setScale", async () => {
      await bridge.setScale("transform-box", 2, 2);
    });

    it("getAllTransforms", async () => {
      const result = await bridge.getAllTransforms();
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Physics
  // =========================================================================

  describe("physics", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 5, "physics-box");
    });

    it("setLinearVelocity", async () => {
      await bridge.setLinearVelocity("physics-box", 1, 0);
    });

    it("setAngularVelocity", async () => {
      await bridge.setAngularVelocity("physics-box", 0.5);
    });

    it("getLinearVelocity", async () => {
      const result = await bridge.getLinearVelocity("physics-box");
      expect(result).toBeDefined();
    });

    it("getAngularVelocity", async () => {
      const result = await bridge.getAngularVelocity("physics-box");
      expect(result).toBeDefined();
    });

    it("applyImpulse", async () => {
      await bridge.applyImpulse("physics-box", 5, 0);
    });

    it("applyForce", async () => {
      await bridge.applyForce("physics-box", 10, 0);
    });

    it("applyTorque", async () => {
      await bridge.applyTorque("physics-box", 1);
    });
  });

  // =========================================================================
  // Physics Queries
  // =========================================================================

  describe("physics queries", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("staticBox", 0, 0, "query-static-box");
      await sleep(100);
    });

    it("queryPoint", async () => {
      const result = await bridge.queryPoint(0, 0);
      expect(result).toBeDefined();
    });

    it("queryPointEntity", async () => {
      const result = await bridge.queryPointEntity(0, 0);
      expect(result).toBeDefined();
    });

    it("queryAabb", async () => {
      const result = await bridge.queryAabb(-5, -5, 5, 5);
      expect(result).toBeDefined();
    });

    it("raycast", async () => {
      const result = await bridge.raycast(0, 10, 0, -1, 20);
      expect(result !== undefined).toBe(true);
    });

    it("screenToWorld", async () => {
      const result = await bridge.screenToWorld(100, 100);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Joints
  // =========================================================================

  describe("joints", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 5, "joint-box-a");
      await bridge.spawnEntity("box", 2, 5, "joint-box-b");
      await sleep(50);
    });

    it("createRevoluteJoint", async () => {
      const jointId = await bridge.createRevoluteJoint(
        "joint-box-a",
        "joint-box-b",
        1,
        5,
      );
      expect(typeof jointId).toBe("number");
    });

    it("createDistanceJoint", async () => {
      const jointId = await bridge.createDistanceJoint(
        "joint-box-a",
        "joint-box-b",
        0,
        0,
        2,
        0,
      );
      expect(typeof jointId).toBe("number");
    });

    it("createPrismaticJoint", async () => {
      const jointId = await bridge.createPrismaticJoint(
        "joint-box-a",
        "joint-box-b",
        1,
        5,
        1,
        0,
      );
      expect(typeof jointId).toBe("number");
    });

    it("createWeldJoint", async () => {
      const jointId = await bridge.createWeldJoint(
        "joint-box-a",
        "joint-box-b",
        1,
        5,
      );
      expect(typeof jointId).toBe("number");
    });

    it("createMouseJoint", async () => {
      const jointId = await bridge.createMouseJoint(
        "joint-box-a",
        0,
        5,
        100,
      );
      expect(typeof jointId).toBe("number");
    });

    it("getLastJointId", async () => {
      const result = await bridge.getLastJointId();
      expect(typeof result).toBe("number");
    });

    it("setMotorSpeed", async () => {
      const jointId = await bridge.createRevoluteJoint(
        "joint-box-a",
        "joint-box-b",
        1,
        5,
        false,
        0,
        0,
        true,
        1.0,
        10.0,
      );
      await bridge.setMotorSpeed(jointId, 2.0);
    });

    it("setMouseTarget", async () => {
      const jointId = await bridge.createMouseJoint(
        "joint-box-a",
        0,
        5,
        100,
      );
      await bridge.setMouseTarget(jointId, 1, 6);
    });

    it("destroyJoint", async () => {
      const jointId = await bridge.createWeldJoint(
        "joint-box-a",
        "joint-box-b",
        1,
        5,
      );
      await bridge.destroyJoint(jointId);
    });

    it("destroyMouseJointForEntity", async () => {
      await bridge.createMouseJoint("joint-box-a", 0, 5, 100);
      await bridge.destroyMouseJointForEntity("joint-box-a");
    });

    it("destroyJoint with non-existent joint does not crash", async () => {
      await bridge.destroyJoint(99999);
    });
  });

  // =========================================================================
  // Sync System
  // =========================================================================

  describe("sync system", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 0, "sync-box");
    });

    it("getTransform", async () => {
      const result = await bridge.getTransform("sync-box");
      expect(result).toBeDefined();
    });

    it("getTransforms", async () => {
      const result = await bridge.getTransforms(["sync-box"]);
      expect(result).toBeDefined();
    });

    it("setTrackedEntities", async () => {
      await bridge.setTrackedEntities(["sync-box"]);
    });

    it("onTransformSync", async () => {
      await bridge.onTransformSync("dummy-callback");
    });

    it("onPropertySync", async () => {
      await bridge.onPropertySync("dummy-callback");
    });

    it("setWatchConfig", async () => {
      await bridge.setWatchConfig(JSON.stringify({ frameProperties: [] }));
    });
  });

  // =========================================================================
  // Properties
  // =========================================================================

  describe("properties", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
    });

    it("getAllProperties", async () => {
      await bridge.getAllProperties();
    });
  });

  // =========================================================================
  // Visual Renderer
  // =========================================================================

  describe("visual renderer", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 0, "visual-box");
    });

    it("setEntityImage", async () => {
      await bridge.setEntityImage("visual-box", "https://example.com/img.png", 64, 64);
    });

    it("setEntityImageFromFile", async () => {
      await bridge.setEntityImageFromFile("visual-box", "/tmp/nonexistent.png", 64, 64);
    });

    it("setEntityAtlasRegion", async () => {
      await bridge.setEntityAtlasRegion(
        "visual-box",
        "https://example.com/atlas.png",
        0, 0, 32, 32,
        64, 64,
      );
    });

    it("setEntityAtlasRegionFromFile", async () => {
      await bridge.setEntityAtlasRegionFromFile(
        "visual-box",
        "/tmp/nonexistent-atlas.png",
        0, 0, 32, 32,
        64, 64,
      );
    });

    it("setOpacity", async () => {
      await bridge.setOpacity("visual-box", 0.5);
    });

    it("setVisible", async () => {
      await bridge.setVisible("visual-box", false);
      await bridge.setVisible("visual-box", true);
    });

    it("setDebugShowShapes", async () => {
      await bridge.setDebugShowShapes(true);
      await bridge.setDebugShowShapes(false);
    });

    it("setDebugSettings", async () => {
      await bridge.setDebugSettings(JSON.stringify({ showShapes: false }));
    });

    it("clearTextureCache", async () => {
      await bridge.clearTextureCache();
    });

    it("preloadTextures", async () => {
      await bridge.preloadTextures(JSON.stringify(["https://example.com/img.png"]));
    });
  });

  // =========================================================================
  // Pixel Buffer
  // =========================================================================

  describe("pixel buffer", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 0, "pixel-box");
    });

    it("createPixelBuffer", async () => {
      await bridge.createPixelBuffer("pixel-box", 64, 64, "#000000");
    });

    it("pixelBufferDraw", async () => {
      await bridge.pixelBufferDraw(
        "pixel-box",
        JSON.stringify([{ type: "rect", x: 0, y: 0, w: 10, h: 10, color: "#ff0000" }]),
      );
    });

    it("pixelBufferClear", async () => {
      await bridge.pixelBufferClear("pixel-box", "#000000");
    });

    it("destroyPixelBuffer", async () => {
      await bridge.destroyPixelBuffer("pixel-box");
    });
  });

  // =========================================================================
  // Input / Events
  // =========================================================================

  describe("input / events", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
    });

    it("sendInput", async () => {
      await bridge.sendInput("tap", 0, 0);
    });

    it("onInputEvent", async () => {
      await bridge.onInputEvent("dummy-callback");
    });

    it("onCollision", async () => {
      await bridge.onCollision("dummy-callback");
    });

    it("onEntityDestroyed", async () => {
      await bridge.onEntityDestroyed("dummy-callback");
    });

    it("onSensorBegin", async () => {
      await bridge.onSensorBegin("dummy-callback");
    });

    it("onSensorEnd", async () => {
      await bridge.onSensorEnd("dummy-callback");
    });
  });

  // =========================================================================
  // Camera
  // =========================================================================

  describe("camera", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
      await bridge.spawnEntity("box", 0, 0, "camera-box");
    });

    it("setCameraTarget", async () => {
      await bridge.setCameraTarget("camera-box");
    });

    it("setCameraPosition", async () => {
      await bridge.setCameraPosition(0, 0);
    });

    it("setCameraZoom", async () => {
      await bridge.setCameraZoom(1.5);
    });

    it("startCamera", async () => {
      await bridge.startCamera("camera-box");
    });

    it("stopCamera", async () => {
      await bridge.stopCamera();
    });
  });

  // =========================================================================
  // UI
  // =========================================================================

  describe("ui", () => {
    beforeAll(async () => {
      await bridge.loadGameJson(JSON.stringify(CONTRACT_GAME));
    });

    it("createUiButton", async () => {
      await bridge.createUiButton(
        "test-btn",
        "https://example.com/normal.png",
        "https://example.com/pressed.png",
        10, 10, 50, 50,
      );
    });

    it("destroyUiButton", async () => {
      await bridge.destroyUiButton("test-btn");
    });

    it("onUiButtonEvent", async () => {
      await bridge.onUiButtonEvent("dummy-callback");
    });

    it("spawnParticle", async () => {
      await bridge.spawnParticle("explosion", 0, 0);
    });

    it("playSound", async () => {
      await bridge.playSound("res://nonexistent.wav");
    });

    it("createThemedUiComponent", async () => {
      await bridge.createThemedUiComponent(
        "test-component",
        0,
        "https://example.com/metadata.json",
        10, 10, 100, 50,
      );
    });

    it("destroyThemedUiComponent", async () => {
      await bridge.destroyThemedUiComponent("test-component");
    });
  });

  // =========================================================================
  // 3D Viewport
  // =========================================================================

  describe("3d viewport", () => {
    it("show3DModel", async () => {
      const result = await bridge.show3DModel("res://nonexistent.glb");
      expect(result).toBeDefined();
    });

    it("show3DModelFromUrl", async () => {
      await bridge.show3DModelFromUrl("https://example.com/model.glb");
    });

    it("set3DViewportPosition", async () => {
      await bridge.set3DViewportPosition(0, 0);
    });

    it("set3DViewportSize", async () => {
      await bridge.set3DViewportSize(200, 200);
    });

    it("rotate3DModel", async () => {
      await bridge.rotate3DModel(0, 45, 0);
    });

    it("set3DCameraDistance", async () => {
      await bridge.set3DCameraDistance(5);
    });

    it("set3DCameraSize", async () => {
      await bridge.set3DCameraSize(10);
    });

    it("clear3DModels", async () => {
      await bridge.clear3DModels();
    });
  });

  // =========================================================================
  // Diagnostics
  // =========================================================================

  describe("diagnostics", () => {
    it("getBridgeMethods", async () => {
      const result = await bridge.getBridgeMethods();
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(50);
    });
  });
});
