import type { Physics2D } from '../physics2d/Physics2D';
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
  CollisionEvent,
  SensorEvent,
} from '../physics2d/types';
import { createBodyId, createColliderId, createJointId } from '../physics2d/types';
import type { GodotBridge } from './types';

export function createGodotPhysicsAdapter(bridge: GodotBridge): Physics2D {
  const bodyIdToEntityId = new Map<number, string>();
  const entityIdToBodyId = new Map<string, BodyId>();
  const colliderIdMap = new Map<number, ColliderId>();
  const jointIdMap = new Map<number, JointId>();
  
  const userDataStore = new Map<number, unknown>();
  const groupStore = new Map<number, string>();
  
  let nextBodyId = 1;
  let nextColliderId = 1;
  let nextJointId = 1;
  
  const collisionBeginCallbacks: CollisionCallback[] = [];
  const collisionEndCallbacks: CollisionCallback[] = [];
  const sensorBeginCallbacks: SensorCallback[] = [];
  const sensorEndCallbacks: SensorCallback[] = [];

  bridge.onCollision((event) => {
    const bodyA = entityIdToBodyId.get(event.entityA);
    const bodyB = entityIdToBodyId.get(event.entityB);
    if (bodyA && bodyB) {
      const collisionEvent: CollisionEvent = {
        bodyA,
        bodyB,
        colliderA: createColliderId(bodyA.value),
        colliderB: createColliderId(bodyB.value),
        contacts: [{
          point: { x: 0, y: 0 },
          normal: { x: 0, y: 1 },
          normalImpulse: event.impulse,
          tangentImpulse: 0,
        }],
      };
      for (const cb of collisionBeginCallbacks) {
        cb(collisionEvent);
      }
    }
  });

  bridge.onSensorBegin((event) => {
    const sensorEvent: SensorEvent = {
      sensor: createColliderId(event.sensorColliderId),
      otherBody: createBodyId(event.otherBodyId),
      otherCollider: createColliderId(event.otherColliderId),
    };
    for (const cb of sensorBeginCallbacks) {
      cb(sensorEvent);
    }
  });

  bridge.onSensorEnd((event) => {
    const sensorEvent: SensorEvent = {
      sensor: createColliderId(event.sensorColliderId),
      otherBody: createBodyId(event.otherBodyId),
      otherCollider: createColliderId(event.otherColliderId),
    };
    for (const cb of sensorEndCallbacks) {
      cb(sensorEvent);
    }
  });

  const adapter: Physics2D = {
    createWorld(_gravity: Vec2): void {
    },

    destroyWorld(): void {
      bridge.clearGame();
      bodyIdToEntityId.clear();
      entityIdToBodyId.clear();
      colliderIdMap.clear();
      jointIdMap.clear();
      userDataStore.clear();
      groupStore.clear();
    },

    step(_dt: number, _velocityIterations?: number, _positionIterations?: number): void {
    },

    createBody(def: BodyDef): BodyId {
      const bodyId = createBodyId(nextBodyId++);
      const entityId = `body_${bodyId.value}_${Date.now()}`;
      
      bodyIdToEntityId.set(bodyId.value, entityId);
      entityIdToBodyId.set(entityId, bodyId);
      
      if (def.userData !== undefined) {
        userDataStore.set(bodyId.value, def.userData);
      }
      if (def.group) {
        groupStore.set(bodyId.value, def.group);
      }
      
      bridge.createBody({
        type: def.type,
        position: def.position,
        angle: def.angle,
        linearDamping: def.linearDamping,
        angularDamping: def.angularDamping,
        fixedRotation: def.fixedRotation,
        bullet: def.bullet,
        userData: def.userData,
        group: def.group,
      });
      
      return bodyId;
    },

    destroyBody(id: BodyId): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.destroyEntity(entityId);
        bodyIdToEntityId.delete(id.value);
        entityIdToBodyId.delete(entityId);
        userDataStore.delete(id.value);
        groupStore.delete(id.value);
      }
    },

    addFixture(bodyId: BodyId, def: FixtureDef): ColliderId {
      const colliderId = createColliderId(nextColliderId++);
      colliderIdMap.set(colliderId.value, colliderId);
      
      bridge.addFixture(bodyId.value, def);
      
      return colliderId;
    },

    removeFixture(_id: ColliderId): void {
    },

    setSensor(id: ColliderId, isSensor: boolean): void {
      bridge.setSensor(id.value, isSensor);
    },

    getTransform(id: BodyId): Transform {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        const transform = bridge.getEntityTransform(entityId);
        if (transform) {
          return {
            position: { x: transform.x, y: transform.y },
            angle: transform.angle,
          };
        }
      }
      return { position: { x: 0, y: 0 }, angle: 0 };
    },

    setTransform(id: BodyId, transform: Transform): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.setTransform(entityId, transform.position.x, transform.position.y, transform.angle);
      }
    },

    getLinearVelocity(id: BodyId): Vec2 {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        const vel = bridge.getLinearVelocity(entityId);
        if (vel) return vel;
      }
      return { x: 0, y: 0 };
    },

    setLinearVelocity(id: BodyId, velocity: Vec2): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.setLinearVelocity(entityId, velocity);
      }
    },

    getAngularVelocity(id: BodyId): number {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        return bridge.getAngularVelocity(entityId) ?? 0;
      }
      return 0;
    },

    setAngularVelocity(id: BodyId, velocity: number): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.setAngularVelocity(entityId, velocity);
      }
    },

    applyForce(id: BodyId, force: Vec2, _worldPoint?: Vec2): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.applyForce(entityId, force);
      }
    },

    applyForceToCenter(id: BodyId, force: Vec2): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.applyForce(entityId, force);
      }
    },

    applyImpulse(id: BodyId, impulse: Vec2, _worldPoint?: Vec2): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.applyImpulse(entityId, impulse);
      }
    },

    applyImpulseToCenter(id: BodyId, impulse: Vec2): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.applyImpulse(entityId, impulse);
      }
    },

    applyTorque(id: BodyId, torque: number): void {
      const entityId = bodyIdToEntityId.get(id.value);
      if (entityId) {
        bridge.applyTorque(entityId, torque);
      }
    },

    createRevoluteJoint(def: RevoluteJointDef): JointId {
      const jointId = createJointId(nextJointId++);
      jointIdMap.set(jointId.value, jointId);
      
      const entityA = bodyIdToEntityId.get(def.bodyA.value);
      const entityB = bodyIdToEntityId.get(def.bodyB.value);
      
      if (entityA && entityB) {
        bridge.createRevoluteJoint({
          type: 'revolute',
          bodyA: entityA,
          bodyB: entityB,
          anchor: def.anchor,
          enableLimit: def.enableLimit,
          lowerAngle: def.lowerAngle,
          upperAngle: def.upperAngle,
          enableMotor: def.enableMotor,
          motorSpeed: def.motorSpeed,
          maxMotorTorque: def.maxMotorTorque,
        });
      }
      
      return jointId;
    },

    createDistanceJoint(def: DistanceJointDef): JointId {
      const jointId = createJointId(nextJointId++);
      jointIdMap.set(jointId.value, jointId);
      
      const entityA = bodyIdToEntityId.get(def.bodyA.value);
      const entityB = bodyIdToEntityId.get(def.bodyB.value);
      
      if (entityA && entityB) {
        bridge.createDistanceJoint({
          type: 'distance',
          bodyA: entityA,
          bodyB: entityB,
          anchorA: def.anchorA,
          anchorB: def.anchorB,
          length: def.length,
          stiffness: def.stiffness,
          damping: def.damping,
        });
      }
      
      return jointId;
    },

    createPrismaticJoint(def: PrismaticJointDef): JointId {
      const jointId = createJointId(nextJointId++);
      jointIdMap.set(jointId.value, jointId);
      
      const entityA = bodyIdToEntityId.get(def.bodyA.value);
      const entityB = bodyIdToEntityId.get(def.bodyB.value);
      
      if (entityA && entityB) {
        bridge.createPrismaticJoint({
          type: 'prismatic',
          bodyA: entityA,
          bodyB: entityB,
          anchor: def.anchor,
          axis: def.axis,
          enableLimit: def.enableLimit,
          lowerTranslation: def.lowerTranslation,
          upperTranslation: def.upperTranslation,
          enableMotor: def.enableMotor,
          motorSpeed: def.motorSpeed,
          maxMotorForce: def.maxMotorForce,
        });
      }
      
      return jointId;
    },

    createMouseJoint(def: MouseJointDef): JointId {
      const jointId = createJointId(nextJointId++);
      jointIdMap.set(jointId.value, jointId);
      
      const entityId = bodyIdToEntityId.get(def.body.value);
      
      if (entityId) {
        bridge.createMouseJoint({
          type: 'mouse',
          body: entityId,
          target: def.target,
          maxForce: def.maxForce,
          stiffness: def.stiffness,
          damping: def.damping,
        });
      }
      
      return jointId;
    },

    createWeldJoint(def: WeldJointDef): JointId {
      const jointId = createJointId(nextJointId++);
      jointIdMap.set(jointId.value, jointId);
      
      const entityA = bodyIdToEntityId.get(def.bodyA.value);
      const entityB = bodyIdToEntityId.get(def.bodyB.value);
      
      if (entityA && entityB) {
        bridge.createWeldJoint({
          type: 'weld',
          bodyA: entityA,
          bodyB: entityB,
          anchor: def.anchor,
          stiffness: def.stiffness,
          damping: def.damping,
        });
      }
      
      return jointId;
    },

    destroyJoint(id: JointId): void {
      bridge.destroyJoint(id.value);
      jointIdMap.delete(id.value);
    },

    setMotorSpeed(id: JointId, speed: number): void {
      bridge.setMotorSpeed(id.value, speed);
    },

    setMouseTarget(id: JointId, target: Vec2): void {
      bridge.setMouseTarget(id.value, target);
    },

    queryPoint(point: Vec2): BodyId | null {
      const result = bridge.queryPoint(point);
      if (result !== null) {
        return createBodyId(result);
      }
      return null;
    },

    queryAABB(min: Vec2, max: Vec2): BodyId[] {
      const results = bridge.queryAABB(min, max);
      return results.map(id => createBodyId(id));
    },

    raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null {
      const result = bridge.raycast(origin, direction, maxDistance);
      if (result) {
        return {
          bodyId: createBodyId(result.bodyId),
          colliderId: createColliderId(result.colliderId),
          point: result.point,
          normal: result.normal,
          fraction: result.fraction,
        };
      }
      return null;
    },

    onCollisionBegin(callback: CollisionCallback): Unsubscribe {
      collisionBeginCallbacks.push(callback);
      return () => {
        const index = collisionBeginCallbacks.indexOf(callback);
        if (index >= 0) collisionBeginCallbacks.splice(index, 1);
      };
    },

    onCollisionEnd(callback: CollisionCallback): Unsubscribe {
      collisionEndCallbacks.push(callback);
      return () => {
        const index = collisionEndCallbacks.indexOf(callback);
        if (index >= 0) collisionEndCallbacks.splice(index, 1);
      };
    },

    onSensorBegin(callback: SensorCallback): Unsubscribe {
      sensorBeginCallbacks.push(callback);
      return () => {
        const index = sensorBeginCallbacks.indexOf(callback);
        if (index >= 0) sensorBeginCallbacks.splice(index, 1);
      };
    },

    onSensorEnd(callback: SensorCallback): Unsubscribe {
      sensorEndCallbacks.push(callback);
      return () => {
        const index = sensorEndCallbacks.indexOf(callback);
        if (index >= 0) sensorEndCallbacks.splice(index, 1);
      };
    },

    getUserData<T = unknown>(id: BodyId): T | undefined {
      return userDataStore.get(id.value) as T | undefined;
    },

    setUserData(id: BodyId, data: unknown): void {
      userDataStore.set(id.value, data);
      bridge.setUserData(id.value, data);
    },

    getGroup(id: BodyId): string | undefined {
      return groupStore.get(id.value);
    },

    getAllBodies(): BodyId[] {
      return Array.from(bodyIdToEntityId.keys()).map(id => createBodyId(id));
    },

    getBodiesInGroup(group: string): BodyId[] {
      const result: BodyId[] = [];
      for (const [bodyId, g] of groupStore) {
        if (g === group) {
          result.push(createBodyId(bodyId));
        }
      }
      return result;
    },
  };

  return adapter;
}
