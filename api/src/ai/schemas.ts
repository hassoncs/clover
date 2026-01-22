import { z } from 'zod';

export const Vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const BoundsSchema = z.object({
  minX: z.number(),
  maxX: z.number(),
  minY: z.number(),
  maxY: z.number(),
});

export const ShadowEffectSchema = z.object({
  color: z.string(),
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number(),
}).optional();

export const RectSpriteSchema = z.object({
  type: z.literal('rect'),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const CircleSpriteSchema = z.object({
  type: z.literal('circle'),
  radius: z.number().positive(),
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const PolygonSpriteSchema = z.object({
  type: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const ImageSpriteSchema = z.object({
  type: z.literal('image'),
  imageUrl: z.string(),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const SpriteComponentSchema = z.discriminatedUnion('type', [
  RectSpriteSchema,
  CircleSpriteSchema,
  PolygonSpriteSchema,
  ImageSpriteSchema,
]);

export const BoxPhysicsSchema = z.object({
  bodyType: z.enum(['static', 'dynamic', 'kinematic']),
  shape: z.literal('box'),
  width: z.number().positive(),
  height: z.number().positive(),
  density: z.number().min(0),
  friction: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
  isSensor: z.boolean().optional(),
  fixedRotation: z.boolean().optional(),
  bullet: z.boolean().optional(),
  linearDamping: z.number().optional(),
  angularDamping: z.number().optional(),
});

export const CirclePhysicsSchema = z.object({
  bodyType: z.enum(['static', 'dynamic', 'kinematic']),
  shape: z.literal('circle'),
  radius: z.number().positive(),
  density: z.number().min(0),
  friction: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
  isSensor: z.boolean().optional(),
  fixedRotation: z.boolean().optional(),
  bullet: z.boolean().optional(),
  linearDamping: z.number().optional(),
  angularDamping: z.number().optional(),
});

export const PolygonPhysicsSchema = z.object({
  bodyType: z.enum(['static', 'dynamic', 'kinematic']),
  shape: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
  density: z.number().min(0),
  friction: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
  isSensor: z.boolean().optional(),
  fixedRotation: z.boolean().optional(),
  linearDamping: z.number().optional(),
  angularDamping: z.number().optional(),
});

export const PhysicsComponentSchema = z.discriminatedUnion('shape', [
  BoxPhysicsSchema,
  CirclePhysicsSchema,
  PolygonPhysicsSchema,
]);

export const MoveBehaviorSchema = z.object({
  type: z.literal('move'),
  direction: z.enum(['left', 'right', 'up', 'down', 'toward_target', 'away_from_target']),
  speed: z.number().positive(),
  target: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const RotateBehaviorSchema = z.object({
  type: z.literal('rotate'),
  speed: z.number(),
  direction: z.enum(['clockwise', 'counterclockwise']),
  affectsPhysics: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const ControlBehaviorSchema = z.object({
  type: z.literal('control'),
  controlType: z.enum([
    'tap_to_jump',
    'tap_to_shoot',
    'tap_to_flip',
    'drag_to_aim',
    'drag_to_move',
    'tilt_to_move',
    'tilt_gravity',
    'buttons',
  ]),
  force: z.number().optional(),
  cooldown: z.number().optional(),
  maxSpeed: z.number().optional(),
  aimLine: z.boolean().optional(),
  maxPullDistance: z.number().optional(),
  enabled: z.boolean().optional(),
});

export const SpawnOnEventBehaviorSchema = z.object({
  type: z.literal('spawn_on_event'),
  event: z.enum(['tap', 'timer', 'collision', 'destroy', 'start']),
  entityTemplate: z.string(),
  spawnPosition: z.enum(['at_self', 'at_touch', 'random_in_bounds', 'offset']),
  offset: Vec2Schema.optional(),
  bounds: BoundsSchema.optional(),
  interval: z.number().optional(),
  maxSpawns: z.number().optional(),
  initialVelocity: Vec2Schema.optional(),
  withTags: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const DestroyOnCollisionBehaviorSchema = z.object({
  type: z.literal('destroy_on_collision'),
  withTags: z.array(z.string()),
  effect: z.enum(['none', 'fade', 'explode', 'shrink']).optional(),
  destroyOther: z.boolean().optional(),
  minImpactVelocity: z.number().optional(),
  enabled: z.boolean().optional(),
});

export const ScoreOnCollisionBehaviorSchema = z.object({
  type: z.literal('score_on_collision'),
  withTags: z.array(z.string()),
  points: z.number(),
  once: z.boolean().optional(),
  showPopup: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const TimerBehaviorSchema = z.object({
  type: z.literal('timer'),
  duration: z.number().positive(),
  action: z.enum(['destroy', 'spawn', 'enable_behavior', 'disable_behavior', 'trigger_event']),
  repeat: z.boolean().optional(),
  spawnTemplate: z.string().optional(),
  behaviorIndex: z.number().optional(),
  eventName: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const OscillateBehaviorSchema = z.object({
  type: z.literal('oscillate'),
  axis: z.enum(['x', 'y', 'both']),
  amplitude: z.number().positive(),
  frequency: z.number().positive(),
  phase: z.number().optional(),
  enabled: z.boolean().optional(),
});

export const FollowBehaviorSchema = z.object({
  type: z.literal('follow'),
  target: z.string(),
  speed: z.number().positive(),
  minDistance: z.number().optional(),
  maxDistance: z.number().optional(),
  enabled: z.boolean().optional(),
});

export const BounceBehaviorSchema = z.object({
  type: z.literal('bounce'),
  bounds: BoundsSchema,
  enabled: z.boolean().optional(),
});

export const MagneticBehaviorSchema = z.object({
  type: z.literal('magnetic'),
  strength: z.number(),
  radius: z.number().positive(),
  attractsTags: z.array(z.string()).optional(),
  repels: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const AnimateBehaviorSchema = z.object({
  type: z.literal('animate'),
  frames: z.array(z.string()),
  fps: z.number().positive(),
  loop: z.boolean().optional(),
  playOn: z.enum(['always', 'moving', 'collision', 'destroy']).optional(),
  enabled: z.boolean().optional(),
});

export const GravityZoneBehaviorSchema = z.object({
  type: z.literal('gravity_zone'),
  gravity: Vec2Schema,
  radius: z.number().positive(),
  affectsTags: z.array(z.string()).optional(),
  falloff: z.enum(['none', 'linear', 'quadratic']).optional(),
  enabled: z.boolean().optional(),
});

export const BehaviorSchema = z.discriminatedUnion('type', [
  MoveBehaviorSchema,
  RotateBehaviorSchema,
  ControlBehaviorSchema,
  SpawnOnEventBehaviorSchema,
  DestroyOnCollisionBehaviorSchema,
  ScoreOnCollisionBehaviorSchema,
  TimerBehaviorSchema,
  OscillateBehaviorSchema,
  FollowBehaviorSchema,
  BounceBehaviorSchema,
  MagneticBehaviorSchema,
  AnimateBehaviorSchema,
  GravityZoneBehaviorSchema,
]);

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});

export const EntityTemplateSchema = z.object({
  id: z.string(),
  sprite: SpriteComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
});

export const GameEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string().optional(),
  transform: TransformSchema,
  sprite: SpriteComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  visible: z.boolean().optional(),
  active: z.boolean().optional(),
  assetPackId: z.string().optional(),
});

export const CollisionTriggerSchema = z.object({
  type: z.literal('collision'),
  entityATag: z.string(),
  entityBTag: z.string(),
});

export const TimerTriggerSchema = z.object({
  type: z.literal('timer'),
  time: z.number().positive(),
  repeat: z.boolean().optional(),
});

export const ScoreTriggerSchema = z.object({
  type: z.literal('score'),
  threshold: z.number(),
  comparison: z.enum(['gte', 'lte', 'eq']),
});

export const EntityCountTriggerSchema = z.object({
  type: z.literal('entity_count'),
  tag: z.string(),
  count: z.number(),
  comparison: z.enum(['gte', 'lte', 'eq', 'zero']),
});

export const EventTriggerSchema = z.object({
  type: z.literal('event'),
  eventName: z.string(),
});

export const RuleTriggerSchema = z.discriminatedUnion('type', [
  CollisionTriggerSchema,
  TimerTriggerSchema,
  ScoreTriggerSchema,
  EntityCountTriggerSchema,
  EventTriggerSchema,
]);

export const SpawnActionSchema = z.object({
  type: z.literal('spawn'),
  template: z.string(),
  position: z.object({
    type: z.enum(['fixed', 'random', 'at_entity', 'at_collision']),
    x: z.number().optional(),
    y: z.number().optional(),
    bounds: BoundsSchema.optional(),
    entityId: z.string().optional(),
  }),
  count: z.number().optional(),
  spread: z.number().optional(),
});

export const DestroyActionSchema = z.object({
  type: z.literal('destroy'),
  target: z.object({
    type: z.enum(['by_id', 'by_tag', 'collision_entities', 'all']),
    entityId: z.string().optional(),
    tag: z.string().optional(),
    count: z.number().optional(),
  }),
});

export const ScoreActionSchema = z.object({
  type: z.literal('score'),
  operation: z.enum(['add', 'subtract', 'set', 'multiply']),
  value: z.number(),
});

export const GameStateActionSchema = z.object({
  type: z.literal('game_state'),
  state: z.enum(['win', 'lose', 'pause', 'restart', 'next_level']),
  delay: z.number().optional(),
});

export const EventActionSchema = z.object({
  type: z.literal('event'),
  eventName: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const RuleActionSchema = z.discriminatedUnion('type', [
  SpawnActionSchema,
  DestroyActionSchema,
  ScoreActionSchema,
  GameStateActionSchema,
  EventActionSchema,
]);

export const GameRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  trigger: RuleTriggerSchema,
  conditions: z.array(z.object({
    type: z.enum(['score', 'time', 'entity_exists', 'entity_count', 'random']),
    min: z.number().optional(),
    max: z.number().optional(),
    entityId: z.string().optional(),
    entityTag: z.string().optional(),
    tag: z.string().optional(),
    probability: z.number().optional(),
  })).optional(),
  actions: z.array(RuleActionSchema),
  fireOnce: z.boolean().optional(),
  cooldown: z.number().optional(),
});

export const WinConditionSchema = z.object({
  type: z.enum(['score', 'destroy_all', 'survive_time', 'reach_entity', 'collect_all', 'custom']),
  score: z.number().optional(),
  tag: z.string().optional(),
  time: z.number().optional(),
  entityId: z.string().optional(),
});

export const LoseConditionSchema = z.object({
  type: z.enum(['entity_destroyed', 'entity_exits_screen', 'time_up', 'score_below', 'lives_zero', 'custom']),
  tag: z.string().optional(),
  time: z.number().optional(),
  entityId: z.string().optional(),
  score: z.number().optional(),
});

export const WorldConfigSchema = z.object({
  gravity: Vec2Schema,
  pixelsPerMeter: z.number().positive().default(50),
  bounds: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const CameraConfigSchema = z.object({
  type: z.enum(['fixed', 'follow', 'follow-x', 'follow-y', 'auto-scroll']),
  followTarget: z.string().optional(),
  zoom: z.number().positive().optional(),
  minZoom: z.number().positive().optional(),
  maxZoom: z.number().positive().optional(),
  followSmoothing: z.number().min(0).max(1).optional(),
  followOffset: Vec2Schema.optional(),
  deadZone: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  lookAhead: z.object({
    enabled: z.boolean(),
    distance: z.number().positive(),
    smoothing: z.number().min(0).max(1).optional(),
    mode: z.enum(['velocity', 'facing', 'input']).optional(),
  }).optional(),
  bounds: BoundsSchema.optional(),
  autoScroll: z.object({
    direction: Vec2Schema,
    speed: z.number().positive(),
    acceleration: z.number().optional(),
  }).optional(),
  shake: z.object({
    decay: z.number().positive().optional(),
    maxOffset: z.number().positive().optional(),
    maxRotation: z.number().optional(),
  }).optional(),
});

export const PresentationConfigSchema = z.object({
  aspectRatio: z.union([
    z.object({ width: z.number().positive(), height: z.number().positive() }),
    z.number().positive(),
  ]).optional(),
  fit: z.enum(['contain', 'cover']).optional(),
  letterboxColor: z.string().optional(),
  orientation: z.enum(['portrait', 'landscape', 'any']).optional(),
});

export const UIConfigSchema = z.object({
  showScore: z.boolean().optional(),
  showTimer: z.boolean().optional(),
  showLives: z.boolean().optional(),
  timerCountdown: z.boolean().optional(),
  scorePosition: z.enum(['top-left', 'top-center', 'top-right']).optional(),
  backgroundColor: z.string().optional(),
});

export const GameMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  author: z.string().default(''),
  version: z.string().default('1.0.0'),
});

export const AssetSourceSchema = z.enum(['generated', 'uploaded', 'none']);

export const AssetConfigSchema = z.object({
  imageUrl: z.string().optional(),
  source: AssetSourceSchema.optional(),
  scale: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  animations: z.record(z.string(), z.object({
    frames: z.array(z.string()),
    fps: z.number().positive(),
    loop: z.boolean().optional(),
  })).optional(),
});

export const SpriteStyleSchema = z.enum(['pixel', 'cartoon', '3d', 'flat']);

export const AssetPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  style: SpriteStyleSchema.optional(),
  assets: z.record(z.string(), AssetConfigSchema),
});

export const ParallaxDepthSchema = z.enum(['sky', 'far', 'mid', 'near']);

export const ParallaxLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  depth: ParallaxDepthSchema,
  parallaxFactor: z.number().min(0).max(1),
  scale: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  visible: z.boolean().optional(),
});

export const ParallaxConfigSchema = z.object({
  enabled: z.boolean(),
  layers: z.array(ParallaxLayerSchema),
});

export const TileCollisionSchema = z.union([
  z.literal('none'),
  z.literal('full'),
  z.literal('platform'),
  z.object({
    polygon: z.array(Vec2Schema),
  }),
]);

export const TileAnimationSchema = z.object({
  frames: z.array(z.number()),
  fps: z.number().positive(),
  loop: z.boolean().optional(),
});

export const TileMetadataSchema = z.object({
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collision: TileCollisionSchema.optional(),
  animation: TileAnimationSchema.optional(),
});

export const TileSheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  tileWidth: z.number().positive(),
  tileHeight: z.number().positive(),
  columns: z.number().positive(),
  rows: z.number().positive(),
  spacing: z.number().optional(),
  margin: z.number().optional(),
  tiles: z.record(z.number(), TileMetadataSchema).optional(),
  source: AssetSourceSchema.optional(),
  style: SpriteStyleSchema.optional(),
});

export const TileLayerTypeSchema = z.enum(['background', 'collision', 'foreground', 'decoration']);

export const TileLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: TileLayerTypeSchema,
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  data: z.array(z.number()),
  parallaxFactor: z.number().optional(),
  zIndex: z.number().optional(),
});

export const TileMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  tileSheetId: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  layers: z.array(TileLayerSchema),
});

export const GameDefinitionSchema = z.object({
  metadata: GameMetadataSchema,
  world: WorldConfigSchema,
  presentation: PresentationConfigSchema.optional(),
  camera: CameraConfigSchema.optional(),
  ui: UIConfigSchema.optional(),
  templates: z.record(z.string(), EntityTemplateSchema),
  entities: z.array(GameEntitySchema).min(1),
  rules: z.array(GameRuleSchema).optional(),
  winCondition: WinConditionSchema.optional(),
  loseCondition: LoseConditionSchema.optional(),
  assetPacks: z.record(z.string(), AssetPackSchema).optional(),
  activeAssetPackId: z.string().optional(),
  parallaxConfig: ParallaxConfigSchema.optional(),
  tileSheets: z.array(TileSheetSchema).optional(),
  tileMaps: z.array(TileMapSchema).optional(),
});

export type GameDefinitionGenerated = z.infer<typeof GameDefinitionSchema>;
