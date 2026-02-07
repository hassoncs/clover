import { describe, it, expect, vi } from "vitest";
import {
  createCallbackArrays,
  createCallbackMethods,
  clearAllCallbacks,
  type BridgeCallbackArrays,
} from "../callback-registry";

const CALLBACK_KEYS: (keyof BridgeCallbackArrays)[] = [
  "collision",
  "destroy",
  "entitySpawned",
  "sensorBegin",
  "sensorEnd",
  "inputEvent",
  "uiButton",
  "transformSync",
  "propertySync",
  "score",
];

describe("callback-registry", () => {
  describe("createCallbackArrays", () => {
    it("creates empty arrays for all 10 callback types", () => {
      const cbs = createCallbackArrays();
      expect(Object.keys(cbs)).toHaveLength(10);
      for (const key of CALLBACK_KEYS) {
        expect(cbs[key]).toEqual([]);
      }
    });
  });

  describe("createCallbackMethods", () => {
    it("returns a method for each callback type", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);

      expect(methods.onCollision).toBeTypeOf("function");
      expect(methods.onEntityDestroyed).toBeTypeOf("function");
      expect(methods.onEntitySpawned).toBeTypeOf("function");
      expect(methods.onSensorBegin).toBeTypeOf("function");
      expect(methods.onSensorEnd).toBeTypeOf("function");
      expect(methods.onInputEvent).toBeTypeOf("function");
      expect(methods.onUIButtonEvent).toBeTypeOf("function");
      expect(methods.onTransformSync).toBeTypeOf("function");
      expect(methods.onPropertySync).toBeTypeOf("function");
      expect(methods.onScore).toBeTypeOf("function");
    });

    it("subscribing pushes callback into the corresponding array", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      methods.onCollision(fn);
      expect(cbs.collision).toHaveLength(1);
      expect(cbs.collision[0]).toBe(fn);
    });
  });

  describe("subscribing and calling", () => {
    it("triggers the callback when the array entry is invoked", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      methods.onScore(fn);
      cbs.score[0](42, "entity-1");

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith(42, "entity-1");
    });

    it("works for onInputEvent with all arguments", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      methods.onInputEvent(fn);
      cbs.inputEvent[0]("tap", 100, 200, "entity-5");

      expect(fn).toHaveBeenCalledWith("tap", 100, 200, "entity-5");
    });
  });

  describe("unsubscribing", () => {
    it("removes the callback from the array", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      const unsub = methods.onEntityDestroyed(fn);
      expect(cbs.destroy).toHaveLength(1);

      unsub();
      expect(cbs.destroy).toHaveLength(0);
    });

    it("does not affect other callbacks when one is removed", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      const unsub1 = methods.onSensorBegin(fn1);
      methods.onSensorBegin(fn2);
      expect(cbs.sensorBegin).toHaveLength(2);

      unsub1();
      expect(cbs.sensorBegin).toHaveLength(1);
      expect(cbs.sensorBegin[0]).toBe(fn2);
    });

    it("is safe to call unsubscribe multiple times", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      const unsub = methods.onCollision(fn);
      unsub();
      unsub();
      expect(cbs.collision).toHaveLength(0);
    });
  });

  describe("clearAllCallbacks", () => {
    it("empties all callback arrays", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);

      methods.onCollision(vi.fn());
      methods.onEntityDestroyed(vi.fn());
      methods.onEntitySpawned(vi.fn());
      methods.onSensorBegin(vi.fn());
      methods.onSensorEnd(vi.fn());
      methods.onInputEvent(vi.fn());
      methods.onUIButtonEvent(vi.fn());
      methods.onTransformSync(vi.fn());
      methods.onPropertySync(vi.fn());
      methods.onScore(vi.fn());

      for (const key of CALLBACK_KEYS) {
        expect(cbs[key].length).toBeGreaterThan(0);
      }

      clearAllCallbacks(cbs);

      for (const key of CALLBACK_KEYS) {
        expect(cbs[key]).toHaveLength(0);
      }
    });
  });

  describe("multiple callbacks", () => {
    it("registers multiple callbacks and all fire when invoked", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      methods.onTransformSync(fn1);
      methods.onTransformSync(fn2);
      methods.onTransformSync(fn3);

      const transforms = { player: { x: 1, y: 2, rotation: 0 } };
      for (const cb of cbs.transformSync) {
        cb(transforms as any);
      }

      expect(fn1).toHaveBeenCalledWith(transforms);
      expect(fn2).toHaveBeenCalledWith(transforms);
      expect(fn3).toHaveBeenCalledWith(transforms);
    });

    it("fires only remaining callbacks after partial unsubscribe", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      const unsub1 = methods.onUIButtonEvent(fn1);
      methods.onUIButtonEvent(fn2);

      unsub1();

      for (const cb of cbs.uiButton) {
        cb("button_pressed", "start-btn");
      }

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalledWith("button_pressed", "start-btn");
    });
  });
});
