import type {
	GameConfig,
	PartyInputRequest,
	PartyInputResponse,
	PartyMessage,
	PartyPlayer,
	PartyRoomPhase,
	PartyRoomState,
} from "@slopcade/shared/types/party";

export type { GameConfig };

const VALID_MESSAGE_TYPES = new Set([
	"state_update",
	"player_joined",
	"player_left",
	"input_request",
	"input_response",
	"phase_change",
	"error",
	"host_reconnect",
	"player_reconnect",
	"start_game",
	"private_state",
	"player_token",
]);

export function encodeMessage(msg: PartyMessage): string {
	return JSON.stringify(msg);
}

export function decodeMessage(raw: string | ArrayBuffer): PartyMessage | null {
	try {
		const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
		const parsed = JSON.parse(text) as Record<string, unknown>;
		if (
			typeof parsed.type !== "string" ||
			!VALID_MESSAGE_TYPES.has(parsed.type)
		) {
			return null;
		}
		return parsed as unknown as PartyMessage;
	} catch {
		return null;
	}
}

export function stateUpdateMessage(state: PartyRoomState): PartyMessage {
	return { type: "state_update", state, stateVersion: state.stateVersion };
}

export function playerJoinedMessage(player: PartyPlayer): PartyMessage {
	return { type: "player_joined", player };
}

export function playerLeftMessage(playerId: string): PartyMessage {
	return { type: "player_left", playerId };
}

export function inputRequestMessage(
	requestId: string,
	request: PartyInputRequest,
): PartyMessage {
	return { type: "input_request", requestId, request };
}

export function inputResponseMessage(
	requestId: string,
	response: PartyInputResponse,
): PartyMessage {
	return { type: "input_response", requestId, response };
}

export function phaseChangeMessage(
	phase: PartyRoomPhase,
	metadata?: Record<string, unknown>,
): PartyMessage {
	return { type: "phase_change", phase, metadata };
}

export function errorMessage(code: string, message: string): PartyMessage {
	return { type: "error", code, message };
}

export function playerReconnectMessage(playerId: string): PartyMessage {
	return { type: "player_reconnect", playerId };
}

export function privateStateMessage(
	data: Record<string, unknown>,
): PartyMessage {
	return { type: "private_state", data };
}

export function playerTokenMessage(
	token: string,
	playerId: string,
): PartyMessage {
	return { type: "player_token", token, playerId };
}

export function startGameMessage(gameConfig?: GameConfig): PartyMessage {
	return { type: "start_game", gameConfig };
}
