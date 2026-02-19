import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { env } from "@/lib/config/env";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";
import type {
	GameConfig,
	InputResponseMessage,
	PartyInputRequest,
	PartyMessage,
	PartyPlayer,
	PartyRoomState,
} from "./types";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 15000;
const MAX_RECONNECT_ATTEMPTS = 10;
const CLEAN_CLOSE_CODE = 1000;

function getPlayerTokenKey(roomCode: string): string {
	return `party_player_token:${roomCode}`;
}

export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "reconnecting"
	| "error";

export interface UsePartyConnectionParams {
	code: string;
	role: "host" | "player";
	name?: string;
	avatar?: string;
	hostToken?: string;
}

export interface ActiveInputRequest {
	requestId: string;
	request: PartyInputRequest;
}

export interface UsePartyConnectionResult {
	roomState: PartyRoomState | null;
	privateState: unknown | null;
	connectionStatus: ConnectionStatus;
	players: PartyPlayer[];
	activeInputRequest: ActiveInputRequest | null;
	playerId: string | null;
	sendInput: (value: unknown) => void;
	sendStartGame: (gameConfig?: GameConfig) => void;
}

export function usePartyConnection({
	code,
	role,
	name,
	avatar,
	hostToken,
}: UsePartyConnectionParams): UsePartyConnectionResult {
	const [roomState, setRoomState] = useState<PartyRoomState | null>(null);
	const [privateState, setPrivateState] = useState<unknown>(null);
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("connecting");
	const [activeInputRequest, setActiveInputRequest] =
		useState<ActiveInputRequest | null>(null);
	const [playerId, setPlayerId] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const reconnectAttemptsRef = useRef(0);
	const isConnectingRef = useRef(false);
	const shouldReconnectRef = useRef(true);
	const inputQueueRef = useRef<unknown[]>([]);
	const playerTokenRef = useRef<string | null>(null);
	const connectRef = useRef<(() => Promise<void>) | null>(null);

	const clearReconnectTimer = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
	}, []);

	const scheduleReconnect = useCallback(() => {
		if (!shouldReconnectRef.current) {
			return;
		}

		if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
			setConnectionStatus("error");
			return;
		}

		reconnectAttemptsRef.current += 1;
		const delay = Math.min(
			INITIAL_RECONNECT_DELAY * 2 ** (reconnectAttemptsRef.current - 1),
			MAX_RECONNECT_DELAY,
		);

		setConnectionStatus("reconnecting");
		clearReconnectTimer();
		reconnectTimeoutRef.current = setTimeout(() => {
			void connectRef.current?.();
		}, delay);
	}, [clearReconnectTimer]);

	const connect = useCallback(async () => {
		if (!shouldReconnectRef.current) {
			return;
		}

		if (
			isConnectingRef.current ||
			wsRef.current?.readyState === WebSocket.OPEN
		) {
			return;
		}

		isConnectingRef.current = true;
		if (reconnectAttemptsRef.current === 0) {
			setConnectionStatus("connecting");
		} else {
			setConnectionStatus("reconnecting");
		}

		try {
			const token = await getAuthToken();
			if (!token && role === "host" && !hostToken) {
				console.warn("[usePartyConnection] No auth token available for host");
				isConnectingRef.current = false;
				setConnectionStatus("error");
				return;
			}

			const params = new URLSearchParams();
			params.set("role", role);
			if (role === "host" && hostToken) {
				params.set("token", hostToken);
			} else if (role === "player") {
				if (name) {
					params.set("name", name);
				}
				if (avatar) {
					params.set("avatar", avatar);
				}
				const reconnectToken =
					playerTokenRef.current ??
					(await getStorageItem<string | null>(getPlayerTokenKey(code), null));
				if (reconnectToken) {
					playerTokenRef.current = reconnectToken;
					params.set("token", reconnectToken);
				}
			}
			if (token) {
				params.set("token", token);
			}

			const wsUrl = `${env.apiUrl.replace(/^http/, "ws")}/api/party/${code}/ws?${params.toString()}`;

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("[usePartyConnection] Connected");
				setConnectionStatus("connected");
				reconnectAttemptsRef.current = 0;
				isConnectingRef.current = false;
				clearReconnectTimer();

				while (inputQueueRef.current.length > 0) {
					const input = inputQueueRef.current.shift();
					if (input && ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify(input));
					}
				}
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data) as PartyMessage;

					switch (message.type) {
						case "state_update":
							setRoomState(message.state);
							break;
						case "player_joined":
							setRoomState((prev) => {
								if (!prev) return prev;
								return {
									...prev,
									players: [...prev.players, message.player],
								};
							});
							break;
						case "player_left":
							setRoomState((prev) => {
								if (!prev) return prev;
								return {
									...prev,
									players: prev.players.filter(
										(p) => p.id !== message.playerId,
									),
								};
							});
							break;
						case "input_request":
							setActiveInputRequest({
								requestId: message.requestId,
								request: message.request,
							});
							break;
						case "phase_change":
							setRoomState((prev) => {
								if (!prev) return prev;
								return { ...prev, phase: message.phase };
							});
							if (message.phase === "ended") {
								setActiveInputRequest(null);
							}
							break;
						case "private_state":
							setPrivateState(message.data);
							break;
						case "player_token":
							playerTokenRef.current = message.token;
							setPlayerId(message.playerId);
							setStorageItem(getPlayerTokenKey(code), message.token);
							break;
						case "error":
							console.error(
								"[usePartyConnection] Server error:",
								message.message,
							);
							break;
						default:
							break;
					}
				} catch (err) {
					console.error("[usePartyConnection] Failed to parse message:", err);
				}
			};

			ws.onerror = (error) => {
				console.error("[usePartyConnection] WebSocket error:", error);
			};

			ws.onclose = (event) => {
				console.log("[usePartyConnection] Disconnected");
				wsRef.current = null;
				isConnectingRef.current = false;

				if (!shouldReconnectRef.current) {
					setConnectionStatus("disconnected");
					clearReconnectTimer();
					return;
				}

				if (event.code === CLEAN_CLOSE_CODE || event.wasClean) {
					setConnectionStatus("disconnected");
					clearReconnectTimer();
					return;
				}

				scheduleReconnect();
			};
		} catch (err) {
			console.error("[usePartyConnection] Connection error:", err);
			isConnectingRef.current = false;
			scheduleReconnect();
		}
	}, [
		clearReconnectTimer,
		code,
		hostToken,
		name,
		avatar,
		role,
		scheduleReconnect,
	]);

	const disconnect = useCallback(() => {
		shouldReconnectRef.current = false;
		clearReconnectTimer();
		if (wsRef.current) {
			wsRef.current.close(CLEAN_CLOSE_CODE, "party_connection_closed");
			wsRef.current = null;
		}
		reconnectAttemptsRef.current = 0;
		isConnectingRef.current = false;
		setConnectionStatus("disconnected");
	}, [clearReconnectTimer]);

	const sendInput = useCallback(
		(value: unknown) => {
			const currentRequest = activeInputRequest;
			if (!currentRequest) {
				console.warn(
					"[usePartyConnection] sendInput called with no active input request",
				);
				return;
			}

			const message: InputResponseMessage = {
				type: "input_response",
				response: {
					playerId: "",
					value,
					timestamp: Date.now(),
				},
				requestId: currentRequest.requestId,
			};

			setActiveInputRequest(null);

			if (wsRef.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify(message));
			} else {
				inputQueueRef.current.push(message);
			}
		},
		[activeInputRequest],
	);

	const sendStartGame = useCallback((gameConfig?: GameConfig) => {
		const message = { type: "start_game", gameConfig };
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		}
	}, []);

	useEffect(() => {
		connectRef.current = connect;
	}, [connect]);

	useEffect(() => {
		shouldReconnectRef.current = true;
		reconnectAttemptsRef.current = 0;
		connect();
		return () => {
			disconnect();
		};
	}, [connect, disconnect]);

	return {
		roomState,
		privateState,
		connectionStatus,
		players: roomState?.players ?? [],
		activeInputRequest,
		playerId,
		sendInput,
		sendStartGame,
	};
}
