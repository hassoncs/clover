import type { GameDefinition } from '@slopcade/shared';
import type {
  GodotBridge,
  CollisionEvent,
  SensorEvent,
  EntityTransform,
  Vec2,
  RaycastHit,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  WeldJointDef,
  MouseJointDef,
  BodyDef,
  FixtureDef,
} from './types';

declare global {
  interface Window {
    GodotBridge?: {
      loadGameJson: (json: string) => boolean;
      clearGame: () => void;
      spawnEntity: (templateId: string, x: number, y: number, entityId: string) => void;
      destroyEntity: (entityId: string) => void;
      getEntityTransform: (entityId: string) => EntityTransform | null;
      getAllTransforms: () => Record<string, EntityTransform>;
      setTransform: (entityId: string, x: number, y: number, angle: number) => void;
      setPosition: (entityId: string, x: number, y: number) => void;
      setRotation: (entityId: string, angle: number) => void;
      getLinearVelocity: (entityId: string) => { x: number; y: number } | null;
      setLinearVelocity: (entityId: string, vx: number, vy: number) => void;
      getAngularVelocity: (entityId: string) => number | null;
      setAngularVelocity: (entityId: string, v: number) => void;
      applyImpulse: (entityId: string, ix: number, iy: number) => void;
      applyForce: (entityId: string, fx: number, fy: number) => void;
      applyTorque: (entityId: string, torque: number) => void;
      createRevoluteJoint: (...args: (string | number | boolean)[]) => number;
      createDistanceJoint: (...args: (string | number)[]) => number;
      createPrismaticJoint: (...args: (string | number | boolean)[]) => number;
      createWeldJoint: (...args: (string | number)[]) => number;
      createMouseJoint: (...args: (string | number)[]) => number;
      destroyJoint: (jointId: number) => void;
      setMotorSpeed: (jointId: number, speed: number) => void;
      setMouseTarget: (jointId: number, x: number, y: number) => void;
      queryPoint: (x: number, y: number) => number | null;
      queryAABB: (minX: number, minY: number, maxX: number, maxY: number) => number[];
      raycast: (originX: number, originY: number, dirX: number, dirY: number, maxDist: number) => RaycastHit | null;
      createBody: (...args: (string | number | boolean | unknown)[]) => number;
      addFixture: (...args: (number | string | boolean)[]) => number;
      setSensor: (colliderId: number, isSensor: boolean) => void;
      setUserData: (bodyId: number, data: unknown) => void;
      getUserData: (bodyId: number) => unknown;
      getAllBodies: () => number[];
      sendInput: (type: string, x: number, y: number, entityId: string) => void;
      onCollision: (callback: (entityA: string, entityB: string, impulse: number) => void) => void;
      onEntityDestroyed: (callback: (entityId: string) => void) => void;
      onSensorBegin: (callback: (sensorId: number, bodyId: number, colliderId: number) => void) => void;
      onSensorEnd: (callback: (sensorId: number, bodyId: number, colliderId: number) => void) => void;
    };
  }
}

export function createWebGodotBridge(): GodotBridge {
  const collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  const destroyCallbacks: ((entityId: string) => void)[] = [];
  const sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  const sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];

  const getGodotBridge = (): Window['GodotBridge'] | null => {
    const iframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      return (iframe.contentWindow as Window).GodotBridge ?? null;
    }
    return window.GodotBridge ?? null;
  };

  const bridge: GodotBridge = {
    async initialize() {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Godot WASM load timeout')), 30000);

        const checkReady = setInterval(() => {
          const godotBridge = getGodotBridge();
          if (godotBridge) {
            clearInterval(checkReady);
            clearTimeout(timeout);

            godotBridge.onCollision((entityA, entityB, impulse) => {
              const event: CollisionEvent = { entityA, entityB, impulse };
              for (const cb of collisionCallbacks) cb(event);
            });

            godotBridge.onEntityDestroyed((entityId) => {
              for (const cb of destroyCallbacks) cb(entityId);
            });

            godotBridge.onSensorBegin((sensorId, bodyId, colliderId) => {
              const event: SensorEvent = { sensorColliderId: sensorId, otherBodyId: bodyId, otherColliderId: colliderId };
              for (const cb of sensorBeginCallbacks) cb(event);
            });

            godotBridge.onSensorEnd((sensorId, bodyId, colliderId) => {
              const event: SensorEvent = { sensorColliderId: sensorId, otherBodyId: bodyId, otherColliderId: colliderId };
              for (const cb of sensorEndCallbacks) cb(event);
            });

            resolve();
          }
        }, 100);
      });
    },

    dispose() {
      collisionCallbacks.length = 0;
      destroyCallbacks.length = 0;
      sensorBeginCallbacks.length = 0;
      sensorEndCallbacks.length = 0;
    },

    async loadGame(definition: GameDefinition) {
      const godotBridge = getGodotBridge();
      if (!godotBridge) throw new Error('Godot not initialized');
      godotBridge.loadGameJson(JSON.stringify(definition));
    },

    clearGame() {
      getGodotBridge()?.clearGame();
    },

    spawnEntity(templateId: string, x: number, y: number): string {
      const entityId = `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      getGodotBridge()?.spawnEntity(templateId, x, y, entityId);
      return entityId;
    },

    destroyEntity(entityId: string) {
      getGodotBridge()?.destroyEntity(entityId);
    },

    getEntityTransform(entityId: string): EntityTransform | null {
      return getGodotBridge()?.getEntityTransform(entityId) ?? null;
    },

    getAllTransforms(): Record<string, EntityTransform> {
      return getGodotBridge()?.getAllTransforms() ?? {};
    },

    setTransform(entityId: string, x: number, y: number, angle: number) {
      getGodotBridge()?.setTransform(entityId, x, y, angle);
    },

    setPosition(entityId: string, x: number, y: number) {
      getGodotBridge()?.setPosition(entityId, x, y);
    },

    setRotation(entityId: string, angle: number) {
      getGodotBridge()?.setRotation(entityId, angle);
    },

    getLinearVelocity(entityId: string): Vec2 | null {
      return getGodotBridge()?.getLinearVelocity(entityId) ?? null;
    },

    setLinearVelocity(entityId: string, velocity: Vec2) {
      getGodotBridge()?.setLinearVelocity(entityId, velocity.x, velocity.y);
    },

    getAngularVelocity(entityId: string): number | null {
      return getGodotBridge()?.getAngularVelocity(entityId) ?? null;
    },

    setAngularVelocity(entityId: string, velocity: number) {
      getGodotBridge()?.setAngularVelocity(entityId, velocity);
    },

    applyImpulse(entityId: string, impulse: Vec2) {
      getGodotBridge()?.applyImpulse(entityId, impulse.x, impulse.y);
    },

    applyForce(entityId: string, force: Vec2) {
      getGodotBridge()?.applyForce(entityId, force.x, force.y);
    },

    applyTorque(entityId: string, torque: number) {
      getGodotBridge()?.applyTorque(entityId, torque);
    },

    createRevoluteJoint(def: RevoluteJointDef): number {
      return getGodotBridge()?.createRevoluteJoint(
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.enableLimit ?? false, def.lowerAngle ?? 0, def.upperAngle ?? 0,
        def.enableMotor ?? false, def.motorSpeed ?? 0, def.maxMotorTorque ?? 0
      ) ?? -1;
    },

    createDistanceJoint(def: DistanceJointDef): number {
      return getGodotBridge()?.createDistanceJoint(
        def.bodyA, def.bodyB,
        def.anchorA.x, def.anchorA.y,
        def.anchorB.x, def.anchorB.y,
        def.length ?? 0, def.stiffness ?? 0, def.damping ?? 0
      ) ?? -1;
    },

    createPrismaticJoint(def: PrismaticJointDef): number {
      return getGodotBridge()?.createPrismaticJoint(
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.axis.x, def.axis.y,
        def.enableLimit ?? false, def.lowerTranslation ?? 0, def.upperTranslation ?? 0,
        def.enableMotor ?? false, def.motorSpeed ?? 0, def.maxMotorForce ?? 0
      ) ?? -1;
    },

    createWeldJoint(def: WeldJointDef): number {
      return getGodotBridge()?.createWeldJoint(
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.stiffness ?? 0, def.damping ?? 0
      ) ?? -1;
    },

    createMouseJoint(def: MouseJointDef): number {
      return getGodotBridge()?.createMouseJoint(
        def.body,
        def.target.x, def.target.y,
        def.maxForce,
        def.stiffness ?? 5, def.damping ?? 0.7
      ) ?? -1;
    },

    destroyJoint(jointId: number) {
      getGodotBridge()?.destroyJoint(jointId);
    },

    setMotorSpeed(jointId: number, speed: number) {
      getGodotBridge()?.setMotorSpeed(jointId, speed);
    },

    setMouseTarget(jointId: number, target: Vec2) {
      getGodotBridge()?.setMouseTarget(jointId, target.x, target.y);
    },

    queryPoint(point: Vec2): number | null {
      return getGodotBridge()?.queryPoint(point.x, point.y) ?? null;
    },

    queryAABB(min: Vec2, max: Vec2): number[] {
      return getGodotBridge()?.queryAABB(min.x, min.y, max.x, max.y) ?? [];
    },

    raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null {
      return getGodotBridge()?.raycast(origin.x, origin.y, direction.x, direction.y, maxDistance) ?? null;
    },

    createBody(def: BodyDef): number {
      return getGodotBridge()?.createBody(
        def.type,
        def.position.x, def.position.y,
        def.angle ?? 0,
        def.linearDamping ?? 0,
        def.angularDamping ?? 0,
        def.fixedRotation ?? false,
        def.bullet ?? false,
        def.userData,
        def.group
      ) ?? -1;
    },

    addFixture(bodyId: number, def: FixtureDef): number {
      const shape = def.shape;
      let args: (number | string | boolean)[] = [bodyId, shape.type];

      if (shape.type === 'circle') {
        args.push(shape.radius ?? 0.5);
      } else if (shape.type === 'box') {
        args.push(shape.halfWidth ?? 0.5, shape.halfHeight ?? 0.5);
      } else if (shape.type === 'polygon' && shape.vertices) {
        args.push(shape.vertices.length);
        for (const v of shape.vertices) {
          args.push(v.x, v.y);
        }
      }

      args.push(
        def.density ?? 1,
        def.friction ?? 0.3,
        def.restitution ?? 0,
        def.isSensor ?? false,
        def.categoryBits ?? 1,
        def.maskBits ?? 0xFFFFFFFF
      );

      return getGodotBridge()?.addFixture(...args) ?? -1;
    },

    setSensor(colliderId: number, isSensor: boolean) {
      getGodotBridge()?.setSensor(colliderId, isSensor);
    },

    setUserData(bodyId: number, data: unknown) {
      getGodotBridge()?.setUserData(bodyId, data);
    },

    getUserData(bodyId: number): unknown {
      return getGodotBridge()?.getUserData(bodyId);
    },

    getAllBodies(): number[] {
      return getGodotBridge()?.getAllBodies() ?? [];
    },

    onCollision(callback: (event: CollisionEvent) => void): () => void {
      collisionCallbacks.push(callback);
      return () => {
        const index = collisionCallbacks.indexOf(callback);
        if (index >= 0) collisionCallbacks.splice(index, 1);
      };
    },

    onEntityDestroyed(callback: (entityId: string) => void): () => void {
      destroyCallbacks.push(callback);
      return () => {
        const index = destroyCallbacks.indexOf(callback);
        if (index >= 0) destroyCallbacks.splice(index, 1);
      };
    },

    onSensorBegin(callback: (event: SensorEvent) => void): () => void {
      sensorBeginCallbacks.push(callback);
      return () => {
        const index = sensorBeginCallbacks.indexOf(callback);
        if (index >= 0) sensorBeginCallbacks.splice(index, 1);
      };
    },

    onSensorEnd(callback: (event: SensorEvent) => void): () => void {
      sensorEndCallbacks.push(callback);
      return () => {
        const index = sensorEndCallbacks.indexOf(callback);
        if (index >= 0) sensorEndCallbacks.splice(index, 1);
      };
    },

    sendInput(type, data) {
      getGodotBridge()?.sendInput(type, data.x, data.y, data.entityId ?? '');
    },
  };

  return bridge;
}
