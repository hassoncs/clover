import type { Bounds, Vec2 } from './common';

export type RuleTriggerType =
  | 'collision'
  | 'timer'
  | 'score'
  | 'entity_count'
  | 'event'
  | 'frame';

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

export type RuleTrigger =
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger
  | EntityCountTrigger
  | EventTrigger
  | FrameTrigger;

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

export type RuleCondition =
  | ScoreCondition
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition;

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

export type RuleAction =
  | SpawnAction
  | DestroyAction
  | ScoreAction
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction
  | LivesAction;

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
