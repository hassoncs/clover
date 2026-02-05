import type { InputEvents } from '@/lib/game-engine/BehaviorContext';
import type { WorldOps, SequenceHandle, WorldEntityQuery, WorldEntityData } from '@slopcade/shared/types/world-ops';
import type { Vec2 } from '@slopcade/shared/types/common';

export interface ScriptBudgetConfig {
  maxExecutionTimeMs: number;
  loadTimeoutMs: number;
  maxInstructions: number;
  maxMemoryBytes: number;
}

export const DEFAULT_SCRIPT_BUDGET: ScriptBudgetConfig = {
  maxExecutionTimeMs: 2,
  loadTimeoutMs: 5000,
  maxInstructions: 100_000,
  maxMemoryBytes: 1 * 1024 * 1024,
};

export interface DragSnapshot {
  isDragging: boolean;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  entityId: string | null;
}

/**
 * ScriptContext with sync reads + WorldOps for writes + startSequence for multi-frame work.
 * This is the canonical interface for script hooks.
 */
export interface ScriptContext {
  // ═══════════════════════════════════════════════════════════════
  // SYNC READS — from frame cache, safe in onUpdate
  // ═══════════════════════════════════════════════════════════════
  getPosition(entityId: string): Vec2 | null;
  getVelocity(entityId: string): Vec2 | null;
  getRotation(entityId: string): number | null;
  getTags(entityId: string): string[];
  hasTag(entityId: string, tag: string): boolean;
  getTemplate(entityId: string): string | undefined;
  getVariable(name: string): unknown;
  getConstant(name: string): number | string | boolean | undefined;
  queryEntities(query?: WorldEntityQuery): string[];
  getEntityData(entityId: string): WorldEntityData | null;
  queryEntitiesWithData(query?: WorldEntityQuery): WorldEntityData[];

  // ═══════════════════════════════════════════════════════════════
  // ASYNC WORLD OPS — full API, for writes + animations + sequences
  // ═══════════════════════════════════════════════════════════════
  world: WorldOps;

  // ═══════════════════════════════════════════════════════════════
  // SEQUENCE MANAGEMENT — bridge from sync onUpdate to async work
  // ═══════════════════════════════════════════════════════════════
  startSequence(name: string, fn: (world: WorldOps) => Promise<void>): SequenceHandle;
  isSequenceRunning(name: string): boolean;
  cancelSequence(name: string): void;

  // ═══════════════════════════════════════════════════════════════
  // FRAME INFO + INPUT (sync, per-frame)
  // ═══════════════════════════════════════════════════════════════
  readonly dt: number;
  readonly elapsed: number;
  readonly frameId: number;
  input: InputSnapshot | null;
  mouse: Vec2 | null;
  drag: DragSnapshot | null;

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES (sync, pure functions)
  // ═══════════════════════════════════════════════════════════════
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: readonly T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Vec2, b: Vec2): number;
}

export interface InputSnapshot {
  type: keyof InputEvents;
  position?: { x: number; y: number };
  entityId?: string | null;
  timestamp: number;
}

/**
 * Script lifecycle exports.
 * All hooks return void — no async hooks allowed.
 */
export interface ScriptLifecycleExports {
  onStart?(ctx: ScriptContext): void;
  onUpdate?(ctx: ScriptContext, dt: number): void;
  onInput?(ctx: ScriptContext, event: ScriptInputEvent): void;
  onCollision?(ctx: ScriptContext, collision: ScriptCollisionEvent): void;
}

export interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted';
  position?: { x: number; y: number };
  entityId?: string | null;
  timestamp: number;
}

export interface ScriptCollisionEvent {
  entityA: string;
  entityB: string;
  normal: { x: number; y: number };
  impulse: number;
  contactPoint: { x: number; y: number };
  timestamp: number;
}

export type ScriptErrorType = 'syntax' | 'runtime' | 'timeout' | 'memory' | 'unknown';

export interface ScriptErrorReport {
  message: string;
  type: ScriptErrorType;
  stack?: string;
  phase: 'load' | 'start' | 'update' | 'input' | 'collision';
  hookName?: string;
  frameId: number;
  timestamp: number;
}

export interface ScriptResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: ScriptErrorReport;
}

export interface ScriptSandboxConfig {
  scriptCode: string;
  scriptId: string;
  budget?: Partial<ScriptBudgetConfig>;
  gameId: string;
}
