import type { SpriteComponent } from './sprite';
import type { PhysicsComponent } from './physics';
import type { Behavior, ConditionalBehavior } from './behavior';

export interface TransformComponent {
  x: number;
  y: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

export const DEFAULT_TRANSFORM: TransformComponent = {
  x: 0,
  y: 0,
  angle: 0,
  scaleX: 1,
  scaleY: 1,
};

export interface GameEntity {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  /** Tag-driven conditional behavior groups (exclusive by priority) */
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  visible?: boolean;
  active?: boolean;
  assetPackId?: string;
}

export interface SlotDefinition {
  x: number;
  y: number;
  layer?: number;
}

export interface EntityTemplate {
  id: string;
  /** Human-readable description for AI image generation prompts */
  description?: string;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  /** Tag-driven conditional behavior groups (exclusive by priority) */
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  slots?: Record<string, SlotDefinition>;
}
