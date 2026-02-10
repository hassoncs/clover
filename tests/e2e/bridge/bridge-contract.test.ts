import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./generated/TypedBridgeClient.js";

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
    await bridge.loadGame(CONTRACT_GAME);
  });

  afterAll(async () => {
    await driver.stop();
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe("lifecycle", () => {
    it("loadGame", async () => {
      await bridge.loadGame(CONTRACT_GAME);
    });

    it("clearGame", async () => {
      await bridge.clearGame();
      await bridge.loadGame(CONTRACT_GAME);
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
      const result = await bridge.callRpc("load_custom_scene", ["res://nonexistent.tscn"]);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Entity Management
  // =========================================================================

  describe("entity management", () => {
    beforeAll(async () => {
      await bridge.loadGame(CONTRACT_GAME);
    });

    it("spawnEntity", async () => {
      await bridge.spawnEntity({
        entityId: "contract-entity-1",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
    });

    it("spawnEntityWithId", async () => {
      const result = await bridge.callRpc("spawn_entity_with_id", [
        "box",
        1,
        1,
        "contract-entity-2",
      ]);
      expect(result).toBeDefined();
    });

    it("getAllBodies", async () => {
      const result = await bridge.getAllEntities();
      expect(result).toBeDefined();
    });

    it("getEntityTransform", async () => {
      const result = await bridge.getEntityTransform("contract-entity-1");
      expect(result).toBeDefined();
    });

    it("destroyEntity", async () => {
      await bridge.spawnEntity({
        entityId: "contract-entity-destroy",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      await sleep(50);
      await bridge.destroyEntity("contract-entity-destroy");
    });

    it("setUserData", async () => {
      await bridge.spawnEntity({
        entityId: "contract-entity-user-data",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      await bridge.setUserData("contract-entity-user-data", { test: true });
    });

    it("getUserData", async () => {
      await bridge.spawnEntity({
        entityId: "contract-entity-user-data-get",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
      const result = await bridge.getUserData("contract-entity-user-data-get");
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Transform
  // =========================================================================

  describe("transform", () => {
    beforeAll(async () => {
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "transform-box",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
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
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "physics-box",
        templateId: "box",
        position: { x: 0, y: 5 },
      });
    });

    it("setLinearVelocity", async () => {
      await bridge.setLinearVelocity("physics-box", { x: 1, y: 0 });
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
      await bridge.applyImpulse("physics-box", { x: 5, y: 0 });
    });

    it("applyForce", async () => {
      await bridge.applyForce("physics-box", { x: 10, y: 0 });
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
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "query-static-box",
        templateId: "staticBox",
        position: { x: 0, y: 0 },
      });
      await sleep(100);
    });

    it("queryPoint", async () => {
      const result = await bridge.queryPoint({ x: 0, y: 0 });
      expect(result).toBeDefined();
    });

    it("queryPointEntity", async () => {
      const result = await bridge.queryPointEntity({ x: 0, y: 0 });
      expect(result).toBeDefined();
    });

    it("queryAabb", async () => {
      const result = await bridge.queryAABB({ x: -5, y: -5 }, { x: 5, y: 5 });
      expect(result).toBeDefined();
    });

    it("raycast", async () => {
      const result = await bridge.raycast({ x: 0, y: 10 }, { x: 0, y: -1 }, 20);
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
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "joint-box-a",
        templateId: "box",
        position: { x: 0, y: 5 },
      });
      await bridge.spawnEntity({
        entityId: "joint-box-b",
        templateId: "box",
        position: { x: 2, y: 5 },
      });
      await sleep(50);
    });

    it("createRevoluteJoint", async () => {
      const jointId = await bridge.createRevoluteJoint({
        type: "revolute",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchor: { x: 1, y: 5 },
      });
      expect(typeof jointId).toBe("number");
    });

    it("createDistanceJoint", async () => {
      const jointId = await bridge.createDistanceJoint({
        type: "distance",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchorA: { x: 0, y: 0 },
        anchorB: { x: 2, y: 0 },
      });
      expect(typeof jointId).toBe("number");
    });

    it("createPrismaticJoint", async () => {
      const jointId = await bridge.createPrismaticJoint({
        type: "prismatic",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchor: { x: 1, y: 5 },
        axis: { x: 1, y: 0 },
      });
      expect(typeof jointId).toBe("number");
    });

    it("createWeldJoint", async () => {
      const jointId = await bridge.createWeldJoint({
        type: "weld",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchor: { x: 1, y: 5 },
      });
      expect(typeof jointId).toBe("number");
    });

    it("createMouseJoint", async () => {
      const jointId = await bridge.createMouseJoint({
        type: "mouse",
        body: "joint-box-a",
        target: { x: 0, y: 5 },
        maxForce: 100,
      });
      expect(typeof jointId).toBe("number");
    });

    it("getLastJointId", async () => {
      const result = await bridge.callRpc("get_last_joint_id");
      expect(typeof result).toBe("number");
    });

    it("setMotorSpeed", async () => {
      const jointId = await bridge.createRevoluteJoint({
        type: "revolute",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchor: { x: 1, y: 5 },
        enableLimit: false,
        lowerAngle: 0,
        upperAngle: 0,
        enableMotor: true,
        motorSpeed: 1.0,
        maxMotorTorque: 10.0,
      });
      await bridge.setMotorSpeed(jointId, 2.0);
    });

    it("setMouseTarget", async () => {
      const jointId = await bridge.createMouseJoint({
        type: "mouse",
        body: "joint-box-a",
        target: { x: 0, y: 5 },
        maxForce: 100,
      });
      await bridge.setMouseTarget(jointId, { x: 1, y: 6 });
    });

    it("destroyJoint", async () => {
      const jointId = await bridge.createWeldJoint({
        type: "weld",
        bodyA: "joint-box-a",
        bodyB: "joint-box-b",
        anchor: { x: 1, y: 5 },
      });
      await bridge.destroyJoint(jointId);
    });

    it("destroyMouseJointForEntity", async () => {
      await bridge.createMouseJoint({
        type: "mouse",
        body: "joint-box-a",
        target: { x: 0, y: 5 },
        maxForce: 100,
      });
      await bridge.callRpc("destroy_mouse_joint_for_entity", ["joint-box-a"]);
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
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "sync-box",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
    });

    it("getTransform", async () => {
      const result = await bridge.callRpc("get_transform", ["sync-box"]);
      expect(result).toBeDefined();
    });

    it("getTransforms", async () => {
      const result = await bridge.callRpc("get_transforms", [["sync-box"]]);
      expect(result).toBeDefined();
    });

    it("setTrackedEntities", async () => {
      await bridge.callRpc("set_tracked_entities", [["sync-box"]]);
    });

    it("onTransformSync", async () => {
      await bridge.callRpc("on_transform_sync", ["dummy-callback"]);
    });

    it("onPropertySync", async () => {
      await bridge.callRpc("on_property_sync", ["dummy-callback"]);
    });

    it("setWatchConfig", async () => {
      await bridge.setWatchConfig({ frameProperties: [] });
    });
  });

  // =========================================================================
  // Properties
  // =========================================================================

  describe("properties", () => {
    beforeAll(async () => {
      await bridge.loadGame(CONTRACT_GAME);
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
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "visual-box",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
    });

    it("setEntityImage", async () => {
      await bridge.setEntityImage("visual-box", "https://example.com/img.png", 64, 64);
    });

    it("setEntityImageFromFile", async () => {
      await bridge.callRpc("set_entity_image_from_file", [
        "visual-box",
        "/tmp/nonexistent.png",
        64,
        64,
      ]);
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
      await bridge.callRpc("set_entity_atlas_region_from_file", [
        "visual-box",
        "/tmp/nonexistent-atlas.png",
        0,
        0,
        32,
        32,
        64,
        64,
      ]);
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
      await bridge.setDebugSettings({
        showInputDebug: false,
        showPhysicsShapes: false,
        showZones: false,
        showFPS: false,
      });
    });

    it("clearTextureCache", async () => {
      await bridge.clearTextureCache();
    });

    it("preloadTextures", async () => {
      await bridge.preloadTextures(["https://example.com/img.png"]);
    });
  });

  // =========================================================================
  // Pixel Buffer
  // =========================================================================

  describe("pixel buffer", () => {
    beforeAll(async () => {
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "pixel-box",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
    });

    it("createPixelBuffer", async () => {
      await bridge.createPixelBuffer("pixel-box", 64, 64, "#000000");
    });

    it("pixelBufferDraw", async () => {
      await bridge.pixelBufferDraw("pixel-box", [
        { type: "pixel", x: 0, y: 0, color: "#ff0000" },
      ]);
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
      await bridge.loadGame(CONTRACT_GAME);
    });

    it("sendInput", async () => {
      await bridge.sendInput("tap", { x: 0, y: 0 });
    });

    it("onInputEvent", async () => {
      await bridge.callRpc("on_input_event", ["dummy-callback"]);
    });

    it("onCollision", async () => {
      await bridge.callRpc("on_collision", ["dummy-callback"]);
    });

    it("onEntityDestroyed", async () => {
      await bridge.callRpc("on_entity_destroyed", ["dummy-callback"]);
    });

    it("onSensorBegin", async () => {
      await bridge.callRpc("on_sensor_begin", ["dummy-callback"]);
    });

    it("onSensorEnd", async () => {
      await bridge.callRpc("on_sensor_end", ["dummy-callback"]);
    });
  });

  // =========================================================================
  // Camera
  // =========================================================================

  describe("camera", () => {
    beforeAll(async () => {
      await bridge.loadGame(CONTRACT_GAME);
      await bridge.spawnEntity({
        entityId: "camera-box",
        templateId: "box",
        position: { x: 0, y: 0 },
      });
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
      await bridge.loadGame(CONTRACT_GAME);
    });

    it("createUiButton", async () => {
      await bridge.createUIButton(
        "test-btn",
        "https://example.com/normal.png",
        "https://example.com/pressed.png",
        10, 10, 50, 50,
      );
    });

    it("destroyUiButton", async () => {
      await bridge.destroyUIButton("test-btn");
    });

    it("onUiButtonEvent", async () => {
      await bridge.callRpc("on_ui_button_event", ["dummy-callback"]);
    });

    it("spawnParticle", async () => {
      await bridge.spawnParticle("explosion", 0, 0);
    });

    it("playSound", async () => {
      await bridge.playSound("res://nonexistent.wav");
    });

    it("createThemedUiComponent", async () => {
      await bridge.createThemedUIComponent(
        "test-component",
        0,
        "https://example.com/metadata.json",
        10, 10, 100, 50,
      );
    });

    it("destroyThemedUiComponent", async () => {
      await bridge.destroyThemedUIComponent("test-component");
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
      const result = await bridge.callRpc("get_bridge_methods");
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(50);
    });
  });
});
