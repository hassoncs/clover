import { vi } from 'vitest';
import type { GodotBridge } from '../types';

export interface BridgeCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

export interface RecordingGodotBridge extends GodotBridge {
  getCalls(): BridgeCall[];
  getCallsFor(method: string): BridgeCall[];
  clearCalls(): void;
}

export function createMockGodotBridge(): GodotBridge {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),

    loadGame: vi.fn().mockResolvedValue(undefined),
    clearGame: vi.fn(),
    loadCustomScene: vi.fn().mockResolvedValue(undefined),
    pausePhysics: vi.fn(),
    resumePhysics: vi.fn(),
    setInspectMode: vi.fn(),
    stepPhysics: vi.fn().mockResolvedValue({ ok: true, framesAdvanced: 1, endFrame: 1 }),
    callRpc: vi.fn().mockResolvedValue({ success: true }),

    spawnEntity: vi.fn().mockReturnValue('mock-entity-1'),
    destroyEntity: vi.fn(),

    getEntityTransform: vi.fn().mockResolvedValue({ x: 0, y: 0, angle: 0 }),
    getAllTransforms: vi.fn().mockResolvedValue({}),

    setTransform: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
    setOpacity: vi.fn(),

    getLinearVelocity: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    setLinearVelocity: vi.fn(),
    getAngularVelocity: vi.fn().mockResolvedValue(0),
    setAngularVelocity: vi.fn(),

    applyImpulse: vi.fn(),
    applyForce: vi.fn(),
    applyTorque: vi.fn(),

    createRevoluteJoint: vi.fn().mockReturnValue(1),
    createDistanceJoint: vi.fn().mockReturnValue(1),
    createPrismaticJoint: vi.fn().mockReturnValue(1),
    createWeldJoint: vi.fn().mockReturnValue(1),
    createMouseJoint: vi.fn().mockReturnValue(1),
    createMouseJointAsync: vi.fn().mockResolvedValue(1),
    destroyJoint: vi.fn(),
    setMotorSpeed: vi.fn(),
    setMouseTarget: vi.fn(),

    screenToWorld: vi.fn().mockResolvedValue({ x: 0, y: 0 }),

    queryPoint: vi.fn().mockResolvedValue(null),
    queryPointEntity: vi.fn().mockResolvedValue(null),
    queryAABB: vi.fn().mockResolvedValue([]),
    raycast: vi.fn().mockResolvedValue(null),

    createBody: vi.fn().mockReturnValue(1),
    addFixture: vi.fn().mockReturnValue(1),
    setSensor: vi.fn(),
    setUserData: vi.fn(),
    getUserData: vi.fn().mockResolvedValue(null),
    getAllBodies: vi.fn().mockResolvedValue([]),

    onCollision: vi.fn().mockReturnValue(() => {}),
    onEntityDestroyed: vi.fn().mockReturnValue(() => {}),
    onEntitySpawned: vi.fn().mockReturnValue(() => {}),
    onSensorBegin: vi.fn().mockReturnValue(() => {}),
    onSensorEnd: vi.fn().mockReturnValue(() => {}),
    onTransformSync: vi.fn().mockReturnValue(() => {}),
    onScore: vi.fn().mockReturnValue(() => {}),

    getAllProperties: vi.fn().mockResolvedValue({ entities: {}, globals: {} }),
    onPropertySync: vi.fn().mockReturnValue(() => {}),
    setWatchConfig: vi.fn(),

    sendInput: vi.fn(),
    onInputEvent: vi.fn().mockReturnValue(() => {}),

    setEntityImage: vi.fn(),
    setEntityAtlasRegion: vi.fn(),
    clearTextureCache: vi.fn(),
    preloadTextures: vi.fn().mockResolvedValue({ completed: 0, failed: 0 }),

    setDebugShowShapes: vi.fn(),
    setDebugSettings: vi.fn(),

    setCameraTarget: vi.fn(),
    setCameraPosition: vi.fn(),
    setCameraZoom: vi.fn(),

    spawnParticle: vi.fn(),

    playSound: vi.fn(),

    applySpriteEffect: vi.fn(),
    updateSpriteEffectParam: vi.fn(),
    clearSpriteEffect: vi.fn(),

    setPostEffect: vi.fn(),
    updatePostEffectParam: vi.fn(),
    clearPostEffect: vi.fn(),

    screenShake: vi.fn(),
    zoomPunch: vi.fn(),
    triggerShockwave: vi.fn(),
    flashScreen: vi.fn(),

    createDynamicShader: vi.fn().mockResolvedValue({ success: true, shader_id: 'mock-shader' }),
    applyDynamicShader: vi.fn(),
    applyDynamicPostShader: vi.fn(),

    spawnParticlePreset: vi.fn(),

    getAvailableEffects: vi.fn().mockResolvedValue({ sprite: [], post: [], particles: [] }),

    createUIButton: vi.fn(),
    destroyUIButton: vi.fn(),
    onUIButtonEvent: vi.fn().mockReturnValue(() => {}),

    createThemedUIComponent: vi.fn(),
    destroyThemedUIComponent: vi.fn(),

    show3DModel: vi.fn().mockReturnValue(true),
    show3DModelFromUrl: vi.fn(),
    set3DViewportPosition: vi.fn(),
    set3DViewportSize: vi.fn(),
    rotate3DModel: vi.fn(),
    set3DCameraDistance: vi.fn(),
    clear3DModels: vi.fn(),

    // Extended methods from handler inventory
    getTransform: vi.fn().mockResolvedValue({ x: 0, y: 0, angle: 0 }),
    getTransforms: vi.fn().mockResolvedValue({}),
    setTrackedEntities: vi.fn(),
    getCameraInfo: vi.fn().mockResolvedValue({ target: null, position: { x: 0, y: 0 }, zoom: 1 }),
    captureScreenshot: vi.fn().mockResolvedValue(undefined),
    getWorldInfo: vi.fn().mockResolvedValue({ gravity: { x: 0, y: -10 }, entityCount: 0, physicsFPS: 60 }),
    getViewportInfo: vi.fn().mockResolvedValue({ width: 800, height: 600, has3DContent: false }),
  } as unknown as GodotBridge;
}

export function getMockCallCount(mock: GodotBridge, methodName: string): number {
  const method = (mock as unknown as Record<string, unknown>)[methodName];
  if (method && typeof method === 'function' && 'mock' in method) {
    return (method as { mock: { calls: unknown[] } }).mock.calls.length;
  }
  return 0;
}

export function isMockFunction(mock: GodotBridge, methodName: string): boolean {
  const method = (mock as unknown as Record<string, unknown>)[methodName];
  return vi.isMockFunction(method as Function);
}

export function createRecordingGodotBridge(): RecordingGodotBridge {
  const calls: BridgeCall[] = [];
  
  const record = (method: string, ...args: unknown[]) => {
    calls.push({ method, args, timestamp: Date.now() });
  };

  const mockBridge = createMockGodotBridge();
  
  (mockBridge.createBody as any).mockImplementation((def: unknown) => {
    const bodyId = calls.filter(c => c.method === 'createBody').length + 1;
    record('createBody', def);
    return bodyId;
  });
  
  (mockBridge.addFixture as any).mockImplementation((bodyId: number, fixtureDef: unknown) => {
    const fixtureId = calls.filter(c => c.method === 'addFixture').length + 1;
    record('addFixture', bodyId, fixtureDef);
    return fixtureId;
  });
  
  const recordingBridge = mockBridge as RecordingGodotBridge;
  recordingBridge.getCalls = () => [...calls];
  recordingBridge.getCallsFor = (method: string) => calls.filter(c => c.method === method);
  recordingBridge.clearCalls = () => { calls.length = 0; };
  
  return recordingBridge;
}
