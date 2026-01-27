import { z } from 'zod';
import {
  ExpressionValueSchema,
  NumberValueSchema,
  PositiveNumberValueSchema,
  NonNegativeNumberValueSchema,
  Vec2ValueSchema,
  GameVariablesSchema,
  TuningConfigSchema,
  VariableCategorySchema,
  VariableWithTuningSchema,
} from '../expressions/schema-helpers';
import { AssetSystemConfigSchema, AssetSourceSchema } from './asset-system';

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
});

const BaseSpriteSchema = z.object({
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: ShadowEffectSchema.optional(),
});

export const RectSpriteSchema = BaseSpriteSchema.extend({
  type: z.literal('rect'),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const CircleSpriteSchema = BaseSpriteSchema.extend({
  type: z.literal('circle'),
  radius: z.number().positive(),
});

export const PolygonSpriteSchema = BaseSpriteSchema.extend({
  type: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
});

export const ImageSpriteSchema = BaseSpriteSchema.extend({
  type: z.literal('image'),
  imageUrl: z.string(),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
});

export const SpriteComponentSchema = z.discriminatedUnion('type', [
  RectSpriteSchema,
  CircleSpriteSchema,
  PolygonSpriteSchema,
  ImageSpriteSchema,
]);

const BasePhysicsSchema = z.object({
  bodyType: z.enum(['static', 'dynamic', 'kinematic']),
  density: z.number().nonnegative(),
  friction: z.number().nonnegative(),
  restitution: z.number().nonnegative(),
  isSensor: z.boolean().optional(),
  fixedRotation: z.boolean().optional(),
  bullet: z.boolean().optional(),
  linearDamping: z.number().optional(),
  angularDamping: z.number().optional(),
  initialVelocity: Vec2Schema.optional(),
  initialAngularVelocity: z.number().optional(),
});

export const BoxPhysicsSchema = BasePhysicsSchema.extend({
  shape: z.literal('box'),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const CirclePhysicsSchema = BasePhysicsSchema.extend({
  shape: z.literal('circle'),
  radius: z.number().positive(),
});

export const PolygonPhysicsSchema = BasePhysicsSchema.extend({
  shape: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
});

export const PhysicsComponentSchema = z.discriminatedUnion('shape', [
  BoxPhysicsSchema,
  CirclePhysicsSchema,
  PolygonPhysicsSchema,
]);

const BaseBehaviorSchema = z.object({
  enabled: z.boolean().optional(),
});

export const MoveBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('move'),
  direction: z.enum(['left', 'right', 'up', 'down', 'toward_target', 'away_from_target']),
  speed: PositiveNumberValueSchema,
  target: z.string().optional(),
  movementType: z.enum(['velocity', 'force']).optional(),
  patrol: BoundsSchema.optional(),
});

export const RotateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('rotate'),
  speed: NumberValueSchema,
  direction: z.enum(['clockwise', 'counterclockwise']),
  affectsPhysics: z.boolean().optional(),
});

export const SpawnOnEventBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('spawn_on_event'),
  event: z.enum(['tap', 'timer', 'collision', 'destroy', 'start']),
  entityTemplate: z.union([z.string(), z.array(z.string())]),
  spawnPosition: z.enum(['at_self', 'at_touch', 'random_in_bounds', 'offset']),
  offset: Vec2ValueSchema.optional(),
  bounds: BoundsSchema.optional(),
  interval: PositiveNumberValueSchema.optional(),
  maxSpawns: PositiveNumberValueSchema.optional(),
  initialVelocity: Vec2ValueSchema.optional(),
  withTags: z.array(z.string()).optional(),
});

export const DestroyOnCollisionBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('destroy_on_collision'),
  withTags: z.array(z.string()),
  effect: z.enum(['none', 'fade', 'explode', 'shrink']).optional(),
  destroyOther: z.boolean().optional(),
  minImpactVelocity: NonNegativeNumberValueSchema.optional(),
});

export const ScoreOnCollisionBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('score_on_collision'),
  withTags: z.array(z.string()),
  points: NumberValueSchema,
  once: z.boolean().optional(),
  showPopup: z.boolean().optional(),
});

export const TimerBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('timer'),
  duration: PositiveNumberValueSchema,
  action: z.enum(['destroy', 'spawn', 'enable_behavior', 'disable_behavior', 'trigger_event']),
  repeat: z.boolean().optional(),
  spawnTemplate: z.string().optional(),
  behaviorIndex: z.number().optional(),
  eventName: z.string().optional(),
});

export const OscillateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('oscillate'),
  axis: z.enum(['x', 'y', 'both']),
  amplitude: PositiveNumberValueSchema,
  frequency: PositiveNumberValueSchema,
  phase: NumberValueSchema.optional(),
});

export const GravityZoneBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('gravity_zone'),
  gravity: Vec2ValueSchema,
  radius: PositiveNumberValueSchema,
  affectsTags: z.array(z.string()).optional(),
  falloff: z.enum(['none', 'linear', 'quadratic']).optional(),
});

export const AnimateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('animate'),
  frames: z.array(z.string()).min(1),
  fps: PositiveNumberValueSchema,
  loop: z.boolean().optional(),
  playOn: z.enum(['always', 'moving', 'collision', 'destroy']).optional(),
});

export const FollowBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('follow'),
  target: z.string(),
  speed: PositiveNumberValueSchema,
  minDistance: NonNegativeNumberValueSchema.optional(),
  maxDistance: PositiveNumberValueSchema.optional(),
});

export const BounceBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('bounce'),
  bounds: BoundsSchema,
});

export const MagneticBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('magnetic'),
  strength: NumberValueSchema,
  radius: PositiveNumberValueSchema,
  attractsTags: z.array(z.string()).optional(),
  repels: z.boolean().optional(),
});

export const AttachToBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('attach_to'),
  parentTag: z.string(),
  slotName: z.string(),
  inheritRotation: z.boolean().optional(),
});

export const BehaviorSchema = z.discriminatedUnion('type', [
  MoveBehaviorSchema,
  RotateBehaviorSchema,
  SpawnOnEventBehaviorSchema,
  DestroyOnCollisionBehaviorSchema,
  ScoreOnCollisionBehaviorSchema,
  TimerBehaviorSchema,
  OscillateBehaviorSchema,
  GravityZoneBehaviorSchema,
  AnimateBehaviorSchema,
  FollowBehaviorSchema,
  BounceBehaviorSchema,
  MagneticBehaviorSchema,
  AttachToBehaviorSchema,
]);

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
  count: z.number().nonnegative(),
  comparison: z.enum(['gte', 'lte', 'eq', 'zero']),
});

export const EventTriggerSchema = z.object({
  type: z.literal('event'),
  eventName: z.string(),
});

export const FrameTriggerSchema = z.object({
  type: z.literal('frame'),
});

export const RuleTriggerSchema = z.discriminatedUnion('type', [
  CollisionTriggerSchema,
  TimerTriggerSchema,
  ScoreTriggerSchema,
  EntityCountTriggerSchema,
  EventTriggerSchema,
  FrameTriggerSchema,
]);

export const ScoreConditionSchema = z.object({
  type: z.literal('score'),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const TimeConditionSchema = z.object({
  type: z.literal('time'),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const EntityExistsConditionSchema = z.object({
  type: z.literal('entity_exists'),
  entityId: z.string().optional(),
  entityTag: z.string().optional(),
});

export const EntityCountConditionSchema = z.object({
  type: z.literal('entity_count'),
  tag: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const RandomConditionSchema = z.object({
  type: z.literal('random'),
  probability: z.number().min(0).max(1),
});

export const ListContainsConditionSchema = z.object({
  type: z.literal('list_contains'),
  listName: z.string(),
  value: ExpressionValueSchema,
  negated: z.boolean().optional(),
});

export const RuleConditionSchema = z.discriminatedUnion('type', [
  ScoreConditionSchema,
  TimeConditionSchema,
  EntityExistsConditionSchema,
  EntityCountConditionSchema,
  RandomConditionSchema,
  ListContainsConditionSchema,
]);

export const SpawnPositionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fixed'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('random'), bounds: BoundsSchema }),
  z.object({ type: z.literal('at_entity'), entityId: z.string() }),
  z.object({ type: z.literal('at_collision') }),
]);

export const DestroyTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('by_id'), entityId: z.string() }),
  z.object({ type: z.literal('by_tag'), tag: z.string(), count: z.number().optional() }),
  z.object({ type: z.literal('collision_entities') }),
  z.object({ type: z.literal('all') }),
]);

export const SpawnActionSchema = z.object({
  type: z.literal('spawn'),
  template: z.union([z.string(), z.array(z.string())]),
  position: SpawnPositionSchema,
  count: z.number().positive().optional(),
  spread: z.number().optional(),
});

export const DestroyActionSchema = z.object({
  type: z.literal('destroy'),
  target: DestroyTargetSchema,
});

export const ScoreActionSchema = z.object({
  type: z.literal('score'),
  operation: z.enum(['add', 'subtract', 'set', 'multiply']),
  value: NumberValueSchema,
});

export const GameStateActionSchema = z.object({
  type: z.literal('game_state'),
  state: z.enum(['win', 'lose', 'pause', 'restart', 'next_level']),
  delay: z.number().optional(),
});

export const SoundActionSchema = z.object({
  type: z.literal('sound'),
  soundId: z.string(),
  volume: z.number().min(0).max(1).optional(),
});

export const EventActionSchema = z.object({
  type: z.literal('event'),
  eventName: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const ModifyActionSchema = z.object({
  type: z.literal('modify'),
  target: z.discriminatedUnion('type', [
    z.object({ type: z.literal('by_id'), entityId: z.string() }),
    z.object({ type: z.literal('by_tag'), tag: z.string() }),
  ]),
  property: z.string(),
  operation: z.enum(['set', 'add', 'multiply']),
  value: NumberValueSchema,
});

export const LivesActionSchema = z.object({
  type: z.literal('lives'),
  operation: z.enum(['add', 'subtract', 'set']),
  value: NumberValueSchema,
});

export const PushToListActionSchema = z.object({
  type: z.literal('push_to_list'),
  listName: z.string(),
  value: ExpressionValueSchema,
});

export const PopFromListActionSchema = z.object({
  type: z.literal('pop_from_list'),
  listName: z.string(),
  position: z.enum(['front', 'back']).optional(),
  storeIn: z.string().optional(),
});

export const ShuffleListActionSchema = z.object({
  type: z.literal('shuffle_list'),
  listName: z.string(),
});

export const RuleActionSchema = z.discriminatedUnion('type', [
  SpawnActionSchema,
  DestroyActionSchema,
  ScoreActionSchema,
  GameStateActionSchema,
  SoundActionSchema,
  EventActionSchema,
  ModifyActionSchema,
  LivesActionSchema,
  PushToListActionSchema,
  PopFromListActionSchema,
  ShuffleListActionSchema,
]);

export const GameRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  trigger: RuleTriggerSchema,
  conditions: z.array(RuleConditionSchema).optional(),
  actions: z.array(RuleActionSchema).min(1),
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

export const TransformComponentSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
});

export const SlotDefinitionSchema = z.object({
  x: z.number(),
  y: z.number(),
  layer: z.number().optional(),
});

export const ChildEntityDefinitionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string(),
    template: z.string(),
    localTransform: TransformComponentSchema,
    slot: z.string().optional(),
    sprite: SpriteComponentSchema.optional(),
    physics: PhysicsComponentSchema.optional(),
    behaviors: z.array(BehaviorSchema).optional(),
    tags: z.array(z.string()).optional(),
    visible: z.boolean().optional(),
    assetPackId: z.string().optional(),
    children: z.array(ChildEntityDefinitionSchema).optional(),
  })
);

export const ChildTemplateDefinitionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    template: z.string(),
    localTransform: TransformComponentSchema,
    slot: z.string().optional(),
    sprite: SpriteComponentSchema.optional(),
    physics: PhysicsComponentSchema.optional(),
    behaviors: z.array(BehaviorSchema).optional(),
    tags: z.array(z.string()).optional(),
    children: z.array(ChildTemplateDefinitionSchema).optional(),
  })
);

export const EntityTemplateSchema = z.object({
  id: z.string(),
  sprite: SpriteComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  slots: z.record(z.string(), SlotDefinitionSchema).optional(),
  children: z.array(ChildTemplateDefinitionSchema).optional(),
});

export const GameEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string().optional(),
  transform: TransformComponentSchema,
  sprite: SpriteComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  visible: z.boolean().optional(),
  active: z.boolean().optional(),
  assetPackId: z.string().optional(),
  children: z.array(ChildEntityDefinitionSchema).optional(),
});

export const WorldConfigSchema = z.object({
  gravity: Vec2Schema,
  pixelsPerMeter: z.number().positive(),
  bounds: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const CameraConfigSchema = z.object({
  type: z.enum(['fixed', 'follow', 'follow-x', 'follow-y', 'auto-scroll']),
  followTarget: z.string().optional(),
  viewHeight: z.number().positive().optional(),
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
  bounds: z.object({
    minX: z.number(),
    maxX: z.number(),
    minY: z.number(),
    maxY: z.number(),
  }).optional(),
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

export const EntityCountDisplaySchema = z.object({
  tag: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

export const VariableDisplaySchema = z.object({
  name: z.string(),
  label: z.string(),
  color: z.string().optional(),
  format: z.string().optional(),
  showWhen: z.enum(['always', 'not_default']).optional(),
  defaultValue: z.union([z.number(), z.string(), z.boolean()]).optional(),
});

export const UIConfigSchema = z.object({
  showScore: z.boolean().optional(),
  showTimer: z.boolean().optional(),
  showLives: z.boolean().optional(),
  livesLabel: z.string().optional(),
  timerCountdown: z.boolean().optional(),
  scorePosition: z.enum(['top-left', 'top-center', 'top-right']).optional(),
  backgroundColor: z.string().optional(),
  entityCountDisplays: z.array(EntityCountDisplaySchema).optional(),
  variableDisplays: z.array(VariableDisplaySchema).optional(),
});

export const GameMetadataSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  version: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  thumbnailUrl: z.string().optional(),
});

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

const GameJointBaseSchema = z.object({
  id: z.string(),
  entityA: z.string(),
  entityB: z.string(),
  collideConnected: z.boolean().optional(),
});

export const GameRevoluteJointSchema = GameJointBaseSchema.extend({
  type: z.literal('revolute'),
  anchor: Vec2Schema,
  enableLimit: z.boolean().optional(),
  lowerAngle: z.number().optional(),
  upperAngle: z.number().optional(),
  enableMotor: z.boolean().optional(),
  motorSpeed: z.number().optional(),
  maxMotorTorque: z.number().optional(),
});

export const GameDistanceJointSchema = GameJointBaseSchema.extend({
  type: z.literal('distance'),
  anchorA: Vec2Schema,
  anchorB: Vec2Schema,
  length: z.number().positive().optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
});

export const GameWeldJointSchema = GameJointBaseSchema.extend({
  type: z.literal('weld'),
  anchor: Vec2Schema,
  stiffness: z.number().optional(),
  damping: z.number().optional(),
});

export const GamePrismaticJointSchema = GameJointBaseSchema.extend({
  type: z.literal('prismatic'),
  anchor: Vec2Schema,
  axis: Vec2Schema,
  enableLimit: z.boolean().optional(),
  lowerTranslation: z.number().optional(),
  upperTranslation: z.number().optional(),
  enableMotor: z.boolean().optional(),
  motorSpeed: z.number().optional(),
  maxMotorForce: z.number().optional(),
});

export const GameJointSchema = z.discriminatedUnion('type', [
  GameRevoluteJointSchema,
  GameDistanceJointSchema,
  GameWeldJointSchema,
  GamePrismaticJointSchema,
]);

export const SheetLayoutSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("grid"),
    columns: z.number().positive(),
    rows: z.number().positive(),
    cellWidth: z.number().positive(),
    cellHeight: z.number().positive(),
    spacing: z.number().optional(),
    margin: z.number().optional(),
    origin: z.literal("top-left").optional(),
  }),
  z.object({
    type: z.literal("strip"),
    direction: z.enum(["horizontal", "vertical"]),
    frameCount: z.number().positive(),
    cellWidth: z.number().positive(),
    cellHeight: z.number().positive(),
    spacing: z.number().optional(),
    margin: z.number().optional(),
  }),
  z.object({
    type: z.literal("manual"),
  }),
]);

export const SheetRegionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("gridIndex"),
    index: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("rect"),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
]);

export const SheetPivotSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SheetPromptConfigSchema = z.object({
  basePrompt: z.string(),
  commonModifiers: z.array(z.string()).optional(),
  stylePreset: z.string().optional(),
  negativePrompt: z.string().optional(),
});

export const AssetSheetEntrySchema = z.object({
  id: z.string().min(1),
  region: SheetRegionSchema,
  pivot: SheetPivotSchema.optional(),
  tags: z.array(z.string()).optional(),
  promptOverride: z.string().optional(),
});

export const SheetAnimationSchema = z.object({
  id: z.string().min(1),
  frames: z.array(z.string()).min(1),
  fps: z.number().positive(),
  loop: z.boolean().optional(),
});

export const SheetTileCollisionSchema = z.union([
  z.literal("none"),
  z.literal("full"),
  z.literal("platform"),
  z.object({ polygon: z.array(z.object({ x: z.number(), y: z.number() })).min(3) }),
]);

export const SheetTileAnimationSchema = z.object({
  frames: z.array(z.number().int().nonnegative()).min(1),
  fps: z.number().positive(),
  loop: z.boolean().optional(),
});

export const SheetTileMetadataSchema = z.object({
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collision: SheetTileCollisionSchema.optional(),
  animation: SheetTileAnimationSchema.optional(),
  promptOverride: z.string().optional(),
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
  tiles: z.record(z.number(), SheetTileMetadataSchema).optional(),
  source: AssetSourceSchema.optional(),
  style: SpriteStyleSchema.optional(),
});

export const VariationVariantSchema = z.object({
  entryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  weight: z.number().positive().optional(),
  promptOverride: z.string().optional(),
});

export const VariationGroupSchema = z.object({
  id: z.string().min(1),
  variants: z.record(z.string(), VariationVariantSchema),
});

export const AssetSheetBaseSchema = z.object({
  id: z.string(),
  packId: z.string(),
  source: AssetSourceSchema.optional(),
  imageAssetId: z.string().optional(),
  imageUrl: z.string(),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
  layout: SheetLayoutSchema,
  entries: z.record(z.string(), AssetSheetEntrySchema),
  promptConfig: SheetPromptConfigSchema.optional(),
  createdAt: z.number(),
  deletedAt: z.number().optional(),
});

export const AssetSheetSchema = z.discriminatedUnion("kind", [
  AssetSheetBaseSchema.extend({
    kind: z.literal("sprite"),
    animations: z.record(z.string(), SheetAnimationSchema).optional(),
    defaultAnimationId: z.string().optional(),
  }),
  AssetSheetBaseSchema.extend({
    kind: z.literal("tile"),
    tileWidth: z.number().positive(),
    tileHeight: z.number().positive(),
    tiles: z.record(z.number(), SheetTileMetadataSchema).optional(),
  }),
  AssetSheetBaseSchema.extend({
    kind: z.literal("variation"),
    groups: z.record(z.string(), VariationGroupSchema),
    defaultGroupId: z.string().optional(),
    defaultVariantKey: z.string().optional(),
  }),
]);

export const TapZoneEdgeSchema = z.enum(['left', 'right', 'top', 'bottom']);
export const TapZoneButtonSchema = z.enum(['left', 'right', 'up', 'down', 'jump', 'action']);

export const TapZoneSchema = z.object({
  id: z.string(),
  edge: TapZoneEdgeSchema,
  size: z.number().min(0).max(1),
  button: TapZoneButtonSchema,
  debugColor: z.string().optional(),
});

export const VirtualButtonTypeSchema = z.enum(['jump', 'action']);

export const VirtualButtonSchema = z.object({
  id: z.string(),
  button: VirtualButtonTypeSchema,
  label: z.string().optional(),
  size: z.number().positive().optional(),
  color: z.string().optional(),
  activeColor: z.string().optional(),
});

export const VirtualJoystickSchema = z.object({
  id: z.string(),
  size: z.number().positive().optional(),
  knobSize: z.number().positive().optional(),
  deadZone: z.number().min(0).max(1).optional(),
  color: z.string().optional(),
  knobColor: z.string().optional(),
});

export const DPadDirectionSchema = z.enum(['up', 'down', 'left', 'right']);

export const VirtualDPadSchema = z.object({
  id: z.string(),
  size: z.number().positive().optional(),
  buttonSize: z.number().positive().optional(),
  color: z.string().optional(),
  activeColor: z.string().optional(),
  showDiagonals: z.boolean().optional(),
});

export const InputConfigSchema = z.object({
  tapZones: z.array(TapZoneSchema).optional(),
  debugTapZones: z.boolean().optional(),
  debugInputs: z.boolean().optional(),
  virtualButtons: z.array(VirtualButtonSchema).optional(),
  virtualJoystick: VirtualJoystickSchema.optional(),
  virtualDPad: VirtualDPadSchema.optional(),
  enableHaptics: z.boolean().optional(),
});

export const GameDefinitionSchema = z.object({
  metadata: GameMetadataSchema,
  world: WorldConfigSchema,
  presentation: PresentationConfigSchema.optional(),
  camera: CameraConfigSchema.optional(),
  ui: UIConfigSchema.optional(),
  variables: GameVariablesSchema.optional(),
  templates: z.record(z.string(), EntityTemplateSchema),
  entities: z.array(GameEntitySchema),
  joints: z.array(GameJointSchema).optional(),
  rules: z.array(GameRuleSchema).optional(),
  winCondition: WinConditionSchema.optional(),
  loseCondition: LoseConditionSchema.optional(),
  assetPacks: z.record(z.string(), AssetPackSchema).optional(),
  activeAssetPackId: z.string().optional(),
  assetSystem: AssetSystemConfigSchema.optional(),
  parallaxConfig: ParallaxConfigSchema.optional(),
  tileSheets: z.array(TileSheetSchema).optional(),
  tileMaps: z.array(TileMapSchema).optional(),
  input: InputConfigSchema.optional(),
});

export type GameDefinitionInput = z.infer<typeof GameDefinitionSchema>;

export { TuningConfigSchema, VariableCategorySchema, VariableWithTuningSchema } from '../expressions/schema-helpers';
