import type { InputEvents } from '@/lib/game-engine/BehaviorContext';

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

export interface ScriptContext {
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getConstant(name: string): number | string | boolean | undefined;
  emit(eventName: string, data?: Record<string, unknown>): void;
  win(): void;
  lose(): void;
  spawnEntity(templateId: string, position: { x: number; y: number }, opts?: SpawnOptions): string | null;
  destroyEntity(entityId: string): void;
  getEntityPosition(entityId: string): { x: number; y: number } | null;
  setEntityPosition(entityId: string, position: { x: number; y: number }): void;
  getEntityVelocity(entityId: string): { x: number; y: number } | null;
  setEntityVelocity(entityId: string, velocity: { x: number; y: number }): void;
  applyImpulse(entityId: string, impulse: { x: number; y: number }): void;
  getEntityTags(entityId: string): string[];
  addTag(entityId: string, tag: string): void;
  removeTag(entityId: string, tag: string): boolean;
  hasTag(entityId: string, tag: string): boolean;
  queryEntities(query?: EntityQuery): string[];
  getInput(): InputSnapshot | null;
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: readonly T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: { x: number; y: number }, b: { x: number; y: number }): number;
  readonly frameId: number;
  readonly elapsed: number;
  readonly dt: number;
}

export interface SpawnOptions {
  velocity?: { x: number; y: number };
  angle?: number;
  data?: Record<string, unknown>;
}

export interface EntityQuery {
  tag?: string;
  templateId?: string;
  inAabb?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface InputSnapshot {
  type: keyof InputEvents;
  position?: { x: number; y: number };
  entityId?: string | null;
  timestamp: number;
}

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

export interface SandboxRuntimeContext {
  entityManager: {
    spawnEntity(templateId: string, position: { x: number; y: number }, opts?: SpawnOptions): string | null;
    destroyEntity(entityId: string): void;
    getEntityPosition(entityId: string): { x: number; y: number } | null;
    setEntityPosition(entityId: string, position: { x: number; y: number }): void;
    getEntityVelocity(entityId: string): { x: number; y: number } | null;
    setEntityVelocity(entityId: string, velocity: { x: number; y: number }): void;
    applyImpulse(entityId: string, impulse: { x: number; y: number }): void;
    getEntityTags(entityId: string): string[];
    addTag(entityId: string, tag: string): void;
    removeTag(entityId: string, tag: string): boolean;
    hasTag(entityId: string, tag: string): boolean;
    queryEntities(query?: EntityQuery): string[];
  };
  rulesEvaluator: {
    getVariable(name: string): unknown;
    setVariable(name: string, value: unknown): void;
    getConstant(name: string): number | string | boolean | undefined;
    emitEvent(eventName: string, data?: Record<string, unknown>): void;
    win(): void;
    lose(): void;
  };
  inputSnapshot: InputSnapshot | null;
  frameInfo: {
    frameId: number;
    elapsed: number;
    dt: number;
  };
  constants?: Record<string, number | string | boolean>;
}

export interface ScriptSandboxConfig {
  scriptCode: string;
  scriptId: string;
  budget?: Partial<ScriptBudgetConfig>;
  gameId: string;
}
