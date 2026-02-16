import { SystemPhase } from "@slopcade/shared";
import { EffectDispatcher } from "../../../EffectDispatcher";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

export interface SpriteEffectsSystemConfig {
	getVariables?: () => Record<string, unknown>;
}

export interface SpriteEffectsSystemState {
	trackedEntities: number;
}

export class SpriteEffectsRuntimeSystem
	implements RuntimeSystem<SpriteEffectsSystemConfig, SpriteEffectsSystemState>
{
	readonly id = "sprite-effects";
	readonly phase = SystemPhase.PRE_UPDATE;
	readonly priority = 65;

	private config: SpriteEffectsSystemConfig;
	private dispatcher: EffectDispatcher | null = null;
	private systemContext: SystemContext | null = null;

	constructor(config: SpriteEffectsSystemConfig = {}) {
		this.config = config;
	}

	initialize(_ctx: SystemContext, config: SpriteEffectsSystemConfig): void {
		this.config = { ...this.config, ...config };
		this.systemContext = _ctx;
		this.dispatcher = new EffectDispatcher({
			entityManager: _ctx.entityManager,
			bridge: _ctx.bridge,
			getVariables: this.config.getVariables,
		});
		_ctx.effectDispatcher = this.dispatcher;
	}

	update(_ctx: UpdateContext, _state: SpriteEffectsSystemState): void {}

	destroy(): void {
		if (this.dispatcher) {
			this.dispatcher.destroy();
		}
		if (this.systemContext) {
			this.systemContext.effectDispatcher = undefined;
		}
		this.dispatcher = null;
		this.systemContext = null;
	}

	getState(): SpriteEffectsSystemState {
		return {
			trackedEntities: this.dispatcher?.getTrackedEntityCount() ?? 0,
		};
	}
}
