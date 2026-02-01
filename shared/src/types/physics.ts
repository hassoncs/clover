import type { Vec2 } from './common';

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';

export interface PhysicsComponent {
  bodyType: PhysicsBodyType;
  density?: number;
  mass?: number;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  ccd?: boolean;
  initialVelocity?: Vec2;
  initialAngularVelocity?: number;
}

export type ColliderShape = 'box' | 'circle' | 'polygon' | 'capsule';

export type CoefficientCombineRule = 'average' | 'min' | 'multiply' | 'max';

interface BaseColliderComponent {
  shape: ColliderShape;
  friction?: number;
  restitution?: number;
  frictionCombine?: CoefficientCombineRule;
  restitutionCombine?: CoefficientCombineRule;
  isSensor?: boolean;
}

export interface BoxColliderComponent extends BaseColliderComponent {
  shape: 'box';
  width: number;
  height: number;
}

export interface CircleColliderComponent extends BaseColliderComponent {
  shape: 'circle';
  radius: number;
}

export interface PolygonColliderComponent extends BaseColliderComponent {
  shape: 'polygon';
  vertices: Vec2[];
}

export interface CapsuleColliderComponent extends BaseColliderComponent {
  shape: 'capsule';
  radius: number;
  height: number;
}

export type ColliderComponent =
  | BoxColliderComponent
  | CircleColliderComponent
  | PolygonColliderComponent
  | CapsuleColliderComponent;

// Entity Archetypes - explicit classification for entity behavior
export type EntityArchetype = 
  | { type: 'body'; bodyType: 'dynamic' | 'static' | 'kinematic' }
  | { type: 'sensor' }
  | { type: 'hitbox' }
  | { type: 'visual' };

// Collision layer constants (matching Godot CollisionLayers.gd)
export const COLLISION_LAYERS = {
  BODIES: 1,
  SENSORS: 2,
  HITBOXES: 4,
} as const;


