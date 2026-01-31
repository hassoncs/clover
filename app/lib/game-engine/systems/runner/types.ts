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
import type { InputState, GameState } from '../../BehaviorContext';
import type { EventQueue } from './EventQueue';

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
}

/**
 * InputSnapshot - Immutable input state for a single frame.
 * 
 * This is a frozen copy of the input state to prevent systems from
 * accidentally mutating shared input data.
 */
export type InputSnapshot = Readonly<InputState>;
