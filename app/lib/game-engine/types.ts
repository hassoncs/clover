import type { BodyId, ColliderId } from '../physics2d/types';
import type {
  GameEntity,
  TransformComponent,
  SpriteComponent,
  PhysicsComponent,
  Behavior,
  EntityTemplate,
} from '@slopcade/shared';

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
