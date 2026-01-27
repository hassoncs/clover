import type { RuleAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { ActionExecutor } from './ActionExecutor';
import { ScoreActionExecutor } from './ScoreActionExecutor';
import { SpawnActionExecutor } from './SpawnActionExecutor';
import { DestroyActionExecutor } from './DestroyActionExecutor';
import { PhysicsActionExecutor } from './PhysicsActionExecutor';
import { LogicActionExecutor } from './LogicActionExecutor';
import { EntityActionExecutor } from './EntityActionExecutor';
import { CameraActionExecutor } from './CameraActionExecutor';
import { SoundActionExecutor } from './SoundActionExecutor';
import { SetEntitySizeActionExecutor } from './SetEntitySizeActionExecutor';
import { ComboActionExecutor } from './ComboActionExecutor';
import { CheckpointActionExecutor } from './CheckpointActionExecutor';
import { GridActionExecutor } from './GridActionExecutor';
import { InventoryActionExecutor } from './InventoryActionExecutor';
import { PathActionExecutor } from './PathActionExecutor';
import { ProgressionActionExecutor } from './ProgressionActionExecutor';
import { SpatialQueryActionExecutor } from './SpatialQueryActionExecutor';
import { StateMachineActionExecutor } from './StateMachineActionExecutor';
import { WaveActionExecutor } from './WaveActionExecutor';
import { BallSortActionExecutor } from './BallSortActionExecutor';
import { ContainerActionExecutor } from './ContainerActionExecutor';

export type ActionType = RuleAction['type'];

export class ActionRegistry {
  private registry: Map<ActionType, ActionExecutor<RuleAction>> = new Map();

  constructor(
    private scoreActionExecutor: ScoreActionExecutor,
    private spawnActionExecutor: SpawnActionExecutor,
    private destroyActionExecutor: DestroyActionExecutor,
    private physicsActionExecutor: PhysicsActionExecutor,
    private logicActionExecutor: LogicActionExecutor,
    private entityActionExecutor: EntityActionExecutor,
    private cameraActionExecutor: CameraActionExecutor,
    private soundActionExecutor: SoundActionExecutor,
    private setEntitySizeActionExecutor: SetEntitySizeActionExecutor,
    private comboActionExecutor: ComboActionExecutor,
    private checkpointActionExecutor: CheckpointActionExecutor,
    private gridActionExecutor: GridActionExecutor,
    private inventoryActionExecutor: InventoryActionExecutor,
    private pathActionExecutor: PathActionExecutor,
    private progressionActionExecutor: ProgressionActionExecutor,
    private spatialQueryActionExecutor: SpatialQueryActionExecutor,
    private stateMachineActionExecutor: StateMachineActionExecutor,
    private waveActionExecutor: WaveActionExecutor,
    private ballSortActionExecutor: BallSortActionExecutor,
    private containerActionExecutor: ContainerActionExecutor,
  ) {
    this.registerAll();
  }

  private registerAll(): void {
    this.registry.set('score', this.scoreActionExecutor);
    this.registry.set('spawn', this.spawnActionExecutor);
    this.registry.set('destroy', this.destroyActionExecutor);
    this.registry.set('destroy_marked', this.destroyActionExecutor);
    this.registry.set('apply_impulse', this.physicsActionExecutor);
    this.registry.set('apply_force', this.physicsActionExecutor);
    this.registry.set('set_velocity', this.physicsActionExecutor);
    this.registry.set('move', this.physicsActionExecutor);
    this.registry.set('move_toward', this.physicsActionExecutor);
    this.registry.set('modify', this.entityActionExecutor);
    this.registry.set('game_state', this.logicActionExecutor);
    this.registry.set('event', this.logicActionExecutor);
    this.registry.set('set_variable', this.logicActionExecutor);
    this.registry.set('start_cooldown', this.logicActionExecutor);
    this.registry.set('lives', this.logicActionExecutor);
    this.registry.set('push_to_list', this.logicActionExecutor);
    this.registry.set('pop_from_list', this.logicActionExecutor);
    this.registry.set('shuffle_list', this.logicActionExecutor);
    this.registry.set('camera_shake', this.cameraActionExecutor);
    this.registry.set('camera_zoom', this.cameraActionExecutor);
    this.registry.set('set_time_scale', this.cameraActionExecutor);
    this.registry.set('sound', this.soundActionExecutor);
    this.registry.set('set_entity_size', this.setEntitySizeActionExecutor);
    this.registry.set('combo_increment', this.comboActionExecutor);
    this.registry.set('combo_reset', this.comboActionExecutor);
    this.registry.set('checkpoint_activate', this.checkpointActionExecutor);
    this.registry.set('checkpoint_save', this.checkpointActionExecutor);
    this.registry.set('checkpoint_restore', this.checkpointActionExecutor);
    this.registry.set('grid_move', this.gridActionExecutor);
    this.registry.set('grid_place', this.gridActionExecutor);
    this.registry.set('inventory_add', this.inventoryActionExecutor);
    this.registry.set('inventory_remove', this.inventoryActionExecutor);
    this.registry.set('resource_modify', this.inventoryActionExecutor);
    this.registry.set('path_start', this.pathActionExecutor);
    this.registry.set('path_stop', this.pathActionExecutor);
    this.registry.set('progression_add_xp', this.progressionActionExecutor);
    this.registry.set('progression_unlock', this.progressionActionExecutor);
    this.registry.set('target_nearest', this.spatialQueryActionExecutor);
    this.registry.set('state_transition', this.stateMachineActionExecutor);
    this.registry.set('waves_start', this.waveActionExecutor);
    this.registry.set('waves_next', this.waveActionExecutor);
    this.registry.set('ball_sort_pickup', this.ballSortActionExecutor);
    this.registry.set('ball_sort_drop', this.ballSortActionExecutor);
    this.registry.set('ball_sort_check_win', this.ballSortActionExecutor);
    // Container actions
    this.registry.set('container_push', this.containerActionExecutor);
    this.registry.set('container_pop', this.containerActionExecutor);
    this.registry.set('container_transfer', this.containerActionExecutor);
    this.registry.set('container_swap', this.containerActionExecutor);
    this.registry.set('container_clear', this.containerActionExecutor);
    this.registry.set('container_select', this.containerActionExecutor);
    this.registry.set('container_deselect', this.containerActionExecutor);
  }

  execute(action: RuleAction, context: RuleContext): void {
    const executor = this.registry.get(action.type);
    if (executor) {
      executor.execute(action, context);
    } else {
      console.warn(`[ActionRegistry] Unknown action type: ${action.type}`);
    }
  }

  has(type: ActionType): boolean {
    return this.registry.has(type);
  }
}
