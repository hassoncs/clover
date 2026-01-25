export const DEBUG_BRIDGE_VERSION = '2.0.0';

export type SnapshotDetail = 'low' | 'med' | 'high';

export interface SnapshotOptions {
  detail?: SnapshotDetail;
  filterTags?: string[];
  filterTemplate?: string;
  maxEntities?: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface EntityPhysicsInfo {
  bodyType: 'static' | 'dynamic' | 'kinematic' | 'sensor';
  mass?: number;
  isSleeping?: boolean;
  isSensor?: boolean;
  collisionLayer?: number;
  collisionMask?: number;
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  fixedRotation?: boolean;
  ccd?: boolean;
  enabled?: boolean;
  velocity?: Vec2;
  angularVelocity?: number;
  material?: {
    friction: number;
    restitution: number;
  };
}

export interface EntitySnapshot {
  id: string;
  template: string;
  position: Vec2;
  angle: number;
  velocity?: Vec2;
  angularVelocity?: number;
  aabb?: AABB;
  physics?: EntityPhysicsInfo;
  behaviors?: string[];
  tags?: string[];
  visible?: boolean;
  zIndex?: number;
}

export interface WorldInfo {
  pixelsPerMeter: number;
  gravity: Vec2;
  bounds: {
    width: number;
    height: number;
  };
}

export interface CameraInfo {
  position: Vec2;
  zoom: number;
  target?: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
}

export interface GameSnapshot {
  protocolVersion: string;
  timestamp: number;
  frameId: number;
  world: WorldInfo;
  camera: CameraInfo;
  viewport: ViewportInfo;
  entities: EntitySnapshot[];
  entityCount: number;
  gameState?: {
    score?: number;
    lives?: number;
    time?: number;
    state?: string;
    variables?: Record<string, unknown>;
  };
}

export type OverlayType = 'bounds' | 'labels' | 'velocities' | 'physics' | 'ids';

export interface ScreenshotOptions {
  withOverlays?: boolean;
  overlayTypes?: OverlayType[];
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
}

export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
  frameId: number;
  format: 'png' | 'jpeg';
}

export type AnnotationType = 'rect' | 'circle' | 'line' | 'label' | 'arrow' | 'point';

export interface BaseAnnotation {
  type: AnnotationType;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  position: Vec2;
  width: number;
  height: number;
  fill?: boolean;
  label?: string;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  position: Vec2;
  radius: number;
  fill?: boolean;
  label?: string;
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'line';
  start: Vec2;
  end: Vec2;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  start: Vec2;
  end: Vec2;
  headSize?: number;
  label?: string;
}

export interface LabelAnnotation extends BaseAnnotation {
  type: 'label';
  position: Vec2;
  text: string;
  fontSize?: number;
  backgroundColor?: string;
  padding?: number;
}

export interface PointAnnotation extends BaseAnnotation {
  type: 'point';
  position: Vec2;
  size?: number;
  label?: string;
}

export type Annotation =
  | RectAnnotation
  | CircleAnnotation
  | LineAnnotation
  | ArrowAnnotation
  | LabelAnnotation
  | PointAnnotation;

export interface AnnotateOptions {
  coordSystem?: 'world' | 'screen';
}

export interface TapResult {
  hit: string | null;
  worldPos: Vec2;
  screenPos: Vec2;
  timestamp: number;
}

export interface DragOptions {
  steps?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AssertResult {
  passed: boolean;
  message: string;
  assertionType: string;
  expected?: unknown;
  actual?: unknown;
  entityId?: string;
  timestamp: number;
}

export interface WaitResult {
  success: boolean;
  elapsedMs: number;
  timedOut: boolean;
  lastValue?: unknown;
}

export interface CollisionRecord {
  entityA: string;
  entityB: string;
  timestamp: number;
  frameId: number;
  impulse: number;
  position: Vec2;
}

export interface DebugBridgeState {
  enabled: boolean;
  collisionHistory: CollisionRecord[];
  maxCollisionHistory: number;
  frameId: number;
}

// =============================================================================
// SELECTOR SYSTEM TYPES
// =============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'id' | 'name' | 'template' | 'distance' | 'zIndex';
  origin?: Vec2;
  include?: ('transform' | 'physics' | 'render' | 'shapes' | 'joints' | 'overlaps' | 'behaviors')[];
  scopeRootId?: string;
  includeHierarchy?: boolean;
}

export interface QueryMatch {
  entityId: string;
  name: string;
  position: Vec2;
  angle: number;
  template?: string;
  tags?: string[];
  path?: string;
  visible?: boolean;
  zIndex?: number;
  parentId?: string;
  childrenIds?: string[];
  transform?: {
    position: Vec2;
    rotation: number;
    scale: Vec2;
    localPosition: Vec2;
    localRotation: number;
    localScale: Vec2;
  };
  physics?: EntityPhysicsInfo;
  render?: {
    visible: boolean;
    zIndex: number;
    modulate: { r: number; g: number; b: number; a: number };
  };
}

export interface QueryResult {
  matches: QueryMatch[];
  count: number;
  hasMore: boolean;
  error?: string;
}

// =============================================================================
// PROPERTY SYSTEM TYPES
// =============================================================================

export interface GetPropsResult {
  entityId: string;
  values: Record<string, unknown>;
  error?: string;
}

export interface SetPropsOptions {
  unsafe?: boolean;
  requirePaused?: boolean;
  clamp?: boolean;
  autoWake?: boolean;
  validateOnly?: boolean;
  returnDelta?: boolean;
}

export interface PropApplyResult {
  path: string;
  ok: boolean;
  error?: string;
  validated?: boolean;
}

export interface SetPropsResult {
  entityId: string;
  applied: PropApplyResult[];
  snapshotDelta?: {
    entities: { entityId: string; changes: Record<string, unknown> }[];
  };
  error?: string;
}

export interface PatchOp {
  op: 'replace' | 'addTag' | 'removeTag' | 'increment';
  entityId: string;
  path?: string;
  value?: unknown;
}

export interface PatchPropsResult {
  results: {
    op: string;
    entityId: string;
    path?: string;
    value?: unknown;
    ok: boolean;
    error?: string;
  }[];
}

// =============================================================================
// LIFECYCLE TYPES
// =============================================================================

export interface SpawnRequest {
  template: string;
  name?: string;
  tags?: string[];
  position: Vec2;
  rotation?: number;
  initialProps?: Record<string, unknown>;
  parentId?: string;
  idHint?: string;
}

export interface SpawnResult {
  ok: boolean;
  entityId?: string;
  error?: string;
}

export interface DestroyOptions {
  mode?: 'queueFree' | 'disable';
}

export interface DestroyResult {
  ok: boolean;
  entityId?: string;
  mode?: string;
  error?: string;
}

export interface CloneOptions {
  withChildren?: boolean;
  offset?: Vec2;
  newName?: string;
}

export interface CloneResult {
  ok: boolean;
  entityId?: string;
  sourceId?: string;
  error?: string;
}

export interface ReparentOptions {
  keepGlobalTransform?: boolean;
  index?: number;
}

export interface ReparentResult {
  ok: boolean;
  entityId?: string;
  oldParentId?: string;
  newParentId?: string;
  error?: string;
}

// =============================================================================
// TIME CONTROL TYPES
// =============================================================================

export interface TimeState {
  paused: boolean;
  timeScale: number;
  frame: number;
  fixedDelta: number;
  physicsTicksPerSecond: number;
  seed: number;
  deterministic: boolean;
  stepFramesRemaining: number;
}

export interface TimeControlResult {
  ok: boolean;
  state: TimeState;
  already?: boolean;
  error?: string;
}

export interface StepResult {
  ok: boolean;
  framesAdvanced?: number;
  framesRequested?: number;
  startFrame?: number;
  endFrame?: number;
  state: TimeState;
  message?: string;
  error?: string;
}

// =============================================================================
// EVENT MONITORING TYPES
// =============================================================================

export interface EventFilter {
  entityId?: string;
  template?: string;
  tag?: string;
  a?: { entityId?: string; template?: string; tag?: string };
  b?: { entityId?: string; template?: string; tag?: string };
}

export interface SubscribeRequest {
  types: string[];
  where?: { anyOf?: EventFilter[] } | EventFilter;
  limitPerPoll?: number;
}

export interface SubscribeResult {
  ok?: boolean;
  subId: string | null;
  error?: string;
}

export interface GameEvent {
  eventId: number;
  type: string;
  timestampMs: number;
  frame: number;
  data: Record<string, unknown>;
}

export interface PollEventsOptions {
  subId?: string;
  max?: number;
  timeoutMs?: number;
}

export interface PollEventsResult {
  events: GameEvent[];
  count: number;
  dropped: number;
  cursor?: number;
  error?: string;
}

// =============================================================================
// PHYSICS QUERY TYPES
// =============================================================================

export interface RaycastRequest {
  from: Vec2;
  to: Vec2;
  mask?: number;
  includeSensors?: boolean;
  maxHits?: number;
}

export interface RaycastHit {
  entityId: string;
  point: Vec2;
  normal: Vec2;
  distance: number;
  shapeId?: string;
}

export interface RaycastResult {
  hits: RaycastHit[];
  error?: string;
}

export interface ShapeInfo {
  shapeIndex: number;
  kind: 'circle' | 'rect' | 'capsule' | 'polygon' | 'segment' | 'worldBoundary' | 'unknown';
  localPosition: Vec2;
  localRotation: number;
  disabled: boolean;
  radius?: number;
  extents?: Vec2;
  width?: number;
  height?: number;
  points?: Vec2[];
  a?: Vec2;
  b?: Vec2;
  normal?: Vec2;
  distance?: number;
}

export interface GetShapesResult {
  entityId: string;
  shapes: ShapeInfo[];
  error?: string;
}

export interface JointInfo {
  jointId: number;
  type: string;
  aId: string;
  bId: string;
  nodeA: string;
  nodeB: string;
  params: Record<string, unknown>;
}

export interface GetJointsResult {
  joints: JointInfo[];
  error?: string;
}

export interface OverlapInfo {
  entityId: string;
  type: 'body' | 'area';
}

export interface GetOverlapsResult {
  entityId: string;
  overlaps: OverlapInfo[];
  error?: string;
}

export interface QueryPointResult {
  point: Vec2;
  entities: { entityId: string; shapeIndex?: number }[];
  error?: string;
}

export interface QueryAABBResult {
  rect: AABB;
  entities: { entityId: string }[];
  error?: string;
}

// =============================================================================
// MAIN INTERFACE
// =============================================================================

export interface GodotDebugBridge {
  readonly version: string;
  readonly enabled: boolean;

  // Legacy snapshot API
  getSnapshot(options?: SnapshotOptions): Promise<GameSnapshot>;
  getEntity(entityId: string): Promise<EntitySnapshot | null>;

  // Screenshot
  captureScreenshot(options?: ScreenshotOptions): Promise<ScreenshotResult>;
  annotateScreenshot(
    base64: string,
    annotations: Annotation[],
    options?: AnnotateOptions
  ): Promise<string>;

  // Input simulation
  simulateTap(x: number, y: number): Promise<TapResult>;
  simulateDrag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
    options?: DragOptions
  ): Promise<void>;

  // Coordinate conversion
  worldToScreen(worldPos: Vec2): Vec2;
  screenToWorld(screenPos: Vec2): Vec2;

  // Assertions
  assert: {
    exists(entityId: string): AssertResult;
    notExists(entityId: string): AssertResult;
    nearPosition(entityId: string, pos: Vec2, epsilon?: number): AssertResult;
    hasVelocity(entityId: string, minMagnitude?: number): AssertResult;
    isStationary(entityId: string, epsilon?: number): AssertResult;
    collisionOccurred(entityA: string, entityB: string, withinMs?: number): AssertResult;
    stateEquals(key: string, value: unknown): AssertResult;
    entityCount(count: number): AssertResult;
    entityCountAtLeast(count: number): AssertResult;
  };

  // Wait helpers
  waitForCondition(
    predicate: () => boolean | Promise<boolean>,
    timeoutMs: number,
    pollIntervalMs?: number
  ): Promise<WaitResult>;
  waitForEntity(entityId: string, timeoutMs: number): Promise<WaitResult>;
  waitForStationary(entityId: string, timeoutMs: number, epsilon?: number): Promise<WaitResult>;
  waitForCollision(entityA: string, entityB: string, timeoutMs: number): Promise<WaitResult>;

  // Collision history
  getCollisionHistory(): CollisionRecord[];
  clearCollisionHistory(): void;

  // Frame
  nextFrame(): Promise<number>;
  getFrameId(): number;

  // ==========================================================================
  // NEW V2 APIs
  // ==========================================================================

  // Selector/Query
  query(selector: string, options?: QueryOptions): Promise<QueryResult>;

  // Property access
  getProps(entityId: string, paths: string[]): Promise<GetPropsResult>;
  getAllProps(entityId: string): Promise<Record<string, unknown>>;
  setProps(entityId: string, values: Record<string, unknown>, options?: SetPropsOptions): Promise<SetPropsResult>;
  patchProps(ops: PatchOp[], options?: SetPropsOptions): Promise<PatchPropsResult>;

  // Lifecycle
  spawn(request: SpawnRequest): Promise<SpawnResult>;
  destroy(entityId: string, options?: DestroyOptions): Promise<DestroyResult>;
  clone(entityId: string, options?: CloneOptions): Promise<CloneResult>;
  reparent(entityId: string, newParentId: string, options?: ReparentOptions): Promise<ReparentResult>;

  // Time control
  getTimeState(): Promise<TimeState>;
  pause(): Promise<TimeControlResult>;
  resume(): Promise<TimeControlResult>;
  step(frames: number): Promise<StepResult>;
  setTimeScale(scale: number): Promise<TimeControlResult>;
  setSeed(seed: number, options?: { enableDeterministic?: boolean }): Promise<TimeControlResult>;

  // Event monitoring
  subscribe(request: SubscribeRequest): Promise<SubscribeResult>;
  unsubscribe(subId: string): Promise<{ ok: boolean; error?: string }>;
  pollEvents(options?: PollEventsOptions): Promise<PollEventsResult>;

  // Physics queries
  raycast(request: RaycastRequest): Promise<RaycastResult>;
  getShapes(entityId: string): Promise<GetShapesResult>;
  getJoints(entityId?: string): Promise<GetJointsResult>;
  getOverlaps(entityId: string): Promise<GetOverlapsResult>;
  queryPoint(x: number, y: number, options?: { mask?: number; includeSensors?: boolean }): Promise<QueryPointResult>;
  queryAABB(rect: AABB, options?: { mask?: number; includeSensors?: boolean }): Promise<QueryAABBResult>;
}
