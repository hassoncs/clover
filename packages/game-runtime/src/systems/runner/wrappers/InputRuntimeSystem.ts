import { SystemPhase } from "@slopcade/shared";
import { InputEntityManager } from "../../../InputEntityManager";
import type { Vec2 } from "../../../physics2d/types";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

export interface InputSystemConfig {
	debug?: boolean;
}

export interface InputSystemState {
	mousePosition: Vec2 | null;
	activeInputs: string[];
}

export class InputRuntimeSystem
	implements RuntimeSystem<InputSystemConfig, InputSystemState>
{
	readonly id = "input";
	readonly phase = SystemPhase.PRE_UPDATE;
	readonly priority = 60;

	private config: InputSystemConfig;
	private inputEntityManager: InputEntityManager | null = null;

	constructor(config: InputSystemConfig) {
		this.config = config;
	}

	initialize(_ctx: SystemContext, _config: InputSystemConfig): void {
		this.inputEntityManager = new InputEntityManager({
			debug: this.config.debug,
		});
	}

	update(ctx: UpdateContext, _state: InputSystemState): void {
		if (this.inputEntityManager) {
			this.inputEntityManager.syncFromInput(ctx.input);
		}

		const tap = (ctx.input as any).tap;
		if (tap) {
			const tapEvent = {
				type: "tap" as const,
				x: tap.x ?? 0,
				y: tap.y ?? 0,
				worldX: tap.worldX,
				worldY: tap.worldY,
				targetEntityId: tap.targetEntityId,
			};
			(ctx.frame.inputEvents as any).push(tapEvent);
		}
	}

	destroy(): void {
		this.inputEntityManager = null;
	}

	getState(): InputSystemState {
		if (!this.inputEntityManager) {
			return { mousePosition: null, activeInputs: [] };
		}

		const mouseEntity = this.inputEntityManager.getEntity("$mouse");
		const mousePosition = mouseEntity?.active
			? { x: mouseEntity.transform.x, y: mouseEntity.transform.y }
			: null;

		const activeInputs = this.inputEntityManager
			.getAllEntities()
			.filter((e) => e.active)
			.map((e) => e.id);

		return {
			mousePosition,
			activeInputs,
		};
	}

	getInputEntityManager(): InputEntityManager | null {
		return this.inputEntityManager;
	}
}
