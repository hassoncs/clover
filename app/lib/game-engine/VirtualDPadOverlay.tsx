import { useCallback, useRef, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Pressable,
} from "react-native";
import * as Haptics from "@/lib/haptics";
import type { VirtualDPad, DPadDirection } from "@slopcade/shared";

export interface VirtualDPadOverlayProps {
  config: VirtualDPad;
  viewportRect: { x: number; y: number; width: number; height: number };
  onDirectionPress: (direction: DPadDirection, pressed: boolean) => void;
  enableHaptics?: boolean;
}

interface DirectionBounds {
  direction: DPadDirection;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const DEFAULT_SIZE = 140;
const DEFAULT_BUTTON_SIZE = 44;
const DEFAULT_COLOR = "rgba(255, 255, 255, 0.4)";
const DEFAULT_ACTIVE_COLOR = "rgba(255, 255, 255, 0.8)";
const DPAD_MARGIN = 20;

function isPointInRect(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  const halfW = width / 2;
  const halfH = height / 2;
  return (
    x >= centerX - halfW &&
    x <= centerX + halfW &&
    y >= centerY - halfH &&
    y <= centerY + halfH
  );
}

export function VirtualDPadOverlay({
  config,
  viewportRect,
  onDirectionPress,
  enableHaptics = true,
}: VirtualDPadOverlayProps) {
  const activeTouchesRef = useRef<Map<number, DPadDirection>>(new Map());
  const [activeDirections, setActiveDirections] = useState<Set<DPadDirection>>(
    new Set()
  );

  const size = config.size ?? DEFAULT_SIZE;
  const buttonSize = config.buttonSize ?? DEFAULT_BUTTON_SIZE;
  const color = config.color ?? DEFAULT_COLOR;
  const activeColor = config.activeColor ?? DEFAULT_ACTIVE_COLOR;

  const dpadCenterX = DPAD_MARGIN + size / 2;
  const dpadCenterY = viewportRect.height - DPAD_MARGIN - size / 2;

  const directionBounds = useMemo<DirectionBounds[]>(() => [
    {
      direction: "up",
      centerX: dpadCenterX,
      centerY: dpadCenterY - buttonSize,
      width: buttonSize,
      height: buttonSize,
    },
    {
      direction: "down",
      centerX: dpadCenterX,
      centerY: dpadCenterY + buttonSize,
      width: buttonSize,
      height: buttonSize,
    },
    {
      direction: "left",
      centerX: dpadCenterX - buttonSize,
      centerY: dpadCenterY,
      width: buttonSize,
      height: buttonSize,
    },
    {
      direction: "right",
      centerX: dpadCenterX + buttonSize,
      centerY: dpadCenterY,
      width: buttonSize,
      height: buttonSize,
    },
  ], [dpadCenterX, dpadCenterY, buttonSize]);

  const triggerHaptic = useCallback(() => {
    if (enableHaptics) {
      Haptics.impactAsync("Light");
    }
  }, [enableHaptics]);

  const findDirectionAtPoint = useCallback(
    (x: number, y: number): DPadDirection | null => {
      for (const btn of directionBounds) {
        if (
          isPointInRect(x, y, btn.centerX, btn.centerY, btn.width, btn.height)
        ) {
          return btn.direction;
        }
      }
      return null;
    },
    [directionBounds]
  );

  const updateActiveDirections = useCallback(() => {
    const newActive = new Set(activeTouchesRef.current.values());
    setActiveDirections(newActive);
  }, []);

  const handleTouchChange = useCallback(
    (
      touchId: number,
      x: number | null,
      y: number | null,
      isEnd: boolean = false
    ) => {
      const prevDirection = activeTouchesRef.current.get(touchId);

      if (isEnd || x === null || y === null) {
        if (prevDirection) {
          activeTouchesRef.current.delete(touchId);
          const stillPressed = Array.from(
            activeTouchesRef.current.values()
          ).includes(prevDirection);
          if (!stillPressed) {
            onDirectionPress(prevDirection, false);
          }
          updateActiveDirections();
        }
        return;
      }

      const newDirection = findDirectionAtPoint(x, y);

      if (prevDirection !== newDirection) {
        if (prevDirection) {
          activeTouchesRef.current.delete(touchId);
          const stillPressed = Array.from(
            activeTouchesRef.current.values()
          ).includes(prevDirection);
          if (!stillPressed) {
            onDirectionPress(prevDirection, false);
          }
        }
        if (newDirection) {
          activeTouchesRef.current.set(touchId, newDirection);
          onDirectionPress(newDirection, true);
          triggerHaptic();
        }
        updateActiveDirections();
      }
    },
    [findDirectionAtPoint, onDirectionPress, updateActiveDirections, triggerHaptic]
  );

  const handleWebTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const rect = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleTouchChange(touch.identifier, x, y);
      }
    },
    [handleTouchChange]
  );

  const handleWebTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const rect = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleTouchChange(touch.identifier, x, y);
      }
    },
    [handleTouchChange]
  );

  const handleWebTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      for (const touch of Array.from(event.changedTouches)) {
        handleTouchChange(touch.identifier, null, null, true);
      }
    },
    [handleTouchChange]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      handleTouchChange(0, x, y);
    },
    [handleTouchChange]
  );

  const handleMouseUp = useCallback(() => {
    handleTouchChange(0, null, null, true);
  }, [handleTouchChange]);

  const renderDirectionButton = (btn: DirectionBounds) => {
    const isActive = activeDirections.has(btn.direction);
    const buttonStyle = {
      left: btn.centerX - btn.width / 2,
      top: btn.centerY - btn.height / 2,
      width: btn.width,
      height: btn.height,
      backgroundColor: isActive ? activeColor : color,
    };

    const arrowRotation = {
      up: "0deg",
      right: "90deg",
      down: "180deg",
      left: "270deg",
    }[btn.direction];

    const arrowContent = (
      <View
        style={[
          styles.arrow,
          { transform: [{ rotate: arrowRotation }] },
        ]}
      >
        <View style={styles.arrowHead} />
      </View>
    );

    if (Platform.OS === "web") {
      return (
        <div
          key={btn.direction}
          style={{
            position: "absolute",
            ...buttonStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            touchAction: "none",
            userSelect: "none",
            cursor: "pointer",
            transition: "background-color 0.1s ease",
            borderRadius: 6,
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow: isActive
              ? "0 0 10px rgba(255, 255, 255, 0.5)"
              : "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          {arrowContent}
        </div>
      );
    }

    return (
      <Pressable
        key={btn.direction}
        style={[styles.nativeButton, buttonStyle]}
        onPressIn={() => {
          onDirectionPress(btn.direction, true);
          setActiveDirections((prev) => new Set([...prev, btn.direction]));
          triggerHaptic();
        }}
        onPressOut={() => {
          onDirectionPress(btn.direction, false);
          setActiveDirections((prev) => {
            const next = new Set(prev);
            next.delete(btn.direction);
            return next;
          });
        }}
      >
        {arrowContent}
      </Pressable>
    );
  };

  const renderCenterButton = () => {
    const centerStyle = {
      left: dpadCenterX - buttonSize / 2,
      top: dpadCenterY - buttonSize / 2,
      width: buttonSize,
      height: buttonSize,
      backgroundColor: color,
    };

    if (Platform.OS === "web") {
      return (
        <div
          key="center"
          style={{
            position: "absolute",
            ...centerStyle,
            borderRadius: 6,
            border: "2px solid rgba(255, 255, 255, 0.4)",
            pointerEvents: "none",
          }}
        />
      );
    }

    return (
      <View key="center" style={[styles.centerButton, centerStyle]} />
    );
  };

  if (Platform.OS === "web") {
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        style={{
          position: "absolute",
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
          pointerEvents: "none",
        }}
        onTouchStart={handleWebTouchStart}
        onTouchMove={handleWebTouchMove}
        onTouchEnd={handleWebTouchEnd}
        onTouchCancel={handleWebTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderCenterButton()}
        {directionBounds.map(renderDirectionButton)}
      </div>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
        },
      ]}
      pointerEvents="box-none"
    >
      {renderCenterButton()}
      {directionBounds.map(renderDirectionButton)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  nativeButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 6,
  },
  centerButton: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 6,
  },
  arrow: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fff",
  },
});
