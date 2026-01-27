import type {
  GodotDebugBridge,
  GameSnapshot,
  EntitySnapshot,
  SnapshotOptions,
  ScreenshotOptions,
  ScreenshotResult,
  Annotation,
  AnnotateOptions,
  TapResult,
  DragOptions,
  WaitResult,
  CollisionRecord,
  DebugBridgeState,
  Vec2,
  ViewportInfo,
  QueryOptions,
  QueryResult,
  GetPropsResult,
  SetPropsOptions,
  SetPropsResult,
  PatchOp,
  PatchPropsResult,
  SpawnRequest,
  SpawnResult,
  DestroyOptions,
  DestroyResult,
  CloneOptions,
  CloneResult,
  ReparentOptions,
  ReparentResult,
  TimeState,
  TimeControlResult,
  StepResult,
  SubscribeRequest,
  SubscribeResult,
  PollEventsOptions,
  PollEventsResult,
  RaycastRequest,
  RaycastResult,
  GetShapesResult,
  GetJointsResult,
  GetOverlapsResult,
  QueryPointResult,
  QueryAABBResult,
  AABB,
} from './types';
import { DEBUG_BRIDGE_VERSION } from './types';
import { annotateImage } from './screenshot';
import { createAssertions } from './assertions';
import { queryAsync as sharedQueryAsync, type GodotBridgeBase } from '../query';

const DEFAULT_MAX_COLLISION_HISTORY = 100;
const DEFAULT_POLL_INTERVAL_MS = 16;

interface GodotBridgeExtended extends GodotBridgeBase {
  _lastResult: unknown;
  getAllTransforms: () => void;
  getAllProperties: () => void;
  getSceneSnapshot?: () => void;
  queryPointEntity: (x: number, y: number) => void;
  sendInput: (type: string, x: number, y: number, entityId: string) => void;
  captureScreenshot?: (withOverlays: boolean, overlayTypesJson: string) => void;
  setDebugShowShapes?: (show: boolean) => void;
  getWorldInfo?: () => void;
  getCameraInfo?: () => void;
  getViewportInfo?: () => void;
  onCollision: (callback: (dataOrEntityA: string, entityB?: string, impulse?: number) => void) => void;
}

function queryAsync<T>(bridge: GodotBridgeExtended, method: string, args: unknown[] = [], timeoutMs = 5000): Promise<T> {
  return sharedQueryAsync<T>(bridge, method, args, { timeoutMs });
}

declare const __DEV__: boolean | undefined;

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') return true;

  return false;
}

function getGodotBridge(): GodotBridgeExtended | null {
  const iframe = document.querySelector(
    'iframe[title="Godot Game Engine"]'
  ) as HTMLIFrameElement | null;

  if (iframe?.contentWindow) {
    const win = iframe.contentWindow as { GodotBridge?: GodotBridgeExtended };
    return win.GodotBridge ?? null;
  }

  const win = window as unknown as { GodotBridge?: GodotBridgeExtended };
  return win.GodotBridge ?? null;
}

export function createGodotDebugBridge(): GodotDebugBridge | null {
  if (!isDebugEnabled()) {
    console.warn('[GodotDebugBridge] Debug mode not enabled. Add ?debug=true to URL or run in dev mode.');
    return null;
  }

  const state: DebugBridgeState = {
    enabled: true,
    collisionHistory: [],
    maxCollisionHistory: DEFAULT_MAX_COLLISION_HISTORY,
    frameId: 0,
  };

  let pixelsPerMeter = 50;
  let cameraPosition: Vec2 = { x: 0, y: 0 };
  let cameraZoom = 1;
  let viewportSize: ViewportInfo = { width: 800, height: 600 };
  let cachedSnapshot: GameSnapshot | null = null;

  const setupCollisionTracking = () => {
    const bridge = getGodotBridge();
    if (!bridge) return;

    bridge.onCollision((dataOrEntityA: string, entityB?: string, impulse?: number) => {
      try {
        let record: CollisionRecord;

        if (entityB === undefined) {
          const data = JSON.parse(dataOrEntityA);
          record = {
            entityA: data.entityA,
            entityB: data.entityB,
            timestamp: Date.now(),
            frameId: state.frameId,
            impulse: data.contacts?.[0]?.normalImpulse ?? 0,
            position: data.contacts?.[0]?.point ?? { x: 0, y: 0 },
          };
        } else {
          record = {
            entityA: dataOrEntityA,
            entityB: entityB,
            timestamp: Date.now(),
            frameId: state.frameId,
            impulse: impulse ?? 0,
            position: { x: 0, y: 0 },
          };
        }

        state.collisionHistory.push(record);
        if (state.collisionHistory.length > state.maxCollisionHistory) {
          state.collisionHistory.shift();
        }
      } catch {
        // Parse error - ignore malformed collision data
      }
    });
  };

  setupCollisionTracking();

  const worldToScreen = (worldPos: Vec2): Vec2 => {
    const screenX = (worldPos.x - cameraPosition.x) * pixelsPerMeter * cameraZoom + viewportSize.width / 2;
    const screenY = (-worldPos.y + cameraPosition.y) * pixelsPerMeter * cameraZoom + viewportSize.height / 2;
    return { x: screenX, y: screenY };
  };

  const screenToWorld = (screenPos: Vec2): Vec2 => {
    const worldX = (screenPos.x - viewportSize.width / 2) / (pixelsPerMeter * cameraZoom) + cameraPosition.x;
    const worldY = -(screenPos.y - viewportSize.height / 2) / (pixelsPerMeter * cameraZoom) + cameraPosition.y;
    return { x: worldX, y: worldY };
  };

  const getSnapshot = async (options: SnapshotOptions = {}): Promise<GameSnapshot> => {
    const bridge = getGodotBridge();
    if (!bridge) {
      throw new Error('[GodotDebugBridge] Godot bridge not available');
    }

    const detail = options.detail ?? 'med';
    const maxEntities = options.maxEntities ?? 1000;

    interface SceneNode {
      name: string;
      id: string;
      entityId?: string;
      type: string;
      template?: string;
      position: { x: number; y: number };
      angle: number;
      visible?: boolean;
      zIndex?: number;
      physics?: {
        bodyType: string;
        mass?: number;
        sleeping?: boolean;
        velocity?: { x: number; y: number };
        angularVelocity?: number;
      };
      sprite?: { texture: string | null; modulate: string };
      meta?: Record<string, unknown>;
    }

    let sceneEntities: SceneNode[] = [];
    let worldInfo: { pixelsPerMeter?: number; gravity?: { x: number; y: number }; bounds?: { width: number; height: number } } = {};
    let cameraInfo: { x?: number; y?: number; zoom?: number; target?: string } = {};
    let vpInfo: { width?: number; height?: number } = {};

    const supportsAsyncQuery = !!bridge.query;

    if (supportsAsyncQuery) {
      const [worldResult, cameraResult, vpResult, snapshotResult] = await Promise.all([
        queryAsync<typeof worldInfo>(bridge, 'getWorldInfo').catch(() => ({})),
        queryAsync<typeof cameraInfo>(bridge, 'getCameraInfo').catch(() => ({})),
        queryAsync<typeof vpInfo>(bridge, 'getViewportInfo').catch(() => ({})),
        queryAsync<{ timestamp?: number; entities: SceneNode[] }>(bridge, 'getSceneSnapshot').catch(() => ({ entities: [] })),
      ]);
      worldInfo = worldResult;
      cameraInfo = cameraResult;
      vpInfo = vpResult;
      sceneEntities = snapshotResult.entities ?? [];
    } else {
      if (bridge.getWorldInfo) {
        bridge.getWorldInfo();
        worldInfo = (bridge._lastResult ?? {}) as typeof worldInfo;
      }
      if (bridge.getCameraInfo) {
        bridge.getCameraInfo();
        cameraInfo = (bridge._lastResult ?? {}) as typeof cameraInfo;
      }
      if (bridge.getViewportInfo) {
        bridge.getViewportInfo();
        vpInfo = (bridge._lastResult ?? {}) as typeof vpInfo;
      }
      if (bridge.getSceneSnapshot) {
        bridge.getSceneSnapshot();
        const sceneSnapshot = (bridge._lastResult ?? { entities: [] }) as { timestamp?: number; entities: SceneNode[] };
        sceneEntities = sceneSnapshot.entities ?? [];
      } else {
        bridge.getAllTransforms();
        const transforms = (bridge._lastResult ?? {}) as Record<string, { x: number; y: number; angle: number }>;
        bridge.getAllProperties();
        const properties = (bridge._lastResult ?? { entities: {} }) as { entities: Record<string, Record<string, unknown>> };
        sceneEntities = Object.keys(transforms).map((id) => ({
          name: id,
          id,
          entityId: id,
          type: 'Node2D',
          position: { x: transforms[id].x, y: transforms[id].y },
          angle: transforms[id].angle,
          ...properties.entities[id],
        })) as SceneNode[];
      }
    }

    pixelsPerMeter = worldInfo.pixelsPerMeter ?? 50;
    cameraPosition = { x: cameraInfo.x ?? 0, y: cameraInfo.y ?? 0 };
    cameraZoom = cameraInfo.zoom ?? 1;
    viewportSize = { width: vpInfo.width ?? 800, height: vpInfo.height ?? 600 };

    state.frameId++;

    // Filter entities
    let filteredEntities = sceneEntities;

    if (options.filterTemplate) {
      filteredEntities = filteredEntities.filter((e) => e.template === options.filterTemplate);
    }

    if (options.filterTags && options.filterTags.length > 0) {
      filteredEntities = filteredEntities.filter((e) => {
        const tags = (e.meta?.tags ?? []) as string[];
        return options.filterTags!.some((tag) => tags.includes(tag));
      });
    }

    const limitedEntities = filteredEntities.slice(0, maxEntities);

    // Map to EntitySnapshot format
    const entities: EntitySnapshot[] = limitedEntities.map((node) => {
      const entity: EntitySnapshot = {
        id: node.entityId ?? node.id,
        template: node.template ?? node.type,
        position: node.position,
        angle: node.angle,
      };

      if (detail === 'med' || detail === 'high') {
        entity.velocity = node.physics?.velocity;
        entity.angularVelocity = node.physics?.angularVelocity;
      }

      if (detail === 'high') {
        entity.physics = node.physics ? {
          bodyType: node.physics.bodyType as 'dynamic' | 'static' | 'kinematic',
          mass: node.physics.mass,
          isSleeping: node.physics.sleeping,
        } : undefined;
        entity.visible = node.visible;
        entity.zIndex = node.zIndex;
      }

      return entity;
    });

    const snapshot: GameSnapshot = {
      protocolVersion: DEBUG_BRIDGE_VERSION,
      timestamp: Date.now(),
      frameId: state.frameId,
      world: {
        pixelsPerMeter,
        gravity: worldInfo.gravity ?? { x: 0, y: -9.8 },
        bounds: worldInfo.bounds ?? { width: 20, height: 12 },
      },
      camera: {
        position: cameraPosition,
        zoom: cameraZoom,
        target: cameraInfo.target,
      },
      viewport: viewportSize,
      entities,
      entityCount: sceneEntities.length,
    };

    cachedSnapshot = snapshot;
    return snapshot;
  };

  const getEntity = async (entityId: string): Promise<EntitySnapshot | null> => {
    const snapshot = await getSnapshot({ detail: 'high', maxEntities: 10000 });
    return snapshot.entities.find((e) => e.id === entityId) ?? null;
  };

  const captureScreenshot = async (options: ScreenshotOptions = {}): Promise<ScreenshotResult> => {
    const bridge = getGodotBridge();
    if (!bridge) {
      throw new Error('[GodotDebugBridge] Godot bridge not available');
    }

    const withOverlays = options.withOverlays ?? false;
    const overlayTypes = options.overlayTypes ?? ['bounds', 'labels'];
    const format = options.format ?? 'png';

    if (bridge.captureScreenshot) {
      bridge.captureScreenshot(withOverlays, JSON.stringify(overlayTypes));
      const result = bridge._lastResult as {
        base64?: string;
        width?: number;
        height?: number;
        timestamp?: number;
        frameId?: number;
      } | null;

      if (result?.base64) {
        return {
          base64: result.base64,
          width: result.width ?? 800,
          height: result.height ?? 600,
          timestamp: result.timestamp ?? Date.now(),
          frameId: result.frameId ?? state.frameId,
          format,
        };
      }
    }

    throw new Error('[GodotDebugBridge] Screenshot capture not supported - captureScreenshot method not available on bridge');
  };

  const annotateScreenshotFn = async (
    base64: string,
    annotations: Annotation[],
    options: AnnotateOptions = {}
  ): Promise<string> => {
    const coordSystem = options.coordSystem ?? 'world';

    const screenAnnotations = annotations.map((ann) => {
      if (coordSystem === 'screen') return ann;

      const converted = { ...ann } as Record<string, unknown>;

      if ('position' in converted && converted.position) {
        converted.position = worldToScreen(converted.position as Vec2);
      }
      if ('start' in converted && converted.start) {
        converted.start = worldToScreen(converted.start as Vec2);
      }
      if ('end' in converted && converted.end) {
        converted.end = worldToScreen(converted.end as Vec2);
      }

      if ('width' in converted && typeof converted.width === 'number') {
        converted.width = converted.width * pixelsPerMeter * cameraZoom;
      }
      if ('height' in converted && typeof converted.height === 'number') {
        converted.height = converted.height * pixelsPerMeter * cameraZoom;
      }
      if ('radius' in converted && typeof converted.radius === 'number') {
        converted.radius = converted.radius * pixelsPerMeter * cameraZoom;
      }

      return converted as unknown as Annotation;
    });

    return annotateImage(base64, screenAnnotations);
  };

  const simulateTap = async (x: number, y: number): Promise<TapResult> => {
    const bridge = getGodotBridge();
    if (!bridge) {
      throw new Error('[GodotDebugBridge] Godot bridge not available');
    }

    bridge.queryPointEntity(x, y);
    const hitEntity = bridge._lastResult as string | null;

    bridge.sendInput('tap', x, y, hitEntity ?? '');

    return {
      hit: hitEntity,
      worldPos: { x, y },
      screenPos: worldToScreen({ x, y }),
      timestamp: Date.now(),
    };
  };

  const simulateDrag = async (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
    options: DragOptions = {}
  ): Promise<void> => {
    const bridge = getGodotBridge();
    if (!bridge) {
      throw new Error('[GodotDebugBridge] Godot bridge not available');
    }

    const steps = options.steps ?? Math.max(10, Math.floor(durationMs / 16));
    const easing = options.easing ?? 'linear';

    const ease = (t: number): number => {
      switch (easing) {
        case 'ease-in':
          return t * t;
        case 'ease-out':
          return t * (2 - t);
        case 'ease-in-out':
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:
          return t;
      }
    };

    bridge.sendInput('drag_start', startX, startY, '');

    const stepDelay = durationMs / steps;

    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      const currentX = startX + (endX - startX) * t;
      const currentY = startY + (endY - startY) * t;

      await new Promise((resolve) => setTimeout(resolve, stepDelay));
      bridge.sendInput('drag_move', currentX, currentY, '');
    }

    bridge.sendInput('drag_end', endX, endY, '');
  };

  const waitForCondition = async (
    predicate: () => boolean | Promise<boolean>,
    timeoutMs: number,
    pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ): Promise<WaitResult> => {
    const startTime = Date.now();
    let lastValue: unknown = false;

    while (Date.now() - startTime < timeoutMs) {
      try {
        lastValue = await predicate();
        if (lastValue) {
          return {
            success: true,
            elapsedMs: Date.now() - startTime,
            timedOut: false,
            lastValue,
          };
        }
      } catch {
        // Predicate threw an error - continue waiting
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      success: false,
      elapsedMs: Date.now() - startTime,
      timedOut: true,
      lastValue,
    };
  };

  const waitForEntity = async (entityId: string, timeoutMs: number): Promise<WaitResult> => {
    return waitForCondition(async () => {
      const entity = await getEntity(entityId);
      return entity !== null;
    }, timeoutMs);
  };

  const waitForStationary = async (
    entityId: string,
    timeoutMs: number,
    epsilon: number = 0.1
  ): Promise<WaitResult> => {
    return waitForCondition(async () => {
      const entity = await getEntity(entityId);
      if (!entity || !entity.velocity) return false;
      const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
      return speed < epsilon;
    }, timeoutMs);
  };

  const waitForCollision = async (
    entityA: string,
    entityB: string,
    timeoutMs: number
  ): Promise<WaitResult> => {
    const startTime = Date.now();

    return waitForCondition(() => {
      const recent = state.collisionHistory.filter((c) => c.timestamp >= startTime);
      return recent.some(
        (c) =>
          (c.entityA === entityA && c.entityB === entityB) ||
          (c.entityA === entityB && c.entityB === entityA)
      );
    }, timeoutMs);
  };

  const nextFrame = async (): Promise<number> => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        state.frameId++;
        resolve(state.frameId);
      });
    });
  };

  const getLatestSnapshot = (): GameSnapshot | null => cachedSnapshot;

  const assertions = createAssertions(getLatestSnapshot, state);

  const debugBridge: GodotDebugBridge = {
    version: DEBUG_BRIDGE_VERSION,
    enabled: state.enabled,

    getSnapshot,
    getEntity,

    captureScreenshot,
    annotateScreenshot: annotateScreenshotFn,

    simulateTap,
    simulateDrag,

    worldToScreen,
    screenToWorld,

    assert: assertions,

    waitForCondition,
    waitForEntity,
    waitForStationary,
    waitForCollision,

    getCollisionHistory: () => [...state.collisionHistory],
    clearCollisionHistory: () => {
      state.collisionHistory = [];
    },

    nextFrame,
    getFrameId: () => state.frameId,

    // V2 APIs - Selector/Query
    query: async (selector: string, options?: QueryOptions): Promise<QueryResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<QueryResult>(bridge, 'query', [selector, options ?? {}]);
    },

    // V2 APIs - Property access
    getProps: async (entityId: string, paths: string[]): Promise<GetPropsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<GetPropsResult>(bridge, 'getProps', [entityId, paths]);
    },

    getAllProps: async (entityId: string): Promise<Record<string, unknown>> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      const result = await queryAsync<{ entityId: string; values?: Record<string, unknown>; error?: string }>(bridge, 'getAllProps', [entityId]);
      return result.values ?? result;
    },

    setProps: async (entityId: string, values: Record<string, unknown>, options?: SetPropsOptions): Promise<SetPropsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<SetPropsResult>(bridge, 'setProps', [entityId, values, options ?? {}]);
    },

    patchProps: async (ops: PatchOp[], options?: SetPropsOptions): Promise<PatchPropsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<PatchPropsResult>(bridge, 'patchProps', [ops, options ?? {}]);
    },

    // V2 APIs - Lifecycle
    spawn: async (request: SpawnRequest): Promise<SpawnResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<SpawnResult>(bridge, 'spawn', [request]);
    },

    destroy: async (entityId: string, options?: DestroyOptions): Promise<DestroyResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<DestroyResult>(bridge, 'destroy', [entityId, options ?? {}]);
    },

    clone: async (entityId: string, options?: CloneOptions): Promise<CloneResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<CloneResult>(bridge, 'clone', [entityId, options ?? {}]);
    },

    reparent: async (entityId: string, newParentId: string, options?: ReparentOptions): Promise<ReparentResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<ReparentResult>(bridge, 'reparent', [entityId, newParentId, options ?? {}]);
    },

    // V2 APIs - Time control
    getTimeState: async (): Promise<TimeState> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<TimeState>(bridge, 'getTimeState', []);
    },

    pause: async (): Promise<TimeControlResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<TimeControlResult>(bridge, 'pause', []);
    },

    resume: async (): Promise<TimeControlResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<TimeControlResult>(bridge, 'resume', []);
    },

    step: async (frames: number): Promise<StepResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<StepResult>(bridge, 'step', [frames]);
    },

    setTimeScale: async (scale: number): Promise<TimeControlResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<TimeControlResult>(bridge, 'setTimeScale', [scale]);
    },

    setSeed: async (seed: number, options?: { enableDeterministic?: boolean }): Promise<TimeControlResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<TimeControlResult>(bridge, 'setSeed', [seed, options ?? {}]);
    },

    // V2 APIs - Event monitoring
    subscribe: async (request: SubscribeRequest): Promise<SubscribeResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<SubscribeResult>(bridge, 'subscribe', [request]);
    },

    unsubscribe: async (subId: string): Promise<{ ok: boolean; error?: string }> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<{ ok: boolean; error?: string }>(bridge, 'unsubscribe', [subId]);
    },

    pollEvents: async (options?: PollEventsOptions): Promise<PollEventsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<PollEventsResult>(bridge, 'pollEvents', [options ?? {}]);
    },

    // V2 APIs - Physics queries
    raycast: async (request: RaycastRequest): Promise<RaycastResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<RaycastResult>(bridge, 'raycast', [request]);
    },

    getShapes: async (entityId: string): Promise<GetShapesResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<GetShapesResult>(bridge, 'getShapes', [entityId]);
    },

    getJoints: async (entityId?: string): Promise<GetJointsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      if (entityId) {
        return queryAsync<GetJointsResult>(bridge, 'getEntityJoints', [entityId]);
      }
      return queryAsync<GetJointsResult>(bridge, 'getJoints', [{}]);
    },

    getOverlaps: async (entityId: string): Promise<GetOverlapsResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<GetOverlapsResult>(bridge, 'getOverlaps', [entityId]);
    },

    queryPoint: async (x: number, y: number, options?: { mask?: number; includeSensors?: boolean }): Promise<QueryPointResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<QueryPointResult>(bridge, 'queryPoint', [x, y, options ?? {}]);
    },

    queryAABB: async (rect: AABB, options?: { mask?: number; includeSensors?: boolean }): Promise<QueryAABBResult> => {
      const bridge = getGodotBridge();
      if (!bridge) throw new Error('[GodotDebugBridge] Godot bridge not available');
      return queryAsync<QueryAABBResult>(bridge, 'queryAABB', [rect, options ?? {}]);
    },
  };

  return debugBridge;
}

export function injectGodotDebugBridge(): GodotDebugBridge | null {
  if (typeof window === 'undefined') return null;

  const win = window as unknown as { GodotDebugBridge?: GodotDebugBridge };

  if (win.GodotDebugBridge) {
    return win.GodotDebugBridge;
  }

  const bridge = createGodotDebugBridge();
  if (bridge) {
    win.GodotDebugBridge = bridge;
    console.log(`[GodotDebugBridge] Injected v${DEBUG_BRIDGE_VERSION}`);
  }

  return bridge;
}
