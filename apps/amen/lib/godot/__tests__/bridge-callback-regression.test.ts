import { describe, it, expect, vi } from "vitest";
import {
  createCallbackArrays,
  createCallbackMethods,
  clearAllCallbacks,
} from "../callback-registry";

describe("bridge callback regression tests", () => {
  describe("callback functions survive registration lifecycle", () => {
    it("onInputEvent callback is invoked with correct args after registration", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      methods.onInputEvent(fn);

      for (const cb of cbs.inputEvent) {
        cb("drag_start", 0.5, 0.3, "canvas");
      }

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith("drag_start", 0.5, 0.3, "canvas");
    });

    it("callback reference identity is preserved (not stringified/cloned)", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const fn = vi.fn();

      methods.onInputEvent(fn);

      expect(cbs.inputEvent[0]).toBe(fn);
    });

    it("multiple event callbacks coexist independently", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);

      const collisionFn = vi.fn();
      const inputFn = vi.fn();
      const destroyFn = vi.fn();

      methods.onCollision(collisionFn);
      methods.onInputEvent(inputFn);
      methods.onEntityDestroyed(destroyFn);

      expect(cbs.collision).toHaveLength(1);
      expect(cbs.inputEvent).toHaveLength(1);
      expect(cbs.destroy).toHaveLength(1);

      for (const cb of cbs.inputEvent) {
        cb("tap", 0.5, 0.5, null);
      }

      expect(inputFn).toHaveBeenCalledOnce();
      expect(collisionFn).not.toHaveBeenCalled();
      expect(destroyFn).not.toHaveBeenCalled();
    });
  });

  describe("callback re-registration after clear", () => {
    it("callbacks work after clearAllCallbacks + re-register", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);

      const fn1 = vi.fn();
      methods.onInputEvent(fn1);
      expect(cbs.inputEvent).toHaveLength(1);

      clearAllCallbacks(cbs);
      expect(cbs.inputEvent).toHaveLength(0);

      // Re-register (new callback)
      const fn2 = vi.fn();
      methods.onInputEvent(fn2);
      expect(cbs.inputEvent).toHaveLength(1);

      // New callback works
      for (const cb of cbs.inputEvent) {
        cb("drag_move", 0.6, 0.4, "canvas");
      }

      expect(fn2).toHaveBeenCalledWith("drag_move", 0.6, 0.4, "canvas");
      expect(fn1).not.toHaveBeenCalled();
    });

    it("old unsubscribe functions are safe to call after clear", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);

      const fn = vi.fn();
      const unsub = methods.onInputEvent(fn);

      clearAllCallbacks(cbs);

      // Old unsubscribe should not throw
      expect(() => unsub()).not.toThrow();
      expect(cbs.inputEvent).toHaveLength(0);
    });
  });

  describe("input event flow for paint example", () => {
    it("drag sequence delivers all events in order", () => {
      const cbs = createCallbackArrays();
      const methods = createCallbackMethods(cbs);
      const events: Array<{ type: string; x: number; y: number }> = [];

      methods.onInputEvent((type, x, y) => {
        events.push({ type, x, y });
      });

      // Simulate a paint stroke: drag_start → drag_move → drag_move → drag_end
      const sequence = [
        { type: "drag_start", x: 0.1, y: 0.2 },
        { type: "drag_move", x: 0.15, y: 0.25 },
        { type: "drag_move", x: 0.2, y: 0.3 },
        { type: "drag_end", x: 0.2, y: 0.3 },
      ];

      for (const event of sequence) {
        for (const cb of cbs.inputEvent) {
          cb(event.type, event.x, event.y, "canvas");
        }
      }

      expect(events).toHaveLength(4);
      expect(events[0].type).toBe("drag_start");
      expect(events[3].type).toBe("drag_end");
      expect(events[1].x).toBe(0.15);
    });
  });
});
