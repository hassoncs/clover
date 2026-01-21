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
  speed: z.number().positive(),
  target: z.string().optional(),
  movementType: z.enum(['velocity', 'force']).optional(),
  patrol: BoundsSchema.optional(),
});

export const RotateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('rotate'),
  speed: z.number(),
  direction: z.enum(['clockwise', 'counterclockwise']),
  affectsPhysics: z.boolean().optional(),
});

export const ControlBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('control'),
  controlType: z.enum([
    'tap_to_jump', 'tap_to_shoot', 'tap_to_flip',
    'drag_to_aim', 'drag_to_move', 'tilt_to_move', 'tilt_gravity', 'buttons'
  ]),
  force: z.number().optional(),
  cooldown: z.number().optional(),
  maxSpeed: z.number().optional(),
  aimLine: z.boolean().optional(),
  maxPullDistance: z.number().optional(),
});

export const SpawnOnEventBehaviorSchema = BaseBehaviorSchema.extend({
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
});

export const DestroyOnCollisionBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('destroy_on_collision'),
  withTags: z.array(z.string()),
  effect: z.enum(['none', 'fade', 'explode', 'shrink']).optional(),
  destroyOther: z.boolean().optional(),
  minImpactVelocity: z.number().optional(),
});

export const ScoreOnCollisionBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('score_on_collision'),
  withTags: z.array(z.string()),
  points: z.number(),
  once: z.boolean().optional(),
  showPopup: z.boolean().optional(),
});

export const TimerBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('timer'),
  duration: z.number().positive(),
  action: z.enum(['destroy', 'spawn', 'enable_behavior', 'disable_behavior', 'trigger_event']),
  repeat: z.boolean().optional(),
  spawnTemplate: z.string().optional(),
  behaviorIndex: z.number().optional(),
  eventName: z.string().optional(),
});

export const OscillateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('oscillate'),
  axis: z.enum(['x', 'y', 'both']),
  amplitude: z.number().positive(),
  frequency: z.number().positive(),
  phase: z.number().optional(),
});

export const GravityZoneBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('gravity_zone'),
  gravity: Vec2Schema,
  radius: z.number().positive(),
  affectsTags: z.array(z.string()).optional(),
  falloff: z.enum(['none', 'linear', 'quadratic']).optional(),
});

export const AnimateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('animate'),
  frames: z.array(z.string()).min(1),
  fps: z.number().positive(),
  loop: z.boolean().optional(),
  playOn: z.enum(['always', 'moving', 'collision', 'destroy']).optional(),
});

export const FollowBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('follow'),
  target: z.string(),
  speed: z.number().positive(),
  minDistance: z.number().optional(),
  maxDistance: z.number().optional(),
});

export const BounceBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('bounce'),
  bounds: BoundsSchema,
});

export const MagneticBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('magnetic'),
  strength: z.number(),
  radius: z.number().positive(),
  attractsTags: z.array(z.string()).optional(),
  repels: z.boolean().optional(),
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
  GravityZoneBehaviorSchema,
  AnimateBehaviorSchema,
  FollowBehaviorSchema,
  BounceBehaviorSchema,
  MagneticBehaviorSchema,
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

export const RuleConditionSchema = z.discriminatedUnion('type', [
  ScoreConditionSchema,
  TimeConditionSchema,
  EntityExistsConditionSchema,
  EntityCountConditionSchema,
  RandomConditionSchema,
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
  template: z.string(),
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
  value: z.number(),
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
  value: z.number(),
});

export const RuleActionSchema = z.discriminatedUnion('type', [
  SpawnActionSchema,
  DestroyActionSchema,
  ScoreActionSchema,
  GameStateActionSchema,
  SoundActionSchema,
  EventActionSchema,
  ModifyActionSchema,
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
  transform: TransformComponentSchema,
  sprite: SpriteComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  visible: z.boolean().optional(),
  active: z.boolean().optional(),
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
  type: z.enum(['fixed', 'follow']),
  followTarget: z.string().optional(),
  zoom: z.number().positive().optional(),
  bounds: z.object({
    minX: z.number(),
    maxX: z.number(),
    minY: z.number(),
    maxY: z.number(),
  }).optional(),
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
  title: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  version: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  thumbnailUrl: z.string().optional(),
});

export const GameDefinitionSchema = z.object({
  metadata: GameMetadataSchema,
  world: WorldConfigSchema,
  camera: CameraConfigSchema.optional(),
  ui: UIConfigSchema.optional(),
  templates: z.record(z.string(), EntityTemplateSchema),
  entities: z.array(GameEntitySchema),
  rules: z.array(GameRuleSchema).optional(),
  winCondition: WinConditionSchema.optional(),
  loseCondition: LoseConditionSchema.optional(),
});

export type GameDefinitionInput = z.infer<typeof GameDefinitionSchema>;
