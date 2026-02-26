import type { AgUiEvent } from "@slopcade/shared/chat";
import { useCallback, useEffect, useRef } from "react";
import { useEditorChat, useEditorConfig } from "../editor-context";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useGameWebSocket(gameId: string | null) {
	const { useChatEventNotify } = useEditorChat();
	const notifySubscribers = useChatEventNotify();
	const { getStorageItem } = useEditorConfig();
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
			const token = await getStorageItem("auth-token");
			if (!token) {
				console.warn("[useGameWebSocket] No auth token available");
				isConnectingRef.current = false;
				return;
			}

			const wsBaseUrl =
				typeof window !== "undefined" && window.location
					? window.location.origin.replace(/^http/, "ws")
					: "ws://localhost:1355";
			const wsUrl = `${wsBaseUrl}/api/games/${gameId}/ws?token=${encodeURIComponent(token)}`;

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

			ws.onerror = () => {
				// Silently ignore WebSocket errors - these are expected when
				// the server is unavailable or during development
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
	}, [gameId, notifySubscribers, getStorageItem]);

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
