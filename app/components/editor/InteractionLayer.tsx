import { useRef, useCallback, useEffect, useState } from "react";
import { View, StyleSheet, type LayoutChangeEvent } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { useEditor } from "./EditorProvider";

interface Vec2 {
  x: number;
  y: number;
}

interface InteractionLayerProps {
  pixelsPerMeter?: number;
  worldBounds?: { width: number; height: number };
  onEntityHitTest?: (worldPos: Vec2) => string | null;
}

export function InteractionLayer({
  pixelsPerMeter = 50,
  worldBounds = { width: 20, height: 12 },
  onEntityHitTest,
}: InteractionLayerProps) {
  const {
    mode,
    selectedEntityId,
    selectEntity,
    moveEntity,
    scaleEntity,
    document,
    setCamera,
  } = useEditor();

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const dragStartPosRef = useRef<Vec2 | null>(null);
  const dragStartEntityPosRef = useRef<Vec2 | null>(null);
  const initialScaleRef = useRef<number>(1);

  const cameraX = useSharedValue(worldBounds.width / 2);
  const cameraY = useSharedValue(worldBounds.height / 2);
  const cameraZoom = useSharedValue(document.camera?.zoom ?? 1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize({ width, height });
  }, []);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Vec2 => {
      const centerX = viewportSize.width / 2;
      const centerY = viewportSize.height / 2;
      const zoom = cameraZoom.value;

      const worldX = cameraX.value + (screenX - centerX) / (pixelsPerMeter * zoom);
      const worldY = cameraY.value + (screenY - centerY) / (pixelsPerMeter * zoom);

      return { x: worldX, y: worldY };
    },
    [viewportSize, pixelsPerMeter, cameraX, cameraY, cameraZoom]
  );

  const findEntityAtPoint = useCallback(
    (worldPos: Vec2): string | null => {
      if (onEntityHitTest) {
        return onEntityHitTest(worldPos);
      }

      for (let i = document.entities.length - 1; i >= 0; i--) {
        const entity = document.entities[i];
        const ex = entity.transform.x;
        const ey = entity.transform.y;
        if (!entity.template) continue;
        const template = document.templates[entity.template];
        if (!template) continue;

        const physics = template.physics;
        let halfWidth = 0.5;
        let halfHeight = 0.5;
        if (physics?.shape === "box") {
          halfWidth = (physics.width ?? 1) / 2;
          halfHeight = (physics.height ?? 1) / 2;
        } else if (physics?.shape === "circle") {
          halfWidth = physics.radius ?? 0.5;
          halfHeight = physics.radius ?? 0.5;
        }

        if (
          worldPos.x >= ex - halfWidth &&
          worldPos.x <= ex + halfWidth &&
          worldPos.y >= ey - halfHeight &&
          worldPos.y <= ey + halfHeight
        ) {
          return entity.id;
        }
      }

      return null;
    },
    [document.entities, document.templates, onEntityHitTest]
  );

  const handleTap = useCallback(
    (screenX: number, screenY: number) => {
      const worldPos = screenToWorld(screenX, screenY);
      const entityId = findEntityAtPoint(worldPos);
      selectEntity(entityId);
    },
    [screenToWorld, findEntityAtPoint, selectEntity]
  );

  const handleDragStart = useCallback(
    (screenX: number, screenY: number) => {
      if (!selectedEntityId) return;

      const entity = document.entities.find((e) => e.id === selectedEntityId);
      if (!entity) return;

      dragStartPosRef.current = screenToWorld(screenX, screenY);
      dragStartEntityPosRef.current = {
        x: entity.transform.x,
        y: entity.transform.y,
      };
    },
    [selectedEntityId, document.entities, screenToWorld]
  );

  const handleDragUpdate = useCallback(
    (screenX: number, screenY: number) => {
      if (!selectedEntityId || !dragStartPosRef.current || !dragStartEntityPosRef.current) {
        return;
      }

      const currentWorldPos = screenToWorld(screenX, screenY);
      const deltaX = currentWorldPos.x - dragStartPosRef.current.x;
      const deltaY = currentWorldPos.y - dragStartPosRef.current.y;

      const newX = dragStartEntityPosRef.current.x + deltaX;
      const newY = dragStartEntityPosRef.current.y + deltaY;

      moveEntity(selectedEntityId, newX, newY);
    },
    [selectedEntityId, screenToWorld, moveEntity]
  );

  const handleDragEnd = useCallback(() => {
    dragStartPosRef.current = null;
    dragStartEntityPosRef.current = null;
  }, []);

  const handlePinchStart = useCallback(() => {
    if (!selectedEntityId) return;

    const entity = document.entities.find((e) => e.id === selectedEntityId);
    if (!entity) return;

    initialScaleRef.current = entity.transform.scaleX ?? 1;
  }, [selectedEntityId, document.entities]);

  const handlePinchUpdate = useCallback(
    (pinchScale: number) => {
      if (!selectedEntityId) return;

      const newScale = Math.max(0.25, Math.min(4, initialScaleRef.current * pinchScale));
      scaleEntity(selectedEntityId, newScale);
    },
    [selectedEntityId, scaleEntity]
  );

  const handleCameraPan = useCallback(
    (deltaX: number, deltaY: number) => {
      const zoom = cameraZoom.value;
      cameraX.value -= deltaX / (pixelsPerMeter * zoom);
      cameraY.value -= deltaY / (pixelsPerMeter * zoom);
      setCamera({ x: cameraX.value, y: cameraY.value });
    },
    [cameraX, cameraY, cameraZoom, pixelsPerMeter, setCamera]
  );

  const handleCameraZoom = useCallback(
    (zoomDelta: number) => {
      const newZoom = Math.max(0.5, Math.min(3, cameraZoom.value * zoomDelta));
      cameraZoom.value = newZoom;
      setCamera(undefined, newZoom);
    },
    [cameraZoom, setCamera]
  );

  const tapGesture = Gesture.Tap().onEnd((event) => {
    runOnJS(handleTap)(event.x, event.y);
  });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart((event) => {
      runOnJS(handleDragStart)(event.x, event.y);
    })
    .onUpdate((event) => {
      if (selectedEntityId) {
        runOnJS(handleDragUpdate)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd(() => {
      runOnJS(handleDragEnd)();
    });

  const cameraPanGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((event) => {
      runOnJS(handleCameraPan)(event.translationX * 0.1, event.translationY * 0.1);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      if (selectedEntityId) {
        runOnJS(handlePinchStart)();
      }
    })
    .onUpdate((event) => {
      if (selectedEntityId) {
        runOnJS(handlePinchUpdate)(event.scale);
      } else {
        runOnJS(handleCameraZoom)(event.scale > 1 ? 1.01 : 0.99);
      }
    });

  const composedGesture = Gesture.Simultaneous(
    tapGesture,
    Gesture.Exclusive(panGesture, cameraPanGesture),
    pinchGesture
  );

  if (mode === "playtest") {
    return null;
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={StyleSheet.absoluteFill} onLayout={handleLayout} />
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
