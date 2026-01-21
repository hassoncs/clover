import type { Vec2, Bounds } from './common';

export type BehaviorType =
  | 'move'
  | 'rotate'
  | 'follow'
  | 'bounce'
  | 'control'
  | 'spawn_on_event'
  | 'destroy_on_collision'
  | 'score_on_collision'
  | 'timer'
  | 'animate'
  | 'oscillate'
  | 'gravity_zone'
  | 'magnetic';

export type MoveDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'toward_target'
  | 'away_from_target';

export type ControlType =
  | 'tap_to_jump'
  | 'tap_to_shoot'
  | 'tap_to_flip'
  | 'drag_to_aim'
  | 'drag_to_move'
  | 'tilt_to_move'
  | 'tilt_gravity'
  | 'buttons';

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

export interface ControlBehavior extends BaseBehavior {
  type: 'control';
  controlType: ControlType;
  force?: number;
  cooldown?: number;
  maxSpeed?: number;
  aimLine?: boolean;
  maxPullDistance?: number;
}

export interface SpawnOnEventBehavior extends BaseBehavior {
  type: 'spawn_on_event';
  event: SpawnEvent;
  entityTemplate: string;
  spawnPosition: BehaviorSpawnPosition;
  offset?: Vec2;
  bounds?: Bounds;
  interval?: number;
  maxSpawns?: number;
  initialVelocity?: Vec2;
  withTags?: string[];
}

export interface DestroyOnCollisionBehavior extends BaseBehavior {
  type: 'destroy_on_collision';
  withTags: string[];
  effect?: DestructionEffect;
  destroyOther?: boolean;
  minImpactVelocity?: number;
}

export interface ScoreOnCollisionBehavior extends BaseBehavior {
  type: 'score_on_collision';
  withTags: string[];
  points: number;
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

export type Behavior =
  | MoveBehavior
  | RotateBehavior
  | ControlBehavior
  | SpawnOnEventBehavior
  | DestroyOnCollisionBehavior
  | ScoreOnCollisionBehavior
  | TimerBehavior
  | OscillateBehavior
  | GravityZoneBehavior
  | AnimateBehavior
  | FollowBehavior
  | BounceBehavior
  | MagneticBehavior;
