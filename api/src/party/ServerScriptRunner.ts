import { SLOPCADE_MODULES } from "@slopcade/shared/scripting/modules";
import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";

export interface RoomAPI {
	setPhase(phase: string): Promise<void>;
	updateSharedData(data: Record<string, unknown>): Promise<void>;
	requestInput(
		requestId: string,
		request: PartyInputRequest,
	): Promise<Map<string, PartyInputResponse>>;
	requestInputFromSubset(
		requestId: string,
		request: PartyInputRequest,
		playerIds: string[],
	): Promise<Map<string, PartyInputResponse>>;
	sendToPlayer(playerId: string, data: Record<string, unknown>): Promise<void>;
	updatePlayerScore(playerId: string, delta: number): Promise<void>;
	delay(ms: number): Promise<void>;
	getPlayers(): string[];
}

export interface ServerScriptRoom {
	setPhase(phase: string): Promise<void>;
	updateSharedData(data: Record<string, unknown>): Promise<void>;
	requestInput(
		requestId: string,
		request: PartyInputRequest,
	): Promise<Map<string, PartyInputResponse>>;
	requestInputFromSubset(
		requestId: string,
		request: PartyInputRequest,
		playerIds: string[],
	): Promise<Map<string, PartyInputResponse>>;
	sendToPlayer(playerId: string, data: Record<string, unknown>): Promise<void>;
	updatePlayerScore(playerId: string, delta: number): Promise<void>;
	getPlayers(): string[];
}

interface ScriptExports {
	run?: (room: RoomAPI, config?: Record<string, unknown>) => unknown;
	[key: string]: unknown;
}

export class ServerScriptRunner {
	private readonly roomAPI: RoomAPI;

	constructor(private readonly room: ServerScriptRoom) {
		this.roomAPI = {
			setPhase: (phase) => this.room.setPhase(phase),
			updateSharedData: (data) => this.room.updateSharedData(data),
			requestInput: (requestId, request) =>
				this.room.requestInput(requestId, request),
			requestInputFromSubset: (requestId, request, playerIds) =>
				this.room.requestInputFromSubset(requestId, request, playerIds),
			sendToPlayer: (playerId, data) => this.room.sendToPlayer(playerId, data),
			updatePlayerScore: (playerId, delta) =>
				this.room.updatePlayerScore(playerId, delta),
			delay: (ms) =>
				new Promise((resolve) => {
					setTimeout(resolve, ms);
				}),
			getPlayers: () => this.room.getPlayers(),
		};
	}

	async execute(
		scriptCode: string,
		config: Record<string, unknown> = {},
	): Promise<void> {
		const requireFn = this.buildRequireFunction();

		const wrappedCode = `
      "use strict";
      const module = { exports: {} };
      const exports = module.exports;
      ${scriptCode}
      return module.exports;
    `;

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const factory = new Function(
			"require",
			"room",
			"config",
			"console",
			wrappedCode,
		);

		const scriptConsole = this.createScriptConsole();
		const exportsResult = factory(
			requireFn,
			this.roomAPI,
			config,
			scriptConsole,
		) as ScriptExports;

		if (typeof exportsResult.run === "function") {
			await exportsResult.run(this.roomAPI, config);
		}
	}

	private createScriptConsole(): Console {
		return {
			log: (...args: unknown[]) => console.log("[PartyServerScript]", ...args),
			warn: (...args: unknown[]) =>
				console.warn("[PartyServerScript]", ...args),
			error: (...args: unknown[]) =>
				console.error("[PartyServerScript]", ...args),
		} as Console;
	}

	private buildRequireFunction(): (name: string) => unknown {
		const moduleCache = new Map<string, unknown>();

		return (name: string) => {
			if (moduleCache.has(name)) {
				return moduleCache.get(name);
			}

			const moduleSource = SLOPCADE_MODULES[name];
			if (!moduleSource) {
				throw new Error(`Module not found: ${name}`);
			}

			const moduleRecord: { exports: unknown } = { exports: {} };
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const moduleFactory = new Function("module", "exports", moduleSource);
			moduleFactory(moduleRecord, moduleRecord.exports);
			moduleCache.set(name, moduleRecord.exports);

			return moduleRecord.exports;
		};
	}
}
