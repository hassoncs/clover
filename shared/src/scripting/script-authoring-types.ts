export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface EntityData {
  id: string;
  tags: string[];
  position: Position;
  template?: string;
}

export interface EntityQuery {
  tag?: string;
  templateId?: string;
}

export interface SpawnOptions {
  velocity?: Velocity;
  angle?: number;
  data?: Record<string, unknown>;
}

export interface AnimateConfig {
  x?: number;
  y?: number;
  duration: number;
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
}

export interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted';
  position?: Position;
  entityId?: string | null;
  timestamp: number;
}

export interface ScriptCollisionEvent {
  entityA: string;
  entityB: string;
  normal: Position;
  impulse: number;
  contactPoint: Position;
  timestamp: number;
}

export interface ScriptContext {
  // ─────────────────────────────────────────────────────────────
  // Variables
  // ─────────────────────────────────────────────────────────────

  getVariable(name: string): unknown;
  setVariable(name: string, value: string | number | boolean): void;

  // ─────────────────────────────────────────────────────────────
  // Entity Management
  // ─────────────────────────────────────────────────────────────

  spawnEntity(templateId: string, position: Position, opts?: SpawnOptions): string | null;
  destroyEntity(entityId: string): void;
  getEntityPosition(entityId: string): Position | null;
  setEntityPosition(entityId: string, position: Position): void;
  getEntityVelocity(entityId: string): Velocity | null;
  setEntityVelocity(entityId: string, velocity: Velocity): void;
  applyImpulse(entityId: string, impulse: Velocity): void;
  getEntityTags(entityId: string): string[];
  addTag(entityId: string, tag: string): void;
  removeTag(entityId: string, tag: string): boolean;
  hasTag(entityId: string, tag: string): boolean;
  queryEntities(query?: EntityQuery): string[];
  getEntityData(entityId: string): EntityData | null;
  queryEntitiesWithData(query?: EntityQuery): EntityData[];
  animateEntity(entityId: string, config: AnimateConfig): void;

  // ─────────────────────────────────────────────────────────────
  // Game State
  // ─────────────────────────────────────────────────────────────

  emit(eventName: string, data?: Record<string, unknown>): void;
  win(): void;
  lose(): void;
  addScore(points: number): void;
  addLives(count: number): void;

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: readonly T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Position, b: Position): number;

  // ─────────────────────────────────────────────────────────────
  // Frame Info (read-only)
  // ─────────────────────────────────────────────────────────────

  readonly frameId: number;
  readonly elapsed: number;
  readonly dt: number;
}

export type ScriptFunction<TArgs = Record<string, unknown>> =
  (ctx: ScriptContext, args?: TArgs) => unknown;
