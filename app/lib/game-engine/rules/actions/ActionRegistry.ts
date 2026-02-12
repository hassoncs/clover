import type { RuleAction } from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ActionExecutor } from "./ActionExecutor";
import type { BallSortActionExecutor } from "./BallSortActionExecutor";
import type { CameraActionExecutor } from "./CameraActionExecutor";
import type { CheckpointActionExecutor } from "./CheckpointActionExecutor";
import type { ComboActionExecutor } from "./ComboActionExecutor";
import type { ContainerActionExecutor } from "./ContainerActionExecutor";
import type { DestroyActionExecutor } from "./DestroyActionExecutor";
import type { EconomyEmitEventActionExecutor } from "./EconomyEmitEventActionExecutor";
import type { EconomySetValueActionExecutor } from "./EconomySetValueActionExecutor";
import type { EconomyTransferActionExecutor } from "./EconomyTransferActionExecutor";
import type { EntityActionExecutor } from "./EntityActionExecutor";
import type { GridActionExecutor } from "./GridActionExecutor";
import type { HapticActionExecutor } from "./HapticActionExecutor";
import type { InventoryActionExecutor } from "./InventoryActionExecutor";
import type { LogicActionExecutor } from "./LogicActionExecutor";
import type { PathActionExecutor } from "./PathActionExecutor";
import type { PhysicsActionExecutor } from "./PhysicsActionExecutor";
import type { ProgressionActionExecutor } from "./ProgressionActionExecutor";
import type { RunScriptActionExecutor } from "./RunScriptActionExecutor";
import type { SetEntitySizeActionExecutor } from "./SetEntitySizeActionExecutor";
import type { SoundActionExecutor } from "./SoundActionExecutor";
import type { SpatialQueryActionExecutor } from "./SpatialQueryActionExecutor";
import type { SpawnActionExecutor } from "./SpawnActionExecutor";
import type { StateMachineActionExecutor } from "./StateMachineActionExecutor";
import type { WaveActionExecutor } from "./WaveActionExecutor";

export type ActionType = RuleAction["type"];

export class ActionRegistry {
	private registry: Map<ActionType, ActionExecutor<RuleAction>> = new Map();

	constructor(
		private spawnActionExecutor: SpawnActionExecutor,
		private destroyActionExecutor: DestroyActionExecutor,
		private physicsActionExecutor: PhysicsActionExecutor,
		private logicActionExecutor: LogicActionExecutor,
		private entityActionExecutor: EntityActionExecutor,
		private cameraActionExecutor: CameraActionExecutor,
		private soundActionExecutor: SoundActionExecutor,
		private hapticActionExecutor: HapticActionExecutor,
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
		private runScriptActionExecutor: RunScriptActionExecutor,
		private economyTransferActionExecutor: EconomyTransferActionExecutor,
		private economyEmitEventActionExecutor: EconomyEmitEventActionExecutor,
		private economySetValueActionExecutor: EconomySetValueActionExecutor,
	) {
		this.registerAll();
	}

	private registerAll(): void {
		this.registry.set("spawn", this.spawnActionExecutor);
		this.registry.set("destroy", this.destroyActionExecutor);
		this.registry.set("destroy_marked", this.destroyActionExecutor);
		this.registry.set("apply_impulse", this.physicsActionExecutor);
		this.registry.set("apply_force", this.physicsActionExecutor);
		this.registry.set("set_velocity", this.physicsActionExecutor);
		this.registry.set("move", this.physicsActionExecutor);
		this.registry.set("move_toward", this.physicsActionExecutor);
		this.registry.set("modify", this.entityActionExecutor);
		this.registry.set("game_state", this.logicActionExecutor);
		this.registry.set("event", this.logicActionExecutor);
		this.registry.set("set_variable", this.logicActionExecutor);
		this.registry.set("start_cooldown", this.logicActionExecutor);
		this.registry.set("push_to_list", this.logicActionExecutor);
		this.registry.set("pop_from_list", this.logicActionExecutor);
		this.registry.set("shuffle_list", this.logicActionExecutor);
		this.registry.set("camera_shake", this.cameraActionExecutor);
		this.registry.set("camera_zoom", this.cameraActionExecutor);
		this.registry.set("set_time_scale", this.cameraActionExecutor);
		this.registry.set("sound", this.soundActionExecutor);
		this.registry.set("haptic", this.hapticActionExecutor);
		this.registry.set("set_entity_size", this.setEntitySizeActionExecutor);
		this.registry.set("combo_increment", this.comboActionExecutor);
		this.registry.set("combo_reset", this.comboActionExecutor);
		this.registry.set("checkpoint_activate", this.checkpointActionExecutor);
		this.registry.set("checkpoint_save", this.checkpointActionExecutor);
		this.registry.set("checkpoint_restore", this.checkpointActionExecutor);
		this.registry.set("grid_move", this.gridActionExecutor);
		this.registry.set("grid_place", this.gridActionExecutor);
		this.registry.set("inventory_add", this.inventoryActionExecutor);
		this.registry.set("inventory_remove", this.inventoryActionExecutor);
		this.registry.set("resource_modify", this.inventoryActionExecutor);
		this.registry.set("path_start", this.pathActionExecutor);
		this.registry.set("path_stop", this.pathActionExecutor);
		this.registry.set("progression_add_xp", this.progressionActionExecutor);
		this.registry.set("progression_unlock", this.progressionActionExecutor);
		this.registry.set("target_nearest", this.spatialQueryActionExecutor);
		this.registry.set("state_transition", this.stateMachineActionExecutor);
		this.registry.set("waves_start", this.waveActionExecutor);
		this.registry.set("waves_next", this.waveActionExecutor);
		this.registry.set("ball_sort_pickup", this.ballSortActionExecutor);
		this.registry.set("ball_sort_drop", this.ballSortActionExecutor);
		this.registry.set("ball_sort_check_win", this.ballSortActionExecutor);
		// Container actions
		this.registry.set("container_push", this.containerActionExecutor);
		this.registry.set("container_pop", this.containerActionExecutor);
		this.registry.set("container_transfer", this.containerActionExecutor);
		this.registry.set("container_swap", this.containerActionExecutor);
		this.registry.set("container_clear", this.containerActionExecutor);
		this.registry.set("container_select", this.containerActionExecutor);
		this.registry.set("container_deselect", this.containerActionExecutor);
		// Script action
		this.registry.set("run_script", this.runScriptActionExecutor);
		// Economy actions
		this.registry.set("economy_transfer", this.economyTransferActionExecutor);
		this.registry.set(
			"economy_emit_event",
			this.economyEmitEventActionExecutor,
		);
		this.registry.set("economy_set_value", this.economySetValueActionExecutor);
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
