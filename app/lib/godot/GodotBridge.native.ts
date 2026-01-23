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
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import './react-native-godot.d';

type GodotModule = typeof import('@borndotcom/react-native-godot');
let godotModule: GodotModule | null = null;
let isGodotInitialized = false;

async function getGodotModule(): Promise<GodotModule> {
  if (!godotModule) {
    godotModule = await import('@borndotcom/react-native-godot');
  }
  return godotModule;
}

function callGameBridge(methodName: string, ...args: unknown[]) {
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        gameBridge.call(methodName, ...args);
      }
    });
  });
}

export function createNativeGodotBridge(): GodotBridge {
  const collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  const destroyCallbacks: ((entityId: string) => void)[] = [];
  const sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  const sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];

  const bridge: GodotBridge = {
    async initialize() {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();

      if (isGodotInitialized) return;

      return new Promise<void>((resolve, reject) => {
        runOnGodotThread(() => {
          'worklet';
          try {
            const args = Platform.OS === 'android'
              ? [
                  '--verbose',
                  '--path', '/main',
                  '--rendering-driver', 'opengl3',
                  '--rendering-method', 'gl_compatibility',
                  '--display-driver', 'embedded',
                ]
              : [
                  '--verbose',
                  '--main-pack', (FileSystem.bundleDirectory ?? '') + 'godot/main.pck',
                  '--rendering-driver', 'opengl3',
                  '--rendering-method', 'gl_compatibility',
                  '--display-driver', 'embedded',
                ];

            RTNGodot.createInstance(args);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }).then(() => {
        isGodotInitialized = true;
      });
    },

    dispose() {
      if (!isGodotInitialized) return;

      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        runOnGodotThread(() => {
          'worklet';
          RTNGodot.destroyInstance();
        });
      });

      isGodotInitialized = false;
      collisionCallbacks.length = 0;
      destroyCallbacks.length = 0;
      sensorBeginCallbacks.length = 0;
      sensorEndCallbacks.length = 0;
    },

    async loadGame(definition: GameDefinition) {
      const jsonString = JSON.stringify(definition);
      callGameBridge('load_game_json', jsonString);
    },

    clearGame() {
      callGameBridge('clear_game');
    },

    spawnEntity(templateId: string, x: number, y: number): string {
      const entityId = `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      callGameBridge('spawn_entity_with_id', templateId, x, y, entityId);
      return entityId;
    },

    destroyEntity(entityId: string) {
      callGameBridge('destroy_entity', entityId);
    },

    getEntityTransform(_entityId: string): EntityTransform | null {
      return null;
    },

    getAllTransforms(): Record<string, EntityTransform> {
      return {};
    },

    setTransform(entityId: string, x: number, y: number, angle: number) {
      callGameBridge('set_transform', entityId, x, y, angle);
    },

    setPosition(entityId: string, x: number, y: number) {
      callGameBridge('set_position', entityId, x, y);
    },

    setRotation(entityId: string, angle: number) {
      callGameBridge('set_rotation', entityId, angle);
    },

    getLinearVelocity(_entityId: string): Vec2 | null {
      return null;
    },

    setLinearVelocity(entityId: string, velocity: Vec2) {
      callGameBridge('set_linear_velocity', entityId, velocity.x, velocity.y);
    },

    getAngularVelocity(_entityId: string): number | null {
      return null;
    },

    setAngularVelocity(entityId: string, velocity: number) {
      callGameBridge('set_angular_velocity', entityId, velocity);
    },

    applyImpulse(entityId: string, impulse: Vec2) {
      callGameBridge('apply_impulse', entityId, impulse.x, impulse.y);
    },

    applyForce(entityId: string, force: Vec2) {
      callGameBridge('apply_force', entityId, force.x, force.y);
    },

    applyTorque(entityId: string, torque: number) {
      callGameBridge('apply_torque', entityId, torque);
    },

    createRevoluteJoint(def: RevoluteJointDef): number {
      const jointId = Date.now();
      callGameBridge('create_revolute_joint',
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.enableLimit ?? false, def.lowerAngle ?? 0, def.upperAngle ?? 0,
        def.enableMotor ?? false, def.motorSpeed ?? 0, def.maxMotorTorque ?? 0
      );
      return jointId;
    },

    createDistanceJoint(def: DistanceJointDef): number {
      const jointId = Date.now();
      callGameBridge('create_distance_joint',
        def.bodyA, def.bodyB,
        def.anchorA.x, def.anchorA.y,
        def.anchorB.x, def.anchorB.y,
        def.length ?? 0, def.stiffness ?? 0, def.damping ?? 0
      );
      return jointId;
    },

    createPrismaticJoint(def: PrismaticJointDef): number {
      const jointId = Date.now();
      callGameBridge('create_prismatic_joint',
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.axis.x, def.axis.y,
        def.enableLimit ?? false, def.lowerTranslation ?? 0, def.upperTranslation ?? 0,
        def.enableMotor ?? false, def.motorSpeed ?? 0, def.maxMotorForce ?? 0
      );
      return jointId;
    },

    createWeldJoint(def: WeldJointDef): number {
      const jointId = Date.now();
      callGameBridge('create_weld_joint',
        def.bodyA, def.bodyB,
        def.anchor.x, def.anchor.y,
        def.stiffness ?? 0, def.damping ?? 0
      );
      return jointId;
    },

    createMouseJoint(def: MouseJointDef): number {
      const jointId = Date.now();
      callGameBridge('create_mouse_joint',
        def.body,
        def.target.x, def.target.y,
        def.maxForce,
        def.stiffness ?? 5, def.damping ?? 0.7
      );
      return jointId;
    },

    destroyJoint(jointId: number) {
      callGameBridge('destroy_joint', jointId);
    },

    setMotorSpeed(jointId: number, speed: number) {
      callGameBridge('set_motor_speed', jointId, speed);
    },

    setMouseTarget(jointId: number, target: Vec2) {
      callGameBridge('set_mouse_target', jointId, target.x, target.y);
    },

    queryPoint(_point: Vec2): number | null {
      return null;
    },

    queryAABB(_min: Vec2, _max: Vec2): number[] {
      return [];
    },

    raycast(_origin: Vec2, _direction: Vec2, _maxDistance: number): RaycastHit | null {
      return null;
    },

    createBody(def: BodyDef): number {
      const bodyId = Date.now();
      callGameBridge('create_body',
        def.type,
        def.position.x, def.position.y,
        def.angle ?? 0,
        def.linearDamping ?? 0,
        def.angularDamping ?? 0,
        def.fixedRotation ?? false,
        def.bullet ?? false,
        def.userData,
        def.group
      );
      return bodyId;
    },

    addFixture(bodyId: number, def: FixtureDef): number {
      const colliderId = Date.now();
      const shape = def.shape;
      const args: unknown[] = [bodyId, shape.type];

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

      callGameBridge('add_fixture', ...args);
      return colliderId;
    },

    setSensor(colliderId: number, isSensor: boolean) {
      callGameBridge('set_sensor', colliderId, isSensor);
    },

    setUserData(bodyId: number, data: unknown) {
      callGameBridge('set_user_data', bodyId, data);
    },

    getUserData(_bodyId: number): unknown {
      return undefined;
    },

    getAllBodies(): number[] {
      return [];
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
      callGameBridge('send_input', type, data.x, data.y, data.entityId ?? '');
    },
  };

  return bridge;
}
