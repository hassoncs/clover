import type { Vec2 } from './common';

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';
export type PhysicsShape = 'box' | 'circle' | 'polygon';

interface BasePhysicsComponent {
  bodyType: PhysicsBodyType;
  shape: PhysicsShape;
  density: number;
  friction: number;
  restitution: number;
  fixedRotation?: boolean;
  bullet?: boolean;
  linearDamping?: number;
  angularDamping?: number;
  initialVelocity?: Vec2;
  initialAngularVelocity?: number;
}

export interface BoxPhysicsComponent extends BasePhysicsComponent {
  shape: 'box';
  width: number;
  height: number;
}

export interface CirclePhysicsComponent extends BasePhysicsComponent {
  shape: 'circle';
  radius: number;
}

export interface PolygonPhysicsComponent extends BasePhysicsComponent {
  shape: 'polygon';
  vertices: Vec2[];
}

export type PhysicsComponent =
  | BoxPhysicsComponent
  | CirclePhysicsComponent
  | PolygonPhysicsComponent;

// ============================================================================
// Zone Types
// ============================================================================

export type ZoneMovementType = 'static' | 'kinematic';

export type ZoneShape =
  | { type: 'box'; width: number; height: number }
  | { type: 'circle'; radius: number }
  | { type: 'polygon'; vertices: Vec2[] };

export interface ZoneComponent {
  movement?: ZoneMovementType; // defaults to "static"
  shape: ZoneShape;
  categoryBits?: number;
  maskBits?: number;
}

export interface ZoneEntityDefinition {
  type: 'zone';
  zone: ZoneComponent;
}
