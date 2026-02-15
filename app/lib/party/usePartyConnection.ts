import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { env } from "@/lib/config/env";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";
import type {
	InputResponseMessage,
	PartyInputRequest,
	PartyMessage,
	PartyPlayer,
	PartyRoomState,
} from "./types";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function getPlayerTokenKey(roomCode: string): string {
	return `party_player_token:${roomCode}`;
}

export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "reconnecting";

export interface UsePartyConnectionParams {
	code: string;
	role: "host" | "player";
	name?: string;
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
	sendStartGame: () => void;
}

export function usePartyConnection({
	code,
	role,
	name,
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
	const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
	const isConnectingRef = useRef(false);
	const inputQueueRef = useRef<unknown[]>([]);
	const playerTokenRef = useRef<string | null>(null);

	const connect = useCallback(async () => {
		if (
			isConnectingRef.current ||
			wsRef.current?.readyState === WebSocket.OPEN
		) {
			return;
		}

		isConnectingRef.current = true;
		setConnectionStatus(wsRef.current ? "reconnecting" : "connecting");

		try {
			const token = await getAuthToken();
			if (!token && role === "host" && !hostToken) {
				console.warn("[usePartyConnection] No auth token available for host");
				isConnectingRef.current = false;
				setConnectionStatus("disconnected");
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
				const storedToken = await getStorageItem<string | null>(
					getPlayerTokenKey(code),
					null,
				);
				if (storedToken) {
					playerTokenRef.current = storedToken;
					params.set("token", storedToken);
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
				reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
				isConnectingRef.current = false;

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

			ws.onclose = () => {
				console.log("[usePartyConnection] Disconnected");
				wsRef.current = null;
				isConnectingRef.current = false;
				setConnectionStatus("disconnected");

				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
				}
				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectDelayRef.current = Math.min(
						reconnectDelayRef.current * 2,
						MAX_RECONNECT_DELAY,
					);
					connect();
				}, reconnectDelayRef.current);
			};
		} catch (err) {
			console.error("[usePartyConnection] Connection error:", err);
			isConnectingRef.current = false;
			setConnectionStatus("disconnected");
		}
	}, [code, role, name, hostToken]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setConnectionStatus("disconnected");
	}, []);

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

	const sendStartGame = useCallback(() => {
		const message = { type: "start_game" };
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		}
	}, []);

	useEffect(() => {
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
