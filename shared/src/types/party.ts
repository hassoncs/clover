export interface PartyConfig {
	maxPlayers: number;
	minPlayers?: number;
	roleAssignment?: "random" | "host-picks" | "player-choice";
	allowSpectators?: boolean;
	autoStartWhenFull?: boolean;
	lobbyTimeoutSeconds?: number;
}

export interface PartyPlayer {
	id: string;
	name: string;
	avatar?: string;
	connected: boolean;
	role?: string;
	score?: number;
	isHost?: boolean;
}

export type PartyRoomPhase = "lobby" | "playing" | "ended";

export interface PartyRoomState {
	phase: PartyRoomPhase;
	players: PartyPlayer[];
	hostId: string;
	sharedData?: Record<string, unknown>;
	currentRound?: number;
	maxRounds?: number;
}

export type PartyInputType = "text" | "choice" | "drawing" | "buzzer";

export interface PartyInputRequest {
	type: PartyInputType;
	prompt: string;
	timeLimit?: number;
	options?: string[];
	metadata?: Record<string, unknown>;
}

export interface PartyInputResponse {
	playerId: string;
	value: unknown;
	timestamp: number;
}

export interface StateUpdateMessage {
	type: "state_update";
	state: PartyRoomState;
}

export interface PlayerJoinedMessage {
	type: "player_joined";
	player: PartyPlayer;
}

export interface PlayerLeftMessage {
	type: "player_left";
	playerId: string;
}

export interface InputRequestMessage {
	type: "input_request";
	request: PartyInputRequest;
	requestId: string;
}

export interface InputResponseMessage {
	type: "input_response";
	response: PartyInputResponse;
	requestId: string;
}

export interface PhaseChangeMessage {
	type: "phase_change";
	phase: PartyRoomPhase;
	metadata?: Record<string, unknown>;
}

export interface ErrorMessage {
	type: "error";
	code: string;
	message: string;
}

export interface HostReconnectMessage {
	type: "host_reconnect";
	newHostId: string;
}

export interface PlayerReconnectMessage {
	type: "player_reconnect";
	playerId: string;
}

export type PartyMessage =
	| StateUpdateMessage
	| PlayerJoinedMessage
	| PlayerLeftMessage
	| InputRequestMessage
	| InputResponseMessage
	| PhaseChangeMessage
	| ErrorMessage
	| HostReconnectMessage
	| PlayerReconnectMessage;
