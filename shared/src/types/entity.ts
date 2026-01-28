import type { SpriteComponent } from './sprite';
import type { PhysicsComponent, ZoneComponent } from './physics';
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

/**
 * Definition for a child entity nested within a parent
 */
export interface ChildEntityDefinition {
  /** Optional - auto-generated as {parentId}_{name} if omitted */
  id?: string;
  /** Name of the child entity */
  name: string;
  /** Template to instantiate */
  template: string;
  /** Transform relative to parent */
  localTransform: TransformComponent;
  /** Reference to parent's slot for coordinates (optional) */
  slot?: string;
  
  /** Optional overrides */
  sprite?: Partial<SpriteComponent>;
  physics?: Partial<PhysicsComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  visible?: boolean;
  assetPackId?: string;
  
  /** Recursive nesting */
  children?: ChildEntityDefinition[];
}

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
  /** Nested child entities */
  children?: ChildEntityDefinition[];
}

export interface SlotDefinition {
  x: number;
  y: number;
  layer?: number;
}

/**
 * Definition for a child entity within a template (prefab pattern)
 */
export interface ChildTemplateDefinition {
  /** Name of the child */
  name: string;
  /** Template to instantiate */
  template: string;
  /** Transform relative to parent */
  localTransform: TransformComponent;
  /** Reference to parent's slot for coordinates (optional) */
  slot?: string;
  
  /** Optional overrides */
  sprite?: Partial<SpriteComponent>;
  physics?: Partial<PhysicsComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  
  /** Recursive nesting */
  children?: ChildTemplateDefinition[];
}

export interface BaseEntityTemplate {
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
  /** Template-level children (part of prefab) */
  children?: ChildTemplateDefinition[];
  /** Explicit type annotation - inferred from presence of physics vs zone */
  type?: 'body' | 'zone';
  /** Zone configuration (only for zone type entities) */
  zone?: ZoneComponent;
}

export type EntityTemplate = 
  | (BaseEntityTemplate & { type?: 'body'; physics?: PhysicsComponent })
  | (BaseEntityTemplate & { type: 'zone'; zone: ZoneComponent });

// ============================================================================
// Entity Definitions for Zone Types
// ============================================================================

export interface BaseEntityDefinition {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;
  sprite?: SpriteComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  visible?: boolean;
  active?: boolean;
  assetPackId?: string;
  children?: ChildEntityDefinition[];
}

export interface BodyEntityDefinition extends BaseEntityDefinition {
  type: 'body';
  physics: PhysicsComponent;
}

export { ZoneEntityDefinition } from './physics';
