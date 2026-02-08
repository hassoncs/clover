import type {
  EffectPipelineSpec,
  GameDefinition,
  MultiPassEffectSpec,
  PipelineSnapshot,
  PropertySyncPayload,
} from '@slopcade/shared';
import { serializePipelineSpec } from '@slopcade/shared/effects/pipeline-serialization';
import type {
  GodotBridge,
  CollisionEvent,
  SensorEvent,
  EntitySpawnedEvent,
  EntityTransform,
  Vec2,
  SpawnEntityRequest,
  RaycastHit,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  WeldJointDef,
  MouseJointDef,
  BodyDef,
  ColliderConfig,
  ContactInfo,
  DynamicShaderResult,
  DrawCommand,
} from './types';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import './react-native-godot.d';
import { BridgeCore, type BridgeMessage } from './BridgeCore';
import { createCallbackArrays, createCallbackMethods, clearAllCallbacks } from './callback-registry';

class NativeBridgeCore extends BridgeCore {
  protected send(msg: BridgeMessage): void {
    if (msg.id) {
      callGameBridge('handle_request', msg.id, msg.type, JSON.stringify(msg.data ?? {}));
    }
  }
}

type GodotModule = typeof import('@borndotcom/react-native-godot');

interface GodotGameBridge {
  entities: Record<string, {
    position: { x: number; y: number };
    rotation: number;
  }>;
  pixels_per_meter: number;
  poll_events(): string;
  native_dispatch(method_name: string, args_json: string): unknown;
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
  if (isDisposing || !isGodotInitialized) {
    return;
  }

  const argsJson = JSON.stringify(args);
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    if (isDisposing) {
      return;
    }
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        gameBridge.native_dispatch(methodName, argsJson);
      }
    });
  });
}

function callGameBridgeAsync(methodName: string, ...args: unknown[]): Promise<any> {
  return new Promise((resolve, reject) => {
    if (isDisposing || !isGodotInitialized) {
      reject(new Error('Godot not initialized'));
      return;
    }

    const argsJson = JSON.stringify(args);
    getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
      if (isDisposing) {
        reject(new Error('Godot is disposing'));
        return;
      }

      runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
          if (gameBridge) {
            return gameBridge.native_dispatch(methodName, argsJson);
          }
          return null;
        } catch (e) {
          return null;
        }
      }).then(resolve).catch(reject);
    }).catch(reject);
  });
}

function callEffectsBridge(methodName: string, ...args: unknown[]) {
  if (isDisposing || !isGodotInitialized) return;

  const argsJson = JSON.stringify(args);
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    if (isDisposing) return;
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const effectsBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridgeEffects');
      if (effectsBridge) {
        effectsBridge.native_dispatch(methodName, argsJson);
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
  const cbs = createCallbackArrays();
  let eventPollTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let consecutiveEmptyPolls = 0;
  const bridgeCore = new NativeBridgeCore();

  function scheduleNextPoll() {
    if (isDisposing) return;
    const delay = consecutiveEmptyPolls === 0 ? 16 : Math.min(16 * Math.pow(2, consecutiveEmptyPolls), 100);
    eventPollTimeoutId = setTimeout(pollAndDispatchEvents, delay);
  }

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
        } catch (e) {}
        return '[]';
      });
      
      const events: QueuedEvent[] = JSON.parse(eventsJson);
      
      if (events.length === 0) {
        consecutiveEmptyPolls++;
      } else {
        consecutiveEmptyPolls = 0;
      }

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
            for (const cb of cbs.collision) cb(collisionEvent);
            bridgeCore.dispatch({ type: 'collision', data: collisionEvent });
            break;
          }
          case 'collision_detailed': {
            const data = event.data as { entityA: string; entityB: string; contacts: ContactInfo[] };
            const collisionEvent: CollisionEvent = {
              entityA: data.entityA,
              entityB: data.entityB,
              contacts: data.contacts,
            };
            for (const cb of cbs.collision) cb(collisionEvent);
            bridgeCore.dispatch({ type: 'collision', data: collisionEvent });
            break;
          }
          case 'destroy': {
            const entityId = (event.data as { entityId: string }).entityId;
            for (const cb of cbs.destroy) cb(entityId);
            bridgeCore.dispatch({ type: 'entity_destroyed', data: { entityId } });
            break;
          }
          case 'entity_spawned': {
            const data = event.data as unknown as EntitySpawnedEvent;
            for (const cb of cbs.entitySpawned) cb(data);
            bridgeCore.dispatch({ type: 'entity_spawned', data });
            break;
          }
          case 'sensor_begin': {
            const data = event.data as { sensorShapeIndex: number; otherEntityId: string; otherShapeIndex: number };
            const sensorEvent: SensorEvent = {
              sensorShapeIndex: data.sensorShapeIndex,
              otherEntityId: data.otherEntityId,
              otherShapeIndex: data.otherShapeIndex,
            };
            for (const cb of cbs.sensorBegin) cb(sensorEvent);
            bridgeCore.dispatch({ type: 'sensor_begin', data: sensorEvent });
            break;
          }
          case 'sensor_end': {
            const data = event.data as { sensorShapeIndex: number; otherEntityId: string; otherShapeIndex: number };
            const sensorEvent: SensorEvent = {
              sensorShapeIndex: data.sensorShapeIndex,
              otherEntityId: data.otherEntityId,
              otherShapeIndex: data.otherShapeIndex,
            };
            for (const cb of cbs.sensorEnd) cb(sensorEvent);
            bridgeCore.dispatch({ type: 'sensor_end', data: sensorEvent });
            break;
          }
          case 'ui_button': {
            const data = event.data as { eventType: string; buttonId: string };
            for (const cb of cbs.uiButton) {
              cb(data.eventType as 'button_down' | 'button_up' | 'button_pressed', data.buttonId);
            }
            break;
          }
          case 'input': {
            const data = event.data as { type: string; x: number; y: number; entityId: string | null };
            for (const cb of cbs.inputEvent) {
              cb(data.type, data.x, data.y, data.entityId);
            }
            break;
          }
          case 'property_sync': {
            const data = event.data as unknown as PropertySyncPayload;
            for (const cb of cbs.propertySync) {
              cb(data);
            }
            break;
          }
          case 'score': {
            const data = event.data as { points: number; entityId: string };
            for (const cb of cbs.score) {
              cb(data.points, data.entityId);
            }
            break;
          }
        }
      }
    } catch (e) {}
    
    scheduleNextPoll();
  }

  const bridge: GodotBridge = {
    async initialize() {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();

      if (isGodotInitialized) {
        return;
      }

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
              if (!instance) {
                return { ready: false, stage: 'no_instance' };
              }
              const api = RTNGodot.API();
              if (!api) {
                return { ready: false, stage: 'no_api' };
              }
              if (!api.Engine) {
                return { ready: false, stage: 'no_engine' };
              }
              const mainLoop = api.Engine.get_main_loop();
              if (!mainLoop) {
                return { ready: false, stage: 'no_main_loop' };
              }
              const root = mainLoop.get_root();
              if (!root) {
                return { ready: false, stage: 'no_root' };
              }
              return { ready: true, stage: 'ready' };
            } catch (e) {
              return { ready: false, stage: 'exception', error: String(e) };
            }
          }).then((result: { ready: boolean; stage: string; error?: string }) => {
            if (result.ready) {
              isGodotInitialized = true;
              
              scheduleNextPoll();
              
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error(`[GodotBridge] TIMEOUT: Godot never reached ready state. Last stage: ${result.stage}${result.error ? `, error: ${result.error}` : ''}`);
              reject(new Error(`Godot engine failed to initialize after 10 seconds (stuck at: ${result.stage})`));
            } else {
              setTimeout(checkReady, 100);
            }
          }).catch((err) => {
            if (attempts >= maxAttempts) {
              reject(new Error(`Godot engine failed to initialize (runOnGodotThread error: ${err})`));
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
      
      if (eventPollTimeoutId) {
        clearTimeout(eventPollTimeoutId);
        eventPollTimeoutId = null;
      }
      bridgeCore.cancelAllPending('Bridge disposed');

      clearAllCallbacks(cbs);

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
              gameBridge.native_dispatch('clear_game', '[]');
            }
          } catch (e) {
            // Error during dispose
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
    setInspectMode(_enabled: boolean) {
      // Not implemented for native yet - only web needs this
    },

    async stepPhysics(frames: number): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }> {
      const response = await callGameBridgeAsync('callRpc', JSON.stringify({ 
        method: "time.step", 
        params: { frames } 
      }));
      const result = JSON.parse(response);
      return {
        ok: result.ok ?? true,
        framesAdvanced: result.framesAdvanced ?? frames,
        endFrame: result.endFrame ?? 0
      };
    },

    async callRpc(method: string, params?: unknown): Promise<any> {
      const response = await callGameBridgeAsync('callRpc', JSON.stringify({ method, params }));
      const parsed = JSON.parse(response);
      if (parsed.error) {
        throw new Error(parsed.error.message);
      }
      return parsed.result ?? parsed;
    },

    spawnEntity(request: SpawnEntityRequest): void {
      const velocityJson = request.velocity ? JSON.stringify(request.velocity) : '';
      callGameBridge('spawn_entity_with_id', request.templateId, request.position.x, request.position.y, request.entityId, velocityJson);
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
            if (node?.position) {
              const ppm = gameBridge.pixels_per_meter || 50.0;
              return {
                x: node.position.x / ppm,
                y: node.position.y / ppm,
                angle: node.rotation
              } as EntityTransform;
            }
          }
        } catch (e) {
          // Error getting entity transform
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
        } catch (e) {}
        return {};
      });
    },

    async getAllProperties(): Promise<PropertySyncPayload> {
      const result = await callGameBridgeAsync('get_all_properties');
      if (result && typeof result === 'object') {
        return result as PropertySyncPayload;
      }
      return { frameId: 0, timestamp: 0, entities: {} };
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

    setOpacity(entityId: string, opacity: number) {
      callGameBridge('set_opacity', entityId, opacity);
    },

    setVisible(entityId: string, visible: boolean) {
      callGameBridge('set_visible', entityId, visible);
    },

    async getLinearVelocity(entityId: string): Promise<Vec2 | null> {
      const result = await callGameBridgeAsync('get_linear_velocity', entityId);
      if (result && typeof result === 'object' && 'x' in result) {
        return result as Vec2;
      }
      return null;
    },

    setLinearVelocity(entityId: string, velocity: Vec2) {
      callGameBridge('set_linear_velocity', entityId, velocity.x, velocity.y);
    },

    async getAngularVelocity(entityId: string): Promise<number | null> {
      const result = await callGameBridgeAsync('get_angular_velocity', entityId);
      return typeof result === 'number' ? result : null;
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
      const result = await callGameBridgeAsync('create_mouse_joint',
        def.body,
        def.target.x, def.target.y,
        def.maxForce,
        def.stiffness ?? 5, def.damping ?? 0.7
      );
      return typeof result === 'number' ? result : -1;
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

    async queryPoint(point: Vec2): Promise<number | null> {
      const result = await callGameBridgeAsync('query_point', point.x, point.y);
      return typeof result === 'number' ? result : null;
    },

    async screenToWorld(screenX: number, screenY: number): Promise<Vec2> {
      const { RTNGodot, runOnGodotThread } = await getGodotModule();

      return runOnGodotThread(() => {
        'worklet';
        try {
          const Godot = RTNGodot.API();
          const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
          if (gameBridge) {
            const argsJson = JSON.stringify([screenX, screenY]);
            const result = gameBridge.native_dispatch('screen_to_world', argsJson);
            if (result && typeof result === 'object') {
              return result as Vec2;
            }
          }
        } catch (e) {}
        return { x: 0, y: 0 };
      });
    },

    async queryPointEntity(point: Vec2): Promise<string | null> {
      const result = await callGameBridgeAsync('query_point_entity', point.x, point.y);
      return typeof result === 'string' ? result : null;
    },

    async queryAABB(min: Vec2, max: Vec2): Promise<number[]> {
      const result = await callGameBridgeAsync('query_aabb', min.x, min.y, max.x, max.y);
      if (typeof result === 'string') {
        return JSON.parse(result) as number[];
      }
      return Array.isArray(result) ? result : [];
    },

    async raycast(origin: Vec2, direction: Vec2, maxDistance: number): Promise<RaycastHit | null> {
      const result = await callGameBridgeAsync('raycast', origin.x, origin.y, direction.x, direction.y, maxDistance);
      if (typeof result === 'string') {
        return JSON.parse(result) as RaycastHit;
      }
      return result as RaycastHit | null;
    },



    setUserData(_entityId: string, _data: unknown) {},

    async getUserData(_entityId: string): Promise<unknown> {
      return null;
    },

    async getAllEntities(): Promise<string[]> {
      return [];
    },

    ...createCallbackMethods(cbs),

    setWatchConfig(config: unknown): void {
      callGameBridge('set_watch_config', JSON.stringify(config));
    },

    sendInput(type, data) {
      callGameBridge('send_input', type, data.x, data.y, data.entityId ?? '');
    },

    createPixelBuffer(entityId: string, width: number, height: number, clearColor: string, worldWidth?: number, worldHeight?: number) {
      callGameBridge('createPixelBuffer', entityId, width, height, clearColor, worldWidth ?? 0, worldHeight ?? 0);
    },
    pixelBufferDraw(entityId: string, commands: DrawCommand[]) {
      callGameBridge('pixelBufferDraw', entityId, JSON.stringify(commands));
    },
    pixelBufferClear(entityId: string, color: string) {
      callGameBridge('pixelBufferClear', entityId, color);
    },
    destroyPixelBuffer(entityId: string) {
      callGameBridge('destroyPixelBuffer', entityId);
    },

    async setEntityImage(entityId: string, url: string, width: number, height: number) {
      try {
        const filename = `texture_${entityId}_${Date.now()}.png`;
        const localPath = `${FileSystem.cacheDirectory}${filename}`;
        
        const downloadResult = await FileSystem.downloadAsync(url, localPath);
        
        if (downloadResult.status === 200) {
          // Strip file:// prefix - Godot's Image.load() expects raw filesystem paths
          const godotPath = localPath.replace(/^file:\/\//, '');
          callGameBridge('set_entity_image_from_file', entityId, godotPath, width, height);
        }
      } catch (e) {}
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
          const downloadResult = await FileSystem.downloadAsync(atlasUrl, localPath);
          
          if (downloadResult.status !== 200) {
            return;
          }
          godotPath = localPath.replace(/^file:\/\//, '');
        }
        
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

    setDebugSettings(settings: { showInputDebug: boolean; showPhysicsShapes: boolean; showZones: boolean; showFPS: boolean }) {
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

    startCamera(entityId: string, width?: number, height?: number) {
      callGameBridge('start_camera', entityId, width ?? 1280, height ?? 720);
    },

    stopCamera() {
      callGameBridge('stop_camera');
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

    applyPipeline(spec: EffectPipelineSpec) {
      const specJson = serializePipelineSpec(spec);
      callEffectsBridge('apply_pipeline', specJson);
    },

    clearPipeline() {
      callEffectsBridge('clear_pipeline');
    },

    updatePipelinePassParam(passId: string, paramName: string, value: unknown) {
      callEffectsBridge('update_pipeline_pass_param', passId, paramName, value);
    },

    startPipeline() {
      callEffectsBridge('start_pipeline');
    },

    pausePipeline() {
      callEffectsBridge('pause_pipeline');
    },

    resumePipeline() {
      callEffectsBridge('resume_pipeline');
    },

    stopPipeline() {
      callEffectsBridge('stop_pipeline');
    },

    resetPipeline() {
      callEffectsBridge('reset_pipeline');
    },

    async captureSnapshot(): Promise<PipelineSnapshot> {
      const result = await callGameBridgeAsync('capture_pipeline_snapshot');
      if (result && typeof result === 'object' && 'pipelineId' in (result as Record<string, unknown>)) {
        return result as PipelineSnapshot;
      }
      if (typeof result === 'string') {
        try {
          return JSON.parse(result) as PipelineSnapshot;
        } catch {}
      }
      return { pipelineId: '', passes: [], lifecycleState: 'idle', timestamp: 0 };
    },

    restoreSnapshot(snapshot: PipelineSnapshot) {
      callEffectsBridge('restore_pipeline_snapshot', JSON.stringify(snapshot));
    },

    applyMultiPassEffect(entityId: string, spec: MultiPassEffectSpec) {
      callEffectsBridge('apply_multi_pass_effect', entityId, JSON.stringify(spec));
    },

    startMultiPassEffect() {
      callEffectsBridge('start_multi_pass_effect');
    },

    stopMultiPassEffect() {
      callEffectsBridge('stop_multi_pass_effect');
    },

    setMultiPassInput(passId: string, inputs: Record<string, unknown>) {
      callEffectsBridge('set_multi_pass_input', passId, JSON.stringify(inputs));
    },

    clearMultiPassEffect() {
      callEffectsBridge('clear_multi_pass_effect');
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

    set3DCameraSize(size: number): void {
      callGameBridge('set_3d_camera_size', size);
    },

    clear3DModels(): void {
      callGameBridge('clear_3d_models');
    },
  };

  return bridge;
}
