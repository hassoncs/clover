import type { Vec2 } from './common';

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';
export type PhysicsShape = 'box' | 'circle' | 'polygon';

interface BasePhysicsComponent {
  bodyType: PhysicsBodyType;
  shape: PhysicsShape;
  density: number;
  friction: number;
  restitution: number;
  isSensor?: boolean;
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
