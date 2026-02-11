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

// ============================================================================
// Constant Reference Types (for bundle format)
// ============================================================================

/**
 * Reference to a constant defined in GameDefinition.constants.
 * Used in bundle format to reference values by name instead of hardcoding.
 * Example: { const: "GRAVITY" } resolves to the value of constants.GRAVITY
 */
export const ConstantRefSchema = z.object({
  const: z.string(),
});

export type ConstantRef = z.infer<typeof ConstantRefSchema>;

/**
 * Union type: either a number or a constant reference
 */
export const NumberOrConstantSchema = z.union([z.number(), ConstantRefSchema]);

export type NumberOrConstant = z.infer<typeof NumberOrConstantSchema>;

/**
 * Union type: either a string or a constant reference
 */
export const StringOrConstantSchema = z.union([z.string(), ConstantRefSchema]);

export type StringOrConstant = z.infer<typeof StringOrConstantSchema>;

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

const BaseVisualSchema = z.object({
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  zIndex: z.number().optional(),
  blendMode: z.enum(['mix', 'add', 'sub', 'mul']).optional(),
  shadow: ShadowEffectSchema.optional(),
});

export const RectVisualSchema = BaseVisualSchema.extend({
  type: z.literal('rect'),
  color: z.string(),
});

export const CircleVisualSchema = BaseVisualSchema.extend({
  type: z.literal('circle'),
  radius: z.number().optional(),
  color: z.string(),
});

export const PolygonVisualSchema = BaseVisualSchema.extend({
  type: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
  color: z.string(),
});

export const ImageVisualSchema = BaseVisualSchema.extend({
  type: z.literal('image'),
  whatDescription: z.string().optional(),
  tint: z.string().optional(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  url: z.string().optional(),
  scale: z.number().optional(),
});

export const TextVisualSchema = BaseVisualSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  color: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

export const VisualComponentSchema = z.discriminatedUnion('type', [
  RectVisualSchema,
  CircleVisualSchema,
  PolygonVisualSchema,
  ImageVisualSchema,
  TextVisualSchema,
]);

export const SpriteComponentSchema = VisualComponentSchema;

export const PhysicsComponentSchema = z.object({
  bodyType: z.enum(['static', 'dynamic', 'kinematic']),
  density: z.number().nonnegative().optional(),
  mass: z.number().nonnegative().optional(),
  gravityScale: z.number().optional(),
  linearDamping: z.number().optional(),
  angularDamping: z.number().optional(),
  fixedRotation: z.boolean().optional(),
  ccd: z.boolean().optional(),
  initialVelocity: Vec2Schema.optional(),
  initialAngularVelocity: z.number().optional(),
});

const BaseColliderSchema = z.object({
  friction: z.number().nonnegative().optional(),
  restitution: z.number().nonnegative().optional(),
  isSensor: z.boolean().optional(),
  categoryBits: z.number().optional(),
  maskBits: z.number().optional(),
});

export const BoxColliderSchema = BaseColliderSchema.extend({
  shape: z.literal('box'),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const CircleColliderSchema = BaseColliderSchema.extend({
  shape: z.literal('circle'),
  radius: z.number().positive(),
});

export const PolygonColliderSchema = BaseColliderSchema.extend({
  shape: z.literal('polygon'),
  vertices: z.array(Vec2Schema).min(3),
});

export const CapsuleColliderSchema = BaseColliderSchema.extend({
  shape: z.literal('capsule'),
  radius: z.number().positive(),
  height: z.number().positive(),
});

export const ColliderComponentSchema = z.discriminatedUnion('shape', [
  BoxColliderSchema,
  CircleColliderSchema,
  PolygonColliderSchema,
  CapsuleColliderSchema,
]);

export const CharacterComponentSchema = z.object({
  upDirection: z.enum(['up', 'down']).optional(),
  snapToGround: z.number().optional(),
  maxSlopeAngle: z.number().optional(),
  minSlopeSlideAngle: z.number().optional(),
  autoStep: z.boolean().optional(),
  maxAutoStepHeight: z.number().optional(),
  slideOnSlope: z.boolean().optional(),
  collisionOffset: z.number().optional(),
  isGrounded: z.boolean().optional(),
  floorNormal: Vec2Schema.optional(),
  floorAngle: z.number().optional(),
  platformVelocity: Vec2Schema.optional(),
  hitCeiling: z.boolean().optional(),
  hitWall: z.boolean().optional(),
});

const BaseBehaviorSchema = z.object({
  enabled: z.boolean().optional(),
});

export const MoveBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('move'),
  direction: z.enum(['left', 'right', 'up', 'down', 'toward_target', 'away_from_target']),
  speed: NumberValueSchema,
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

export const DestroyWhenOffScreenBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('destroy_when_off_screen'),
  edge: z.enum(['left', 'right', 'top', 'bottom']),
  buffer: z.number().optional(),
  recursive: z.boolean().optional(),
});

export const ConfigureChildrenAtSpawnBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('configure_children_at_spawn'),
  configs: z.array(z.object({
    childName: z.string(),
    property: z.enum(['transform.x', 'transform.y', 'localTransform.x', 'localTransform.y']),
    randomRange: z.tuple([z.number(), z.number()]).optional(),
    offsetFrom: z.string().optional(),
    offset: z.number().optional(),
  })),
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
  speed: NumberValueSchema,
  minDistance: NumberValueSchema.optional(),
  maxDistance: NumberValueSchema.optional(),
});

export const BounceBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('bounce'),
  bounds: BoundsSchema,
});

export const MagneticBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('magnetic'),
  strength: NumberValueSchema,
  radius: NumberValueSchema,
  attractsTags: z.array(z.string()).optional(),
  repels: z.boolean().optional(),
});

export const AttachToBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('attach_to'),
  parentTag: z.string(),
  slotName: z.string(),
  inheritRotation: z.boolean().optional(),
});

export const RotateTowardBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('rotate_toward'),
  target: z.string(),
  speed: z.number().optional(),
  offset: z.number().optional(),
});

export const ScoreOnDestroyBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('score_on_destroy'),
  points: NumberValueSchema,
});

export const ScaleOscillateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('scale_oscillate'),
  min: z.number(),
  max: z.number(),
  speed: z.number(),
  phase: z.number().optional(),
});

export const HealthBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('health'),
  maxHealth: z.number(),
  currentHealth: z.number().optional(),
  damageFromTags: z.array(z.string()).optional(),
  damagePerHit: z.number().optional(),
  destroyOnDeath: z.boolean().optional(),
  invulnerabilityTime: z.number().optional(),
});

export const DraggableBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('draggable'),
  mode: z.enum(['force', 'kinematic']).optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  requireDirectHit: z.boolean().optional(),
});

export const ParticleEmitterBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('particle_emitter'),
  emitterType: z.enum([
    'fire',
    'smoke',
    'sparks',
    'magic',
    'explosion',
    'rain',
    'snow',
    'bubbles',
    'confetti',
    'custom',
  ]),
  offset: Vec2Schema.optional(),
  emitWhile: z.enum(['always', 'moving', 'enabled']).optional(),
});

export const TeleportBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('teleport'),
  destinationEntityId: z.string(),
  withTags: z.array(z.string()),
  preserveVelocity: z.boolean().optional(),
  velocityMultiplier: z.number().optional(),
  exitOffset: Vec2Schema.optional(),
  cooldown: z.number().optional(),
});

export const MaintainSpeedBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('maintain_speed'),
  speed: NumberValueSchema,
  mode: z.enum(['constant', 'minimum']).optional(),
});

export const SpriteEffectBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('sprite_effect'),
  effect: z.enum([
    'outline',
    'glow',
    'tint',
    'flash',
    'pixelate',
    'posterize',
    'rim_light',
    'color_matrix',
    'inner_glow',
    'drop_shadow',
    'fade_out',
  ]),
  params: z.object({
    color: z.tuple([z.number(), z.number(), z.number()]).optional(),
    intensity: z.number().optional(),
    duration: z.number().optional(),
    pulse: z.boolean().optional(),
  }).optional(),
});

export const MovementDirectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('vector'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('toward_target'), targetTag: z.string().optional() }),
  z.object({ type: z.literal('away_from_target'), targetTag: z.string().optional() }),
  z.object({ type: z.literal('random') }),
]);

export const TranslateBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('translate'),
  direction: MovementDirectionSchema,
  speed: z.number(),
  bounds: BoundsSchema.optional(),
  duration: z.number().optional(),
});

export const SetVelocityBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('set_velocity'),
  direction: MovementDirectionSchema,
  speed: z.number(),
  overwrite: z.boolean().optional(),
});

export const ApplyImpulseBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('apply_impulse'),
  direction: MovementDirectionSchema,
  magnitude: z.number(),
  duration: z.number().optional(),
});

export const TweenBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('tween'),
  property: z.enum(['position', 'rotation', 'scale', 'opacity']),
  to: z.union([z.number(), z.object({ x: z.number(), y: z.number() })]),
  from: z.union([z.number(), z.object({ x: z.number(), y: z.number() })]).optional(),
  duration: z.number(),
  ease: z.string().optional(),
  loop: z.boolean().optional(),
  yoyo: z.boolean().optional(),
  onCompleteEvent: z.string().optional(),
});

export const StickToEntityBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('stick_to_entity'),
  targetTag: z.string(),
  offset: Vec2Schema.optional(),
  inheritRotation: z.boolean().optional(),
});

export const LaunchOnInputBehaviorSchema = BaseBehaviorSchema.extend({
  type: z.literal('launch_on_input'),
  speed: z.number(),
  minAngle: z.number().optional(),
  maxAngle: z.number().optional(),
  enableBehaviorAfterLaunch: z.number().optional(),
});

export const BehaviorSchema = z.discriminatedUnion('type', [
  MoveBehaviorSchema,
  RotateBehaviorSchema,
  RotateTowardBehaviorSchema,
  SpawnOnEventBehaviorSchema,
  DestroyOnCollisionBehaviorSchema,
  DestroyWhenOffScreenBehaviorSchema,
  ConfigureChildrenAtSpawnBehaviorSchema,
  ScoreOnCollisionBehaviorSchema,
  ScoreOnDestroyBehaviorSchema,
  TimerBehaviorSchema,
  OscillateBehaviorSchema,
  ScaleOscillateBehaviorSchema,
  GravityZoneBehaviorSchema,
  AnimateBehaviorSchema,
  FollowBehaviorSchema,
  BounceBehaviorSchema,
  MagneticBehaviorSchema,
  HealthBehaviorSchema,
  DraggableBehaviorSchema,
  ParticleEmitterBehaviorSchema,
  AttachToBehaviorSchema,
  TeleportBehaviorSchema,
  MaintainSpeedBehaviorSchema,
  SpriteEffectBehaviorSchema,
  TranslateBehaviorSchema,
  SetVelocityBehaviorSchema,
  ApplyImpulseBehaviorSchema,
  TweenBehaviorSchema,
  StickToEntityBehaviorSchema,
  LaunchOnInputBehaviorSchema,
]);

export const ConditionalBehaviorConditionSchema = z.object({
  hasTag: z.string().optional(),
  hasAnyTag: z.array(z.string()).optional(),
  hasAllTags: z.array(z.string()).optional(),
  lacksTag: z.string().optional(),
  expr: z.string().optional(),
});

export const ConditionalBehaviorSchema = z.object({
  when: ConditionalBehaviorConditionSchema,
  priority: z.number(),
  behaviors: z.array(BehaviorSchema),
});

export const CollisionTriggerSchema = z.object({
  type: z.literal('collision'),
  entityATag: z.string(),
  entityBTag: z.string(),
});

export const SensorEnterTriggerSchema = z.object({
  type: z.literal('sensor_enter'),
  sensorTag: z.string(),
  entityTag: z.string(),
});

export const SensorExitTriggerSchema = z.object({
  type: z.literal('sensor_exit'),
  sensorTag: z.string(),
  entityTag: z.string(),
});

export const TimerTriggerSchema = z.object({
  type: z.literal('timer'),
  time: z.number().positive(),
  repeat: z.boolean().optional(),
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

export const TapTriggerSchema = z.object({
  type: z.literal('tap'),
  target: z.union([z.literal('screen'), z.literal('self'), z.string()]).optional(),
  xMin: z.number().optional(),
  xMax: z.number().optional(),
  xMinPercent: z.number().optional(),
  xMaxPercent: z.number().optional(),
});

export const DragTriggerSchema = z.object({
  type: z.literal('drag'),
  phase: z.enum(['start', 'move', 'end']),
  target: z.union([z.literal('screen'), z.literal('self'), z.string()]).optional(),
});

export const TiltTriggerSchema = z.object({
  type: z.literal('tilt'),
  axis: z.enum(['x', 'y', 'both']).optional(),
  threshold: z.number().optional(),
});

export const ButtonTriggerSchema = z.object({
  type: z.literal('button'),
  button: z.enum(['left', 'right', 'up', 'down', 'jump', 'action', 'any']),
  state: z.enum(['pressed', 'released', 'held']),
});

export const SwipeTriggerSchema = z.object({
  type: z.literal('swipe'),
  direction: z.enum(['left', 'right', 'up', 'down', 'any']),
});

export const GameStartTriggerSchema = z.object({
  type: z.literal('game_started'),
});

export const GameLoadedTriggerSchema = z.object({
  type: z.literal('game_loaded'),
});

export const RuleTriggerSchema = z.discriminatedUnion('type', [
  CollisionTriggerSchema,
  SensorEnterTriggerSchema,
  SensorExitTriggerSchema,
  TimerTriggerSchema,
  EntityCountTriggerSchema,
  EventTriggerSchema,
  FrameTriggerSchema,
  TapTriggerSchema,
  DragTriggerSchema,
  TiltTriggerSchema,
  ButtonTriggerSchema,
  SwipeTriggerSchema,
  GameStartTriggerSchema,
  GameLoadedTriggerSchema,
]);

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

export const OnGroundConditionSchema = z.object({
  type: z.literal('on_ground'),
  value: z.boolean(),
});

export const TouchingConditionSchema = z.object({
  type: z.literal('touching'),
  tag: z.string(),
  negated: z.boolean().optional(),
});

export const VelocityConditionSchema = z.object({
  type: z.literal('velocity'),
  axis: z.enum(['x', 'y']),
  comparison: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
  value: z.number(),
});

export const CooldownReadyConditionSchema = z.object({
  type: z.literal('cooldown_ready'),
  cooldownId: z.string(),
});

export const VariableConditionSchema = z.object({
  type: z.literal('variable'),
  name: z.string(),
  comparison: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'neq']),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const ListContainsConditionSchema = z.object({
  type: z.literal('list_contains'),
  listName: z.string(),
  value: ExpressionValueSchema,
  negated: z.boolean().optional(),
});

export const ExpressionConditionSchema = z.object({
  type: z.literal('expression'),
  expr: z.string(),
});

export const StateConditionSchema = z.object({
  type: z.literal('state'),
  machineId: z.string(),
  state: z.string(),
  negated: z.boolean().optional(),
});

export const ContainerIsEmptyConditionSchema = z.object({
  type: z.literal('container_is_empty'),
  container: z.string(),
  negated: z.boolean().optional(),
});

export const ContainerIsFullConditionSchema = z.object({
  type: z.literal('container_is_full'),
  container: z.string(),
  negated: z.boolean().optional(),
});

export const ContainerCountConditionSchema = z.object({
  type: z.literal('container_count'),
  container: z.string(),
  comparison: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'neq']),
  value: z.number(),
});

export const ContainerHasItemConditionSchema = z.object({
  type: z.literal('container_has_item'),
  container: z.string(),
  item: z.union([z.string(), z.object({ type: z.literal('self') }), z.object({ type: z.literal('by_id'), entityId: z.string() }), z.object({ type: z.literal('by_tag'), tag: z.string() })]),
  negated: z.boolean().optional(),
});

export const ContainerCanAcceptConditionSchema = z.object({
  type: z.literal('container_can_accept'),
  container: z.string(),
  item: z.union([z.string(), z.object({ type: z.literal('self') }), z.object({ type: z.literal('by_id'), entityId: z.string() }), z.object({ type: z.literal('by_tag'), tag: z.string() })]),
  match: z.object({}).passthrough().optional(),
  negated: z.boolean().optional(),
});

export const ContainerTopItemConditionSchema = z.object({
  type: z.literal('container_top_item'),
  container: z.string(),
  tag: z.string().optional(),
  entityId: z.string().optional(),
  negated: z.boolean().optional(),
});

export const ContainerIsOccupiedConditionSchema = z.object({
  type: z.literal('container_is_occupied'),
  container: z.string(),
  position: z.union([
    z.object({ row: z.number(), col: z.number() }),
    z.number(),
  ]),
  negated: z.boolean().optional(),
});

export const RuleConditionSchema = z.discriminatedUnion('type', [
  TimeConditionSchema,
  EntityExistsConditionSchema,
  EntityCountConditionSchema,
  RandomConditionSchema,
  OnGroundConditionSchema,
  TouchingConditionSchema,
  VelocityConditionSchema,
  CooldownReadyConditionSchema,
  VariableConditionSchema,
  ListContainsConditionSchema,
  ExpressionConditionSchema,
  StateConditionSchema,
  ContainerIsEmptyConditionSchema,
  ContainerIsFullConditionSchema,
  ContainerCountConditionSchema,
  ContainerHasItemConditionSchema,
  ContainerCanAcceptConditionSchema,
  ContainerTopItemConditionSchema,
  ContainerIsOccupiedConditionSchema,
]);

export const SpawnPositionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fixed'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('random'), bounds: BoundsSchema }),
  z.object({ type: z.literal('at_entity'), entityId: z.string() }),
  z.object({ type: z.literal('at_collision') }),
]);

export const LaunchDirectionSchema = z.union([
  z.literal('up'),
  z.literal('down'),
  z.literal('left'),
  z.literal('right'),
  z.literal('toward_touch'),
  z.object({ x: z.number(), y: z.number() }),
]);

export const LaunchConfigSchema = z.object({
  direction: LaunchDirectionSchema,
  force: z.number().positive(),
  sourceEntityId: z.string().optional(),
});

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
  launch: LaunchConfigSchema.optional(),
});

export const DestroyActionSchema = z.object({
  type: z.literal('destroy'),
  target: DestroyTargetSchema,
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

export const HapticActionSchema = z.object({
  type: z.literal('haptic'),
  hapticType: z.enum(['impact', 'notification', 'selection']).optional(),
  style: z.enum(['Light', 'Medium', 'Heavy', 'Rigid', 'Soft']).optional(),
  notificationStyle: z.enum(['Success', 'Warning', 'Error']).optional(),
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

export const EntityTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('self') }),
  z.object({ type: z.literal('by_id'), entityId: z.string() }),
  z.object({ type: z.literal('by_tag'), tag: z.string() }),
  z.object({ type: z.literal('touched') }),
  z.object({ type: z.literal('player') }),
  z.object({ type: z.literal('other') }),
]);

export const DestroyMarkedActionSchema = z.object({
  type: z.literal('destroy_marked'),
  tag: z.string().optional(),
});

export const ApplyImpulseActionSchema = z.object({
  type: z.literal('apply_impulse'),
  target: EntityTargetSchema,
  x: NumberValueSchema.optional(),
  y: NumberValueSchema.optional(),
  direction: z.enum(['up', 'down', 'left', 'right', 'drag_direction', 'tilt_direction', 'toward_touch']).optional(),
  force: NumberValueSchema.optional(),
  sourceEntityId: z.string().optional(),
});

export const ApplyForceActionSchema = z.object({
  type: z.literal('apply_force'),
  target: EntityTargetSchema,
  x: NumberValueSchema.optional(),
  y: NumberValueSchema.optional(),
  direction: z.enum(['drag_direction', 'tilt_direction', 'toward_touch']).optional(),
  force: NumberValueSchema.optional(),
});

export const SetVelocityActionSchema = z.object({
  type: z.literal('set_velocity'),
  target: EntityTargetSchema,
  x: NumberValueSchema.optional(),
  y: NumberValueSchema.optional(),
});

export const MoveActionSchema = z.object({
  type: z.literal('move'),
  target: EntityTargetSchema,
  direction: z.enum(['left', 'right', 'up', 'down', 'tilt_direction', 'toward_touch', 'toward_touch_x', 'toward_touch_y', 'toward_mouse_x']),
  speed: NumberValueSchema,
});

export const MoveTowardActionSchema = z.object({
  type: z.literal('move_toward'),
  target: EntityTargetSchema,
  towardEntity: EntityTargetSchema,
  axis: z.enum(['x', 'y', 'both']).optional(),
  speed: NumberValueSchema,
  maxSpeed: NumberValueSchema.optional(),
});

export const SetVariableActionSchema = z.object({
  type: z.literal('set_variable'),
  name: z.string(),
  operation: z.enum(['set', 'add', 'subtract', 'multiply', 'toggle']),
  value: z.union([z.number(), z.string(), z.boolean(), ExpressionValueSchema]),
});

export const StartCooldownActionSchema = z.object({
  type: z.literal('start_cooldown'),
  cooldownId: z.string(),
  duration: NumberValueSchema,
});

export const CameraShakeActionSchema = z.object({
  type: z.literal('camera_shake'),
  intensity: NumberValueSchema,
  duration: NumberValueSchema,
});

export const CameraZoomActionSchema = z.object({
  type: z.literal('camera_zoom'),
  scale: NumberValueSchema,
  duration: NumberValueSchema,
  restoreDelay: NumberValueSchema.optional(),
  focusTag: z.string().optional(),
});

export const SetTimeScaleActionSchema = z.object({
  type: z.literal('set_time_scale'),
  scale: NumberValueSchema,
  duration: NumberValueSchema.optional(),
});

export const SetEntitySizeActionSchema = z.object({
  type: z.literal('set_entity_size'),
  target: z.discriminatedUnion('type', [
    z.object({ type: z.literal('self') }),
    z.object({ type: z.literal('by_id'), entityId: z.string() }),
    z.object({ type: z.literal('by_tag'), tag: z.string() }),
  ]),
  scale: NumberValueSchema.optional(),
  radius: NumberValueSchema.optional(),
  width: NumberValueSchema.optional(),
  height: NumberValueSchema.optional(),
  duration: NumberValueSchema.optional(),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional(),
});

export const ComboIncrementActionSchema = z.object({
  type: z.literal('combo_increment'),
}).passthrough();

export const ComboResetActionSchema = z.object({
  type: z.literal('combo_reset'),
}).passthrough();

export const ActivateCheckpointActionSchema = z.object({
  type: z.literal('activate_checkpoint'),
}).passthrough();

export const SaveCheckpointActionSchema = z.object({
  type: z.literal('save_checkpoint'),
}).passthrough();

export const RestoreCheckpointActionSchema = z.object({
  type: z.literal('restore_checkpoint'),
}).passthrough();

export const GridMoveActionSchema = z.object({
  type: z.literal('grid_move'),
}).passthrough();

export const GridPlaceActionSchema = z.object({
  type: z.literal('grid_place'),
}).passthrough();

export const InventoryAddActionSchema = z.object({
  type: z.literal('inventory_add'),
}).passthrough();

export const InventoryRemoveActionSchema = z.object({
  type: z.literal('inventory_remove'),
}).passthrough();

export const ResourceModifyActionSchema = z.object({
  type: z.literal('resource_modify'),
}).passthrough();

export const AddXPActionSchema = z.object({
  type: z.literal('add_xp'),
}).passthrough();

export const UnlockActionSchema = z.object({
  type: z.literal('unlock'),
}).passthrough();

export const StateTransitionActionSchema = z.object({
  type: z.literal('state_transition'),
  machineId: z.string(),
  toState: z.string(),
  force: z.boolean().optional(),
});

export const WavesStartActionSchema = z.object({
  type: z.literal('waves_start'),
}).passthrough();

export const WavesNextActionSchema = z.object({
  type: z.literal('waves_next'),
}).passthrough();

export const PathStartActionSchema = z.object({
  type: z.literal('path_start'),
}).passthrough();

export const PathStopActionSchema = z.object({
  type: z.literal('path_stop'),
}).passthrough();

export const TargetNearestActionSchema = z.object({
  type: z.literal('target_nearest'),
}).passthrough();

export const BallSortPickupActionSchema = z.object({
  type: z.literal('ball_sort_pickup'),
  tubeIndex: z.number().optional(),
});

export const BallSortDropActionSchema = z.object({
  type: z.literal('ball_sort_drop'),
  tubeIndex: z.number().optional(),
});

export const BallSortCheckWinActionSchema = z.object({
  type: z.literal('ball_sort_check_win'),
});

export const ContainerPushActionSchema = z.object({
  type: z.literal('container_push'),
  container: z.string(),
  item: z.union([z.string(), EntityTargetSchema]),
  storeAs: z.string().optional(),
  position: z.object({
    offset: Vec2Schema.optional(),
    animate: z.boolean().optional(),
    duration: z.number().optional(),
  }).optional(),
});

export const ContainerPopActionSchema = z.object({
  type: z.literal('container_pop'),
  container: z.string(),
  position: z.union([z.literal('top'), z.literal('selected'), z.number()]).optional(),
  storeAs: z.string().optional(),
  destroyAfter: z.boolean().optional(),
});

export const ContainerTransferActionSchema = z.object({
  type: z.literal('container_transfer'),
  fromContainer: z.string(),
  toContainer: z.string(),
  item: z.union([z.string(), EntityTargetSchema]).optional(),
  fromPosition: z.union([z.literal('top'), z.literal('selected'), z.number()]).optional(),
  toPosition: z.union([z.literal('next'), z.number()]).optional(),
  storeAs: z.string().optional(),
  animate: z.boolean().optional(),
  duration: z.number().optional(),
});

export const ContainerSwapActionSchema = z.object({
  type: z.literal('container_swap'),
  container: z.string(),
  positionA: z.union([z.number(), z.literal('top'), z.literal('selected')]),
  positionB: z.union([z.number(), z.literal('top'), z.literal('selected')]),
  betweenContainers: z.boolean().optional(),
  containerB: z.string().optional(),
});

export const ContainerClearActionSchema = z.object({
  type: z.literal('container_clear'),
  container: z.string(),
  destroy: z.boolean().optional(),
  keep: z.number().optional(),
});

export const ContainerSelectActionSchema = z.object({
  type: z.literal('container_select'),
  container: z.string(),
  index: z.union([z.number(), z.literal('next'), z.literal('previous'), z.literal('first'), z.literal('last')]),
  deselectOthers: z.boolean().optional(),
});

export const ContainerDeselectActionSchema = z.object({
  type: z.literal('container_deselect'),
  container: z.string(),
});

export const RunScriptActionSchema = z.object({
  type: z.literal('run_script'),
  script: z.string().optional(),
  export: z.string().optional(),
  args: z.record(z.unknown()).optional(),
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
  DestroyMarkedActionSchema,
  GameStateActionSchema,
  SoundActionSchema,
  HapticActionSchema,
  EventActionSchema,
  ModifyActionSchema,
  ApplyImpulseActionSchema,
  ApplyForceActionSchema,
  SetVelocityActionSchema,
  MoveActionSchema,
  MoveTowardActionSchema,
  SetVariableActionSchema,
  StartCooldownActionSchema,
  PushToListActionSchema,
  PopFromListActionSchema,
  ShuffleListActionSchema,
  CameraShakeActionSchema,
  CameraZoomActionSchema,
  SetTimeScaleActionSchema,
  SetEntitySizeActionSchema,
  ComboIncrementActionSchema,
  ComboResetActionSchema,
  ActivateCheckpointActionSchema,
  SaveCheckpointActionSchema,
  RestoreCheckpointActionSchema,
  GridMoveActionSchema,
  GridPlaceActionSchema,
  InventoryAddActionSchema,
  InventoryRemoveActionSchema,
  ResourceModifyActionSchema,
  AddXPActionSchema,
  UnlockActionSchema,
  StateTransitionActionSchema,
  WavesStartActionSchema,
  WavesNextActionSchema,
  PathStartActionSchema,
  PathStopActionSchema,
  TargetNearestActionSchema,
  BallSortPickupActionSchema,
  BallSortDropActionSchema,
  BallSortCheckWinActionSchema,
  ContainerPushActionSchema,
  ContainerPopActionSchema,
  ContainerTransferActionSchema,
  ContainerSwapActionSchema,
  ContainerClearActionSchema,
  ContainerSelectActionSchema,
  ContainerDeselectActionSchema,
  RunScriptActionSchema,
]);

export const GameRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  trigger: RuleTriggerSchema,
  conditions: z.array(RuleConditionSchema).optional(),
  actions: z.array(RuleActionSchema).default([]),
  fireOnce: z.boolean().optional(),
  cooldown: z.number().optional(),
}).describe('Game rule');

export const WinConditionSchema = z.object({
  expr: z.string().optional(),
});

export const LoseConditionSchema = z.object({
  type: z.enum(['entity_destroyed', 'entity_exits_screen', 'time_up', 'custom']),
  tag: z.string().optional(),
  time: z.number().optional(),
  entityId: z.string().optional(),
  expr: z.string().optional(),
});

export const TransformComponentSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
}).describe('Entity transform');

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
    visual: VisualComponentSchema.optional(),
    physics: PhysicsComponentSchema.optional(),
    collider: ColliderComponentSchema.optional(),
    character: CharacterComponentSchema.optional(),
    behaviors: z.array(BehaviorSchema).optional(),
    conditionalBehaviors: z.array(ConditionalBehaviorSchema).optional(),
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
    visual: VisualComponentSchema.optional(),
    physics: PhysicsComponentSchema.optional(),
    collider: ColliderComponentSchema.optional(),
    character: CharacterComponentSchema.optional(),
    behaviors: z.array(BehaviorSchema).optional(),
    conditionalBehaviors: z.array(ConditionalBehaviorSchema).optional(),
    tags: z.array(z.string()).optional(),
    children: z.array(ChildTemplateDefinitionSchema).optional(),
  })
);

export const BodyEntityTemplateSchema = z.object({
  type: z.literal('body').optional(),
  id: z.string(),
  description: z.string().optional(),
  whatDescription: z.string().optional(),
  visual: VisualComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  collider: ColliderComponentSchema.optional(),
  character: CharacterComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  conditionalBehaviors: z.array(ConditionalBehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  slots: z.record(z.string(), SlotDefinitionSchema).optional(),
  children: z.array(ChildTemplateDefinitionSchema).optional(),
});

export const EntityTemplateSchema = BodyEntityTemplateSchema.describe('Entity template');

export const GameEntitySchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  template: z.string().optional(),
  transform: TransformComponentSchema,
  visual: VisualComponentSchema.optional(),
  physics: PhysicsComponentSchema.optional(),
  collider: ColliderComponentSchema.optional(),
  character: CharacterComponentSchema.optional(),
  behaviors: z.array(BehaviorSchema).optional(),
  conditionalBehaviors: z.array(ConditionalBehaviorSchema).optional(),
  tags: z.array(z.string()).optional(),
  layer: z.number().optional(),
  visible: z.boolean().optional(),
  active: z.boolean().optional(),
  assetPackId: z.string().optional(),
  children: z.array(ChildEntityDefinitionSchema).optional(),
}).describe('Game entity');

export const WorldConfigSchema = z.object({
  gravity: Vec2Schema,
  pixelsPerMeter: z.number().default(50),
  bounds: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
}).describe('World config');

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



export const GameMetadataSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  title: z.string().default(''),
  description: z.string().optional(),
  instructions: z.string().optional(),
  author: z.string().optional(),
  version: z.string().default(''),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailAssetRef: z.string().optional(),
  titleHeroImageUrl: z.string().optional(),
  titleHeroAssetRef: z.string().optional(),
}).describe('Game metadata');

export const AssetConfigSchema = z.object({
  imageUrl: z.string().optional(),
  assetRef: z.string().optional(),
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

export const ParallaxDepthSchema = z.enum(['sky', 'far', 'mid', 'near']);

export const ParallaxLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  assetRef: z.string().optional(),
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

export const TiltConfigSchema = z.object({
  enabled: z.boolean(),
  sensitivity: z.number().optional(),
  updateInterval: z.number().optional(),
});

export const InputConfigSchema = z.object({
  tapZones: z.array(TapZoneSchema).optional(),
  debugTapZones: z.boolean().optional(),
  debugInputs: z.boolean().optional(),
  virtualButtons: z.array(VirtualButtonSchema).optional(),
  virtualJoystick: VirtualJoystickSchema.optional(),
  virtualDPad: VirtualDPadSchema.optional(),
  enableHaptics: z.boolean().optional(),
  tilt: TiltConfigSchema.optional(),
});

export const ImageFieldSchema = z.object({
  imageUrl: z.string().optional(),
  assetRef: z.string().optional(),
  localPath: z.string().optional(),
});

export const StaticBackgroundSchema = ImageFieldSchema.extend({
  type: z.literal('static'),
  color: z.string().optional(),
  whatDescription: z.string().optional(),
});

export const ParallaxBackgroundSchema = z.object({
  type: z.literal('parallax'),
  layers: z.array(ParallaxLayerSchema),
});

export const BackgroundConfigSchema = z.discriminatedUnion('type', [
  StaticBackgroundSchema,
  ParallaxBackgroundSchema,
]);

export const HoverHighlightConfigSchema = z.object({
  targetTag: z.string(),
  highlightEntityId: z.string(),
});

export const GameButtonDefinitionSchema = z.object({
  label: z.string(),
  eventName: z.string(),
  data: z.record(z.unknown()).optional(),
  variant: z.enum(['primary', 'secondary']).optional(),
});

export const GameDialogStatDefinitionSchema = z.object({
  label: z.string(),
  variable: z.string(),
  format: z.string().optional(),
  binding: z.string().optional(),
});

export const GameDialogStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  titleColor: z.string().optional(),
  titleFontSize: z.number().optional(),
  backdropColor: z.string().optional(),
  width: z.union([z.number(), z.string()]).optional(),
  borderRadius: z.number().optional(),
});

export const GameDialogDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string().optional(),
  stats: z.array(GameDialogStatDefinitionSchema).optional(),
  dismissible: z.boolean().optional(),
  dismissEventName: z.string().optional(),
  buttons: z.array(GameButtonDefinitionSchema),
  showOnState: z.enum(['ready', 'won', 'lost', 'paused']).optional(),
  showWhen: z.string().optional(),
  style: GameDialogStyleSchema.optional(),
});

export const GameDialogsConfigSchema = z.object({
  activeDialogVariable: z.string().optional(),
  dialogs: z.array(GameDialogDefinitionSchema),
  legacyWinDialogFallback: z.boolean().optional(),
});

export const MultiplayerConfigSchema = z.object({
  enabled: z.boolean(),
  maxPlayers: z.number(),
  syncMode: z.enum(['host-authoritative', 'peer-to-peer']).optional(),
  inputDelay: z.number().optional(),
  snapshotRate: z.number().optional(),
  deltaRate: z.number().optional(),
  interpolationDelay: z.number().optional(),
});

export const LoadingScreenConfigSchema = z.object({
  backgroundImageUrl: z.string().optional(),
  backgroundAssetRef: z.string().optional(),
  progressBarImageUrl: z.string().optional(),
  progressBarAssetRef: z.string().optional(),
  progressBarFillImageUrl: z.string().optional(),
  progressBarFillAssetRef: z.string().optional(),
  backgroundColor: z.string().optional(),
  progressBarColor: z.string().optional(),
  textColor: z.string().optional(),
});

export const SoundAssetSchema = z.object({
  url: z.string(),
  type: z.enum(['sfx', 'music']),
  loop: z.boolean().optional(),
  defaultVolume: z.number().optional(),
});

export const VariantSheetConfigSchema = z.object({
  enabled: z.boolean(),
  groupId: z.string(),
  atlasUrl: z.string(),
  atlasAssetRef: z.string().optional(),
  metadataUrl: z.string().optional(),
  metadataAssetRef: z.string().optional(),
  layout: z.object({
    columns: z.number(),
    rows: z.number(),
    cellWidth: z.number(),
    cellHeight: z.number(),
  }),
});

export const Match3ConfigSchema = z.object({
  gridId: z.string(),
  rows: z.number(),
  cols: z.number(),
  cellSize: z.number(),
  pieceTemplates: z.array(z.string()),
  minMatch: z.number().optional(),
  swapDuration: z.number().optional(),
  fallDuration: z.number().optional(),
  clearDelay: z.number().optional(),
  variantSheet: VariantSheetConfigSchema.optional(),
  matchDetection: z.string().optional(),
  scoring: z.string().optional(),
});

export const TetrisConfigSchema = z.object({
  gridId: z.string(),
  boardWidth: z.number(),
  boardHeight: z.number(),
  pieceTemplates: z.array(z.string()),
  initialDropSpeed: z.number().optional(),
  levelSpeedMultiplier: z.number().optional(),
});

export const StateDefinitionSchema = z.object({
  id: z.string(),
  onEnter: z.array(RuleActionSchema).optional(),
  onExit: z.array(RuleActionSchema).optional(),
  onUpdate: z.array(RuleActionSchema).optional(),
  timeout: z.number().optional(),
  timeoutTransition: z.string().optional(),
});

export const TransitionTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('event'), eventName: z.string() }),
  z.object({ type: z.literal('condition'), condition: RuleConditionSchema }),
  z.object({ type: z.literal('manual') }),
]);

export const TransitionDefinitionSchema = z.object({
  id: z.string(),
  from: z.union([z.string(), z.array(z.string()), z.literal('*')]),
  to: z.string(),
  trigger: TransitionTriggerSchema,
  conditions: z.array(RuleConditionSchema).optional(),
  actions: z.array(RuleActionSchema).optional(),
});

export const StateMachineDefinitionSchema = z.object({
  id: z.string(),
  owner: z.string().optional(),
  stateVar: z.string().optional(),
  initialState: z.string(),
  states: z.array(StateDefinitionSchema),
  transitions: z.array(TransitionDefinitionSchema),
});

export const OverlayConfigSchema = z.object({
  elements: z.array(z.object({}).passthrough()),
  theme: z.object({}).passthrough().optional(),
});

export const PersistenceConfigSchema = z.object({
  storageKey: z.string().optional(),
  schema: z.unknown(),
  defaultProgress: z.unknown(),
  version: z.number(),
  autoSave: z.object({}).passthrough().optional(),
});

export const ContainerConfigSchema = z.object({}).passthrough();

// ============================================================================
// Effects / Shader Integration
// ============================================================================

export const ShaderEntrySchema = z.object({
  /** Filename for the shader, e.g. "paint.gdshader" */
  filename: z.string(),
  /** Godot Shading Language source code */
  glsl: z.string(),
});

export type ShaderEntry = z.infer<typeof ShaderEntrySchema>;

export const EffectsConfigSchema = z.object({
  /** Effect graph specification — validated separately by the effects compiler */
  graph: z.unknown().optional(),
  /** Named shader sources that the AI or user can write/edit */
  shaders: z.record(z.string(), ShaderEntrySchema).optional(),
});

export type EffectsConfig = z.infer<typeof EffectsConfigSchema>;

export const GameDefinitionSchema = z.object({
  metadata: GameMetadataSchema,
  world: WorldConfigSchema,
  presentation: PresentationConfigSchema.optional(),
  camera: CameraConfigSchema.optional(),
  background: BackgroundConfigSchema.optional(),
  variables: GameVariablesSchema.optional(),
  templates: z.record(z.string(), EntityTemplateSchema),
  entities: z.array(GameEntitySchema),
  joints: z.array(GameJointSchema).optional(),
  rules: z.array(GameRuleSchema).optional(),
  winCondition: WinConditionSchema.optional(),
  loseCondition: LoseConditionSchema.optional(),
  assetSystem: AssetSystemConfigSchema.optional(),
  parallaxConfig: ParallaxConfigSchema.optional(),
  tileSheets: z.array(TileSheetSchema).optional(),
  tileMaps: z.array(TileMapSchema).optional(),
  multiplayer: MultiplayerConfigSchema.optional(),
  loadingScreen: LoadingScreenConfigSchema.optional(),
  sounds: z.record(z.string(), SoundAssetSchema).optional(),
  input: InputConfigSchema.optional(),
  match3: Match3ConfigSchema.optional(),
  tetris: TetrisConfigSchema.optional(),
  stateMachines: z.array(StateMachineDefinitionSchema).optional(),
  containers: z.array(ContainerConfigSchema).optional(),
  persistence: PersistenceConfigSchema.optional(),
  constants: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
  script: z.string().optional(),
  effects: EffectsConfigSchema.optional(),
  hoverHighlight: HoverHighlightConfigSchema.optional(),
  dialogs: GameDialogsConfigSchema.optional(),
  overlay: OverlayConfigSchema.optional(),
}).describe('Game definition');

export type GameDefinitionInput = z.infer<typeof GameDefinitionSchema>;

export { TuningConfigSchema, VariableCategorySchema, VariableWithTuningSchema } from '../expressions/schema-helpers';
