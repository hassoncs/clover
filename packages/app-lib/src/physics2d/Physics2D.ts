import type {
  JointId,
  Vec2,
  Transform,
  BodyDef,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  MouseJointDef,
  WeldJointDef,
  RaycastHit,
  CollisionCallback,
  SensorCallback,
  Unsubscribe,
} from "./types";

export interface Physics2D {
  createWorld(gravity: Vec2): void;
  destroyWorld(): void;
  step(dt: number): void;
  dispose(): void;

  destroyBody(entityId: string): void;

  removeFixture(entityId: string): void;

  getTransform(entityId: string): Transform;
  setTransform(entityId: string, transform: Transform): void;

  getLinearVelocity(entityId: string): Vec2;
  setLinearVelocity(entityId: string, velocity: Vec2): void;
  getAngularVelocity(entityId: string): number;
  setAngularVelocity(entityId: string, velocity: number): void;

  applyForce(entityId: string, force: Vec2, worldPoint?: Vec2): void;
  applyForceToCenter(entityId: string, force: Vec2): void;
  applyImpulse(entityId: string, impulse: Vec2, worldPoint?: Vec2): void;
  applyImpulseToCenter(entityId: string, impulse: Vec2): void;
  applyTorque(entityId: string, torque: number): void;

  createRevoluteJoint(def: RevoluteJointDef): JointId;
  createDistanceJoint(def: DistanceJointDef): JointId;
  createPrismaticJoint(def: PrismaticJointDef): JointId;
  createMouseJoint(def: MouseJointDef): JointId;
  createWeldJoint(def: WeldJointDef): JointId;
  destroyJoint(id: JointId): void;
  setMotorSpeed(id: JointId, speed: number): void;
  setMouseTarget(id: JointId, target: Vec2): void;

  queryPoint(point: Vec2): string | null;
  queryAABB(min: Vec2, max: Vec2): string[];
  raycast(
    origin: Vec2,
    direction: Vec2,
    maxDistance: number
  ): RaycastHit | null;

  onCollision(callback: CollisionCallback): Unsubscribe;
  onSensorBegin(callback: SensorCallback): Unsubscribe;
  onSensorEnd(callback: SensorCallback): Unsubscribe;

  getUserData<T = unknown>(entityId: string): T | undefined;
  setUserData(entityId: string, data: unknown): void;
  getGroup(entityId: string): string | undefined;
  getAllEntities(): string[];
  getEntitiesInGroup(group: string): string[];
}
