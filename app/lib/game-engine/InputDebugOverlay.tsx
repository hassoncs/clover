import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import type { InputState } from "./BehaviorContext";
import type { CameraSystem } from "./CameraSystem";
import type { ViewportSystem } from "./ViewportSystem";
import type { GameRule } from "@slopcade/shared";
import type { RuntimeEntity } from "./types";

function getEntitySize(entity: RuntimeEntity): { width: number; height: number } {
  const sprite = entity.sprite;
  const physics = entity.physics;

  if (sprite) {
    if (sprite.type === "rect") {
      return { width: sprite.width, height: sprite.height };
    }
    if (sprite.type === "image") {
      return { width: sprite.imageWidth, height: sprite.imageHeight };
    }
    if (sprite.type === "circle") {
      return { width: sprite.radius * 2, height: sprite.radius * 2 };
    }
  }

  if (physics) {
    if (physics.shape === "box") {
      return { width: physics.width, height: physics.height };
    }
    if (physics.shape === "circle") {
      return { width: physics.radius * 2, height: physics.radius * 2 };
    }
  }

  return { width: 1, height: 1 };
}

export interface InputDebugOverlayProps {
  inputRef: React.RefObject<InputState>;
  cameraRef: React.RefObject<CameraSystem | null>;
  viewportSystemRef?: React.RefObject<ViewportSystem | null>;
  viewportRect: { x: number; y: number; width: number; height: number };
  rules?: GameRule[];
  entities?: RuntimeEntity[];
}

interface InputLogEntry {
  id: number;
  type: string;
  detail: string;
  timestamp: number;
}

const MAX_LOG_ENTRIES = 5;
const LOG_ENTRY_LIFETIME_MS = 3000;

function getTappableEntityTags(rules: GameRule[]): Set<string> {
  const tags = new Set<string>();
  for (const rule of rules) {
    if (rule.trigger.type === "tap" && rule.trigger.target) {
      const target = rule.trigger.target;
      if (target !== "screen" && target !== "self") {
        tags.add(target);
      }
    }
  }
  return tags;
}

export function InputDebugOverlay({
  inputRef,
  cameraRef,
  viewportSystemRef,
  viewportRect,
  rules = [],
  entities = [],
}: InputDebugOverlayProps) {
  const [, forceUpdate] = useState(0);
  const logEntriesRef = useRef<InputLogEntry[]>([]);
  const logIdRef = useRef(0);
  const lastTapRef = useRef<InputState["tap"] | null>(null);
  const lastDragRef = useRef<InputState["drag"] | null>(null);

  const tappableEntityTags = useMemo(() => getTappableEntityTags(rules), [rules]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const input = inputRef.current;

      if (input.tap && input.tap !== lastTapRef.current) {
        const entityInfo = input.tap.targetEntityId
          ? ` → ${input.tap.targetEntityId}`
          : " (no entity)";
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "TAP",
          detail: `(${input.tap.worldX.toFixed(1)}, ${input.tap.worldY.toFixed(1)})${entityInfo}`,
          timestamp: now,
        });
        lastTapRef.current = input.tap;
      }

      if (input.drag && !lastDragRef.current) {
        const entityInfo = input.drag.targetEntityId
          ? ` on ${input.drag.targetEntityId}`
          : "";
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "DRAG_START",
          detail: `(${input.drag.startWorldX.toFixed(1)}, ${input.drag.startWorldY.toFixed(1)})${entityInfo}`,
          timestamp: now,
        });
      }

      if (!input.drag && lastDragRef.current) {
        logEntriesRef.current.push({
          id: logIdRef.current++,
          type: "DRAG_END",
          detail: `velocity: (${input.dragEnd?.worldVelocityX?.toFixed(1) ?? 0}, ${input.dragEnd?.worldVelocityY?.toFixed(1) ?? 0})`,
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
  }, [inputRef]);

  const worldToScreen = useCallback((worldX: number, worldY: number): { x: number; y: number } | null => {
    const camera = cameraRef.current;
    const viewportSystem = viewportSystemRef?.current;
    if (!camera) return null;

    if (viewportSystem) {
      const cameraPos = camera.getPosition();
      const cameraZoom = camera.getZoom();
      return viewportSystem.worldToViewport(worldX, worldY, cameraPos, cameraZoom);
    }
    return camera.worldToScreen(worldX, worldY);
  }, [cameraRef, viewportSystemRef]);

  const input = inputRef.current;

  const tapMarker = useMemo(() => {
    if (!input.tap) return null;
    const screenPos = worldToScreen(input.tap.worldX, input.tap.worldY);
    if (!screenPos) return null;

    return (
      <View
        style={[
          styles.tapMarker,
          { left: screenPos.x - 15, top: screenPos.y - 15 },
        ]}
        pointerEvents="none"
      >
        <View style={styles.tapCrosshairH} />
        <View style={styles.tapCrosshairV} />
        {input.tap.targetEntityId && (
          <Text style={styles.tapEntityLabel}>{input.tap.targetEntityId}</Text>
        )}
      </View>
    );
  }, [input.tap, worldToScreen]);

  const dragLine = useMemo(() => {
    if (!input.drag) return null;
    const startScreen = worldToScreen(input.drag.startWorldX, input.drag.startWorldY);
    const currentScreen = worldToScreen(input.drag.currentWorldX, input.drag.currentWorldY);
    if (!startScreen || !currentScreen) return null;

    const dx = currentScreen.x - startScreen.x;
    const dy = currentScreen.y - startScreen.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return (
      <>
        <View
          style={[
            styles.dragStartDot,
            { left: startScreen.x - 6, top: startScreen.y - 6 },
          ]}
          pointerEvents="none"
        />
        {length > 5 && (
          <View
            style={[
              styles.dragLine,
              {
                left: startScreen.x,
                top: startScreen.y,
                width: length,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
            pointerEvents="none"
          />
        )}
        <View
          style={[
            styles.dragCurrentDot,
            { left: currentScreen.x - 4, top: currentScreen.y - 4 },
          ]}
          pointerEvents="none"
        />
      </>
    );
  }, [input.drag, worldToScreen]);

  const tappableEntityHighlights = useMemo(() => {
    if (tappableEntityTags.size === 0) return null;

    const camera = cameraRef.current;
    const zoom = camera?.getZoom() ?? 1;
    const ppm = 50;

    return entities
      .filter((entity) => {
        const tags = entity.tags ?? [];
        return tags.some((tag) => tappableEntityTags.has(tag));
      })
      .map((entity) => {
        const screenPos = worldToScreen(entity.transform.x, entity.transform.y);
        if (!screenPos) return null;

        const size = getEntitySize(entity);
        const screenWidth = size.width * ppm * zoom;
        const screenHeight = size.height * ppm * zoom;

        return (
          <View
            key={entity.id}
            style={[
              styles.tappableHighlight,
              {
                left: screenPos.x - screenWidth / 2,
                top: screenPos.y - screenHeight / 2,
                width: screenWidth,
                height: screenHeight,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.tappableLabel}>{entity.id}</Text>
          </View>
        );
      })
      .filter(Boolean);
  }, [entities, tappableEntityTags, worldToScreen, cameraRef]);

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
  const inputLog = logEntries.length === 0 ? null : (
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
        {tappableEntityHighlights}
        {dragLine}
        {tapMarker}
        {buttonStates}
        {inputLog}
      </div>
    );
  }

  return (
    <View style={containerStyle} pointerEvents="none">
      {tappableEntityHighlights}
      {dragLine}
      {tapMarker}
      {buttonStates}
      {inputLog}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    overflow: "hidden",
  },
  tapMarker: {
    position: "absolute",
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  tapCrosshairH: {
    position: "absolute",
    width: 30,
    height: 2,
    backgroundColor: "#00ff00",
  },
  tapCrosshairV: {
    position: "absolute",
    width: 2,
    height: 30,
    backgroundColor: "#00ff00",
  },
  tapEntityLabel: {
    position: "absolute",
    top: 32,
    backgroundColor: "rgba(0, 255, 0, 0.8)",
    color: "#000",
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  dragStartDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff6600",
    borderWidth: 2,
    borderColor: "#fff",
  },
  dragLine: {
    position: "absolute",
    height: 3,
    backgroundColor: "#ff6600",
    transformOrigin: "left center",
  },
  dragCurrentDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffcc00",
  },
  tappableHighlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(0, 255, 255, 0.8)",
    borderStyle: "dashed",
    backgroundColor: "rgba(0, 255, 255, 0.1)",
  },
  tappableLabel: {
    position: "absolute",
    top: -16,
    left: 0,
    backgroundColor: "rgba(0, 255, 255, 0.8)",
    color: "#000",
    fontSize: 9,
    paddingHorizontal: 3,
    paddingVertical: 1,
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
