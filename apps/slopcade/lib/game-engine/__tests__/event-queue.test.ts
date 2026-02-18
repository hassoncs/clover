import { describe, it, expect, vi } from 'vitest';
import {
  GameEventQueue,
  isLifecycleEvent,
  isInputEvent,
  isPhysicsEvent,
} from '../GameEventQueue';
import type {
  GameLoadedEvent,
  GameStartedEvent,
  TapEvent,
  DragStartEvent,
  DragEndEvent,
  MouseMoveEvent,
  MouseLeaveEvent,
  ButtonPressedEvent,
  ButtonReleasedEvent,
  CollisionEvent,
  SensorBeginEvent,
  SensorEndEvent,
} from '../GameEventQueue';

describe('GameEventQueue', () => {
  describe('push/drain/peek basics', () => {
    it('should push events to the queue', () => {
      const queue = new GameEventQueue();
      const event: GameLoadedEvent = { type: 'game_loaded' };

      queue.push(event);

      expect(queue.length).toBe(1);
    });

    it('should peek at events without removing them', () => {
      const queue = new GameEventQueue();
      const event: GameLoadedEvent = { type: 'game_loaded' };

      queue.push(event);
      const peeked = queue.peek();

      expect(peeked).toHaveLength(1);
      expect(peeked[0]).toEqual(event);
      expect(queue.length).toBe(1);
    });

    it('should drain all events and empty the queue', () => {
      const queue = new GameEventQueue();
      const event1: GameLoadedEvent = { type: 'game_loaded' };
      const event2: GameStartedEvent = { type: 'game_started' };

      queue.push(event1);
      queue.push(event2);
      const drained = queue.drain();

      expect(drained).toHaveLength(2);
      expect(drained[0]).toEqual(event1);
      expect(drained[1]).toEqual(event2);
      expect(queue.length).toBe(0);
    });

    it('should return empty array when draining empty queue', () => {
      const queue = new GameEventQueue();

      const drained = queue.drain();

      expect(drained).toEqual([]);
      expect(queue.length).toBe(0);
    });
  });

  describe('onEventQueued callback', () => {
    it('should fire callback when event is pushed', () => {
      const queue = new GameEventQueue();
      const callback = vi.fn();

      queue.setOnEventQueued(callback);
      queue.push({ type: 'game_loaded' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should fire callback for each push', () => {
      const queue = new GameEventQueue();
      const callback = vi.fn();

      queue.setOnEventQueued(callback);
      queue.push({ type: 'game_loaded' });
      queue.push({ type: 'game_started' });
      queue.push({ type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 });

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should not fire callback after being drained', () => {
      const queue = new GameEventQueue();
      const callback = vi.fn();

      queue.setOnEventQueued(callback);
      queue.push({ type: 'game_loaded' });
      queue.drain();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('array swap behavior', () => {
    it('should use array swap for O(1) drain operation', () => {
      const queue = new GameEventQueue();
      const event1: GameLoadedEvent = { type: 'game_loaded' };
      const event2: GameStartedEvent = { type: 'game_started' };

      queue.push(event1);
      queue.push(event2);

      const firstDrain = queue.drain();
      const secondDrain = queue.drain();

      expect(firstDrain).toHaveLength(2);
      expect(secondDrain).toHaveLength(0);
    });

    it('should allow new events after drain', () => {
      const queue = new GameEventQueue();

      queue.push({ type: 'game_loaded' });
      queue.drain();

      queue.push({ type: 'game_started' });

      expect(queue.length).toBe(1);
      expect(queue.peek()[0].type).toBe('game_started');
    });
  });

  describe('rapid pushes', () => {
    it('should capture all events during rapid pushes', () => {
      const queue = new GameEventQueue();
      const eventCount = 100;

      for (let i = 0; i < eventCount; i++) {
        queue.push({
          type: 'tap',
          x: i,
          y: i * 2,
          worldX: i * 10,
          worldY: i * 20,
        });
      }

      const drained = queue.drain();

      expect(drained).toHaveLength(eventCount);
      drained.forEach((event, index) => {
        expect(event.type).toBe('tap');
        expect((event as TapEvent).x).toBe(index);
      });
    });

    it('should handle mixed event types during rapid pushes', () => {
      const queue = new GameEventQueue();

      queue.push({ type: 'game_loaded' });
      queue.push({ type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 });
      queue.push({ type: 'collision', entityA: 'a', entityB: 'b', normal: { x: 0, y: 1 }, impulse: 5 });
      queue.push({ type: 'drag_start', x: 0, y: 0, worldX: 0, worldY: 0 });
      queue.push({ type: 'sensor_begin', sensorEntityId: 's1', otherEntityId: 'o1' });

      const drained = queue.drain();

      expect(drained).toHaveLength(5);
      expect(drained[0].type).toBe('game_loaded');
      expect(drained[1].type).toBe('tap');
      expect(drained[2].type).toBe('collision');
      expect(drained[3].type).toBe('drag_start');
      expect(drained[4].type).toBe('sensor_begin');
    });
  });

  describe('type guards', () => {
    describe('isLifecycleEvent', () => {
      it('should return true for game_loaded event', () => {
        const event: GameLoadedEvent = { type: 'game_loaded' };
        expect(isLifecycleEvent(event)).toBe(true);
      });

      it('should return true for game_started event', () => {
        const event: GameStartedEvent = { type: 'game_started' };
        expect(isLifecycleEvent(event)).toBe(true);
      });

      it('should return false for input events', () => {
        const event: TapEvent = { type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 };
        expect(isLifecycleEvent(event)).toBe(false);
      });

      it('should return false for physics events', () => {
        const event: CollisionEvent = {
          type: 'collision',
          entityA: 'a',
          entityB: 'b',
          normal: { x: 0, y: 1 },
          impulse: 5,
        };
        expect(isLifecycleEvent(event)).toBe(false);
      });
    });

    describe('isInputEvent', () => {
      it('should return true for tap event', () => {
        const event: TapEvent = { type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for drag_start event', () => {
        const event: DragStartEvent = { type: 'drag_start', x: 0, y: 0, worldX: 0, worldY: 0 };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for drag_end event', () => {
        const event: DragEndEvent = {
          type: 'drag_end',
          velocityX: 0,
          velocityY: 0,
          worldVelocityX: 0,
          worldVelocityY: 0,
        };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for mouse_move event', () => {
        const event: MouseMoveEvent = { type: 'mouse_move', x: 0, y: 0, worldX: 0, worldY: 0 };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for mouse_leave event', () => {
        const event: MouseLeaveEvent = { type: 'mouse_leave' };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for button_pressed event', () => {
        const event: ButtonPressedEvent = { type: 'button_pressed', button: 'jump' };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return true for button_released event', () => {
        const event: ButtonReleasedEvent = { type: 'button_released', button: 'jump' };
        expect(isInputEvent(event)).toBe(true);
      });

      it('should return false for lifecycle events', () => {
        const event: GameLoadedEvent = { type: 'game_loaded' };
        expect(isInputEvent(event)).toBe(false);
      });

      it('should return false for physics events', () => {
        const event: CollisionEvent = {
          type: 'collision',
          entityA: 'a',
          entityB: 'b',
          normal: { x: 0, y: 1 },
          impulse: 5,
        };
        expect(isInputEvent(event)).toBe(false);
      });
    });

    describe('isPhysicsEvent', () => {
      it('should return true for collision event', () => {
        const event: CollisionEvent = {
          type: 'collision',
          entityA: 'a',
          entityB: 'b',
          normal: { x: 0, y: 1 },
          impulse: 5,
        };
        expect(isPhysicsEvent(event)).toBe(true);
      });

      it('should return true for sensor_begin event', () => {
        const event: SensorBeginEvent = { type: 'sensor_begin', sensorEntityId: 's1', otherEntityId: 'o1' };
        expect(isPhysicsEvent(event)).toBe(true);
      });

      it('should return true for sensor_end event', () => {
        const event: SensorEndEvent = { type: 'sensor_end', sensorEntityId: 's1', otherEntityId: 'o1' };
        expect(isPhysicsEvent(event)).toBe(true);
      });

      it('should return false for lifecycle events', () => {
        const event: GameLoadedEvent = { type: 'game_loaded' };
        expect(isPhysicsEvent(event)).toBe(false);
      });

      it('should return false for input events', () => {
        const event: TapEvent = { type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 };
        expect(isPhysicsEvent(event)).toBe(false);
      });
    });
  });
});
