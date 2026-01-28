import type { Bounds, Vec2 } from './common';
import type { ContainerMatchRule } from './container';
import type { Value } from '../expressions/types';
import type { ComboIncrementAction, ComboResetAction } from '../systems/combo/types';
import type { ActivateCheckpointAction, SaveCheckpointAction, RestoreCheckpointAction } from '../systems/checkpoint/types';
import type { GridMoveAction, GridPlaceAction } from '../systems/grid/types';
import type { InventoryAddAction, InventoryRemoveAction, ResourceModifyAction } from '../systems/inventory/types';
import type { AddXPAction, UnlockAction } from '../systems/progression/types';
import type { StateTransitionAction } from '../systems/state-machine/types';
import type { WavesStartAction, WavesNextAction } from '../systems/wave/types';
import type { PathStartAction, PathStopAction } from '../systems/path/types';
import type { TargetNearestAction } from '../systems/spatial-query/types';
import type { SetEntitySizeAction } from '../systems/dynamic-collider/types';

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
  xMin?: number;
  xMax?: number;
  xMinPercent?: number;
  xMaxPercent?: number;
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

export interface ListContainsCondition {
  type: 'list_contains';
  listName: string;
  value: Value<number | string | boolean>;
  negated?: boolean;
}

export interface ExpressionCondition {
  type: 'expression';
  expr: string;
}

export interface StateCondition {
  type: 'state';
  machineId: string;      // ID of the state machine
  state: string;          // State to check for
  negated?: boolean;      // If true, condition passes when NOT in this state
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
  | VariableCondition
  | ListContainsCondition
  | ExpressionCondition
  | StateCondition
  | ContainerIsEmptyCondition
  | ContainerIsFullCondition
  | ContainerCountCondition
  | ContainerHasItemCondition
  | ContainerCanAcceptCondition
  | ContainerTopItemCondition
  | ContainerIsOccupiedCondition;

export type SpawnPositionType = 'fixed' | 'random' | 'at_entity' | 'at_collision';

export type SpawnPosition =
  | { type: 'fixed'; x: number; y: number }
  | { type: 'random'; bounds: Bounds }
  | { type: 'at_entity'; entityId: string }
  | { type: 'at_collision' };

export type LaunchDirection = 
  | 'up' 
  | 'down' 
  | 'left' 
  | 'right' 
  | 'toward_touch'
  | { x: number; y: number };

export interface LaunchConfig {
  direction: LaunchDirection;
  force: number;
  /** Source entity whose position is used for toward_touch direction calculation */
  sourceEntityId?: string;
}

export type DestroyTarget =
  | { type: 'by_id'; entityId: string }
  | { type: 'by_tag'; tag: string; count?: number }
  | { type: 'collision_entities' }
  | { type: 'all' };

export interface SpawnAction {
  type: 'spawn';
  template: string | string[];
  position: SpawnPosition;
  count?: number;
  spread?: number;
  /** Optional launch configuration - applies initial velocity when entity is spawned */
  launch?: LaunchConfig;
}

export interface DestroyAction {
  type: 'destroy';
  target: DestroyTarget;
}

export interface DestroyMarkedAction {
  type: 'destroy_marked';
  tag?: string;
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
  value: Value<number>;
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
  direction?: 'up' | 'down' | 'left' | 'right' | 'drag_direction' | 'tilt_direction' | 'toward_touch';
  force?: Value<number>;
  /** Source entity whose position is used for toward_touch direction calculation */
  sourceEntityId?: string;
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
  direction: 'left' | 'right' | 'up' | 'down' | 'tilt_direction' | 'toward_touch' | 'toward_touch_x' | 'toward_touch_y' | 'toward_mouse_x';
  speed: Value<number>;
}

export interface MoveTowardAction {
  type: 'move_toward';
  target: EntityTarget;
  towardEntity: EntityTarget;
  axis?: 'x' | 'y' | 'both';
  speed: Value<number>;
  maxSpeed?: Value<number>;
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

export interface PushToListAction {
  type: 'push_to_list';
  listName: string;
  value: Value<number | string | boolean>;
}

export interface PopFromListAction {
  type: 'pop_from_list';
  listName: string;
  position?: 'front' | 'back';
  storeIn?: string;
}

export interface ShuffleListAction {
  type: 'shuffle_list';
  listName: string;
}

export interface CameraShakeAction {
  type: 'camera_shake';
  intensity: Value<number>;
  duration: Value<number>;
}

export interface CameraZoomAction {
  type: 'camera_zoom';
  scale: Value<number>;
  duration: Value<number>;
  restoreDelay?: Value<number>;
  focusTag?: string;
}

export interface SetTimeScaleAction {
  type: 'set_time_scale';
  scale: Value<number>;
  duration?: Value<number>;
}

export interface BallSortPickupAction {
  type: 'ball_sort_pickup';
  tubeIndex?: number;
}

export interface BallSortDropAction {
  type: 'ball_sort_drop';
  tubeIndex?: number;
}

export interface BallSortCheckWinAction {
  type: 'ball_sort_check_win';
}

// ============================================================================
// Container Actions
// ============================================================================

export interface ContainerPushAction {
  type: 'container_push';
  container: string;
  item: string | EntityTarget;
  storeAs?: string;
  position?: {
    offset?: Vec2;
    animate?: boolean;
    duration?: number;
  };
}

export interface ContainerPopAction {
  type: 'container_pop';
  container: string;
  position?: 'top' | 'selected' | number;
  storeAs?: string;
  destroyAfter?: boolean;
}

export interface ContainerTransferAction {
  type: 'container_transfer';
  fromContainer: string;
  toContainer: string;
  item?: string | EntityTarget;
  fromPosition?: 'top' | 'selected' | number;
  toPosition?: 'next' | number;
  storeAs?: string;
  animate?: boolean;
  duration?: number;
}

export interface ContainerSwapAction {
  type: 'container_swap';
  container: string;
  positionA: number | 'top' | 'selected';
  positionB: number | 'top' | 'selected';
  betweenContainers?: boolean;
  containerB?: string;
}

export interface ContainerClearAction {
  type: 'container_clear';
  container: string;
  destroy?: boolean;
  keep?: number;
}

export interface ContainerSelectAction {
  type: 'container_select';
  container: string;
  index: number | 'next' | 'previous' | 'first' | 'last';
  deselectOthers?: boolean;
}

export interface ContainerDeselectAction {
  type: 'container_deselect';
  container: string;
}

// ============================================================================
// Container Conditions
// ============================================================================

export interface ContainerIsEmptyCondition {
  type: 'container_is_empty';
  container: string;
  negated?: boolean;
}

export interface ContainerIsFullCondition {
  type: 'container_is_full';
  container: string;
  negated?: boolean;
}

export interface ContainerCountCondition {
  type: 'container_count';
  container: string;
  comparison: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';
  value: number;
}

export interface ContainerHasItemCondition {
  type: 'container_has_item';
  container: string;
  item: string | EntityTarget;
  negated?: boolean;
}

export interface ContainerCanAcceptCondition {
  type: 'container_can_accept';
  container: string;
  item: string | EntityTarget;
  match?: ContainerMatchRule;
  negated?: boolean;
}

export interface ContainerTopItemCondition {
  type: 'container_top_item';
  container: string;
  tag?: string;
  entityId?: string;
  negated?: boolean;
}

export interface ContainerIsOccupiedCondition {
  type: 'container_is_occupied';
  container: string;
  position: { row: number; col: number } | number;
  negated?: boolean;
}

export type RuleAction =
  | SpawnAction
  | DestroyAction
  | DestroyMarkedAction
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
  | MoveTowardAction
  | SetVariableAction
  | StartCooldownAction
  | PushToListAction
  | PopFromListAction
  | ShuffleListAction
  | CameraShakeAction
  | CameraZoomAction
  | SetTimeScaleAction
  | SetEntitySizeAction
  | ComboIncrementAction
  | ComboResetAction
  | ActivateCheckpointAction
  | SaveCheckpointAction
  | RestoreCheckpointAction
  | GridMoveAction
  | GridPlaceAction
  | InventoryAddAction
  | InventoryRemoveAction
  | ResourceModifyAction
  | AddXPAction
  | UnlockAction
  | StateTransitionAction
  | WavesStartAction
  | WavesNextAction
  | PathStartAction
  | PathStopAction
  | TargetNearestAction
  | BallSortPickupAction
  | BallSortDropAction
  | BallSortCheckWinAction
  | ContainerPushAction
  | ContainerPopAction
  | ContainerTransferAction
  | ContainerSwapAction
  | ContainerClearAction
  | ContainerSelectAction
  | ContainerDeselectAction;

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
