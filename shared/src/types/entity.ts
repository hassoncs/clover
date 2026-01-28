import type { VisualComponent } from './visual';
import type { PhysicsComponent, ZoneComponent } from './physics';
import type { ColliderComponent } from './collider';
import type { CharacterComponent } from './character';
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

export interface ChildEntityDefinition {
  id?: string;
  name: string;
  template: string;
  localTransform: TransformComponent;
  slot?: string;
  visual?: Partial<VisualComponent>;
  physics?: Partial<PhysicsComponent>;
  collider?: Partial<ColliderComponent>;
  character?: Partial<CharacterComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  visible?: boolean;
  assetPackId?: string;
  children?: ChildEntityDefinition[];
}

export interface GameEntity {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;
  visual?: VisualComponent;
  physics?: PhysicsComponent;
  collider?: ColliderComponent;
  character?: CharacterComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  visible?: boolean;
  active?: boolean;
  assetPackId?: string;
  children?: ChildEntityDefinition[];
  type?: 'body' | 'zone';
  zone?: ZoneComponent;
}

export interface SlotDefinition {
  x: number;
  y: number;
  layer?: number;
}

export interface ChildTemplateDefinition {
  name: string;
  template: string;
  localTransform: TransformComponent;
  slot?: string;
  visual?: Partial<VisualComponent>;
  physics?: Partial<PhysicsComponent>;
  collider?: Partial<ColliderComponent>;
  character?: Partial<CharacterComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  children?: ChildTemplateDefinition[];
}

export interface BaseEntityTemplate {
  id: string;
  description?: string;
  visual?: VisualComponent;
  physics?: PhysicsComponent;
  collider?: ColliderComponent;
  character?: CharacterComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  slots?: Record<string, SlotDefinition>;
  children?: ChildTemplateDefinition[];
  type?: 'body' | 'zone';
  zone?: ZoneComponent;
}

export type EntityTemplate = 
  | (BaseEntityTemplate & { type?: 'body'; physics?: PhysicsComponent })
  | (BaseEntityTemplate & { type: 'zone'; zone: ZoneComponent });

export interface BaseEntityDefinition {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;
  visual?: VisualComponent;
  physics?: PhysicsComponent;
  collider?: ColliderComponent;
  character?: CharacterComponent;
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
