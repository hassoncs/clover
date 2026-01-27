import type { GameDefinition, PropertySyncPayload } from '@slopcade/shared';
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
  ContactInfo,
  DynamicShaderResult,
} from './types';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import './react-native-godot.d';

type GodotModule = typeof import('@borndotcom/react-native-godot');

interface GodotGameBridge {
  entities: Record<string, {
    position: { x: number; y: number };
    rotation: number;
    linear_velocity?: { x: number; y: number };
    angular_velocity?: number;
  }>;
  pixels_per_meter: number;
  user_data: Record<number, unknown>;
  body_id_reverse: Record<number, string>;
  get_all_transforms(): Record<string, EntityTransform>;
  get_all_properties(): PropertySyncPayload;
  _screen_to_world_impl(screenX: number, screenY: number): { x: number; y: number };
  query_point_entity(x: number, y: number): string | null;
  create_mouse_joint(body: string, targetX: number, targetY: number, maxForce: number, stiffness: number, damping: number): number;
  destroy_joint(jointId: number): void;
  set_mouse_target(jointId: number, x: number, y: number): void;
  query_point(x: number, y: number): number | null;
  query_aabb(minX: number, minY: number, maxX: number, maxY: number): string;
  raycast(originX: number, originY: number, dirX: number, dirY: number, maxDistance: number): string | null;
  poll_events(): string;
  set_linear_velocity(entityId: string, vx: number, vy: number): void;
  set_angular_velocity(entityId: string, velocity: number): void;
  apply_impulse(entityId: string, ix: number, iy: number): void;
  apply_force(entityId: string, fx: number, fy: number): void;
  apply_torque(entityId: string, torque: number): void;
}
let godotModule: GodotModule | null = null;
let isGodotInitialized = false;
let isDisposing = false;

const pendingQueries = new Map<number, (result: string | null) => void>();
const pendingJoints = new Map<number, (jointId: number) => void>();
let requestIdCounter = 0;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

async function getGodotModule(): Promise<GodotModule> {
  if (!godotModule) {
    godotModule = await import('@borndotcom/react-native-godot');
  }
  return godotModule;
}

function callGameBridge(methodName: string, ...args: unknown[]) {
  if (isDisposing || !isGodotInitialized) return;
  
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    if (isDisposing) return;
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        const method = gameBridge[methodName];
        if (typeof method === 'function') {
          // react-native-godot doesn't support JS Array bindings
          // All methods must be called with individual args spread out
          method.apply(gameBridge, args);
        } else {
          console.log(`[Godot worklet] Method ${methodName} not found on GameBridge`);
        }
      }
    });
  });
}

function callEffectsBridge(methodName: string, ...args: unknown[]) {
  if (isDisposing || !isGodotInitialized) return;
  
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    if (isDisposing) return;
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const effectsBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridgeEffects');
      if (effectsBridge) {
        const method = effectsBridge[methodName];
        if (typeof method === 'function') {
          // Spread args individually - react-native-godot doesn't support array bindings
          method.apply(effectsBridge, args);
        } else {
          console.log(`[Godot worklet] Method ${methodName} not found on GameBridgeEffects`);
        }
      }
    });
  });
}

function handleQueryResult(requestId: number, result: string | null) {
  const resolve = pendingQueries.get(requestId);
  if (resolve) {
    pendingQueries.delete(requestId);
    resolve(result);
  }
}

function handleJointCreated(requestId: number, jointId: number) {
  const resolve = pendingJoints.get(requestId);
  if (resolve) {
    pendingJoints.delete(requestId);
    resolve(jointId);
  }
}

interface QueuedEvent {
  type: string;
  data: Record<string, unknown>;
}

export function createNativeGodotBridge(): GodotBridge {
  const collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  const destroyCallbacks: ((entityId: string) => void)[] = [];
  const sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  const sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
  const inputEventCallbacks: ((type: string, x: number, y: number, entityId: string | null) => void)[] = [];
  const uiButtonCallbacks: ((eventType: 'button_down' | 'button_up' | 'button_pressed', buttonId: string) => void)[] = [];
  const transformSyncCallbacks: ((transforms: Record<string, EntityTransform>) => void)[] = [];
  const propertySyncCallbacks: ((properties: PropertySyncPayload) => void)[] = [];
  let eventPollIntervalId: ReturnType<typeof setInterval> | null = null;

  async function pollAndDispatchEvents() {
    if (!isGodotInitialized || isDisposing) return;
    
    try {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      if (isDisposing) return;
      
      const eventsJson = await runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.poll_events) {
            return gameBridge.poll_events();
          }
        } catch (e) {
          console.log(`[Godot worklet] poll_events error: ${e}`);
        }
        return '[]';
      });
      
      const events: QueuedEvent[] = JSON.parse(eventsJson);

      for (const event of events) {
        switch (event.type) {
          case 'collision': {
            const data = event.data as { entityA: string; entityB: string; impulse: number };
            const collisionEvent: CollisionEvent = {
              entityA: data.entityA,
              entityB: data.entityB,
              contacts: [{
                point: { x: 0, y: 0 },
                normal: { x: 0, y: 1 },
                normalImpulse: data.impulse,
                tangentImpulse: 0,
              }],
            };
            for (const cb of collisionCallbacks) cb(collisionEvent);
            break;
          }
          case 'collision_detailed': {
            const data = event.data as { entityA: string; entityB: string; contacts: ContactInfo[] };
            const collisionEvent: CollisionEvent = {
              entityA: data.entityA,
              entityB: data.entityB,
              contacts: data.contacts,
            };
            for (const cb of collisionCallbacks) cb(collisionEvent);
            break;
          }
          case 'destroy': {
            const entityId = (event.data as { entityId: string }).entityId;
            for (const cb of destroyCallbacks) cb(entityId);
            break;
          }
          case 'sensor_begin': {
            const data = event.data as { sensorColliderId: number; otherBodyId: number; otherColliderId: number };
            const sensorEvent: SensorEvent = {
              sensorColliderId: data.sensorColliderId,
              otherBodyId: data.otherBodyId,
              otherColliderId: data.otherColliderId,
            };
            for (const cb of sensorBeginCallbacks) cb(sensorEvent);
            break;
          }
          case 'sensor_end': {
            const data = event.data as { sensorColliderId: number; otherBodyId: number; otherColliderId: number };
            const sensorEvent: SensorEvent = {
              sensorColliderId: data.sensorColliderId,
              otherBodyId: data.otherBodyId,
              otherColliderId: data.otherColliderId,
            };
            for (const cb of sensorEndCallbacks) cb(sensorEvent);
            break;
          }
          case 'ui_button': {
            const data = event.data as { eventType: string; buttonId: string };
            for (const cb of uiButtonCallbacks) {
              cb(data.eventType as 'button_down' | 'button_up' | 'button_pressed', data.buttonId);
            }
            break;
          }
          case 'input': {
            const data = event.data as { type: string; x: number; y: number; entityId: string | null };
            for (const cb of inputEventCallbacks) {
              cb(data.type, data.x, data.y, data.entityId);
            }
            break;
          }
          case 'property_sync': {
            const data = event.data as unknown as PropertySyncPayload;
            for (const cb of propertySyncCallbacks) {
              cb(data);
            }
            break;
          }
        }
      }
    } catch (e) {
      console.log(`[GodotBridge.native] pollAndDispatchEvents error: ${e}`);
    }
  }

  const bridge: GodotBridge = {
    async initialize() {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();

      if (isGodotInitialized) return;

      const bundleDir = FileSystem.bundleDirectory ?? '';
      const pckPath = bundleDir + 'godot/main.pck';

      if (Platform.OS === 'android') {
        runOnGodotThread(() => {
          'worklet';
          RTNGodot.createInstance([
            '--verbose',
            '--path', '/main',
            '--rendering-driver', 'opengl3',
            '--rendering-method', 'gl_compatibility',
            '--display-driver', 'embedded',
          ]);
        });
      } else {
        runOnGodotThread(() => {
          'worklet';
          RTNGodot.createInstance([
            '--verbose',
            '--main-pack', pckPath,
            '--rendering-driver', 'opengl3',
            '--rendering-method', 'gl_compatibility',
            '--display-driver', 'embedded',
          ]);
        });
      }

      return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkReady = () => {
          attempts++;
          
          runOnGodotThread(() => {
            'worklet';
            try {
              const instance = RTNGodot.getInstance();
              console.log(`[Godot worklet] getInstance result: ${instance ? 'exists' : 'null'}`);
              if (instance) {
                const api = RTNGodot.API();
                console.log(`[Godot worklet] API result: ${api ? 'exists' : 'null'}`);
                if (api && api.Engine) {
                  console.log('[Godot worklet] Engine exists, checking main_loop...');
                  const mainLoop = api.Engine.get_main_loop();
                  console.log(`[Godot worklet] main_loop: ${mainLoop ? 'exists' : 'null'}`);
                  if (mainLoop) {
                    const root = mainLoop.get_root();
                    console.log(`[Godot worklet] root: ${root ? 'exists' : 'null'}`);
                    if (root) {
                      return true;
                    }
                  }
                }
              }
            } catch (e) {
              console.log(`[Godot worklet] Error: ${e}`);
              return false;
            }
            return false;
          }).then((ready) => {
            console.log(`[GodotBridge.native] Check ${attempts}: ready=${ready}`);
            if (ready) {
              console.log('[GodotBridge.native] Engine ready!');
              isGodotInitialized = true;
              
              // Start event polling loop (60fps)
              eventPollIntervalId = setInterval(pollAndDispatchEvents, 16);
              console.log('[GodotBridge.native] Event polling started');
              
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Godot engine failed to initialize after 10 seconds'));
            } else {
              setTimeout(checkReady, 100);
            }
          }).catch((err) => {
            console.log(`[GodotBridge.native] Check ${attempts} error: ${err}`);
            if (attempts >= maxAttempts) {
              reject(new Error('Godot engine failed to initialize'));
            } else {
              setTimeout(checkReady, 100);
            }
          });
        };
        
        setTimeout(checkReady, 1000);
      });
    },

    dispose() {
      if (isDisposing) return;
      isDisposing = true;
      
      if (eventPollIntervalId) {
        clearInterval(eventPollIntervalId);
        eventPollIntervalId = null;
      }

      collisionCallbacks.length = 0;
      destroyCallbacks.length = 0;
      sensorBeginCallbacks.length = 0;
      sensorEndCallbacks.length = 0;
      inputEventCallbacks.length = 0;

      if (!isGodotInitialized) {
        isDisposing = false;
        return;
      }

      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        runOnGodotThread(() => {
          'worklet';
          try {
            const Godot = RTNGodot.API();
            const gameBridge = Godot.Engine.get_main_loop()?.get_root()?.get_node('GameBridge');
            if (gameBridge) {
              const clearFn = (gameBridge as Record<string, unknown>)['clear_game'];
              if (typeof clearFn === 'function') {
                clearFn.call(gameBridge);
              }
            }
          } catch (e) {
            console.log('[GodotBridge.native] dispose clear_game error:', e);
          }
        });
        
        setTimeout(() => {
          runOnGodotThread(() => {
            'worklet';
            RTNGodot.destroyInstance();
          });
          isGodotInitialized = false;
          isDisposing = false;
        }, 100);
      });
    },

    async loadGame(definition: GameDefinition) {
      const jsonString = JSON.stringify(definition);
      callGameBridge('load_game_json', jsonString);
    },

    clearGame() {
      callGameBridge('clear_game');
    },

    pausePhysics() {
      callGameBridge('pause_physics');
    },

    resumePhysics() {
      callGameBridge('resume_physics');
    },

    spawnEntity(templateId: string, x: number, y: number): string {
      const entityId = `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      callGameBridge('spawn_entity_with_id', templateId, x, y, entityId);
      return entityId;
    },

    destroyEntity(entityId: string) {
      callGameBridge('destroy_entity', entityId);
    },

    async getEntityTransform(entityId: string): Promise<EntityTransform | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.entities?.[entityId]) {
            const node = gameBridge.entities[entityId];
            const ppm = gameBridge.pixels_per_meter || 50.0;
            return {
              x: node.position.x / ppm,
              y: node.position.y / ppm,
              angle: node.rotation
            } as EntityTransform;
          }
        } catch (e) {
          console.log(`[Godot worklet] getEntityTransform error: ${e}`);
        }
        return null;
      });
    },

    async getAllTransforms(): Promise<Record<string, EntityTransform>> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.entities) {
            const result: Record<string, EntityTransform> = {};
            const ppm = gameBridge.pixels_per_meter || 50.0;
            const entityIds = Object.keys(gameBridge.entities);
            for (const entityId of entityIds) {
              const node = gameBridge.entities[entityId];
              if (node?.position) {
                result[entityId] = {
                  x: node.position.x / ppm,
                  y: node.position.y / ppm,
                  angle: node.rotation || 0,
                };
              }
            }
            return result;
          }
        } catch (e) {
          console.log(`[Godot worklet] getAllTransforms error: ${e}`);
        }
        return {};
      });
    },

    async getAllProperties(): Promise<PropertySyncPayload> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.get_all_properties) {
            return gameBridge.get_all_properties();
          }
        } catch (e) {
          console.log(`[Godot worklet] getAllProperties error: ${e}`);
        }
        return { frameId: 0, timestamp: 0, entities: {} };
      });
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

    setScale(entityId: string, scaleX: number, scaleY: number) {
      callGameBridge('set_scale', entityId, scaleX, scaleY);
    },

    async getLinearVelocity(entityId: string): Promise<Vec2 | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.entities?.[entityId]) {
            const node = gameBridge.entities[entityId];
            if (node.linear_velocity) {
              const ppm = gameBridge.pixels_per_meter || 50.0;
              return {
                x: node.linear_velocity.x / ppm,
                y: node.linear_velocity.y / ppm
              } as Vec2;
            }
          }
        } catch (e) {
          console.log(`[Godot worklet] getLinearVelocity error: ${e}`);
        }
        return null;
      });
    },

    setLinearVelocity(entityId: string, velocity: Vec2) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        if (isDisposing) return;
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            gameBridge.set_linear_velocity(entityId, velocity.x, velocity.y);
          }
        });
      });
    },

    async getAngularVelocity(entityId: string): Promise<number | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.entities?.[entityId]) {
            const node = gameBridge.entities[entityId];
            if (typeof node.angular_velocity === 'number') {
              return node.angular_velocity;
            }
          }
        } catch (e) {
          console.log(`[Godot worklet] getAngularVelocity error: ${e}`);
        }
        return null;
      });
    },

    setAngularVelocity(entityId: string, velocity: number) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        if (isDisposing) return;
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            gameBridge.set_angular_velocity(entityId, velocity);
          }
        });
      });
    },

    applyImpulse(entityId: string, impulse: Vec2) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        if (isDisposing) return;
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            gameBridge.apply_impulse(entityId, impulse.x, impulse.y);
          }
        });
      });
    },

    applyForce(entityId: string, force: Vec2) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        if (isDisposing) return;
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            gameBridge.apply_force(entityId, force.x, force.y);
          }
        });
      });
    },

    applyTorque(entityId: string, torque: number) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        if (isDisposing) return;
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            gameBridge.apply_torque(entityId, torque);
          }
        });
      });
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
      console.warn('[GodotBridge.native] createMouseJoint: sync API not recommended on native, use createMouseJointAsync');
      const jointId = Date.now();
      callGameBridge('create_mouse_joint',
        def.body,
        def.target.x, def.target.y,
        def.maxForce,
        def.stiffness ?? 5, def.damping ?? 0.7
      );
      return jointId;
    },

    async createMouseJointAsync(def: MouseJointDef): Promise<number> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
          if (gameBridge) {
            const jointId = gameBridge.create_mouse_joint(
              def.body,
              def.target.x, def.target.y,
              def.maxForce,
              def.stiffness ?? 5, def.damping ?? 0.7
            ) as number;
            console.log(`[Godot worklet] create_mouse_joint = ${jointId}`);
            return jointId ?? -1;
          }
        } catch (e) {
          console.log(`[Godot worklet] create_mouse_joint error: ${e}`);
        }
        return -1;
      });
    },

    destroyJoint(jointId: number) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
          if (gameBridge) {
            gameBridge.destroy_joint(jointId);
          }
        });
      });
    },

    setMotorSpeed(jointId: number, speed: number) {
      callGameBridge('set_motor_speed', jointId, speed);
    },

    setMouseTarget(jointId: number, target: Vec2) {
      getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
        runOnGodotThread(() => {
          'worklet';
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
          if (gameBridge) {
            gameBridge.set_mouse_target(jointId, target.x, target.y);
          }
        });
      });
    },

    async queryPoint(point: Vec2): Promise<number | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            return gameBridge.query_point(point.x, point.y);
          }
        } catch (e) {
          console.log(`[Godot worklet] queryPoint error: ${e}`);
        }
        return null;
      });
    },

    async screenToWorld(screenX: number, screenY: number): Promise<Vec2> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge && typeof gameBridge._screen_to_world_impl === 'function') {
            const result = gameBridge._screen_to_world_impl(screenX, screenY) as { x: number; y: number };
            return result;
          }
        } catch (e) {
          console.log(`[Godot worklet] screenToWorld error: ${e}`);
        }
        return { x: 0, y: 0 };
      });
    },

    async queryPointEntity(point: Vec2): Promise<string | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            const entityId = gameBridge.query_point_entity(point.x, point.y);
            console.log(`[Godot worklet] query_point_entity(${point.x}, ${point.y}) = ${entityId}`);
            return entityId;
          }
        } catch (e) {
          console.log(`[Godot worklet] query_point_entity error: ${e}`);
        }
        return null;
      });
    },

    async queryAABB(min: Vec2, max: Vec2): Promise<number[]> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            const jsonResult = gameBridge.query_aabb(min.x, min.y, max.x, max.y);
            return jsonResult ? JSON.parse(jsonResult) as number[] : [];
          }
        } catch (e) {
          console.log(`[Godot worklet] queryAABB error: ${e}`);
        }
        return [];
      });
    },

    async raycast(origin: Vec2, direction: Vec2, maxDistance: number): Promise<RaycastHit | null> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge) {
            const jsonResult = gameBridge.raycast(origin.x, origin.y, direction.x, direction.y, maxDistance);
            return jsonResult ? JSON.parse(jsonResult) as RaycastHit : null;
          }
        } catch (e) {
          console.log(`[Godot worklet] raycast error: ${e}`);
        }
        return null;
      });
    },

    createBody(def: BodyDef): number {
      const bodyId = Date.now();
      const userDataJson = def.userData != null ? JSON.stringify(def.userData) : '';
      callGameBridge('create_body',
        def.type,
        def.position.x, def.position.y,
        def.angle ?? 0,
        def.linearDamping ?? 0,
        def.angularDamping ?? 0,
        def.fixedRotation ?? false,
        def.bullet ?? false,
        userDataJson,
        def.group ?? ''
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
      const dataJson = data != null ? JSON.stringify(data) : '';
      callGameBridge('set_user_data', bodyId, dataJson);
    },

    async getUserData(bodyId: number): Promise<unknown> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.user_data) {
            return gameBridge.user_data[bodyId] ?? null;
          }
        } catch (e) {
          console.log(`[Godot worklet] getUserData error: ${e}`);
        }
        return null;
      });
    },

    async getAllBodies(): Promise<number[]> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();
      
      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge') as unknown as GodotGameBridge | null;
          if (gameBridge?.body_id_reverse) {
            return Object.keys(gameBridge.body_id_reverse).map(k => parseInt(k, 10));
          }
        } catch (e) {
          console.log(`[Godot worklet] getAllBodies error: ${e}`);
        }
        return [];
      });
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

    onTransformSync(callback: (transforms: Record<string, EntityTransform>) => void): () => void {
      transformSyncCallbacks.push(callback);
      return () => {
        const index = transformSyncCallbacks.indexOf(callback);
        if (index >= 0) transformSyncCallbacks.splice(index, 1);
      };
    },

    onPropertySync(callback: (properties: PropertySyncPayload) => void): () => void {
      propertySyncCallbacks.push(callback);
      return () => {
        const index = propertySyncCallbacks.indexOf(callback);
        if (index >= 0) propertySyncCallbacks.splice(index, 1);
      };
    },

    setWatchConfig(config: unknown): void {
      callGameBridge('set_watch_config', JSON.stringify(config));
    },

    sendInput(type, data) {
      callGameBridge('send_input', type, data.x, data.y, data.entityId ?? '');
    },

    onInputEvent(callback: (type: string, x: number, y: number, entityId: string | null) => void): () => void {
      inputEventCallbacks.push(callback);
      return () => {
        const index = inputEventCallbacks.indexOf(callback);
        if (index >= 0) inputEventCallbacks.splice(index, 1);
      };
    },

    async setEntityImage(entityId: string, url: string, width: number, height: number) {
      try {
        const filename = `texture_${entityId}_${Date.now()}.png`;
        const localPath = `${FileSystem.cacheDirectory}${filename}`;
        
        console.log(`[GodotBridge.native] Downloading image for ${entityId}: ${url}`);
        const downloadResult = await FileSystem.downloadAsync(url, localPath);
        
        if (downloadResult.status === 200) {
          // Strip file:// prefix - Godot's Image.load() expects raw filesystem paths
          const godotPath = localPath.replace(/^file:\/\//, '');
          console.log(`[GodotBridge.native] Downloaded to ${godotPath}, calling set_entity_image_from_file`);
          callGameBridge('set_entity_image_from_file', entityId, godotPath, width, height);
        } else {
          console.error(`[GodotBridge.native] Failed to download image: status=${downloadResult.status}`);
        }
      } catch (e) {
        console.error(`[GodotBridge.native] setEntityImage error:`, e);
      }
    },

    async setEntityAtlasRegion(
      entityId: string,
      atlasUrl: string,
      x: number,
      y: number,
      w: number,
      h: number,
      width: number,
      height: number
    ) {
      try {
        const urlHash = atlasUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(-50);
        const filename = `atlas_${urlHash}.png`;
        const localPath = `${FileSystem.cacheDirectory}${filename}`;
        
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        let godotPath: string;
        if (fileInfo.exists) {
          godotPath = localPath.replace(/^file:\/\//, '');
        } else {
          console.log(`[GodotBridge.native] Downloading atlas for ${entityId}: ${atlasUrl}`);
          const downloadResult = await FileSystem.downloadAsync(atlasUrl, localPath);
          
          if (downloadResult.status !== 200) {
            console.error(`[GodotBridge.native] Failed to download atlas: status=${downloadResult.status}`);
            return;
          }
          godotPath = localPath.replace(/^file:\/\//, '');
        }
        
        console.log(`[GodotBridge.native] Setting atlas region for ${entityId}: ${godotPath}`);
        callGameBridge('set_entity_atlas_region_from_file', entityId, godotPath, x, y, w, h, width, height);
      } catch (e) {
        console.error(`[GodotBridge.native] setEntityAtlasRegion error:`, e);
      }
    },

    clearTextureCache(url?: string) {
      callGameBridge('clear_texture_cache', url ?? '');
    },

    async preloadTextures(urls: string[], onProgress?: (percent: number, completed: number, failed: number) => void): Promise<{ completed: number; failed: number }> {
      if (urls.length === 0) {
        onProgress?.(100, 0, 0);
        return { completed: 0, failed: 0 };
      }
      
      let completed = 0;
      let failed = 0;
      const total = urls.length;
      
      for (const url of urls) {
        try {
          const urlHash = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-50);
          const filename = `preload_${urlHash}.png`;
          const localPath = `${FileSystem.cacheDirectory}${filename}`;
          
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (!fileInfo.exists) {
            const downloadResult = await FileSystem.downloadAsync(url, localPath);
            if (downloadResult.status !== 200) {
              failed++;
            } else {
              completed++;
            }
          } else {
            completed++;
          }
        } catch {
          failed++;
        }
        
        const percent = Math.round(((completed + failed) / total) * 100);
        onProgress?.(percent, completed, failed);
      }
      
      return { completed, failed };
    },

    setDebugShowShapes(show: boolean) {
      callGameBridge('set_debug_show_shapes', show);
    },

    setDebugSettings(settings: { showInputDebug: boolean; showPhysicsShapes: boolean; showFPS: boolean }) {
      callGameBridge('set_debug_settings', JSON.stringify(settings));
    },

    setCameraTarget(entityId: string | null) {
      callGameBridge('set_camera_target', entityId ?? '');
    },

    setCameraPosition(x: number, y: number) {
      callGameBridge('set_camera_position', x, y);
    },

    setCameraZoom(zoom: number) {
      callGameBridge('set_camera_zoom', zoom);
    },

    spawnParticle(type: string, x: number, y: number) {
      callGameBridge('spawn_particle', type, x, y);
    },

    playSound(resourcePath: string) {
      callGameBridge('play_sound', resourcePath);
    },

    applySpriteEffect(entityId: string, effectName: string, params?: Record<string, unknown>) {
      callEffectsBridge('apply_sprite_effect', entityId, effectName, JSON.stringify(params ?? {}));
    },

    updateSpriteEffectParam(entityId: string, paramName: string, value: unknown) {
      callEffectsBridge('update_sprite_effect_param', entityId, paramName, value);
    },

    clearSpriteEffect(entityId: string) {
      callEffectsBridge('clear_sprite_effect', entityId);
    },

    setPostEffect(effectName: string, params?: Record<string, unknown>, layer?: string) {
      callEffectsBridge('set_post_effect', effectName, JSON.stringify(params ?? {}), layer ?? 'main');
    },

    updatePostEffectParam(paramName: string, value: unknown, layer?: string) {
      callEffectsBridge('update_post_effect_param', paramName, value, layer ?? 'main');
    },

    clearPostEffect(layer?: string) {
      callEffectsBridge('clear_post_effect', layer ?? 'main');
    },

    screenShake(intensity: number, duration?: number) {
      callEffectsBridge('screen_shake', intensity, duration ?? 0.3);
    },

    zoomPunch(intensity?: number, duration?: number) {
      callEffectsBridge('zoom_punch', intensity ?? 0.1, duration ?? 0.15);
    },

    triggerShockwave(worldX: number, worldY: number, duration?: number) {
      callEffectsBridge('trigger_shockwave', worldX, worldY, duration ?? 0.5);
    },

    flashScreen(color?: [number, number, number, number?], duration?: number) {
      const r = color?.[0] ?? 1;
      const g = color?.[1] ?? 1;
      const b = color?.[2] ?? 1;
      const a = color?.[3] ?? 1;
      callEffectsBridge('flash_screen', r, g, b, a, duration ?? 0.1);
    },

    async createDynamicShader(shaderId: string, shaderCode: string): Promise<DynamicShaderResult> {
      callEffectsBridge('create_dynamic_shader', shaderId, shaderCode);
      return { success: true, shader_id: shaderId };
    },

    applyDynamicShader(entityId: string, shaderId: string, params?: Record<string, unknown>) {
      callEffectsBridge('apply_dynamic_shader_to_entity', entityId, shaderId, JSON.stringify(params ?? {}));
    },

    applyDynamicPostShader(shaderCode: string, params?: Record<string, unknown>) {
      callEffectsBridge('apply_dynamic_post_shader', shaderCode, JSON.stringify(params ?? {}));
    },

    spawnParticlePreset(presetName: string, worldX: number, worldY: number, params?: Record<string, unknown>) {
      callEffectsBridge('spawn_particle_preset', presetName, worldX, worldY, JSON.stringify(params ?? {}));
    },

    async getAvailableEffects(): Promise<{ sprite: string[]; post: string[]; particles: string[] }> {
      return {
        sprite: ['outline', 'glow', 'tint', 'flash', 'pixelate', 'posterize', 'silhouette', 'rainbow', 'dissolve', 'holographic', 'wave', 'rim_light', 'color_matrix', 'inner_glow', 'drop_shadow'],
        post: ['vignette', 'scanlines', 'chromatic_aberration', 'shockwave', 'blur', 'crt', 'color_grading', 'glitch', 'motion_blur', 'pixelate_screen', 'shimmer'],
        particles: ['fire', 'smoke', 'sparks', 'magic', 'explosion', 'rain', 'snow', 'bubbles', 'confetti', 'dust', 'leaves', 'stars', 'blood', 'coins'],
      };
    },

    createUIButton(
      buttonId: string,
      normalImageUrl: string,
      pressedImageUrl: string,
      x: number,
      y: number,
      width: number,
      height: number
    ) {
      callGameBridge('create_ui_button', buttonId, normalImageUrl, pressedImageUrl, x, y, width, height);
    },

    destroyUIButton(buttonId: string) {
      callGameBridge('destroy_ui_button', buttonId);
    },

    onUIButtonEvent(callback: (eventType: 'button_down' | 'button_up' | 'button_pressed', buttonId: string) => void): () => void {
      uiButtonCallbacks.push(callback);
      return () => {
        const index = uiButtonCallbacks.indexOf(callback);
        if (index >= 0) uiButtonCallbacks.splice(index, 1);
      };
    },

    createThemedUIComponent(
      componentId: string,
      componentType: 0 | 1 | 2 | 3 | 4 | 5 | 6,
      metadataUrl: string,
      x: number,
      y: number,
      width: number,
      height: number,
      labelText: string = ''
    ) {
      callGameBridge('create_themed_ui_component', componentId, componentType, metadataUrl, x, y, width, height, labelText);
    },

    destroyThemedUIComponent(componentId: string) {
      callGameBridge('destroy_themed_ui_component', componentId);
    },

    show3DModel(path: string): boolean {
      callGameBridge('show_3d_model', path);
      return true;
    },

    show3DModelFromUrl(url: string): void {
      callGameBridge('show_3d_model_from_url', url);
    },

    set3DViewportPosition(x: number, y: number): void {
      callGameBridge('set_3d_viewport_position', x, y);
    },

    set3DViewportSize(width: number, height: number): void {
      callGameBridge('set_3d_viewport_size', width, height);
    },

    rotate3DModel(x: number, y: number, z: number): void {
      callGameBridge('rotate_3d_model', x, y, z);
    },

    set3DCameraDistance(distance: number): void {
      callGameBridge('set_3d_camera_distance', distance);
    },

    clear3DModels(): void {
      callGameBridge('clear_3d_models');
    },
  };

  return bridge;
}
