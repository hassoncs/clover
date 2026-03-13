import type { PenDocument } from "@slopcade/shared/types/pen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const SERVER_SYNC_ENABLED =
	process.env.EXPO_PUBLIC_PENCIL_SERVER_SYNC === "true";

function getServerUrl(): string {
	if (process.env.EXPO_PUBLIC_PENCIL_SERVER_URL) {
		return process.env.EXPO_PUBLIC_PENCIL_SERVER_URL;
	}
	if (Platform.OS === "web" && typeof window !== "undefined") {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/ws`;
	}
	return "ws://localhost:8090/ws";
}

interface AgentCursor {
	agentId: string;
	x: number;
	y: number;
	action: string;
	timestamp: number;
}

interface UsePencilServerOptions {
	document: PenDocument;
	setDocument: (
		doc: PenDocument | ((prev: PenDocument) => PenDocument),
	) => void;
	onDocumentChange?: (doc: PenDocument) => void;
	/** When true, server state_update messages are buffered instead of applied immediately.
	 *  Set this to true while the user is dragging/resizing to prevent snap-back. */
	isInteractingRef?: React.RefObject<boolean>;
}

export function usePencilServer({
	document,
	setDocument,
	onDocumentChange,
	isInteractingRef,
}: UsePencilServerOptions) {
	const wsRef = useRef<WebSocket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [agentCursors, setAgentCursors] = useState<AgentCursor[]>([]);
	const serverUrlRef = useRef(getServerUrl());
	const documentRef = useRef(document);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const pendingServerDocRef = useRef<PenDocument | null>(null);

	// Keep document ref updated
	useEffect(() => {
		documentRef.current = document;
	}, [document]);

	// Connect to WebSocket server
	const connect = useCallback(() => {
		if (!SERVER_SYNC_ENABLED) return;
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		try {
			const ws = new WebSocket(serverUrlRef.current);

			ws.onopen = () => {
				console.info("[pencil-server] Connected to WebSocket server");
				setIsConnected(true);
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					if (message.type === "state_update") {
						const newDoc = message.payload as PenDocument;
						if (isInteractingRef?.current) {
							pendingServerDocRef.current = newDoc;
						} else {
							pendingServerDocRef.current = null;
							setDocument(newDoc);
							onDocumentChange?.(newDoc);
						}
					} else if (message.type === "agent_cursor_moved") {
						const cursor = message.payload as AgentCursor;
						setAgentCursors((prev) => {
							// Update or add cursor
							const existing = prev.findIndex(
								(c) => c.agentId === cursor.agentId,
							);
							if (existing >= 0) {
								const updated = [...prev];
								updated[existing] = cursor;
								return updated;
							}
							return [...prev, cursor];
						});
					} else if (message.type === "delta") {
						// Handle delta updates from other clients
						const delta = message.payload;
						if (delta && Array.isArray(delta.ops)) {
							// Apply delta operations to local document
							// This would use applyDesignChatOpsToDocument
							console.log("[pencil-server] Received delta:", delta);
						}
					}
				} catch (err) {
					console.warn("[pencil-server] Failed to parse message:", err);
				}
			};

			ws.onclose = () => {
				console.info("[pencil-server] WebSocket disconnected");
				setIsConnected(false);
				wsRef.current = null;

				// Attempt to reconnect after 3 seconds
				if (!reconnectTimeoutRef.current) {
					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectTimeoutRef.current = null;
						connect();
					}, 3000);
				}
			};

			ws.onerror = (error) => {
				console.warn("[pencil-server] WebSocket error:", error);
			};

			wsRef.current = ws;
		} catch (err) {
			console.warn("[pencil-server] Failed to connect:", err);
		}
	}, [setDocument, onDocumentChange, isInteractingRef]);

	// Send cursor update to server
	const sendCursorUpdate = useCallback((x: number, y: number) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "cursor_update",
					payload: { x, y },
				}),
			);
		}
	}, []);

	const sendDelta = useCallback((ops: unknown[]) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "delta",
					payload: { ops },
				}),
			);
		}
	}, []);

	const flushPendingServerUpdate = useCallback(() => {
		const pending = pendingServerDocRef.current;
		if (pending) {
			pendingServerDocRef.current = null;
			setDocument(pending);
			onDocumentChange?.(pending);
		}
	}, [setDocument, onDocumentChange]);

	// Connect on mount
	useEffect(() => {
		connect();

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [connect]);

	// Clear old agent cursors periodically
	useEffect(() => {
		const interval = setInterval(() => {
			const now = Date.now();
			setAgentCursors((prev) =>
				prev.filter((cursor) => now - cursor.timestamp < 10000),
			);
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	return {
		isConnected,
		agentCursors,
		sendCursorUpdate,
		sendDelta,
		flushPendingServerUpdate,
		serverUrl: serverUrlRef.current,
	};
}
