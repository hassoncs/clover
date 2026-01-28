import type { BodyId, ColliderId } from '../physics2d/types';
import type {
  GameEntity,
  TransformComponent,
  SpriteComponent,
  PhysicsComponent,
  Behavior,
  EntityTemplate,
  EventBus,
  ConditionalBehavior,
  ZoneComponent,
} from '@slopcade/shared';

/**
 * EngineServices - Core primitives available to all game systems.
 * Part of the 5 core engine primitives (Unity-validated architecture).
 */
export interface EngineServices {
  /** System-to-system decoupled communication */
  eventBus: EventBus;
  // Future primitives will be added here:
  // entityManager: EntityManager;
  // tagManager: TagManager;
  // clock: Clock;
}

export type MarkedEffect = 'glow' | 'pulse' | 'fade_partial';

export interface PendingLifecycleTransition {
  oldGroupId: number;
  newGroupId: number;
}

export interface RuntimeEntity {
  id: string;
  name: string;
  template?: string;
  // Hierarchy tracking
  /** Parent entity ID (undefined if root entity) */
  parentId?: string;
  /** Child entity IDs */
  children: string[];
  // Dual transforms for hierarchy
  /** Transform relative to parent (or world if no parent) */
  localTransform: TransformComponent;
  /** Computed world transform (cached) */
  worldTransform: TransformComponent;
  transform: TransformComponent;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  zone?: ZoneComponent;
  behaviors: RuntimeBehavior[];
  tags: string[];
  /** Interned tag IDs for O(1) tag operations. Managed by EntityManager. */
  tagBits: Set<number>;
  /** Tag-driven conditional behavior groups */
  conditionalBehaviors: ConditionalBehavior[];
  /** Index of the currently active conditional behavior group (-1 if none) */
  activeConditionalGroupId: number;
  /** Pending lifecycle transition to process in BehaviorExecutor */
  pendingLifecycleTransition?: PendingLifecycleTransition;
  layer: number;
  visible: boolean;
  active: boolean;
  bodyId: BodyId | null;
  colliderId: ColliderId | null;
  assetPackId?: string;
  markedForDestruction?: boolean;
  markedEffect?: MarkedEffect;
  markedColor?: string;
  markedAt?: number;
}

export interface RuntimeBehavior {
  definition: Behavior;
  enabled: boolean;
  state: Record<string, unknown>;
}

export interface EntityManagerOptions {
  templates?: Record<string, EntityTemplate>;
}
