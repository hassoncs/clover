import type { Vec2, Bounds } from './common';
import type { ParticleEmitterType } from './particles';
import type { Value } from '../expressions/types';

export type BehaviorType =
  | 'move'
  | 'rotate'
  | 'rotate_toward'
  | 'follow'
  | 'bounce'
  | 'spawn_on_event'
  | 'destroy_on_collision'
  | 'score_on_collision'
  | 'score_on_destroy'
  | 'timer'
  | 'animate'
  | 'oscillate'
  | 'gravity_zone'
  | 'magnetic'
  | 'health'
  | 'draggable'
  | 'particle_emitter'
  | 'attach_to'
  | 'teleport'
  | 'maintain_speed';

export type MoveDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'toward_target'
  | 'away_from_target';

export type SpawnEvent = 'tap' | 'timer' | 'collision' | 'destroy' | 'start';
export type BehaviorSpawnPosition = 'at_self' | 'at_touch' | 'random_in_bounds' | 'offset';
export type DestructionEffect = 'none' | 'fade' | 'explode' | 'shrink';
export type TimerAction = 'destroy' | 'spawn' | 'enable_behavior' | 'disable_behavior' | 'trigger_event';
export type AnimationTrigger = 'always' | 'moving' | 'collision' | 'destroy';
export type GravityFalloff = 'none' | 'linear' | 'quadratic';

interface BaseBehavior {
  type: BehaviorType;
  enabled?: boolean;
}

export interface MoveBehavior extends BaseBehavior {
  type: 'move';
  direction: MoveDirection;
  speed: number;
  target?: string;
  movementType?: 'velocity' | 'force';
  patrol?: Bounds;
}

export interface RotateBehavior extends BaseBehavior {
  type: 'rotate';
  speed: number;
  direction: 'clockwise' | 'counterclockwise';
  affectsPhysics?: boolean;
}

export interface SpawnOnEventBehavior extends BaseBehavior {
  type: 'spawn_on_event';
  event: SpawnEvent;
  entityTemplate: string | string[];
  spawnPosition: BehaviorSpawnPosition;
  offset?: Vec2;
  bounds?: Bounds;
  interval?: number;
  maxSpawns?: number;
  initialVelocity?: Vec2;
  withTags?: string[];
  spawnEffect?: ParticleEmitterType;
}

export type MarkedEffect = 'glow' | 'pulse' | 'fade_partial';

export interface DestructionDelay {
  type: 'time' | 'event' | 'entity_destroyed';
  time?: number;
  eventName?: string;
  entityTag?: string;
}

export interface DestroyOnCollisionBehavior extends BaseBehavior {
  type: 'destroy_on_collision';
  withTags: string[];
  effect?: DestructionEffect;
  destroyOther?: boolean;
  minImpactVelocity?: number;
  delay?: DestructionDelay;
  markedEffect?: MarkedEffect;
  markedColor?: string;
}

export interface ScoreOnCollisionBehavior extends BaseBehavior {
  type: 'score_on_collision';
  withTags: string[];
  points: Value<number>;
  once?: boolean;
  showPopup?: boolean;
}

export interface TimerBehavior extends BaseBehavior {
  type: 'timer';
  duration: number;
  action: TimerAction;
  repeat?: boolean;
  spawnTemplate?: string;
  behaviorIndex?: number;
  eventName?: string;
}

export interface OscillateBehavior extends BaseBehavior {
  type: 'oscillate';
  axis: 'x' | 'y' | 'both';
  amplitude: number;
  frequency: number;
  phase?: number;
}

export interface GravityZoneBehavior extends BaseBehavior {
  type: 'gravity_zone';
  gravity: Vec2;
  radius: number;
  affectsTags?: string[];
  falloff?: GravityFalloff;
}

export interface AnimateBehavior extends BaseBehavior {
  type: 'animate';
  frames: string[];
  fps: number;
  loop?: boolean;
  playOn?: AnimationTrigger;
}

export interface FollowBehavior extends BaseBehavior {
  type: 'follow';
  target: string;
  speed: number;
  minDistance?: number;
  maxDistance?: number;
}

export interface BounceBehavior extends BaseBehavior {
  type: 'bounce';
  bounds: Bounds;
}

export interface MagneticBehavior extends BaseBehavior {
  type: 'magnetic';
  strength: number;
  radius: number;
  attractsTags?: string[];
  repels?: boolean;
}

export interface RotateTowardBehavior extends BaseBehavior {
  type: 'rotate_toward';
  target: string;
  speed?: number;
  offset?: number;
}

export interface ScoreOnDestroyBehavior extends BaseBehavior {
  type: 'score_on_destroy';
  points: Value<number>;
}

export interface HealthBehavior extends BaseBehavior {
  type: 'health';
  maxHealth: number;
  currentHealth?: number;
  damageFromTags?: string[];
  damagePerHit?: number;
  destroyOnDeath?: boolean;
  invulnerabilityTime?: number;
}

export type DragMode = 'force' | 'kinematic';

export interface DraggableBehavior extends BaseBehavior {
  type: 'draggable';
  /** Drag mode: 'force' applies physics forces, 'kinematic' moves directly with cursor */
  mode?: DragMode;
  /** Stiffness of the drag force (higher = snappier response) - only used in 'force' mode */
  stiffness?: number;
  /** Damping of the drag force (higher = less oscillation) - only used in 'force' mode */
  damping?: number;
  /** Only allow dragging if touch starts on this entity */
  requireDirectHit?: boolean;
}

export interface ParticleEmitterBehavior extends BaseBehavior {
  type: 'particle_emitter';
  emitterType: ParticleEmitterType;
  offset?: Vec2;
  emitWhile?: 'always' | 'moving' | 'enabled';
}

export interface AttachToBehavior extends BaseBehavior {
  type: 'attach_to';
  parentTag: string;
  slotName: string;
  inheritRotation?: boolean;
}

export interface TeleportBehavior extends BaseBehavior {
  type: 'teleport';
  destinationEntityId: string;
  withTags: string[];
  preserveVelocity?: boolean;
  velocityMultiplier?: number;
  exitOffset?: Vec2;
  cooldown?: number;
}

export interface MaintainSpeedBehavior extends BaseBehavior {
  type: 'maintain_speed';
  speed: Value<number>;
  mode?: 'constant' | 'minimum';
}

export type Behavior =
  | MoveBehavior
  | RotateBehavior
  | RotateTowardBehavior
  | SpawnOnEventBehavior
  | DestroyOnCollisionBehavior
  | ScoreOnCollisionBehavior
  | ScoreOnDestroyBehavior
  | TimerBehavior
  | OscillateBehavior
  | GravityZoneBehavior
  | AnimateBehavior
  | FollowBehavior
  | BounceBehavior
  | MagneticBehavior
  | HealthBehavior
  | DraggableBehavior
  | ParticleEmitterBehavior
  | AttachToBehavior
  | TeleportBehavior
  | MaintainSpeedBehavior;
