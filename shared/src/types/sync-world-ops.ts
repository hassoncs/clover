import type { Vec2, Bounds } from './common';
import type {
  WorldEntityData,
  WorldEntityQuery,
  WorldRaycastHit,
  SpawnOptions,
  CloneOptions,
  ReparentOptions,
  RaycastOptions,
} from './world-ops';
import type { HapticStyle, NotificationStyle } from './rules';

/**
 * Synchronous world operations for game scripts.
 * All methods return immediately (no Promises).
 * Used in onStart, onUpdate, onInput, onCollision hooks.
 */
export interface SyncWorldOps {
  // ═══════════════════════════════════════════════════════════════
  // Entity Lifecycle
  // ═══════════════════════════════════════════════════════════════
  spawnEntity(templateId: string, position: Vec2, opts?: SpawnOptions): string | null;
  destroyEntity(entityId: string): void;
  cloneEntity(entityId: string, opts?: CloneOptions): string | null;
  reparentEntity(entityId: string, newParentId: string, opts?: ReparentOptions): void;

  // ═══════════════════════════════════════════════════════════════
  // Transform
  // ═══════════════════════════════════════════════════════════════
  getEntityPosition(entityId: string): Vec2 | null;
  setEntityPosition(entityId: string, position: Vec2): void;
  getEntityRotation(entityId: string): number | null;
  setEntityRotation(entityId: string, angle: number): void;
  getEntityScale(entityId: string): Vec2 | null;
  setEntityScale(entityId: string, scale: Vec2): void;
  setEntityVisible(entityId: string, visible: boolean): void;

  // ═══════════════════════════════════════════════════════════════
  // Physics
  // ═══════════════════════════════════════════════════════════════
  getEntityVelocity(entityId: string): Vec2 | null;
  setEntityVelocity(entityId: string, velocity: Vec2): void;
  getEntityAngularVelocity(entityId: string): number | null;
  setEntityAngularVelocity(entityId: string, velocity: number): void;
  applyImpulse(entityId: string, impulse: Vec2): void;
  applyForce(entityId: string, force: Vec2): void;

  // ═══════════════════════════════════════════════════════════════
  // Entity Metadata
  // ═══════════════════════════════════════════════════════════════
  getEntityTags(entityId: string): string[];
  addTag(entityId: string, tag: string): void;
  removeTag(entityId: string, tag: string): boolean;
  hasTag(entityId: string, tag: string): boolean;
  getEntityTemplate(entityId: string): string | undefined;
  getEntityData(entityId: string): WorldEntityData | null;

  // ═══════════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════════
  queryEntities(query?: WorldEntityQuery): string[];
  queryEntitiesWithData(query?: WorldEntityQuery): WorldEntityData[];
  queryPoint(point: Vec2): string | null;
  queryAABB(min: Vec2, max: Vec2): string[];
  raycast(from: Vec2, to: Vec2, opts?: RaycastOptions): WorldRaycastHit | null;

  // ═══════════════════════════════════════════════════════════════
  // Pixel Buffer
  // ═══════════════════════════════════════════════════════════════
  createPixelBuffer(entityId: string, width: number, height: number, clearColor: string): void;
  pixelBufferDraw(entityId: string, commands: Array<{ type: string; [key: string]: unknown }>): void;
  pixelBufferClear(entityId: string, color: string): void;

  // ═══════════════════════════════════════════════════════════════
  // Game State
  // ═══════════════════════════════════════════════════════════════
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getConstant(name: string): unknown;
  emit(eventName: string, data?: Record<string, unknown>): void;
  win(): void;
  lose(): void;

  // ═══════════════════════════════════════════════════════════════
  // Haptics
  // ═══════════════════════════════════════════════════════════════
  haptic(style?: HapticStyle): void;
  hapticNotification(style?: NotificationStyle): void;
  hapticSelection(): void;
}
