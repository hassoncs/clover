import { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import type { TapZone, TapZoneButton } from "@slopcade/shared";

export interface TapZoneOverlayProps {
  zones: TapZone[];
  viewportRect: { x: number; y: number; width: number; height: number };
  debug?: boolean;
  onZonePress: (button: TapZoneButton, pressed: boolean) => void;
}

interface ZoneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_DEBUG_COLORS: Record<TapZoneButton, string> = {
  left: "rgba(255, 0, 0, 0.3)",
  right: "rgba(0, 255, 0, 0.3)",
  up: "rgba(0, 0, 255, 0.3)",
  down: "rgba(255, 255, 0, 0.3)",
  jump: "rgba(255, 0, 255, 0.3)",
  action: "rgba(0, 255, 255, 0.3)",
};

function calculateZoneBounds(
  zone: TapZone,
  viewportWidth: number,
  viewportHeight: number
): ZoneBounds {
  const { edge, size } = zone;

  switch (edge) {
    case "left":
      return {
        left: 0,
        top: 0,
        width: viewportWidth * size,
        height: viewportHeight,
      };
    case "right":
      return {
        left: viewportWidth * (1 - size),
        top: 0,
        width: viewportWidth * size,
        height: viewportHeight,
      };
    case "top":
      return {
        left: 0,
        top: 0,
        width: viewportWidth,
        height: viewportHeight * size,
      };
    case "bottom":
      return {
        left: 0,
        top: viewportHeight * (1 - size),
        width: viewportWidth,
        height: viewportHeight * size,
      };
  }
}

function findZoneAtPoint(
  x: number,
  y: number,
  zones: TapZone[],
  viewportWidth: number,
  viewportHeight: number
): TapZone | null {
  for (const zone of zones) {
    const bounds = calculateZoneBounds(zone, viewportWidth, viewportHeight);
    if (
      x >= bounds.left &&
      x <= bounds.left + bounds.width &&
      y >= bounds.top &&
      y <= bounds.top + bounds.height
    ) {
      return zone;
    }
  }
  return null;
}

export function TapZoneOverlay({
  zones,
  viewportRect,
  debug = false,
  onZonePress,
}: TapZoneOverlayProps) {
  const activeTouchesRef = useRef<Map<number, TapZoneButton>>(new Map());

  const handleTouchChange = useCallback(
    (
      touchId: number,
      x: number | null,
      y: number | null,
      isEnd: boolean = false
    ) => {
      const prevButton = activeTouchesRef.current.get(touchId);

      if (isEnd || x === null || y === null) {
        if (prevButton) {
          activeTouchesRef.current.delete(touchId);
          const stillPressed = Array.from(
            activeTouchesRef.current.values()
          ).includes(prevButton);
          if (!stillPressed) {
            onZonePress(prevButton, false);
          }
        }
        return;
      }

      const zone = findZoneAtPoint(
        x,
        y,
        zones,
        viewportRect.width,
        viewportRect.height
      );
      const newButton = zone?.button ?? null;

      if (prevButton !== newButton) {
        if (prevButton) {
          activeTouchesRef.current.delete(touchId);
          const stillPressed = Array.from(
            activeTouchesRef.current.values()
          ).includes(prevButton);
          if (!stillPressed) {
            onZonePress(prevButton, false);
          }
        }
        if (newButton) {
          activeTouchesRef.current.set(touchId, newButton);
          onZonePress(newButton, true);
        }
      }
    },
    [zones, viewportRect.width, viewportRect.height, onZonePress]
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
      const touches = event.nativeEvent.touches;
      for (const touch of touches) {
        handleTouchChange(Number(touch.identifier), touch.locationX, touch.locationY);
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

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.buttons !== 1) return;
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

  const zoneBounds = zones.map((zone) => ({
    zone,
    bounds: calculateZoneBounds(zone, viewportRect.width, viewportRect.height),
  }));

  const debugOverlays = debug
    ? zoneBounds.map(({ zone, bounds }) => (
        <View
          key={zone.id}
          style={[
            styles.debugZone,
            {
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
              backgroundColor:
                zone.debugColor ?? DEFAULT_DEBUG_COLORS[zone.button],
            },
          ]}
          pointerEvents="none"
        />
      ))
    : null;

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
          touchAction: "none",
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
        {debugOverlays}
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
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleNativeTouchStart}
      onResponderMove={handleNativeTouchMove}
      onResponderRelease={handleNativeTouchEnd}
      onResponderTerminate={handleNativeTouchEnd}
    >
      {debugOverlays}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  debugZone: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderStyle: "dashed",
  },
});
