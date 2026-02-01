import { useRef, useCallback, useEffect } from "react";
import { Platform, type GestureResponderEvent } from "react-native";
import type { InputState } from "../BehaviorContext";
import type { CameraSystem } from "../CameraSystem";
import type { LoadedGame } from "../GameLoader";
import type { Physics2D } from "../../physics2d";
import type { ViewportSystem } from "../ViewportSystem";
import type { TiltConfig } from "@slopcade/shared";
import { useTiltInput } from "./useTiltInput";

function findEntityAtPoint(worldX: number, worldY: number, game: LoadedGame, physics: Physics2D | null): string | undefined {
  if (!physics) return undefined;
  
  const bodyId = physics.queryPoint({ x: worldX, y: worldY });
  if (!bodyId) return undefined;
  
  const entityId = physics.getEntityId(bodyId);
  if (entityId && game.entityManager.getEntity(entityId)) {
    return entityId;
  }
  
  return undefined;
}

interface UseGameInputProps {
  cameraRef: React.RefObject<CameraSystem | null>;
  gameRef: React.RefObject<LoadedGame | null>;
  physicsRef: React.RefObject<Physics2D | null>;
  viewportSystemRef?: React.RefObject<ViewportSystem | null>;
  tiltConfig?: TiltConfig;
}

export function useGameInput({ cameraRef, gameRef, physicsRef, viewportSystemRef, tiltConfig }: UseGameInputProps) {
  const inputRef = useRef<InputState>({});
  const dragStartRef = useRef<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    targetEntityId?: string;
  } | null>(null);
  const buttonsRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false,
  });

  const handleTiltUpdate = useCallback((tilt: { x: number; y: number }) => {
    inputRef.current.tilt = tilt;
  }, []);

  useTiltInput(
    {
      enabled: tiltConfig?.enabled ?? false,
      sensitivity: tiltConfig?.sensitivity,
      updateInterval: tiltConfig?.updateInterval,
    },
    handleTiltUpdate
  );

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const game = gameRef.current;
    const viewportSystem = viewportSystemRef?.current;
    if (!camera || !game) return;

    const { locationX: x, locationY: y } = event.nativeEvent;

    let worldPos: { x: number; y: number };
    if (viewportSystem) {
      const cameraPos = camera.getPosition();
      const cameraZoom = camera.getZoom();
      worldPos = viewportSystem.viewportToWorld(x, y, cameraPos, cameraZoom);
    } else {
      worldPos = camera.screenToWorld(x, y);
    }

    const targetEntityId = findEntityAtPoint(worldPos.x, worldPos.y, game, physicsRef.current);

    dragStartRef.current = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetEntityId,
    };

    // Set continuous touch tracking for behaviors like rotate_toward
    inputRef.current.touch = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
    };

    inputRef.current.drag = {
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      startWorldX: worldPos.x,
      startWorldY: worldPos.y,
      currentWorldX: worldPos.x,
      currentWorldY: worldPos.y,
      targetEntityId,
    };
  }, [cameraRef, gameRef, physicsRef, viewportSystemRef]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const viewportSystem = viewportSystemRef?.current;
    const dragStart = dragStartRef.current;
    if (!camera || !dragStart) return;

    const { locationX: x, locationY: y } = event.nativeEvent;

    let worldPos: { x: number; y: number };
    if (viewportSystem) {
      const cameraPos = camera.getPosition();
      const cameraZoom = camera.getZoom();
      worldPos = viewportSystem.viewportToWorld(x, y, cameraPos, cameraZoom);
    } else {
      worldPos = camera.screenToWorld(x, y);
    }

    inputRef.current.drag = {
      startX: dragStart.x,
      startY: dragStart.y,
      currentX: x,
      currentY: y,
      startWorldX: dragStart.worldX,
      startWorldY: dragStart.worldY,
      currentWorldX: worldPos.x,
      currentWorldY: worldPos.y,
      targetEntityId: dragStart.targetEntityId,
    };

    // Update continuous touch tracking
    inputRef.current.touch = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
    };
  }, [cameraRef, viewportSystemRef]);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const viewportSystem = viewportSystemRef?.current;
    const dragStart = dragStartRef.current;
    if (!camera) return;

    const { locationX: x, locationY: y } = event.nativeEvent;

    let worldPos: { x: number; y: number };
    if (viewportSystem) {
      const cameraPos = camera.getPosition();
      const cameraZoom = camera.getZoom();
      worldPos = viewportSystem.viewportToWorld(x, y, cameraPos, cameraZoom);
    } else {
      worldPos = camera.screenToWorld(x, y);
    }

    inputRef.current.tap = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetEntityId: dragStart?.targetEntityId,
    };

    if (dragStart) {
      const dx = worldPos.x - dragStart.worldX;
      const dy = worldPos.y - dragStart.worldY;
      const VELOCITY_SCALE = 0.1;
      inputRef.current.dragEnd = {
        velocityX: (x - dragStart.x) * VELOCITY_SCALE,
        velocityY: (y - dragStart.y) * VELOCITY_SCALE,
        worldVelocityX: dx * VELOCITY_SCALE,
        worldVelocityY: dy * VELOCITY_SCALE,
      };
    }

    dragStartRef.current = null;
    inputRef.current.drag = undefined;
    inputRef.current.touch = undefined;
  }, [cameraRef, viewportSystemRef]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          buttonsRef.current.left = true;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          buttonsRef.current.right = true;
          break;
        case "ArrowUp":
        case "w":
        case "W":
          buttonsRef.current.up = true;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          buttonsRef.current.down = true;
          break;
        case " ":
          buttonsRef.current.jump = true;
          break;
      }
      inputRef.current.buttons = { ...buttonsRef.current };
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  return {
    inputRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
