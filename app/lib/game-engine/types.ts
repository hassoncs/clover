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

export interface RuntimeEntity {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors: RuntimeBehavior[];
  tags: string[];
  /** Interned tag IDs for O(1) tag operations. Managed by EntityManager. */
  tagBits: Set<number>;
  /** Tag-driven conditional behavior groups */
  conditionalBehaviors: ConditionalBehavior[];
  /** Index of the currently active conditional behavior group (-1 if none) */
  activeConditionalGroupId: number;
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
