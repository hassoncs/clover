import { SystemPhase } from "@slopcade/shared";
import type { PartyRoomState } from "@slopcade/shared/types/party";
import type { EventQueue } from "../EventQueue";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

const ROOM_PREFIX = "room.";

export interface MockNetworkConfig {
	role: "host" | "player";
	roomMock: Partial<PartyRoomState>;
}

export interface MockNetworkState {
	role: "host" | "player";
	playerCount: number;
	phase: string;
}

export class MockNetworkSystem
	implements RuntimeSystem<MockNetworkConfig, MockNetworkState>
{
	readonly id = "network";
	readonly phase = SystemPhase.PRE_UPDATE;
	readonly priority = 90;

	private config: MockNetworkConfig;
	private eventQueue: EventQueue | null = null;
	private currentMock: Partial<PartyRoomState>;
	private previousPhase: string | undefined;
	private previousPlayerCount: number | undefined;
	private dirty = true;

	constructor(config: MockNetworkConfig) {
		this.config = config;
		this.currentMock = { ...config.roomMock };
	}

	initialize(ctx: SystemContext, _config: MockNetworkConfig): void {
		this.eventQueue = ctx.eventQueue;
		this.dirty = true;
	}

	update(ctx: UpdateContext, _state: MockNetworkState): void {
		if (!this.dirty) return;
		this.dirty = false;

		const variables = ctx.gameState.variables as Record<string, unknown>;
		const mock = this.currentMock;

		variables["networkStatus"] = "connected";
		variables["role"] = this.config.role;

		if (mock.phase !== undefined) {
			variables[`${ROOM_PREFIX}phase`] = mock.phase;
		}

		const playerCount = mock.players?.length ?? 0;
		variables[`${ROOM_PREFIX}playerCount`] = playerCount;

		if (mock.hostId !== undefined) {
			variables[`${ROOM_PREFIX}hostId`] = mock.hostId;
		}

		if (mock.currentRound !== undefined) {
			variables[`${ROOM_PREFIX}currentRound`] = mock.currentRound;
		}
		if (mock.maxRounds !== undefined) {
			variables[`${ROOM_PREFIX}maxRounds`] = mock.maxRounds;
		}

		if (mock.sharedData) {
			for (const [key, value] of Object.entries(mock.sharedData)) {
				if (
					typeof value === "number" ||
					typeof value === "string" ||
					typeof value === "boolean"
				) {
					variables[`${ROOM_PREFIX}${key}`] = value;
				}
			}
		}

		if (mock.players) {
			for (let i = 0; i < mock.players.length; i++) {
				const player = mock.players[i];
				variables[`${ROOM_PREFIX}player${i}_name`] = player.name;
				variables[`${ROOM_PREFIX}player${i}_connected`] = player.connected;
				if (player.score !== undefined) {
					variables[`${ROOM_PREFIX}player${i}_score`] = player.score;
				}
			}
		}

		if (this.previousPhase !== undefined && this.previousPhase !== mock.phase) {
			this.eventQueue?.emit("network:phase_change", {
				phase: mock.phase,
				previousPhase: this.previousPhase,
			});
		}
		this.previousPhase = mock.phase;

		if (
			this.previousPlayerCount !== undefined &&
			this.previousPlayerCount !== playerCount
		) {
			this.eventQueue?.emit("network:player_count_change", {
				count: playerCount,
				previousCount: this.previousPlayerCount,
			});
		}
		this.previousPlayerCount = playerCount;
	}

	destroy(): void {
		this.eventQueue = null;
	}

	getState(): MockNetworkState {
		return {
			role: this.config.role,
			playerCount: this.currentMock.players?.length ?? 0,
			phase: this.currentMock.phase ?? "lobby",
		};
	}

	updateMock(newState: Partial<PartyRoomState>): void {
		this.currentMock = { ...this.currentMock, ...newState };
		this.dirty = true;
	}
}
