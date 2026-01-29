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

/**
 * @deprecated Use collider with isSensor: true instead.
 * Zones are now implemented as sensor colliders for unified rendering.
 */
export type ZoneMovementType = 'static' | 'kinematic';

/**
 * @deprecated Use collider with isSensor: true instead.
 * Zones are now implemented as sensor colliders for unified rendering.
 */
export type ZoneShape =
  | { type: 'box'; width: number; height: number }
  | { type: 'circle'; radius: number }
  | { type: 'polygon'; vertices: Vec2[] };

/**
 * @deprecated Use collider with isSensor: true instead.
 * Zones are now implemented as sensor colliders for unified rendering.
 */
export interface ZoneComponent {
  movement?: ZoneMovementType;
  shape: ZoneShape;
  categoryBits?: number;
  maskBits?: number;
}

/**
 * @deprecated Use collider with isSensor: true instead.
 * Zones are now implemented as sensor colliders for unified rendering.
 */
export interface ZoneEntityDefinition {
  type: 'zone';
  zone: ZoneComponent;
}
