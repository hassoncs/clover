import type { AgUiEvent } from "@slopcade/shared/chat";
import { useCallback, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { useChatEventNotify } from "@/lib/chat/ChatStreamProvider";
import { env } from "@/lib/config/env";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useGameWebSocket(gameId: string | null) {
	const notifySubscribers = useChatEventNotify();
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
	const isConnectingRef = useRef(false);

	const connect = useCallback(async () => {
		if (
			!gameId ||
			isConnectingRef.current ||
			wsRef.current?.readyState === WebSocket.OPEN
		) {
			return;
		}

		isConnectingRef.current = true;

		try {
			const token = await getAuthToken();
			if (!token) {
				console.warn("[useGameWebSocket] No auth token available");
				isConnectingRef.current = false;
				return;
			}

			const wsUrl = `${env.apiUrl.replace(/^http/, "ws")}/api/games/${gameId}/ws?token=${encodeURIComponent(token)}`;

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("[useGameWebSocket] Connected");
				reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
				isConnectingRef.current = false;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as AgUiEvent;
					notifySubscribers(data);
				} catch (err) {
					console.error("[useGameWebSocket] Failed to parse message:", err);
				}
			};

			ws.onerror = (error) => {
				console.error("[useGameWebSocket] WebSocket error:", error);
			};

			ws.onclose = () => {
				console.log("[useGameWebSocket] Disconnected");
				wsRef.current = null;
				isConnectingRef.current = false;

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
			console.error("[useGameWebSocket] Connection error:", err);
			isConnectingRef.current = false;
		}
	}, [gameId, notifySubscribers]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (gameId) {
			connect();
		}
		return () => {
			disconnect();
		};
	}, [gameId, connect, disconnect]);
}
