import type { Vec2 } from './physics2d/types';

/**
 * Unified GameEvent type - all events flow through a single queue
 *
 * This replaces the fragmented event system where lifecycle, input, and physics
 * events were handled through separate refs (pendingLifecycleEventsRef, inputRef, collisionsRef).
 *
 * Event categories:
 * - Lifecycle: game_loaded, game_started
 * - Input: tap, drag_start, drag_end, mouse_move, mouse_leave, button_pressed, button_released
 * - Physics: collision, sensor_begin, sensor_end
 */

// Lifecycle events
export interface GameLoadedEvent {
  type: 'game_loaded';
}

export interface GameStartedEvent {
  type: 'game_started';
}

// Input events
export interface TapEvent {
  type: 'tap';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetEntityId?: string;
}

export interface DragStartEvent {
  type: 'drag_start';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetEntityId?: string;
}

export interface DragEndEvent {
  type: 'drag_end';
  velocityX: number;
  velocityY: number;
  worldVelocityX: number;
  worldVelocityY: number;
}

export interface MouseMoveEvent {
  type: 'mouse_move';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
}

export interface MouseLeaveEvent {
  type: 'mouse_leave';
}

export interface ButtonPressedEvent {
  type: 'button_pressed';
  button: string;
}

export interface ButtonReleasedEvent {
  type: 'button_released';
  button: string;
}

// Physics events
export interface CollisionEvent {
  type: 'collision';
  entityA: string;
  entityB: string;
  normal: Vec2;
  impulse: number;
}

export interface SensorBeginEvent {
  type: 'sensor_begin';
  sensorEntityId: string;
  otherEntityId: string;
}

export interface SensorEndEvent {
  type: 'sensor_end';
  sensorEntityId: string;
  otherEntityId: string;
}

/**
 * Union of all game event types
 */
export type GameEvent =
  // Lifecycle
  | GameLoadedEvent
  | GameStartedEvent
  // Input
  | TapEvent
  | DragStartEvent
  | DragEndEvent
  | MouseMoveEvent
  | MouseLeaveEvent
  | ButtonPressedEvent
  | ButtonReleasedEvent
  // Physics
  | CollisionEvent
  | SensorBeginEvent
  | SensorEndEvent;

/**
 * Type guard to check if an event is a lifecycle event
 */
export function isLifecycleEvent(event: GameEvent): event is GameLoadedEvent | GameStartedEvent {
  return event.type === 'game_loaded' || event.type === 'game_started';
}

/**
 * Type guard to check if an event is an input event
 */
export function isInputEvent(event: GameEvent): event is
  | TapEvent
  | DragStartEvent
  | DragEndEvent
  | MouseMoveEvent
  | MouseLeaveEvent
  | ButtonPressedEvent
  | ButtonReleasedEvent {
  return (
    event.type === 'tap' ||
    event.type === 'drag_start' ||
    event.type === 'drag_end' ||
    event.type === 'mouse_move' ||
    event.type === 'mouse_leave' ||
    event.type === 'button_pressed' ||
    event.type === 'button_released'
  );
}

/**
 * Type guard to check if an event is a physics event
 */
export function isPhysicsEvent(event: GameEvent): event is CollisionEvent | SensorBeginEvent | SensorEndEvent {
  return event.type === 'collision' || event.type === 'sensor_begin' || event.type === 'sensor_end';
}

/**
 * Unified event queue for all game events.
 *
 * Replaces the scattered refs:
 * - pendingLifecycleEventsRef (lifecycle events)
 * - collisionsRef (collision events)
 * - inputRef discrete events (tap, drag_end)
 *
 * Continuous state (button held, drag position, mouse position, tilt)
 * remains in inputRef since it's polled every frame, not event-driven.
 */
export class GameEventQueue {
  private queue: GameEvent[] = [];
  private onEventQueued?: () => void;

  /**
   * Push an event to the queue.
   * Triggers the onEventQueued callback if set.
   */
  push(event: GameEvent): void {
    this.queue.push(event);
    this.onEventQueued?.();
  }

  /**
   * Drain all events from the queue.
   * Uses array swap for O(1) operation - no copying.
   * Returns the drained events and resets the queue to empty.
   */
  drain(): GameEvent[] {
    const events = this.queue;
    this.queue = [];
    return events;
  }

  /**
   * Peek at the current queue without draining.
   * Returns a readonly view of the queued events.
   */
  peek(): readonly GameEvent[] {
    return this.queue;
  }

  /**
   * Get the current number of events in the queue.
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Set a callback to be invoked whenever an event is queued.
   * Used for auto-advance in inspector mode.
   */
  setOnEventQueued(callback: () => void): void {
    this.onEventQueued = callback;
  }
}
