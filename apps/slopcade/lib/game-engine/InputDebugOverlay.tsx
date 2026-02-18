import { useState, useEffect, useRef, useMemo } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import type { InputState } from "./BehaviorContext";
import { useDevToolsOptional } from "../contexts/DevToolsContext";

export interface InputDebugOverlayProps {
  inputRef: React.RefObject<InputState>;
  viewportRect: { x: number; y: number; width: number; height: number };
}

interface InputLogEntry {
  id: number;
  type: string;
  detail: string;
  timestamp: number;
}

const MAX_LOG_ENTRIES = 5;
const LOG_ENTRY_LIFETIME_MS = 3000;

export function InputDebugOverlay({
  inputRef,
  viewportRect,
}: InputDebugOverlayProps) {
  const devTools = useDevToolsOptional();
  const [, forceUpdate] = useState(0);
  const logEntriesRef = useRef<InputLogEntry[]>([]);
  const logIdRef = useRef(0);
  const lastTapRef = useRef<InputState["tap"] | null>(null);
  const lastDragRef = useRef<InputState["drag"] | null>(null);

  const showDebug = devTools?.state.showInputDebug ?? false;

  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const input = inputRef.current;

      const tap = input.tap;
      if (tap && tap !== lastTapRef.current) {
        const entityInfo = tap.targetEntityId
          ? ` → ${tap.targetEntityId}`
          : " (no entity)";
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "TAP",
          detail: `(${tap.worldX.toFixed(1)}, ${tap.worldY.toFixed(
            1,
          )})${entityInfo}`,
          timestamp: now,
        });
        lastTapRef.current = tap;
      }

      const drag = input.drag;
      if (drag && !lastDragRef.current) {
        const entityInfo = drag.targetEntityId
          ? ` on ${drag.targetEntityId}`
          : "";
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "DRAG_START",
          detail: `(${drag.startWorldX.toFixed(1)}, ${drag.startWorldY.toFixed(
            1,
          )})${entityInfo}`,
          timestamp: now,
        });
      }

      if (!input.drag && lastDragRef.current) {
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "DRAG_END",
          detail: `velocity: (${
            input.dragEnd?.worldVelocityX?.toFixed(1) ?? 0
          }, ${input.dragEnd?.worldVelocityY?.toFixed(1) ?? 0})`,
          timestamp: now,
        });
      }

      lastDragRef.current = input.drag ?? null;

      logEntriesRef.current = logEntriesRef.current
        .filter((entry) => now - entry.timestamp < LOG_ENTRY_LIFETIME_MS)
        .slice(-MAX_LOG_ENTRIES);

      forceUpdate((n) => n + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [inputRef, showDebug]);

  const input = inputRef.current;

  const buttonStates = useMemo(() => {
    const buttons = input.buttons;
    if (!buttons) return null;

    const activeButtons = Object.entries(buttons)
      .filter(([, pressed]) => pressed)
      .map(([name]) => name);

    if (activeButtons.length === 0) return null;

    return (
      <View style={styles.buttonStateContainer} pointerEvents="none">
        <Text style={styles.buttonStateText}>
          Buttons: {activeButtons.join(", ")}
        </Text>
      </View>
    );
  }, [input.buttons]);

  const logEntries = logEntriesRef.current;
  const inputLog =
    logEntries.length === 0 ? null : (
      <View style={styles.logContainer} pointerEvents="none">
        {logEntries.map((entry) => (
          <Text key={entry.id} style={styles.logEntry}>
            [{entry.type}] {entry.detail}
          </Text>
        ))}
      </View>
    );

  const containerStyle =
    Platform.OS === "web"
      ? {
          position: "absolute" as const,
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
          pointerEvents: "none" as const,
          overflow: "hidden" as const,
        }
      : [
          styles.container,
          {
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
          },
        ];

  if (Platform.OS === "web") {
    return (
      <div style={containerStyle as React.CSSProperties}>
        {showDebug && buttonStates}
        {showDebug && inputLog}
      </div>
    );
  }

  return (
    <View style={containerStyle} pointerEvents="none">
      {showDebug && buttonStates}
      {showDebug && inputLog}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    overflow: "hidden",
  },
  buttonStateContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonStateText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  logContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: "80%",
  },
  logEntry: {
    color: "#0f0",
    fontSize: 10,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
});
