import type {
  BodyId,
  ColliderId,
  JointId,
  Vec2,
  Transform,
  BodyDef,
  FixtureDef,
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

  createBody(def: BodyDef): BodyId;
  destroyBody(id: BodyId): void;

  addFixture(bodyId: BodyId, def: FixtureDef): ColliderId;
  removeFixture(id: ColliderId): void;
  setSensor(id: ColliderId, isSensor: boolean): void;

  getTransform(id: BodyId): Transform;
  setTransform(id: BodyId, transform: Transform): void;

  getLinearVelocity(id: BodyId): Vec2;
  setLinearVelocity(id: BodyId, velocity: Vec2): void;
  getAngularVelocity(id: BodyId): number;
  setAngularVelocity(id: BodyId, velocity: number): void;

  applyForce(id: BodyId, force: Vec2, worldPoint?: Vec2): void;
  applyForceToCenter(id: BodyId, force: Vec2): void;
  applyImpulse(id: BodyId, impulse: Vec2, worldPoint?: Vec2): void;
  applyImpulseToCenter(id: BodyId, impulse: Vec2): void;
  applyTorque(id: BodyId, torque: number): void;

  createRevoluteJoint(def: RevoluteJointDef): JointId;
  createDistanceJoint(def: DistanceJointDef): JointId;
  createPrismaticJoint(def: PrismaticJointDef): JointId;
  createMouseJoint(def: MouseJointDef): JointId;
  createWeldJoint(def: WeldJointDef): JointId;
  destroyJoint(id: JointId): void;
  setMotorSpeed(id: JointId, speed: number): void;
  setMouseTarget(id: JointId, target: Vec2): void;

  queryPoint(point: Vec2): BodyId | null;
  queryAABB(min: Vec2, max: Vec2): BodyId[];
  raycast(
    origin: Vec2,
    direction: Vec2,
    maxDistance: number
  ): RaycastHit | null;

  onCollision(callback: CollisionCallback): Unsubscribe;
  onSensorBegin(callback: SensorCallback): Unsubscribe;
  onSensorEnd(callback: SensorCallback): Unsubscribe;

  getUserData<T = unknown>(id: BodyId): T | undefined;
  setUserData(id: BodyId, data: unknown): void;
  getGroup(id: BodyId): string | undefined;
  getAllBodies(): BodyId[];
  getBodiesInGroup(group: string): BodyId[];
}
