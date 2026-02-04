/**
 * Type definitions for game runtime scripts.
 * 
 * Scripts are TypeScript files that get bundled into the game definition
 * and executed at runtime in the ScriptSandbox.
 * 
 * Convention: Create a `script.ts` file alongside your `game.ts` to add
 * runtime scripting capabilities to your game.
 */

/**
 * Position in world coordinates.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Velocity vector.
 */
export interface Velocity {
  x: number;
  y: number;
}

/**
 * Entity data returned from queries.
 */
export interface EntityData {
  id: string;
  tags: string[];
  position: Position;
  template?: string;
}

/**
 * Query filter for finding entities.
 */
export interface EntityQuery {
  tag?: string;
  templateId?: string;
}

/**
 * Options when spawning an entity.
 */
export interface SpawnOptions {
  velocity?: Velocity;
  angle?: number;
  data?: Record<string, unknown>;
}

/**
 * Animation configuration for entity movement.
 */
export interface AnimateConfig {
  x?: number;
  y?: number;
  duration: number;
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
}

/**
 * Input event passed to onInput hook.
 */
export interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted';
  position?: Position;
  entityId?: string | null;
  timestamp: number;
}

/**
 * Collision event passed to onCollision hook.
 */
export interface ScriptCollisionEvent {
  entityA: string;
  entityB: string;
  normal: Position;
  impulse: number;
  contactPoint: Position;
  timestamp: number;
}

/**
 * The context object passed to all script functions.
 * Provides access to game state, entities, and utilities.
 */
export interface ScriptContext {
  // ─────────────────────────────────────────────────────────────
  // Variables
  // ─────────────────────────────────────────────────────────────
  
  /** Get a game variable value. */
  getVariable(name: string): unknown;
  
  /** Set a game variable value. */
  setVariable(name: string, value: string | number | boolean): void;

  // ─────────────────────────────────────────────────────────────
  // Entity Management
  // ─────────────────────────────────────────────────────────────
  
  /** Spawn a new entity from a template. Returns the entity ID or null if failed. */
  spawnEntity(templateId: string, position: Position, opts?: SpawnOptions): string | null;
  
  /** Destroy an entity by ID. */
  destroyEntity(entityId: string): void;
  
  /** Get entity position by ID. Returns null if entity doesn't exist. */
  getEntityPosition(entityId: string): Position | null;
  
  /** Set entity position by ID. */
  setEntityPosition(entityId: string, position: Position): void;
  
  /** Get entity velocity by ID. Returns null if entity doesn't exist. */
  getEntityVelocity(entityId: string): Velocity | null;
  
  /** Set entity velocity by ID. */
  setEntityVelocity(entityId: string, velocity: Velocity): void;
  
  /** Apply an impulse to an entity. */
  applyImpulse(entityId: string, impulse: Velocity): void;
  
  /** Get all tags for an entity. */
  getEntityTags(entityId: string): string[];
  
  /** Add a tag to an entity. */
  addTag(entityId: string, tag: string): void;
  
  /** Remove a tag from an entity. Returns true if tag was removed. */
  removeTag(entityId: string, tag: string): boolean;
  
  /** Check if entity has a specific tag. */
  hasTag(entityId: string, tag: string): boolean;
  
  /** Query entities, returns array of entity IDs. */
  queryEntities(query?: EntityQuery): string[];
  
  /** Get full entity data by ID. */
  getEntityData(entityId: string): EntityData | null;
  
  /** Query entities and return full data for each. */
  queryEntitiesWithData(query?: EntityQuery): EntityData[];
  
  /** Animate entity to a position over time. */
  animateEntity(entityId: string, config: AnimateConfig): void;

  // ─────────────────────────────────────────────────────────────
  // Game State
  // ─────────────────────────────────────────────────────────────
  
  /** Emit a game event that can trigger rules. */
  emit(eventName: string, data?: Record<string, unknown>): void;
  
  /** Trigger win state. */
  win(): void;
  
  /** Trigger lose state. */
  lose(): void;
  
  /** Add points to score. */
  addScore(points: number): void;
  
  /** Add lives. */
  addLives(count: number): void;

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  
  /** Get a random number between 0 and 1. */
  random(): number;
  
  /** Get a random integer between min and max (inclusive). */
  randomInt(min: number, max: number): number;
  
  /** Pick a random element from an array. */
  randomChoice<T>(array: readonly T[]): T;
  
  /** Clamp a value between min and max. */
  clamp(value: number, min: number, max: number): number;
  
  /** Linear interpolation between a and b. */
  lerp(a: number, b: number, t: number): number;
  
  /** Calculate distance between two points. */
  distance(a: Position, b: Position): number;

  // ─────────────────────────────────────────────────────────────
  // Frame Info (read-only)
  // ─────────────────────────────────────────────────────────────
  
  /** Current frame number. */
  readonly frameId: number;
  
  /** Time elapsed since game start (seconds). */
  readonly elapsed: number;
  
  /** Delta time since last frame (seconds). */
  readonly dt: number;
}

export type ScriptFunction<TArgs = Record<string, unknown>> = 
  (ctx: ScriptContext, args?: TArgs) => unknown;
