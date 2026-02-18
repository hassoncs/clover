import {
	type EconomyEvent,
	type EconomyGraph,
	EconomySimulator,
	type EconomyState,
} from "@slopcade/economy-engine";
import { type EventBus, SystemPhase } from "@slopcade/shared";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

export interface EconomySystemConfig {
	economyGraph?: EconomyGraph;
	tickRate?: number;
}

export interface EconomySystemState {
	simulatorState: EconomyState | null;
	accumulatedDt: number;
}

const DEFAULT_TICK_RATE = 1;
const ECONOMY_EVENT_PREFIX = "economy:";

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return Math.abs(hash);
}

export class EconomyRuntimeSystem
	implements RuntimeSystem<EconomySystemConfig, EconomySystemState>
{
	readonly id = "economy";
	readonly phase = SystemPhase.GAME_LOGIC;
	readonly priority = 40;

	private config: EconomySystemConfig;
	private simulator: EconomySimulator | null = null;
	private tickInterval = 1 / DEFAULT_TICK_RATE;
	private accumulatedDt = 0;
	private eventBus: EventBus | null = null;

	constructor(config?: EconomySystemConfig) {
		this.config = config ?? {};
	}

	initialize(ctx: SystemContext, config: EconomySystemConfig): void {
		this.eventBus = ctx.eventBus;

		const effectiveConfig = config.economyGraph ? config : this.config;
		if (!effectiveConfig.economyGraph) {
			return;
		}

		const seed = hashString(effectiveConfig.economyGraph.id);
		this.simulator = new EconomySimulator(effectiveConfig.economyGraph, seed);
		this.tickInterval = 1 / (effectiveConfig.tickRate ?? DEFAULT_TICK_RATE);
	}

	update(_ctx: UpdateContext, _state: EconomySystemState): void {
		if (!this.simulator) {
			return;
		}

		this.accumulatedDt += _ctx.dt;

		while (this.accumulatedDt >= this.tickInterval) {
			this.accumulatedDt -= this.tickInterval;
			const result = this.simulator.tick();
			this.emitEvents(result.events);
		}
	}

	destroy(): void {
		this.simulator = null;
		this.eventBus = null;
		this.accumulatedDt = 0;
	}

	getState(): EconomySystemState {
		return {
			simulatorState: this.simulator?.getState() ?? null,
			accumulatedDt: this.accumulatedDt,
		};
	}

	private emitEvents(events: EconomyEvent[]): void {
		if (!this.eventBus || events.length === 0) {
			return;
		}

		for (const event of events) {
			this.eventBus.emit(`${ECONOMY_EVENT_PREFIX}${event.type}`, {
				nodeId: event.nodeId,
				...event.data,
			});
		}
	}
}
