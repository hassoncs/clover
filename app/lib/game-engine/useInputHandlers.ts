import { useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import type { GestureResponderEvent } from "react-native";
import type { TapZoneButton, VirtualButtonType, DPadDirection } from "@slopcade/shared";
import type { GodotBridge } from "../godot/types";
import type { CameraSystem } from "./CameraSystem";
import type { ViewportSystem, ViewportRect } from "./ViewportSystem";
import type { JoystickState } from "./VirtualJoystickOverlay";
import type { LoadedGame } from "./GameLoader";
import type { GameEventQueue } from "./GameEventQueue";

export interface InputHandlerRefs {
  bridgeRef: React.RefObject<GodotBridge | null>;
  gameRef: React.RefObject<LoadedGame | null>;
  cameraRef: React.RefObject<CameraSystem | null>;
  viewportSystemRef: React.RefObject<ViewportSystem | null>;
  eventQueueRef: React.RefObject<GameEventQueue>;
  inputRef: React.RefObject<Record<string, unknown>>;
}

export function useInputHandlers(
  refs: InputHandlerRefs,
  viewportRect: ViewportRect,
) {
  const { bridgeRef, gameRef, cameraRef, viewportSystemRef, eventQueueRef, inputRef } = refs;

  const buttonsRef = useRef<Record<string, boolean>>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false,
  });
  const joystickRef = useRef<JoystickState>({
    x: 0,
    y: 0,
    magnitude: 0,
    angle: 0,
  });
  const lastKeyEventRef = useRef<{
    key: string;
    code: string;
    type: "keydown" | "keyup";
    timeStamp: number;
  } | null>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    targetEntityId?: string;
  } | null>(null);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const camera = cameraRef.current;
    const vs = viewportSystemRef.current;
    if (!camera) return { x: 0, y: 0 };

    if (vs) {
      return vs.viewportToWorld(
        screenX,
        screenY,
        camera.getPosition(),
        camera.getZoom()
      );
    }
    return camera.screenToWorld(screenX, screenY);
  }, [cameraRef, viewportSystemRef]);

  const sharedHandleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      lastKeyEventRef.current?.key === e.key &&
      lastKeyEventRef.current?.code === e.code &&
      lastKeyEventRef.current?.type === "keydown" &&
      Math.abs(e.timeStamp - lastKeyEventRef.current.timeStamp) < 20
    ) {
      return;
    }
    lastKeyEventRef.current = {
      key: e.key,
      code: e.code,
      type: "keydown",
      timeStamp: e.timeStamp,
    };

    let changed = false;
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        if (!buttonsRef.current.left) {
          buttonsRef.current.left = true;
          changed = true;
        }
        break;
      case "ArrowRight":
      case "d":
      case "D":
        if (!buttonsRef.current.right) {
          buttonsRef.current.right = true;
          changed = true;
        }
        break;
      case "ArrowUp":
      case "w":
      case "W":
        if (!buttonsRef.current.up) {
          buttonsRef.current.up = true;
          changed = true;
        }
        break;
      case "ArrowDown":
      case "s":
      case "S":
        if (!buttonsRef.current.down) {
          buttonsRef.current.down = true;
          changed = true;
        }
        break;
      case " ": {
        if (!buttonsRef.current.jump) {
          buttonsRef.current.jump = true;
          changed = true;
        }
        const game = gameRef.current;
        if (game) {
          const cannon = game.entityManager
            .getActiveEntities()
            .find((entity) => game.entityManager.hasTag(entity.id, "cannon"));
          if (cannon) {
            const angle = cannon.transform.angle;
            const distance = 10;
            const targetX = cannon.transform.x + Math.cos(angle) * distance;
            const targetY = cannon.transform.y + Math.sin(angle) * distance;

            eventQueueRef.current.push({
              type: 'tap',
              x: 0,
              y: 0,
              worldX: targetX,
              worldY: targetY,
            });
            eventQueueRef.current.push({
              type: 'drag_end',
              velocityX: 0,
              velocityY: 0,
              worldVelocityX: 0,
              worldVelocityY: 0,
            });
          }
        }
        break;
      }
    }
    if (changed) {
      inputRef.current.buttons = { ...buttonsRef.current };
    }
  }, [gameRef, eventQueueRef, inputRef]);

  const sharedHandleKeyUp = useCallback((e: KeyboardEvent) => {
    if (
      lastKeyEventRef.current?.key === e.key &&
      lastKeyEventRef.current?.code === e.code &&
      lastKeyEventRef.current?.type === "keyup" &&
      Math.abs(e.timeStamp - lastKeyEventRef.current.timeStamp) < 20
    ) {
      return;
    }
    lastKeyEventRef.current = {
      key: e.key,
      code: e.code,
      type: "keyup",
      timeStamp: e.timeStamp,
    };

    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        buttonsRef.current.left = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        buttonsRef.current.right = false;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        buttonsRef.current.up = false;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        buttonsRef.current.down = false;
        break;
      case " ":
        buttonsRef.current.jump = false;
        break;
    }
    inputRef.current.buttons = { ...buttonsRef.current };
  }, [inputRef]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    window.addEventListener("keydown", sharedHandleKeyDown, { capture: true });
    window.addEventListener("keyup", sharedHandleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", sharedHandleKeyDown, {
        capture: true,
      });
      window.removeEventListener("keyup", sharedHandleKeyUp, { capture: true });
    };
  }, [sharedHandleKeyDown, sharedHandleKeyUp]);

  const mouseMoveCountRef = useRef(0);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      mouseMoveCountRef.current++;

      const viewportX = e.clientX;
      const viewportY = e.clientY;

      if (
        viewportX < 0 ||
        viewportX > viewportRect.width ||
        viewportY < 0 ||
        viewportY > viewportRect.height
      ) {
        inputRef.current.mouse = undefined;
        return;
      }

      const camera = cameraRef.current;
      const viewportSystem = viewportSystemRef.current;
      if (!camera || !viewportSystem) {
        return;
      }

      const world = viewportSystem.viewportToWorld(
        viewportX,
        viewportY,
        camera.getPosition(),
        camera.getZoom()
      );

      inputRef.current.mouse = {
        x: viewportX,
        y: viewportY,
        worldX: world.x,
        worldY: world.y,
      };
    },
    [viewportRect.width, viewportRect.height, cameraRef, viewportSystemRef, inputRef]
  );

  const handleMouseLeave = useCallback(() => {
    inputRef.current.mouse = undefined;
  }, [inputRef]);

  const handleClick = useCallback(
    async (e: MouseEvent) => {
      const viewportX = e.clientX;
      const viewportY = e.clientY;

      if (
        viewportX < 0 ||
        viewportX > viewportRect.width ||
        viewportY < 0 ||
        viewportY > viewportRect.height
      ) {
        return;
      }

      const camera = cameraRef.current;
      const viewportSystem = viewportSystemRef.current;
      const bridge = bridgeRef.current;
      if (!camera || !viewportSystem) return;

      const world = viewportSystem.viewportToWorld(
        viewportX,
        viewportY,
        camera.getPosition(),
        camera.getZoom()
      );

      let targetEntityId: string | undefined;
      if (bridge) {
        const entityId = await bridge.queryPointEntity(world);
        if (entityId) {
          targetEntityId = entityId;
        }
      }

      eventQueueRef.current.push({
        type: 'tap',
        x: viewportX,
        y: viewportY,
        worldX: world.x,
        worldY: world.y,
        targetEntityId,
      });
    },
    [viewportRect.width, viewportRect.height, bridgeRef, cameraRef, viewportSystemRef, eventQueueRef]
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      if (!bridge) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      const existingTargetEntityId = dragStartRef.current?.targetEntityId;

      dragStartRef.current = { x, y, worldX: world.x, worldY: world.y, targetEntityId: existingTargetEntityId };

      inputRef.current = {
        ...inputRef.current,
        drag: {
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          startWorldX: world.x,
          startWorldY: world.y,
          currentWorldX: world.x,
          currentWorldY: world.y,
          targetEntityId: existingTargetEntityId,
        },
      };

      bridge.sendInput("drag_start", { x: world.x, y: world.y });
    },
    [screenToWorld, bridgeRef, inputRef]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      const dragStart = dragStartRef.current;
      if (!bridge || !dragStart) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      inputRef.current = {
        ...inputRef.current,
        drag: {
          startX: dragStart.x,
          startY: dragStart.y,
          currentX: x,
          currentY: y,
          startWorldX: dragStart.worldX,
          startWorldY: dragStart.worldY,
          currentWorldX: world.x,
          currentWorldY: world.y,
          targetEntityId: dragStart.targetEntityId,
        },
      };

      bridge.sendInput("drag_move", { x: world.x, y: world.y });
    },
    [screenToWorld, bridgeRef, inputRef]
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      const dragStart = dragStartRef.current;
      if (!bridge) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      eventQueueRef.current.push({
        type: 'tap',
        x,
        y,
        worldX: world.x,
        worldY: world.y,
      });

      if (dragStart) {
        const VELOCITY_SCALE = 0.1;
        eventQueueRef.current.push({
          type: 'drag_end',
          velocityX: (x - dragStart.x) * VELOCITY_SCALE,
          velocityY: (y - dragStart.y) * VELOCITY_SCALE,
          worldVelocityX: (world.x - dragStart.worldX) * VELOCITY_SCALE,
          worldVelocityY: (world.y - dragStart.worldY) * VELOCITY_SCALE,
        });
      }

      bridge.sendInput("tap", { x: world.x, y: world.y });
      bridge.sendInput("drag_end", { x: world.x, y: world.y });

      dragStartRef.current = null;
      inputRef.current.drag = undefined;
    },
    [screenToWorld, bridgeRef, eventQueueRef, inputRef]
  );

  const handleZonePress = useCallback(
    (button: TapZoneButton, pressed: boolean) => {
      buttonsRef.current[button] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [inputRef]
  );

  const handleVirtualButtonPress = useCallback(
    (button: VirtualButtonType, pressed: boolean) => {
      buttonsRef.current[button] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [inputRef]
  );

  const handleJoystickMove = useCallback((state: JoystickState) => {
    joystickRef.current = state;

    const threshold = 0.5;
    buttonsRef.current.left = state.x < -threshold;
    buttonsRef.current.right = state.x > threshold;
    buttonsRef.current.up = state.y < -threshold;
    buttonsRef.current.down = state.y > threshold;

    inputRef.current.buttons = { ...buttonsRef.current };
    inputRef.current.joystick = { ...joystickRef.current };
  }, [inputRef]);

  const handleJoystickRelease = useCallback(() => {
    joystickRef.current = { x: 0, y: 0, magnitude: 0, angle: 0 };

    buttonsRef.current.left = false;
    buttonsRef.current.right = false;
    buttonsRef.current.up = false;
    buttonsRef.current.down = false;

    inputRef.current.buttons = { ...buttonsRef.current };
    inputRef.current.joystick = { ...joystickRef.current };
  }, [inputRef]);

  const handleDPadPress = useCallback(
    (direction: DPadDirection, pressed: boolean) => {
      buttonsRef.current[direction] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [inputRef]
  );

  return {
    buttonsRef,
    dragStartRef,
    sharedHandleKeyDown,
    sharedHandleKeyUp,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleZonePress,
    handleVirtualButtonPress,
    handleJoystickMove,
    handleJoystickRelease,
    handleDPadPress,
  };
}
