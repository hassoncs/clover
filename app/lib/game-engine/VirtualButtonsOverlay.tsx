import { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import type { VirtualButton, VirtualButtonType } from "@slopcade/shared";

export interface VirtualButtonsOverlayProps {
  buttons: VirtualButton[];
  viewportRect: { x: number; y: number; width: number; height: number };
  onButtonPress: (button: VirtualButtonType, pressed: boolean) => void;
}

interface ButtonBounds {
  id: string;
  button: VirtualButtonType;
  centerX: number;
  centerY: number;
  radius: number;
  label: string;
  color: string;
  activeColor: string;
}

const DEFAULT_SIZE = 72;
const DEFAULT_COLOR = "rgba(255, 255, 255, 0.4)";
const DEFAULT_ACTIVE_COLOR = "rgba(255, 255, 255, 0.8)";
const BUTTON_MARGIN = 20;
const BUTTON_HORIZONTAL_OFFSET = 70;

function isPointInCircle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number
): boolean {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

export function VirtualButtonsOverlay({
  buttons,
  viewportRect,
  onButtonPress,
}: VirtualButtonsOverlayProps) {
  const activeTouchesRef = useRef<Map<number, VirtualButtonType>>(new Map());
  const [activeButtons, setActiveButtons] = useState<Set<VirtualButtonType>>(
    new Set()
  );

  const buttonBounds = buttons.map((btn, index): ButtonBounds => {
    const size = btn.size ?? DEFAULT_SIZE;
    const radius = size / 2;
    const isRightButton = index === 0;
    const centerX = isRightButton
      ? viewportRect.width - BUTTON_MARGIN - radius
      : viewportRect.width - BUTTON_MARGIN - radius - BUTTON_HORIZONTAL_OFFSET;
    const centerY = isRightButton
      ? viewportRect.height - BUTTON_MARGIN - radius - 30
      : viewportRect.height - BUTTON_MARGIN - radius;

    return {
      id: btn.id,
      button: btn.button,
      centerX,
      centerY,
      radius,
      label: btn.label ?? (btn.button === "jump" ? "A" : "B"),
      color: btn.color ?? DEFAULT_COLOR,
      activeColor: btn.activeColor ?? DEFAULT_ACTIVE_COLOR,
    };
  });

  const findButtonAtPoint = useCallback(
    (x: number, y: number): VirtualButtonType | null => {
      for (const btn of buttonBounds) {
        if (isPointInCircle(x, y, btn.centerX, btn.centerY, btn.radius)) {
          return btn.button;
        }
      }
      return null;
    },
    [buttonBounds]
  );

  const updateActiveButtons = useCallback(() => {
    const newActive = new Set(activeTouchesRef.current.values());
    setActiveButtons(newActive);
  }, []);

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
            onButtonPress(prevButton, false);
          }
          updateActiveButtons();
        }
        return;
      }

      const newButton = findButtonAtPoint(x, y);

      if (prevButton !== newButton) {
        if (prevButton) {
          activeTouchesRef.current.delete(touchId);
          const stillPressed = Array.from(
            activeTouchesRef.current.values()
          ).includes(prevButton);
          if (!stillPressed) {
            onButtonPress(prevButton, false);
          }
        }
        if (newButton) {
          activeTouchesRef.current.set(touchId, newButton);
          onButtonPress(newButton, true);
        }
        updateActiveButtons();
      }
    },
    [findButtonAtPoint, onButtonPress, updateActiveButtons]
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

  const renderButton = (btn: ButtonBounds) => {
    const isActive = activeButtons.has(btn.button);
    const buttonStyle = {
      left: btn.centerX - btn.radius,
      top: btn.centerY - btn.radius,
      width: btn.radius * 2,
      height: btn.radius * 2,
      borderRadius: btn.radius,
      backgroundColor: isActive ? btn.activeColor : btn.color,
    };

    if (Platform.OS === "web") {
      return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          key={btn.id}
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
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow: isActive
              ? "0 0 10px rgba(255, 255, 255, 0.5)"
              : "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
          onTouchStart={handleWebTouchStart}
          onTouchMove={handleWebTouchMove}
          onTouchEnd={handleWebTouchEnd}
          onTouchCancel={handleWebTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Text style={[styles.buttonLabel, { fontSize: btn.radius * 0.6 }]}>
            {btn.label}
          </Text>
        </div>
      );
    }

    return (
      <Pressable
        key={btn.id}
        style={[styles.nativeButton, buttonStyle]}
        onPressIn={() => {
          onButtonPress(btn.button, true);
          setActiveButtons((prev) => new Set([...prev, btn.button]));
        }}
        onPressOut={() => {
          onButtonPress(btn.button, false);
          setActiveButtons((prev) => {
            const next = new Set(prev);
            next.delete(btn.button);
            return next;
          });
        }}
      >
        <Text style={[styles.buttonLabel, { fontSize: btn.radius * 0.6 }]}>
          {btn.label}
        </Text>
      </Pressable>
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
      >
        {buttonBounds.map(renderButton)}
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
      {buttonBounds.map(renderButton)}
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
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
