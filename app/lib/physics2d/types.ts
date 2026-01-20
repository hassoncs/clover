/**
 * Physics2D Type Definitions
 * 
 * Clean abstraction over Box2D that hides implementation details.
 * Designed to be 3D-ready (z=0 for 2D operations).
 */

// =============================================================================
// BRANDED ID TYPES
// =============================================================================

/** Unique identifier for a physics body */
export type BodyId = { readonly __brand: 'BodyId'; readonly value: number };

/** Unique identifier for a collider/fixture */
export type ColliderId = { readonly __brand: 'ColliderId'; readonly value: number };

/** Unique identifier for a joint */
export type JointId = { readonly __brand: 'JointId'; readonly value: number };

// Helper to create branded IDs (internal use)
export function createBodyId(value: number): BodyId {
  return { __brand: 'BodyId', value } as BodyId;
}

export function createColliderId(value: number): ColliderId {
  return { __brand: 'ColliderId', value } as ColliderId;
}

export function createJointId(value: number): JointId {
  return { __brand: 'JointId', value } as JointId;
}

// =============================================================================
// VECTOR AND TRANSFORM
// =============================================================================

/** 2D Vector */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Create a Vec2 */
export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

/** 2D Transform (position + rotation) */
export interface Transform {
  readonly position: Vec2;
  readonly angle: number; // radians
}

/** Create a Transform */
export function transform(x: number, y: number, angle: number = 0): Transform {
  return { position: { x, y }, angle };
}

// =============================================================================
// BODY TYPES
// =============================================================================

/** Physics body type */
export type BodyType = 'static' | 'dynamic' | 'kinematic';

/** Convert BodyType to Box2D numeric type */
export function bodyTypeToBox2D(type: BodyType): number {
  switch (type) {
    case 'static': return 0;
    case 'kinematic': return 1;
    case 'dynamic': return 2;
  }
}

/** Body definition for creating new bodies */
export interface BodyDef {
  /** Body type: static (immovable), dynamic (full physics), kinematic (scripted movement) */
  type: BodyType;
  /** Initial position in world coordinates (meters) */
  position: Vec2;
  /** Initial rotation in radians */
  angle?: number;
  /** Linear velocity damping (0 = no damping) */
  linearDamping?: number;
  /** Angular velocity damping (0 = no damping) */
  angularDamping?: number;
  /** Prevent rotation */
  fixedRotation?: boolean;
  /** Enable continuous collision detection for fast-moving objects */
  bullet?: boolean;
  /** Custom data attached to this body */
  userData?: unknown;
  /** Optional group tag for querying */
  group?: string;
}

// =============================================================================
// SHAPE TYPES
// =============================================================================

/** Supported shape types */
export type ShapeType = 'circle' | 'box' | 'polygon';

/** Circle shape definition */
export interface CircleShapeDef {
  type: 'circle';
  /** Radius in meters */
  radius: number;
  /** Offset from body center */
  offset?: Vec2;
}

/** Box (rectangle) shape definition */
export interface BoxShapeDef {
  type: 'box';
  /** Half-width in meters */
  halfWidth: number;
  /** Half-height in meters */
  halfHeight: number;
  /** Offset from body center */
  offset?: Vec2;
  /** Rotation offset in radians */
  angle?: number;
}

/** Polygon shape definition */
export interface PolygonShapeDef {
  type: 'polygon';
  /** Vertices in counter-clockwise order (max 8 for Box2D) */
  vertices: Vec2[];
}

/** Union of all shape definitions */
export type ShapeDef = CircleShapeDef | BoxShapeDef | PolygonShapeDef;

// =============================================================================
// FIXTURE/COLLIDER TYPES
// =============================================================================

/** Fixture definition for attaching shapes to bodies */
export interface FixtureDef {
  /** Shape to attach */
  shape: ShapeDef;
  /** Density (mass per area). 0 for static bodies. */
  density?: number;
  /** Friction coefficient (0-1) */
  friction?: number;
  /** Restitution/bounciness (0-1) */
  restitution?: number;
  /** Is this a sensor (detects overlap but no collision response) */
  isSensor?: boolean;
  /** Collision filter category bits */
  categoryBits?: number;
  /** Collision filter mask bits */
  maskBits?: number;
}

// =============================================================================
// JOINT TYPES
// =============================================================================

/** Supported joint types */
export type JointType = 'revolute' | 'distance' | 'prismatic' | 'mouse' | 'weld';

/** Base joint definition */
export interface JointDefBase {
  /** First body */
  bodyA: BodyId;
  /** Second body */
  bodyB: BodyId;
  /** Should connected bodies collide? */
  collideConnected?: boolean;
}

/** Revolute (hinge) joint - allows rotation around a point */
export interface RevoluteJointDef extends JointDefBase {
  type: 'revolute';
  /** Anchor point in world coordinates */
  anchor: Vec2;
  /** Enable rotation limits */
  enableLimit?: boolean;
  /** Lower rotation limit (radians) */
  lowerAngle?: number;
  /** Upper rotation limit (radians) */
  upperAngle?: number;
  /** Enable motor */
  enableMotor?: boolean;
  /** Motor speed (radians/second) */
  motorSpeed?: number;
  /** Maximum motor torque */
  maxMotorTorque?: number;
}

/** Distance joint - maintains distance between two points */
export interface DistanceJointDef extends JointDefBase {
  type: 'distance';
  /** Anchor on body A in world coordinates */
  anchorA: Vec2;
  /** Anchor on body B in world coordinates */
  anchorB: Vec2;
  /** Rest length (auto-calculated if not provided) */
  length?: number;
  /** Stiffness (spring constant) */
  stiffness?: number;
  /** Damping ratio */
  damping?: number;
}

/** Prismatic (slider) joint - allows translation along an axis */
export interface PrismaticJointDef extends JointDefBase {
  type: 'prismatic';
  /** Anchor point in world coordinates */
  anchor: Vec2;
  /** Axis of motion (normalized) */
  axis: Vec2;
  /** Enable translation limits */
  enableLimit?: boolean;
  /** Lower translation limit */
  lowerTranslation?: number;
  /** Upper translation limit */
  upperTranslation?: number;
  /** Enable motor */
  enableMotor?: boolean;
  /** Motor speed */
  motorSpeed?: number;
  /** Maximum motor force */
  maxMotorForce?: number;
}

/** Mouse joint - for dragging bodies with input */
export interface MouseJointDef {
  type: 'mouse';
  /** Body to drag (bodyB in Box2D terms) */
  body: BodyId;
  /** Target position in world coordinates */
  target: Vec2;
  /** Maximum force */
  maxForce: number;
  /** Stiffness */
  stiffness?: number;
  /** Damping */
  damping?: number;
}

/** Weld joint - rigidly connects two bodies */
export interface WeldJointDef extends JointDefBase {
  type: 'weld';
  /** Anchor point in world coordinates */
  anchor: Vec2;
  /** Stiffness (for soft weld) */
  stiffness?: number;
  /** Damping */
  damping?: number;
}

/** Union of all joint definitions */
export type JointDef = RevoluteJointDef | DistanceJointDef | PrismaticJointDef | MouseJointDef | WeldJointDef;

// =============================================================================
// COLLISION AND QUERY TYPES
// =============================================================================

/** Contact information from collision */
export interface ContactInfo {
  /** Contact point in world coordinates */
  point: Vec2;
  /** Contact normal (from A to B) */
  normal: Vec2;
  /** Normal impulse magnitude */
  normalImpulse: number;
  /** Tangent impulse magnitude */
  tangentImpulse: number;
}

/** Collision event data */
export interface CollisionEvent {
  /** First body involved */
  bodyA: BodyId;
  /** Second body involved */
  bodyB: BodyId;
  /** First collider involved */
  colliderA: ColliderId;
  /** Second collider involved */
  colliderB: ColliderId;
  /** Contact information (may have multiple contact points) */
  contacts: ContactInfo[];
}

/** Sensor event data */
export interface SensorEvent {
  /** Sensor collider */
  sensor: ColliderId;
  /** Body that entered/exited the sensor */
  otherBody: BodyId;
  /** Collider that entered/exited the sensor */
  otherCollider: ColliderId;
}

/** Raycast hit result */
export interface RaycastHit {
  /** Body that was hit */
  bodyId: BodyId;
  /** Collider that was hit */
  colliderId: ColliderId;
  /** Hit point in world coordinates */
  point: Vec2;
  /** Surface normal at hit point */
  normal: Vec2;
  /** Fraction along ray (0 = origin, 1 = end) */
  fraction: number;
}

// =============================================================================
// CALLBACK TYPES
// =============================================================================

/** Collision begin/end callback */
export type CollisionCallback = (event: CollisionEvent) => void;

/** Sensor begin/end callback */
export type SensorCallback = (event: SensorEvent) => void;

/** Unsubscribe function returned by event subscriptions */
export type Unsubscribe = () => void;
