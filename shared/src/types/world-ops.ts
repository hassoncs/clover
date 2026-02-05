import type { Vec2, Bounds } from './common';

export interface SpawnOptions {
  velocity?: Vec2;
  angle?: number;
  tags?: string[];
  parentId?: string;
}

export interface CloneOptions {
  position?: Vec2;
  withChildren?: boolean;
}

export interface ReparentOptions {
  keepGlobalTransform?: boolean;
}

export interface WorldEntityData {
  id: string;
  template?: string;
  tags: string[];
  position: Vec2;
  rotation: number;
  scale: Vec2;
  velocity?: Vec2;
  angularVelocity?: number;
}

export interface WorldEntityQuery {
  tag?: string;
  templateId?: string;
  inAABB?: Bounds;
}

export interface RaycastOptions {
  mask?: number;
  excludeEntityId?: string;
  includeSensors?: boolean;
}

export interface RaycastHit {
  entityId: string;
  point: Vec2;
  normal: Vec2;
  distance: number;
}

export interface AnimateTarget {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
}

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad';

export interface AnimateOptions {
  duration: number;
  easing?: EasingFunction;
}

export interface WaitOptions {
  /** Use real time instead of game time (unaffected by pause/timeScale). Default: false. */
  realtime?: boolean;
}

export interface SequenceHandle {
  readonly name: string;
  readonly isRunning: boolean;
  cancel(): void;
}

export interface WorldOps {
  // --- Entity Lifecycle ---
  spawn(templateId: string, position: Vec2, opts?: SpawnOptions): Promise<string | null>;
  destroy(entityId: string): Promise<void>;
  clone(entityId: string, opts?: CloneOptions): Promise<string | null>;
  reparent(entityId: string, newParentId: string, opts?: ReparentOptions): Promise<void>;

  // --- Transform ---
  getPosition(entityId: string): Promise<Vec2 | null>;
  setPosition(entityId: string, position: Vec2): Promise<void>;
  getRotation(entityId: string): Promise<number | null>;
  setRotation(entityId: string, angle: number): Promise<void>;
  getScale(entityId: string): Promise<Vec2 | null>;
  setScale(entityId: string, scale: Vec2): Promise<void>;
  setVisible(entityId: string, visible: boolean): Promise<void>;

  // --- Physics ---
  getVelocity(entityId: string): Promise<Vec2 | null>;
  setVelocity(entityId: string, velocity: Vec2): Promise<void>;
  getAngularVelocity(entityId: string): Promise<number | null>;
  setAngularVelocity(entityId: string, velocity: number): Promise<void>;
  applyImpulse(entityId: string, impulse: Vec2): Promise<void>;
  applyForce(entityId: string, force: Vec2): Promise<void>;

  // --- Entity Metadata ---
  getTags(entityId: string): Promise<string[]>;
  addTag(entityId: string, tag: string): Promise<void>;
  removeTag(entityId: string, tag: string): Promise<boolean>;
  hasTag(entityId: string, tag: string): Promise<boolean>;
  getTemplate(entityId: string): Promise<string | undefined>;
  getEntityData(entityId: string): Promise<WorldEntityData | null>;

  // --- Queries ---
  queryEntities(query?: WorldEntityQuery): Promise<string[]>;
  queryEntitiesWithData(query?: WorldEntityQuery): Promise<WorldEntityData[]>;
  queryPoint(point: Vec2): Promise<string | null>;
  queryAABB(min: Vec2, max: Vec2): Promise<string[]>;
  raycast(from: Vec2, to: Vec2, opts?: RaycastOptions): Promise<RaycastHit | null>;

  // --- Game State ---
  getVariable(name: string): Promise<unknown>;
  setVariable(name: string, value: unknown): Promise<void>;
  getConstant(name: string): Promise<unknown>;
  emit(eventName: string, data?: Record<string, unknown>): Promise<void>;
  win(): Promise<void>;
  lose(): Promise<void>;

  // --- Animation / Timing (multi-frame, coroutine-safe) ---
  animate(entityId: string, target: AnimateTarget, opts: AnimateOptions): Promise<void>;
  wait(ms: number, opts?: WaitOptions): Promise<void>;
}
