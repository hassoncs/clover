/**
 * Unified System Architecture - Core Types
 * 
 * This module defines the interfaces for the unified system runner that will
 * eventually replace ad-hoc system management in GameRuntime.godot.tsx.
 * 
 * Key Design Principles:
 * - All systems (core + plugins) follow a single RuntimeSystem interface
 * - Systems execute in phase order (PRE_UPDATE → GAME_LOGIC → PHYSICS → POST_PHYSICS → VISUAL → CLEANUP)
 * - Inter-system communication via EventQueue with next-frame delivery
 * - Context split: SystemContext (stable services) vs UpdateContext (per-frame snapshot)
 * - Systems are STATELESS between frames - all state must be in TState
 */

import type { SystemPhase } from '@slopcade/shared';
import type { GodotBridge } from '@/lib/godot/types';
import type { Physics2D } from '@/lib/physics2d/Physics2D';
import type { EntityManager } from '../../EntityManager';
import type { EventBus } from '@slopcade/shared';
import type { InputState, GameState, CollisionInfo } from '../../BehaviorContext';
import type { EventQueue } from './EventQueue';
import type { WorldOps } from '@slopcade/shared/types/world-ops';

export type { CollisionInfo };

/**
 * Input event types for the rules engine and scripts.
 * These are discrete events that occur during a frame, as opposed to
 * InputState which represents continuous state (e.g., button held down).
 */
export interface TapInputEvent {
  type: 'tap';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetEntityId?: string;
}

export interface MouseMoveInputEvent {
  type: 'mouse_move';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
}

export interface DragStartInputEvent {
  type: 'drag_start';
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetEntityId?: string;
}

export interface DragEndInputEvent {
  type: 'drag_end';
  velocityX: number;
  velocityY: number;
  worldVelocityX: number;
  worldVelocityY: number;
}

export interface ButtonPressedInputEvent {
  type: 'button_pressed';
  button: string;
}

export interface ButtonReleasedInputEvent {
  type: 'button_released';
  button: string;
}

export interface GameStartedInputEvent {
  type: 'game_started';
}

/**
 * Lifecycle event fired after all systems are initialized but before the Play button is shown.
 * Scripts can use this to set up initial game state (e.g., spawn dynamic entities, initialize level).
 */
export interface GameLoadedInputEvent {
  type: 'game_loaded';
}

export interface MouseLeaveInputEvent {
  type: 'mouse_leave';
}

/**
 * Union of all input event types that can occur during a frame.
 */
export type InputEvent =
  | TapInputEvent
  | MouseMoveInputEvent
  | DragStartInputEvent
  | DragEndInputEvent
  | ButtonPressedInputEvent
  | ButtonReleasedInputEvent
  | GameStartedInputEvent
  | GameLoadedInputEvent
  | MouseLeaveInputEvent;

/**
 * Per-frame data buffers owned by the runner.
 * 
 * These buffers follow a strict producer/consumer contract that all systems must respect:
 * 
 * ┌──────────────┬──────────────────────┬──────────────────────┐
 * │    Phase     │   frame.inputEvents  │   frame.collisions   │
 * ├──────────────┼──────────────────────┼──────────────────────┤
 * │ PRE_UPDATE   │ PRODUCER (write)     │ empty (ignored)      │
 * │ GAME_LOGIC   │ CONSUMER (read)      │ CONSUMER (read)      │
 * │ PHYSICS      │ empty (ignored)      │ PRODUCER (write)     │
 * │ POST_PHYSICS │ CONSUMER (read)      │ CONSUMER (read)      │
 * │ VISUAL       │ CONSUMER (read)      │ CONSUMER (read)      │
 * │ CLEANUP      │ CONSUMER (read)      │ CONSUMER (read)      │
 * └──────────────┴──────────────────────┴──────────────────────┘
 * 
 * BUFFER LIFECYCLE:
 * 1. Runner creates empty buffers at frame start
 * 2. PRE_UPDATE systems append input events (taps, drags, etc.)
 * 3. GAME_LOGIC systems read input events to process player commands
 * 4. PHYSICS systems append collision events during simulation
 * 5. POST_PHYSICS/VISUAL/CLEANUP systems read collisions for effects/rendering
 * 6. Runner resets buffers at the start of the next frame
 * 
 * IMPORTANT:
 * - Producers MUST only append (don't reassign the array)
 * - Consumers MUST NOT mutate (arrays are read-only via `readonly`)
 * - Only the designated phase may write to each buffer
 * - All phases may read from any buffer (but should only read their designated buffers)
 * 
 * @example
 * // PRE_UPDATE system producing input events
 * system.update(ctx) {
 *   if (ctx.input.wasTapped) {
 *     ctx.frame.inputEvents.push({
 *       type: 'tap',
 *       x: ctx.input.touchX,
 *       y: ctx.input.touchY,
 *       worldX: worldX,
 *       worldY: worldY,
 *       targetEntityId: entityId
 *     });
 *   }
 * }
 * 
 * @example
 * // GAME_LOGIC system consuming both buffers
 * system.update(ctx) {
 *   // Process player input
 *   for (const event of ctx.frame.inputEvents) {
 *     if (event.type === 'tap' && event.targetEntityId) {
 *       this.handleEntityTap(event.targetEntityId);
 *     }
 *   }
 *   
 *   // Process collisions (e.g., rules engine)
 *   for (const collision of ctx.frame.collisions) {
 *     this.evaluateRules(collision);
 *   }
 * }
 */
export interface FrameData {
  /**
   * Input events produced during the PRE_UPDATE phase.
   * 
   * PRODUCER: InputSystem (PRE_UPDATE phase)
   * CONSUMERS: GAME_LOGIC, POST_PHYSICS, VISUAL, CLEANUP
   * 
   * Contains discrete input events (taps, drags, button presses) that occurred
   * since the last frame. Populated by InputSystem during PRE_UPDATE.
   */
  readonly inputEvents: InputEvent[];
  
  /**
   * Collision events produced during the PHYSICS phase.
   * 
   * PRODUCER: GameRuntime integration layer (populates before runner.update())
   * CONSUMERS: GAME_LOGIC, POST_PHYSICS, VISUAL, CLEANUP
   * 
   * Contains collision pairs with resolved entity references.
   * Populated by GameRuntime from physics collision callbacks.
   */
  readonly collisions: CollisionInfo[];
}

/**
 * RuntimeSystem - The unified interface that all systems must implement.
 * 
 * This interface wraps existing systems (Match3GameSystem, TweenSystem, etc.)
 * and provides a consistent lifecycle and execution model.
 * 
 * @template TConfig - System configuration type (passed at initialization)
 * @template TState - System state type (must be serializable, returned by getState())
 */
export interface RuntimeSystem<TConfig = unknown, TState = unknown> {
  /** Unique system identifier (e.g., "match3", "tween", "physics") */
  readonly id: string;
  
  /** Execution phase - determines when this system runs in the game loop */
  readonly phase: SystemPhase;
  
  /** Priority within phase - higher values execute first (default: 0) */
  readonly priority: number;
  
  /**
   * Initialize the system with stable services and configuration.
   * Called once when the system is registered, before the first update.
   * 
   * IMPORTANT: This method can be async to support systems like ScriptSandbox
   * and GameProgressManager that need async initialization.
   * 
   * @param ctx - Stable services (bridge, physics, entityManager, etc.)
   * @param config - System-specific configuration
   */
  initialize(ctx: SystemContext, config: TConfig): Promise<void> | void;
  
  /**
   * Update the system for the current frame.
   * Called every frame in phase order.
   * 
   * CRITICAL: Systems must be STATELESS between frames. All state must be
   * stored in TState and returned by getState(). This enables:
   * - Deterministic replay
   * - Save/load
   * - Time travel debugging
   * 
   * @param ctx - Per-frame snapshot (dt, elapsed, frameId, input, gameState)
   * @param state - Current system state (from previous frame or initial state)
   */
  update(ctx: UpdateContext, state: TState): void;
  
  /**
   * Clean up system resources.
   * Called when the game is unloaded or the system is unregistered.
   */
  destroy(): void;
  
  /**
   * Get the current system state.
   * Must return a serializable object that can be passed to update().
   * 
   * @returns Current system state
   */
  getState(): TState;
}

/**
 * SystemContext - Stable services passed to systems at initialization.
 * 
 * These services are long-lived and should not change during gameplay.
 * Systems should store references to these services during initialize()
 * and use them throughout their lifetime.
 */
export interface SystemContext {
  /** Godot bridge for rendering and physics commands */
  bridge: GodotBridge;
  
  /** Physics engine interface */
  physics: Physics2D;
  
  /** Entity manager for spawning/destroying entities */
  entityManager: EntityManager;
  
  /** Event bus for immediate same-frame events */
  eventBus: EventBus;
  
  /** Event queue for next-frame event delivery (prevents same-frame side effects) */
  eventQueue: EventQueue;
  
  /** WorldOps interface for unified entity manipulation (optional for backward compatibility) */
  worldOps?: WorldOps;
}

/**
 * UpdateContext - Per-frame read-only snapshot passed to system update().
 * 
 * This context is created fresh each frame and contains only the data needed
 * for that frame's update. Systems should NOT store references to this context.
 * 
 * IMPORTANT: All fields are read-only to prevent accidental mutations that
 * could cause non-deterministic behavior.
 */
export interface UpdateContext {
  /** Delta time since last frame (in seconds) */
  readonly dt: number;
  
  /** Total elapsed time since game start (in seconds) */
  readonly elapsed: number;
  
  /** Current frame number (starts at 0) */
  readonly frameId: number;
  
  /** Current input state (read-only snapshot) */
  readonly input: Readonly<InputState>;
  
  /** Current game state (score, lives, variables, etc.) */
  readonly gameState: Readonly<GameState>;
  
  /** Per-frame event buffers (collisions, input events) */
  readonly frame: FrameData;
}

/**
 * InputSnapshot - Immutable input state for a single frame.
 * 
 * This is a frozen copy of the input state to prevent systems from
 * accidentally mutating shared input data.
 */
export type InputSnapshot = Readonly<InputState>;
