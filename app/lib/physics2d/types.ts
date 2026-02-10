import type { Vec2 as SharedVec2 } from "@slopcade/shared";

export type Vec2 = SharedVec2;

export interface Transform {
  position: Vec2;
  angle: number;
}

export type JointId = { readonly __brand: "JointId"; value: number };

export function createJointId(value: number): JointId {
  return { __brand: "JointId", value } as JointId;
}

export interface ContactInfo {
  point: Vec2;
  normal: Vec2;
  normalImpulse: number;
  tangentImpulse: number;
}

export type BodyType = "static" | "dynamic" | "kinematic";

export interface BodyDef {
  type: BodyType;
  position: Vec2;
  angle?: number;
  linearVelocity?: Vec2;
  angularVelocity?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  bullet?: boolean;
  gravityScale?: number;
  userData?: unknown;
  group?: string;
}

export type ShapeType = "box" | "circle" | "polygon" | "edge" | "chain";

export interface BoxShapeDef {
  type: "box";
  halfWidth: number;
  halfHeight: number;
  center?: Vec2;
}

export interface CircleShapeDef {
  type: "circle";
  radius: number;
  center?: Vec2;
}

export interface PolygonShapeDef {
  type: "polygon";
  vertices: Vec2[];
}

export interface EdgeShapeDef {
  type: "edge";
  v1: Vec2;
  v2: Vec2;
}

export interface ChainShapeDef {
  type: "chain";
  vertices: Vec2[];
  loop?: boolean;
}

export type ShapeDef =
  | BoxShapeDef
  | CircleShapeDef
  | PolygonShapeDef
  | EdgeShapeDef
  | ChainShapeDef;

export interface ColliderConfig {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  categoryBits?: number;
  maskBits?: number;
}

export interface RevoluteJointDef {
  type?: 'revolute';
  entityA: string;
  entityB: string;
  anchor: Vec2;
  collideConnected?: boolean;
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

export interface DistanceJointDef {
  type?: 'distance';
  entityA: string;
  entityB: string;
  anchorA: Vec2;
  anchorB: Vec2;
  collideConnected?: boolean;
  length?: number;
  stiffness?: number;
  damping?: number;
}

export interface PrismaticJointDef {
  type?: 'prismatic';
  entityA: string;
  entityB: string;
  anchor: Vec2;
  axis: Vec2;
  collideConnected?: boolean;
  enableLimit?: boolean;
  lowerTranslation?: number;
  upperTranslation?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorForce?: number;
}

export interface MouseJointDef {
  entity: string;
  target: Vec2;
  maxForce: number;
  stiffness?: number;
  damping?: number;
}

export interface WeldJointDef {
  type?: 'weld';
  entityA: string;
  entityB: string;
  anchor: Vec2;
  collideConnected?: boolean;
  stiffness?: number;
  damping?: number;
}

// Re-export from godot/types (identical definition)
export type { RaycastHit } from '../godot/types';

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  colliderA: string;
  colliderB: string;
  contacts?: ContactInfo[];
}

export interface SensorEvent {
  sensor: string;
  otherEntity: string;
  otherCollider: string;
}

export type CollisionCallback = (event: CollisionEvent) => void;
export type SensorCallback = (event: SensorEvent) => void;
export type Unsubscribe = () => void;

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}
