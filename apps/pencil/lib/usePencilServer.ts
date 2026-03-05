import type { PenDocument } from "@slopcade/shared/types/pen";
import { useEffect, useRef, useCallback, useState } from "react";
import { Platform } from "react-native";

const SERVER_URL = process.env.EXPO_PUBLIC_PENCIL_SERVER_URL || "ws://localhost:8090/ws";

interface AgentCursor {
  agentId: string;
  x: number;
  y: number;
  action: string;
  timestamp: number;
}

interface UsePencilServerOptions {
  document: PenDocument;
  setDocument: (doc: PenDocument | ((prev: PenDocument) => PenDocument)) => void;
  onDocumentChange?: (doc: PenDocument) => void;
}

export function usePencilServer({
  document,
  setDocument,
  onDocumentChange,
}: UsePencilServerOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentCursors, setAgentCursors] = useState<AgentCursor[]>([]);
  const documentRef = useRef(document);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep document ref updated
  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(SERVER_URL);

      ws.onopen = () => {
        console.log("[pencil-server] Connected to WebSocket server");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "state_update") {
            const newDoc = message.payload as PenDocument;
            setDocument(newDoc);
            onDocumentChange?.(newDoc);
          } else if (message.type === "agent_cursor_moved") {
            const cursor = message.payload as AgentCursor;
            setAgentCursors((prev) => {
              // Update or add cursor
              const existing = prev.findIndex((c) => c.agentId === cursor.agentId);
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
          console.error("[pencil-server] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        console.log("[pencil-server] WebSocket disconnected");
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
        console.error("[pencil-server] WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[pencil-server] Failed to connect:", err);
    }
  }, [setDocument, onDocumentChange]);

  // Send cursor update to server
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "cursor_update",
          payload: { x, y },
        })
      );
    }
  }, []);

  // Send delta operations to server
  const sendDelta = useCallback((ops: unknown[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "delta",
          payload: { ops },
        })
      );
    }
  }, []);

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
        prev.filter((cursor) => now - cursor.timestamp < 10000)
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    agentCursors,
    sendCursorUpdate,
    sendDelta,
    serverUrl: SERVER_URL,
  };
}
