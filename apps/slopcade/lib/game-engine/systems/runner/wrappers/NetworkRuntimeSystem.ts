import { SystemPhase } from "@slopcade/shared";
import type { PartyRoomState } from "@slopcade/shared/types/party";
import type {
	ConnectionStatus,
	UsePartyConnectionResult,
} from "@/lib/party/usePartyConnection";
import type { EventQueue } from "../EventQueue";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

const MAX_STATE_UPDATES_PER_SECOND = 10;
const MIN_UPDATE_INTERVAL_MS = 1000 / MAX_STATE_UPDATES_PER_SECOND;
const ROOM_PREFIX = "room.";

export interface NetworkSystemConfig {
	role: "host" | "player";
}

export interface NetworkSystemState {
	connectionStatus: ConnectionStatus;
	role: "host" | "player";
	playerCount: number;
	lastStateUpdateTime: number;
}

interface BufferedNetworkState {
	roomState: PartyRoomState | null;
	connectionStatus: ConnectionStatus;
	timestamp: number;
}

export class NetworkRuntimeSystem
	implements RuntimeSystem<NetworkSystemConfig, NetworkSystemState>
{
	readonly id = "network";
	readonly phase = SystemPhase.PRE_UPDATE;
	readonly priority = 90;

	private config: NetworkSystemConfig;
	private eventQueue: EventQueue | null = null;
	private connectionStatus: ConnectionStatus = "disconnected";
	private lastRoomState: PartyRoomState | null = null;
	private lastStateUpdateTime = 0;
	private buffer: BufferedNetworkState[] = [];
	private sendInputFn: ((input: unknown) => void) | null = null;

	constructor(config: NetworkSystemConfig) {
		this.config = config;
	}

	initialize(ctx: SystemContext, _config: NetworkSystemConfig): void {
		this.eventQueue = ctx.eventQueue;
	}

	update(ctx: UpdateContext, _state: NetworkSystemState): void {
		if (this.buffer.length === 0) return;

		const now = performance.now();
		if (now - this.lastStateUpdateTime < MIN_UPDATE_INTERVAL_MS) return;

		const latest = this.buffer[this.buffer.length - 1];
		this.buffer.length = 0;
		this.lastStateUpdateTime = now;

		const prevStatus = this.connectionStatus;
		this.connectionStatus = latest.connectionStatus;

		const variables = ctx.gameState.variables as Record<string, unknown>;
		variables["networkStatus"] = latest.connectionStatus;
		variables["role"] = this.config.role;

		if (prevStatus !== latest.connectionStatus) {
			this.eventQueue?.emit(`network:status_change`, {
				status: latest.connectionStatus,
				previousStatus: prevStatus,
			});
		}

		if (latest.roomState) {
			const prevState = this.lastRoomState;
			this.lastRoomState = latest.roomState;

			variables[`${ROOM_PREFIX}phase`] = latest.roomState.phase;
			variables[`${ROOM_PREFIX}playerCount`] = latest.roomState.players.length;
			variables[`${ROOM_PREFIX}hostId`] = latest.roomState.hostId;

			if (latest.roomState.roomCode) {
				variables["roomCode"] = latest.roomState.roomCode;
			}

			if (latest.roomState.currentRound !== undefined) {
				variables[`${ROOM_PREFIX}currentRound`] = latest.roomState.currentRound;
			}
			if (latest.roomState.maxRounds !== undefined) {
				variables[`${ROOM_PREFIX}maxRounds`] = latest.roomState.maxRounds;
			}

			if (latest.roomState.sharedData) {
				for (const [key, value] of Object.entries(
					latest.roomState.sharedData,
				)) {
					if (
						typeof value === "number" ||
						typeof value === "string" ||
						typeof value === "boolean"
					) {
						variables[`${ROOM_PREFIX}${key}`] = value;
					}
				}
			}

			for (let i = 0; i < latest.roomState.players.length; i++) {
				const player = latest.roomState.players[i];
				variables[`${ROOM_PREFIX}player${i}_name`] = player.name;
				variables[`${ROOM_PREFIX}player${i}_connected`] = player.connected;
				if (player.score !== undefined) {
					variables[`${ROOM_PREFIX}player${i}_score`] = player.score;
				}
			}

			if (prevState?.phase !== latest.roomState.phase) {
				this.eventQueue?.emit(`network:phase_change`, {
					phase: latest.roomState.phase,
					previousPhase: prevState?.phase,
				});
			}

			if (prevState?.players.length !== latest.roomState.players.length) {
				this.eventQueue?.emit(`network:player_count_change`, {
					count: latest.roomState.players.length,
					previousCount: prevState?.players.length ?? 0,
				});
			}
		}
	}

	destroy(): void {
		this.eventQueue = null;
		this.lastRoomState = null;
		this.buffer.length = 0;
		this.sendInputFn = null;
	}

	getState(): NetworkSystemState {
		return {
			connectionStatus: this.connectionStatus,
			role: this.config.role,
			playerCount: this.lastRoomState?.players.length ?? 0,
			lastStateUpdateTime: this.lastStateUpdateTime,
		};
	}

	setConnection(connection: UsePartyConnectionResult): void {
		this.sendInputFn = connection.sendInput;
		this.pushUpdate(connection.roomState, connection.connectionStatus);
	}

	pushUpdate(
		roomState: PartyRoomState | null,
		connectionStatus: ConnectionStatus,
	): void {
		this.buffer.push({
			roomState,
			connectionStatus,
			timestamp: performance.now(),
		});
	}

	sendInput(input: unknown): void {
		this.sendInputFn?.(input);
	}
}
