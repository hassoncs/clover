import type { Vec2 as SharedVec2 } from "@slopcade/shared";

export type Vec2 = SharedVec2;

export interface Transform {
  x: number;
  y: number;
  angle: number;
}

export type BodyId = { readonly __brand: "BodyId"; value: number };
export type ColliderId = { readonly __brand: "ColliderId"; value: number };
export type JointId = { readonly __brand: "JointId"; value: number };

export function createBodyId(value: number): BodyId {
  return { __brand: "BodyId", value } as BodyId;
}

export function createColliderId(value: number): ColliderId {
  return { __brand: "ColliderId", value } as ColliderId;
}

export function createJointId(value: number): JointId {
  return { __brand: "JointId", value } as JointId;
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
  width: number;
  height: number;
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

export interface FixtureDef {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  categoryBits?: number;
  maskBits?: number;
}

export interface RevoluteJointDef {
  bodyA: BodyId;
  bodyB: BodyId;
  anchor: Vec2;
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

export interface DistanceJointDef {
  bodyA: BodyId;
  bodyB: BodyId;
  anchorA: Vec2;
  anchorB: Vec2;
  length?: number;
  stiffness?: number;
  damping?: number;
}

export interface PrismaticJointDef {
  bodyA: BodyId;
  bodyB: BodyId;
  anchor: Vec2;
  axis: Vec2;
  enableLimit?: boolean;
  lowerTranslation?: number;
  upperTranslation?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorForce?: number;
}

export interface MouseJointDef {
  bodyA: BodyId;
  bodyB: BodyId;
  target: Vec2;
  maxForce?: number;
  stiffness?: number;
  damping?: number;
}

export interface WeldJointDef {
  bodyA: BodyId;
  bodyB: BodyId;
  anchor: Vec2;
  stiffness?: number;
  damping?: number;
}

export interface RaycastHit {
  bodyId: BodyId;
  point: Vec2;
  normal: Vec2;
  fraction: number;
}

export interface CollisionEvent {
  bodyA: BodyId;
  bodyB: BodyId;
  colliderA: ColliderId;
  colliderB: ColliderId;
}

export interface SensorEvent {
  sensor: ColliderId;
  otherBody: BodyId;
  otherCollider: ColliderId;
}

export type CollisionCallback = (event: CollisionEvent) => void;
export type SensorCallback = (event: SensorEvent) => void;
export type Unsubscribe = () => void;

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}
