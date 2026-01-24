import { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import * as Haptics from "@/lib/haptics";
import type { VirtualJoystick } from "@slopcade/shared";

export interface JoystickState {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

export interface VirtualJoystickOverlayProps {
  config: VirtualJoystick;
  viewportRect: { x: number; y: number; width: number; height: number };
  onJoystickMove: (state: JoystickState) => void;
  onJoystickRelease: () => void;
  enableHaptics?: boolean;
}

const DEFAULT_SIZE = 120;
const DEFAULT_KNOB_SIZE = 50;
const DEFAULT_DEAD_ZONE = 0.15;
const DEFAULT_COLOR = "rgba(255, 255, 255, 0.25)";
const DEFAULT_KNOB_COLOR = "rgba(255, 255, 255, 0.6)";
const JOYSTICK_MARGIN = 24;

function calculateJoystickOutput(
  touchX: number,
  touchY: number,
  centerX: number,
  centerY: number,
  maxRadius: number,
  deadZone: number
): JoystickState {
  const dx = touchX - centerX;
  const dy = touchY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const clampedDistance = Math.min(distance, maxRadius);
  const normalizedMagnitude = clampedDistance / maxRadius;

  if (normalizedMagnitude < deadZone) {
    return { x: 0, y: 0, magnitude: 0, angle: 0 };
  }

  const adjustedMagnitude = (normalizedMagnitude - deadZone) / (1 - deadZone);
  const x = Math.cos(angle) * adjustedMagnitude;
  const y = Math.sin(angle) * adjustedMagnitude;

  return { x, y, magnitude: adjustedMagnitude, angle };
}

export function VirtualJoystickOverlay({
  config,
  viewportRect,
  onJoystickMove,
  onJoystickRelease,
  enableHaptics = true,
}: VirtualJoystickOverlayProps) {
  const activeTouchIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const triggerHaptic = useCallback(() => {
    if (enableHaptics) {
      Haptics.impactAsync("Light");
    }
  }, [enableHaptics]);

  const size = config.size ?? DEFAULT_SIZE;
  const knobSize = config.knobSize ?? DEFAULT_KNOB_SIZE;
  const deadZone = config.deadZone ?? DEFAULT_DEAD_ZONE;
  const baseColor = config.color ?? DEFAULT_COLOR;
  const knobColor = config.knobColor ?? DEFAULT_KNOB_COLOR;

  const baseRadius = size / 2;
  const knobRadius = knobSize / 2;
  const maxKnobOffset = baseRadius - knobRadius;

  const centerX = JOYSTICK_MARGIN + baseRadius;
  const centerY = viewportRect.height - JOYSTICK_MARGIN - baseRadius;

  const handleTouchChange = useCallback(
    (
      touchId: number,
      x: number | null,
      y: number | null,
      isEnd: boolean = false
    ) => {
      if (isEnd || x === null || y === null) {
        if (activeTouchIdRef.current === touchId) {
          activeTouchIdRef.current = null;
          setKnobOffset({ x: 0, y: 0 });
          onJoystickRelease();
        }
        return;
      }

      if (
        activeTouchIdRef.current !== null &&
        activeTouchIdRef.current !== touchId
      ) {
        return;
      }

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (activeTouchIdRef.current === null) {
        if (distance > baseRadius) {
          return;
        }
        activeTouchIdRef.current = touchId;
        triggerHaptic();
      }

      const angle = Math.atan2(dy, dx);
      const clampedDistance = Math.min(distance, maxKnobOffset);
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;

      setKnobOffset({ x: knobX, y: knobY });

      const joystickState = calculateJoystickOutput(
        x,
        y,
        centerX,
        centerY,
        maxKnobOffset,
        deadZone
      );
      onJoystickMove(joystickState);
    },
    [
      centerX,
      centerY,
      baseRadius,
      maxKnobOffset,
      deadZone,
      onJoystickMove,
      onJoystickRelease,
      triggerHaptic,
    ]
  );

  const handleNativeTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY, identifier } = event.nativeEvent;
      handleTouchChange(Number(identifier), locationX, locationY);
    },
    [handleTouchChange]
  );

  const handleNativeTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY, identifier } = event.nativeEvent;
      if (Number(identifier) === activeTouchIdRef.current) {
        handleTouchChange(Number(identifier), locationX, locationY);
      }
    },
    [handleTouchChange]
  );

  const handleNativeTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      const { identifier } = event.nativeEvent;
      handleTouchChange(Number(identifier), null, null, true);
    },
    [handleTouchChange]
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
      for (const touch of Array.from(event.touches)) {
        if (touch.identifier === activeTouchIdRef.current) {
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          handleTouchChange(touch.identifier, x, y);
        }
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

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTouchIdRef.current !== 0) return;
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

  const knobStyle = {
    left: baseRadius - knobRadius + knobOffset.x,
    top: baseRadius - knobRadius + knobOffset.y,
    width: knobSize,
    height: knobSize,
    borderRadius: knobRadius,
    backgroundColor: knobColor,
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
      >
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          style={{
            position: "absolute",
            left: centerX - baseRadius,
            top: centerY - baseRadius,
            width: size,
            height: size,
            borderRadius: baseRadius,
            backgroundColor: baseColor,
            border: "2px solid rgba(255, 255, 255, 0.4)",
            pointerEvents: "auto",
            touchAction: "none",
            cursor: "pointer",
          }}
          onTouchStart={handleWebTouchStart}
          onTouchMove={handleWebTouchMove}
          onTouchEnd={handleWebTouchEnd}
          onTouchCancel={handleWebTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              position: "absolute",
              ...knobStyle,
              border: "2px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              transition:
                activeTouchIdRef.current === null
                  ? "all 0.15s ease-out"
                  : "none",
              pointerEvents: "none",
            }}
          />
        </div>
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
      <View
        style={[
          styles.joystickBase,
          {
            left: centerX - baseRadius,
            top: centerY - baseRadius,
            width: size,
            height: size,
            borderRadius: baseRadius,
            backgroundColor: baseColor,
          },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleNativeTouchStart}
        onResponderMove={handleNativeTouchMove}
        onResponderRelease={handleNativeTouchEnd}
        onResponderTerminate={handleNativeTouchEnd}
      >
        <View style={[styles.joystickKnob, knobStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  joystickBase: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  joystickKnob: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
});
