import type { Bounds, Vec2 } from './common';
import type { Value } from '../expressions/types';

export type RuleTriggerType =
  | 'collision'
  | 'timer'
  | 'score'
  | 'entity_count'
  | 'event'
  | 'frame'
  | 'tap'
  | 'drag'
  | 'tilt'
  | 'button'
  | 'swipe'
  | 'gameStart';

export interface CollisionTrigger {
  type: 'collision';
  entityATag: string;
  entityBTag: string;
}

export interface TimerTrigger {
  type: 'timer';
  time: number;
  repeat?: boolean;
}

export interface ScoreTrigger {
  type: 'score';
  threshold: number;
  comparison: 'gte' | 'lte' | 'eq';
}

export interface EntityCountTrigger {
  type: 'entity_count';
  tag: string;
  count: number;
  comparison: 'gte' | 'lte' | 'eq' | 'zero';
}

export interface EventTrigger {
  type: 'event';
  eventName: string;
}

export interface FrameTrigger {
  type: 'frame';
}

export interface TapTrigger {
  type: 'tap';
  target?: 'screen' | 'self' | string;
}

export interface DragTrigger {
  type: 'drag';
  phase: 'start' | 'move' | 'end';
  target?: 'screen' | 'self' | string;
}

export interface TiltTrigger {
  type: 'tilt';
  axis?: 'x' | 'y' | 'both';
  threshold?: number;
}

export interface ButtonTrigger {
  type: 'button';
  button: 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'any';
  state: 'pressed' | 'released' | 'held';
}

export interface SwipeTrigger {
  type: 'swipe';
  direction: 'left' | 'right' | 'up' | 'down' | 'any';
}

export interface GameStartTrigger {
  type: 'gameStart';
}

export type RuleTrigger =
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger
  | EntityCountTrigger
  | EventTrigger
  | FrameTrigger
  | TapTrigger
  | DragTrigger
  | TiltTrigger
  | ButtonTrigger
  | SwipeTrigger
  | GameStartTrigger;

export interface ScoreCondition {
  type: 'score';
  min?: number;
  max?: number;
}

export interface TimeCondition {
  type: 'time';
  min?: number;
  max?: number;
}

export interface EntityExistsCondition {
  type: 'entity_exists';
  entityId?: string;
  entityTag?: string;
}

export interface EntityCountCondition {
  type: 'entity_count';
  tag: string;
  min?: number;
  max?: number;
}

export interface RandomCondition {
  type: 'random';
  probability: number;
}

export interface OnGroundCondition {
  type: 'on_ground';
  value: boolean;
}

export interface TouchingCondition {
  type: 'touching';
  tag: string;
  negated?: boolean;
}

export interface VelocityCondition {
  type: 'velocity';
  axis: 'x' | 'y';
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface CooldownReadyCondition {
  type: 'cooldown_ready';
  cooldownId: string;
}

export interface VariableCondition {
  type: 'variable';
  name: string;
  comparison: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';
  value: number | string | boolean;
}

export type RuleCondition =
  | ScoreCondition
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition
  | OnGroundCondition
  | TouchingCondition
  | VelocityCondition
  | CooldownReadyCondition
  | VariableCondition;

export type SpawnPositionType = 'fixed' | 'random' | 'at_entity' | 'at_collision';

export type SpawnPosition =
  | { type: 'fixed'; x: number; y: number }
  | { type: 'random'; bounds: Bounds }
  | { type: 'at_entity'; entityId: string }
  | { type: 'at_collision' };

export type DestroyTarget =
  | { type: 'by_id'; entityId: string }
  | { type: 'by_tag'; tag: string; count?: number }
  | { type: 'collision_entities' }
  | { type: 'all' };

export interface SpawnAction {
  type: 'spawn';
  template: string;
  position: SpawnPosition;
  count?: number;
  spread?: number;
}

export interface DestroyAction {
  type: 'destroy';
  target: DestroyTarget;
}

export interface ScoreAction {
  type: 'score';
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  value: number;
}

export interface GameStateAction {
  type: 'game_state';
  state: 'win' | 'lose' | 'pause' | 'restart' | 'next_level';
  delay?: number;
}

export interface SoundAction {
  type: 'sound';
  soundId: string;
  volume?: number;
}

export interface EventAction {
  type: 'event';
  eventName: string;
  data?: Record<string, unknown>;
}

export interface ModifyAction {
  type: 'modify';
  target: { type: 'by_id'; entityId: string } | { type: 'by_tag'; tag: string };
  property: string;
  operation: 'set' | 'add' | 'multiply';
  value: number;
}

export interface LivesAction {
  type: 'lives';
  operation: 'add' | 'subtract' | 'set';
  value: number;
}

export type EntityTarget =
  | { type: 'self' }
  | { type: 'by_id'; entityId: string }
  | { type: 'by_tag'; tag: string }
  | { type: 'touched' }
  | { type: 'player' }
  | { type: 'other' };

export interface ApplyImpulseAction {
  type: 'apply_impulse';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
  direction?: 'up' | 'down' | 'left' | 'right' | 'drag_direction' | 'tilt_direction';
  force?: Value<number>;
}

export interface ApplyForceAction {
  type: 'apply_force';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
  direction?: 'drag_direction' | 'tilt_direction' | 'toward_touch';
  force?: Value<number>;
}

export interface SetVelocityAction {
  type: 'set_velocity';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
}

export interface MoveAction {
  type: 'move';
  target: EntityTarget;
  direction: 'left' | 'right' | 'up' | 'down' | 'tilt_direction' | 'toward_touch' | 'toward_touch_x' | 'toward_touch_y';
  speed: Value<number>;
}

export interface SetVariableAction {
  type: 'set_variable';
  name: string;
  operation: 'set' | 'add' | 'subtract' | 'multiply' | 'toggle';
  value: Value<number | string | boolean>;
}

export interface StartCooldownAction {
  type: 'start_cooldown';
  cooldownId: string;
  duration: Value<number>;
}

export type RuleAction =
  | SpawnAction
  | DestroyAction
  | ScoreAction
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction
  | LivesAction
  | ApplyImpulseAction
  | ApplyForceAction
  | SetVelocityAction
  | MoveAction
  | SetVariableAction
  | StartCooldownAction;

export interface GameRule {
  id: string;
  name?: string;
  enabled?: boolean;
  trigger: RuleTrigger;
  conditions?: RuleCondition[];
  actions: RuleAction[];
  fireOnce?: boolean;
  cooldown?: number;
}

export type WinConditionType =
  | 'score'
  | 'destroy_all'
  | 'survive_time'
  | 'reach_entity'
  | 'collect_all'
  | 'custom';

export interface WinCondition {
  type: WinConditionType;
  score?: number;
  tag?: string;
  time?: number;
  entityId?: string;
}

export type LoseConditionType =
  | 'entity_destroyed'
  | 'entity_exits_screen'
  | 'time_up'
  | 'score_below'
  | 'lives_zero'
  | 'custom';

export interface LoseCondition {
  type: LoseConditionType;
  tag?: string;
  time?: number;
  entityId?: string;
  score?: number;
}
