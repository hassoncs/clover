import type { GameDefinition } from '@slopcade/shared';

export interface Vec2 {
  x: number;
  y: number;
}

export interface EntityTransform {
  x: number;
  y: number;
  angle: number;
}

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  impulse: number;
}

export interface SensorEvent {
  sensorColliderId: number;
  otherBodyId: number;
  otherColliderId: number;
}

export interface RaycastHit {
  bodyId: number;
  colliderId: number;
  point: Vec2;
  normal: Vec2;
  fraction: number;
}

// Sprite types
export interface RectSprite {
  type: 'rect';
  width: number;
  height: number;
  color: string;
  opacity?: number;
  zIndex?: number;
}

export interface CircleSprite {
  type: 'circle';
  radius: number;
  color: string;
  opacity?: number;
  zIndex?: number;
}

export interface PolygonSprite {
  type: 'polygon';
  vertices: Vec2[];
  color: string;
  opacity?: number;
  zIndex?: number;
}

export interface ImageSprite {
  type: 'image';
  url: string;
  width: number;
  height: number;
  opacity?: number;
  zIndex?: number;
}

export interface TextSprite {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  opacity?: number;
  zIndex?: number;
}

export type SpriteDefinition =
  | RectSprite
  | CircleSprite
  | PolygonSprite
  | ImageSprite
  | TextSprite;

// Joint definitions
export interface RevoluteJointDef {
  type: 'revolute';
  bodyA: string;
  bodyB: string;
  anchor: Vec2;
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

export interface DistanceJointDef {
  type: 'distance';
  bodyA: string;
  bodyB: string;
  anchorA: Vec2;
  anchorB: Vec2;
  length?: number;
  stiffness?: number;
  damping?: number;
}

export interface PrismaticJointDef {
  type: 'prismatic';
  bodyA: string;
  bodyB: string;
  anchor: Vec2;
  axis: Vec2;
  enableLimit?: boolean;
  lowerTranslation?: number;
  upperTranslation?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorForce?: number;
}

export interface WeldJointDef {
  type: 'weld';
  bodyA: string;
  bodyB: string;
  anchor: Vec2;
  stiffness?: number;
  damping?: number;
}

export interface MouseJointDef {
  type: 'mouse';
  body: string;
  target: Vec2;
  maxForce: number;
  stiffness?: number;
  damping?: number;
}

export type JointDef = RevoluteJointDef | DistanceJointDef | PrismaticJointDef | WeldJointDef | MouseJointDef;

// Body definitions
export type BodyType = 'static' | 'dynamic' | 'kinematic';

export interface BodyDef {
  type: BodyType;
  position: Vec2;
  angle?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  bullet?: boolean;
  userData?: unknown;
  group?: string;
}

export interface ShapeDef {
  type: 'circle' | 'box' | 'polygon';
  radius?: number;
  halfWidth?: number;
  halfHeight?: number;
  vertices?: Vec2[];
}

export interface FixtureDef {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  categoryBits?: number;
  maskBits?: number;
}

export interface GodotBridge {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): void;

  // Game management
  loadGame(definition: GameDefinition): Promise<void>;
  clearGame(): void;

  // Entity management (high-level)
  spawnEntity(templateId: string, x: number, y: number): string;
  destroyEntity(entityId: string): void;

  // Transform queries
  getEntityTransform(entityId: string): EntityTransform | null;
  getAllTransforms(): Record<string, EntityTransform>;

  // Transform control
  setTransform(entityId: string, x: number, y: number, angle: number): void;
  setPosition(entityId: string, x: number, y: number): void;
  setRotation(entityId: string, angle: number): void;

  // Velocity control
  getLinearVelocity(entityId: string): Vec2 | null;
  setLinearVelocity(entityId: string, velocity: Vec2): void;
  getAngularVelocity(entityId: string): number | null;
  setAngularVelocity(entityId: string, velocity: number): void;

  // Force/impulse
  applyImpulse(entityId: string, impulse: Vec2): void;
  applyForce(entityId: string, force: Vec2): void;
  applyTorque(entityId: string, torque: number): void;

  // Joints
  createRevoluteJoint(def: RevoluteJointDef): number;
  createDistanceJoint(def: DistanceJointDef): number;
  createPrismaticJoint(def: PrismaticJointDef): number;
  createWeldJoint(def: WeldJointDef): number;
  createMouseJoint(def: MouseJointDef): number;
  destroyJoint(jointId: number): void;
  setMotorSpeed(jointId: number, speed: number): void;
  setMouseTarget(jointId: number, target: Vec2): void;

  // Physics queries
  queryPoint(point: Vec2): number | null;
  queryAABB(min: Vec2, max: Vec2): number[];
  raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null;

  // Body management (low-level Physics2D API)
  createBody(def: BodyDef): number;
  addFixture(bodyId: number, def: FixtureDef): number;
  setSensor(colliderId: number, isSensor: boolean): void;
  setUserData(bodyId: number, data: unknown): void;
  getUserData(bodyId: number): unknown;
  getAllBodies(): number[];

  // Events
  onCollision(callback: (event: CollisionEvent) => void): () => void;
  onEntityDestroyed(callback: (entityId: string) => void): () => void;
  onSensorBegin(callback: (event: SensorEvent) => void): () => void;
  onSensorEnd(callback: (event: SensorEvent) => void): () => void;

  // Input
  sendInput(type: 'tap' | 'drag_start' | 'drag_move' | 'drag_end', data: { x: number; y: number; entityId?: string }): void;
}

export interface GodotViewProps {
  style?: object;
  onReady?: () => void;
  onError?: (error: Error) => void;
}
