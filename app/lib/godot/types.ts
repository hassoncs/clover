import type {
  GameDefinition,
  PropertySyncPayload,
  Vec2 as SharedVec2,
} from '@slopcade/shared';
import type { CompiledPlan } from '@slopcade/shared/effects';

export type { GameDefinition, PropertySyncPayload, CompiledPlan };
export type Vec2 = SharedVec2;

export interface EntityTransform {
  x: number;
  y: number;
  angle: number;
}

export interface ContactInfo {
  point: Vec2;
  normal: Vec2;
  normalImpulse: number;
  tangentImpulse: number;
}

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  contacts: ContactInfo[];
}

export interface SensorEvent {
  sensorShapeIndex: number;
  otherEntityId: string;
  otherShapeIndex: number;
}

export interface SpawnEntityRequest {
  entityId: string;
  templateId: string;
  position: Vec2;
  velocity?: Vec2;
}

export interface EntitySpawnedEvent {
  entityId: string;
  template: string;
  generation: number;
  tags: string[];
  transform: EntityTransform & { scaleX: number; scaleY: number };

}

export interface RaycastHit {
  entityId: string;
  point: Vec2;
  normal: Vec2;
  fraction: number;
}

export interface DynamicShaderResult {
  success: boolean;
  shader_id: string;
  error?: string;
}

export interface EffectsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type EffectsResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: EffectsError };

export interface EffectsPipelineSnapshot {
  planHash: string;
  passParams: Record<string, Record<string, unknown>>;
  feedbackStates: Record<string, { frameCount: number; frozen: boolean }>;
  lifecycleState: string;
  timestamp: number;
}

export interface EffectsBridge {
  applyGraph(plan: CompiledPlan): Promise<EffectsResult>;
  clearGraph(): Promise<EffectsResult>;
  updateParams(passId: string, params: Record<string, unknown>): Promise<EffectsResult>;
  start(): Promise<EffectsResult>;
  pause(): Promise<EffectsResult>;
  resume(): Promise<EffectsResult>;
  stop(): Promise<EffectsResult>;
  reset(): Promise<EffectsResult>;
  snapshot(): Promise<EffectsResult<EffectsPipelineSnapshot>>;
  restore(snapshot: EffectsPipelineSnapshot): Promise<EffectsResult>;
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

export type DrawCommand =
  | { type: 'pixel'; x: number; y: number; color: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width?: number }
  | { type: 'fill'; color: string };

export type NormalizedDrawCommand =
  | { type: 'stroke'; points: number[]; color: string; width: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width?: number }
  | { type: 'pixel'; x: number; y: number; color: string }
  | { type: 'fill'; color: string };

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

export interface ColliderConfig {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  categoryBits?: number;
  maskBits?: number;
}

export interface GodotBridge extends EffectsBridge {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): void;
  
  // Effects hot-path (convenience wrapper for updateParams)
  effectsUpdateParams(passId: string, params: Record<string, number | boolean | string>): void;
  
  // Normalized coordinate drawing
  drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]): void;

  // Game management
  loadGame(definition: GameDefinition): Promise<void>;
  clearGame(): void;

  // Sectioned loading — independent operations for partial game updates
  setupWorld(world: GameDefinition['world'], background?: GameDefinition['background']): void;
  registerTemplates(templates: GameDefinition['templates']): void;
  loadEntities(entities: GameDefinition['entities']): void;
  clearEntities(): void;

  // Physics control (for pre-game pausing)
  pausePhysics(): void;
  resumePhysics(): void;
  
  // Inspect mode - disables automatic physics stepping for manual control
  setInspectMode(enabled: boolean): void;
  
  // Debug stepping - advances physics by N frames and returns when complete
  stepPhysics(frames: number): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }>;
  
  // Generic RPC call for debug protocol
  callRpc(method: string, params?: unknown): Promise<any>;

  // Entity management (high-level)
  spawnEntity(request: SpawnEntityRequest): void;
  destroyEntity(entityId: string): void;

  // Transform queries (async - native requires worklet communication)
  getEntityTransform(entityId: string): Promise<EntityTransform | null>;
  getAllTransforms(): Promise<Record<string, EntityTransform>>;

  // Transform control
  setTransform(entityId: string, x: number, y: number, angle: number): void;
  setPosition(entityId: string, x: number, y: number): void;
  setRotation(entityId: string, angle: number): void;
  setScale(entityId: string, scaleX: number, scaleY: number): void;
  setOpacity(entityId: string, opacity: number): void;
  setVisible(entityId: string, visible: boolean): void;

  // Velocity control (async - native requires worklet communication)
  getLinearVelocity(entityId: string): Promise<Vec2 | null>;
  setLinearVelocity(entityId: string, velocity: Vec2): void;
  getAngularVelocity(entityId: string): Promise<number | null>;
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
  createMouseJointAsync(def: MouseJointDef): Promise<number>;
  destroyJoint(jointId: number): void;
  setMotorSpeed(jointId: number, speed: number): void;
  setMouseTarget(jointId: number, target: Vec2): void;

  // Coordinate conversion (screen pixels → game world coordinates)
  screenToWorld(screenX: number, screenY: number): Promise<Vec2>;

  // Physics queries (async - native requires worklet communication)
  queryPoint(point: Vec2): Promise<number | null>;
  queryPointEntity(point: Vec2): Promise<string | null>;
  queryAABB(min: Vec2, max: Vec2): Promise<number[]>;
  raycast(origin: Vec2, direction: Vec2, maxDistance: number): Promise<RaycastHit | null>;

  // Entity data management
  setUserData(entityId: string, data: unknown): void;
  getUserData(entityId: string): Promise<unknown>;
  getAllEntities(): Promise<string[]>;

  // Events
  onCollision(callback: (event: CollisionEvent) => void): () => void;
  onEntityDestroyed(callback: (entityId: string) => void): () => void;
  onEntitySpawned(callback: (event: EntitySpawnedEvent) => void): () => void;
  onSensorBegin(callback: (event: SensorEvent) => void): () => void;
  onSensorEnd(callback: (event: SensorEvent) => void): () => void;
  onTransformSync(callback: (transforms: Record<string, EntityTransform>) => void): () => void;
  onScore(callback: (points: number, entityId: string) => void): () => void;
  
  // Property sync (for expression evaluation)
  getAllProperties(): Promise<PropertySyncPayload>;
  onPropertySync(callback: (properties: PropertySyncPayload) => void): () => void;
  setWatchConfig(config: unknown): void;

  // Input
  sendInput(type: 'tap' | 'drag_start' | 'drag_move' | 'drag_end', data: { x: number; y: number; entityId?: string }): void;
  onInputEvent(callback: (type: string, x: number, y: number, entityId: string | null) => void): () => void;

   // Dynamic image management
   setEntityImage(entityId: string, url: string, width: number, height: number): void;
   setEntityAtlasRegion(
     entityId: string,
     atlasUrl: string,
     x: number,
     y: number,
     w: number,
     h: number,
     width: number,
     height: number
   ): void;
   clearTextureCache(url?: string): void;
   
   // Pixel Buffer operations
   createPixelBuffer(entityId: string, width: number, height: number, clearColor: string, worldWidth?: number, worldHeight?: number): void;
   pixelBufferDraw(entityId: string, commands: DrawCommand[]): void;
   pixelBufferClear(entityId: string, color: string): void;
   destroyPixelBuffer(entityId: string): void;
   
   /**
    * Preload textures into Godot's internal texture cache before game starts.
    * This ensures textures are ready when entities spawn, preventing pop-in.
    * @param urls Array of image URLs to preload
    * @param onProgress Optional callback for progress updates (percent, completed, failed)
    * @returns Promise that resolves when all textures are loaded
    */
    preloadTextures(urls: string[], onProgress?: (percent: number, completed: number, failed: number) => void): Promise<{ completed: number; failed: number }>;

    // Debug mode

   setDebugShowShapes(show: boolean): void;
    setDebugSettings(settings: { showInputDebug: boolean; showPhysicsShapes: boolean; showZones: boolean; showFPS: boolean }): void;

  // Camera control
  setCameraTarget(entityId: string | null): void;
  setCameraPosition(x: number, y: number): void;
  setCameraZoom(zoom: number): void;
  startCamera(entityId: string, width?: number, height?: number): void;
  stopCamera(): void;

  // Particle effects
  spawnParticle(type: string, x: number, y: number): void;

  // Audio
  playSound(resourcePath: string): void;

  // Visual Effects - Sprite Effects
  applySpriteEffect(entityId: string, effectName: string, params?: Record<string, unknown>): void;
  updateSpriteEffectParam(entityId: string, paramName: string, value: unknown): void;
  clearSpriteEffect(entityId: string): void;

  // Visual Effects - Post-Processing
  setPostEffect(effectName: string, params?: Record<string, unknown>, layer?: string): void;
  updatePostEffectParam(paramName: string, value: unknown, layer?: string): void;
  clearPostEffect(layer?: string): void;

  // Visual Effects - Camera Effects
  screenShake(intensity: number, duration?: number): void;
  zoomPunch(intensity?: number, duration?: number): void;
  triggerShockwave(worldX: number, worldY: number, duration?: number): void;
  flashScreen(color?: [number, number, number, number?], duration?: number): void;

  // Visual Effects - Dynamic Shaders
  createDynamicShader(shaderId: string, shaderCode: string): Promise<DynamicShaderResult>;
  applyDynamicShader(entityId: string, shaderId: string, params?: Record<string, unknown>): void;
  applyDynamicPostShader(shaderCode: string, params?: Record<string, unknown>): void;
  hotSwapShader(shaderId: string, source: string): void;



  // Visual Effects - Particles
  spawnParticlePreset(presetName: string, worldX: number, worldY: number, params?: Record<string, unknown>): void;

  // Visual Effects - Info
  getAvailableEffects(): Promise<{
    sprite: string[];
    post: string[];
    particles: string[];
  }>;

  // UI Buttons (Godot-native TextureButton)
  createUIButton(
    buttonId: string,
    normalImageUrl: string,
    pressedImageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
  destroyUIButton(buttonId: string): void;
  onUIButtonEvent(callback: (eventType: 'button_down' | 'button_up' | 'button_pressed', buttonId: string) => void): () => void;

  // Themed UI Components (AI-generated with metadata)
  createThemedUIComponent(
    componentId: string,
    componentType: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    metadataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
    labelText?: string
  ): void;
  destroyThemedUIComponent(componentId: string): void;

  // 3D Model Rendering (2.5D)
  show3DModel(path: string): boolean;
  show3DModelFromUrl(url: string): void;
  set3DViewportPosition(x: number, y: number): void;
  set3DViewportSize(width: number, height: number): void;
  rotate3DModel(x: number, y: number, z: number): void;
  set3DModelPosition(x: number, y: number, z: number): void;
  set3DCameraDistance(distance: number): void;
  set3DCameraSize(size: number): void;
  clear3DModels(): void;

  // 3D Primitives
  create3DFloor(size?: number, colorHex?: string, style?: 'plain' | 'grid'): void;
  create3DCube(x: number, y: number, z: number, size?: number, colorHex?: string): void;
  clear3DCubes(): void;

  // 3D Camera
  set3DCameraPosition(x: number, y: number, z: number): void;
  set3DCameraLookAt(x: number, y: number, z: number): void;
  setOrbitControls(enabled: boolean): void;

  // External Input (for effect graphs)
  setExternalInput(name: string, imageData: string): void;
  setScreenInput(enable: boolean): void;
}

export interface GodotViewProps {
  style?: object;
  onReady?: () => void;
  onError?: (error: Error) => void;
  /** Called when a key is pressed inside the iframe */
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Called when a key is released inside the iframe */
  onKeyUp?: (event: KeyboardEvent) => void;
  /** Called when mouse moves inside the iframe */
  onMouseMove?: (event: MouseEvent) => void;
  /** Called when mouse leaves the iframe */
  onMouseLeave?: (event: MouseEvent) => void;
  /** Called when mouse clicks inside the iframe */
  onClick?: (event: MouseEvent) => void;
}
