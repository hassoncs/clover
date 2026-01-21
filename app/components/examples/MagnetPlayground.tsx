import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
  Group,
} from "@shopify/react-native-skia";
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  useForceDrag,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const MAGNET_RADIUS = 0.8;
const METAL_RADIUS = 0.3;
const METAL_COUNT = 12;
const MAGNET_STRENGTH = 50;
const REPULSION_STRENGTH = 30;

interface MagnetState {
  x: number;
  y: number;
  polarity: "attract" | "repel";
}

interface MetalObjectState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

function MagnetPlaygroundCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const magnetIdRef = useRef<BodyId | null>(null);
  const metalIdsRef = useRef<BodyId[]>([]);
  
  const [magnet, setMagnet] = useState<MagnetState>({
    x: 0,
    y: 0,
    polarity: "attract",
  });
  const [metalObjects, setMetalObjects] = useState<MetalObjectState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dragTarget, setDragTarget] = useState<{ x: number; y: number } | null>(null);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const togglePolarity = useCallback(() => {
    setMagnet((prev) => ({
      ...prev,
      polarity: prev.polarity === "attract" ? "repel" : "attract",
    }));
  }, []);

  const applyMagneticForces = useCallback((physics: Physics2D) => {
    if (!magnetIdRef.current) return;

    const magnetPos = physics.getTransform(magnetIdRef.current).position;
    const isAttract = magnet.polarity === "attract";
    const strength = isAttract ? MAGNET_STRENGTH : -REPULSION_STRENGTH;

    for (const metalId of metalIdsRef.current) {
      const metalPos = physics.getTransform(metalId).position;
      const dx = magnetPos.x - metalPos.x;
      const dy = magnetPos.y - metalPos.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Only apply force within range
      if (dist > 0.5 && dist < 6) {
        // Inverse square law with cutoff
        const forceMag = strength / (distSq + 1);
        const forceX = (dx / dist) * forceMag;
        const forceY = (dy / dist) * forceMag;

        physics.applyForceToCenter(metalId, vec2(forceX, forceY));
      }
    }
  }, [magnet.polarity]);

  const handleTouchStart = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;

    // Check if touching near magnet
    const physics = physicsRef.current;
    if (!physics || !magnetIdRef.current) return;

    const magnetPos = physics.getTransform(magnetIdRef.current).position;
    const dx = worldX - magnetPos.x;
    const dy = worldY - magnetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      setDragTarget({ x: worldX, y: worldY });
    } else {
      dragHandlers.onTouchStart(event);
    }
  }, [dragHandlers]);

  const handleTouchMove = useCallback((event: any) => {
    if (dragTarget) {
      const { locationX, locationY } = event.nativeEvent;
      const worldX = locationX / PIXELS_PER_METER;
      const worldY = locationY / PIXELS_PER_METER;
      setDragTarget({ x: worldX, y: worldY });
    } else {
      dragHandlers.onTouchMove(event);
    }
  }, [dragTarget, dragHandlers]);

  const handleTouchEnd = useCallback(() => {
    setDragTarget(null);
    dragHandlers.onTouchEnd({} as any);
  }, [dragHandlers]);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      // Create magnet (controlled object)
      const magnetId = physics.createBody({
        type: "kinematic",
        position: vec2(worldWidth / 2, worldHeight / 2),
      });
      physics.addFixture(magnetId, {
        shape: { type: "circle", radius: MAGNET_RADIUS },
        density: 1,
        restitution: 0.5,
      });
      magnetIdRef.current = magnetId;
      setMagnet({ x: worldWidth / 2, y: worldHeight / 2, polarity: "attract" });

      // Create metal objects
      const newMetalIds: BodyId[] = [];
      const newMetalObjects: MetalObjectState[] = [];

      for (let i = 0; i < METAL_COUNT; i++) {
        const angle = (i / METAL_COUNT) * Math.PI * 2;
        const dist = 3 + Math.random() * 2;
        const x = worldWidth / 2 + Math.cos(angle) * dist;
        const y = worldHeight / 2 + Math.sin(angle) * dist;

        const metalId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
          linearDamping: 0.5,
          angularDamping: 0.5,
        });

        physics.addFixture(metalId, {
          shape: { type: "circle", radius: METAL_RADIUS },
          density: 2,
          friction: 0.3,
          restitution: 0.6,
        });

        newMetalIds.push(metalId);
        newMetalObjects.push({
          id: metalId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
          angle: 0,
        });
      }

      metalIdsRef.current = newMetalIds;
      setMetalObjects(newMetalObjects);

      // Create container walls
      const wallPositions = [
        { x: worldWidth / 2, y: worldHeight - 1, w: worldWidth, h: 1 },
        { x: 1, y: worldHeight / 2, w: 1, h: worldHeight },
        { x: worldWidth - 1, y: worldHeight / 2, w: 1, h: worldHeight },
      ];

      for (const wall of wallPositions) {
        const wallId = physics.createBody({
          type: "static",
          position: vec2(wall.x, wall.y),
        });
        physics.addFixture(wallId, {
          shape: { type: "box", halfWidth: wall.w / 2, halfHeight: wall.h / 2 },
          density: 0,
          friction: 0.5,
          restitution: 0.8,
        });
      }

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      magnetIdRef.current = null;
      metalIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !magnetIdRef.current) return;

    dragHandlers.applyDragForces();

    // Move magnet if dragging
    if (dragTarget) {
      physics.setTransform(magnetIdRef.current, {
        position: vec2(dragTarget.x, dragTarget.y),
        angle: 0,
      });
    }

    // Apply magnetic forces
    applyMagneticForces(physics);

    physics.step(dt, 8, 3);

    const magnetTransform = physics.getTransform(magnetIdRef.current);
    setMagnet((prev) => ({
      ...prev,
      x: magnetTransform.position.x * PIXELS_PER_METER,
      y: magnetTransform.position.y * PIXELS_PER_METER,
    }));

    const updatedMetals = metalIdsRef.current.map((id) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setMetalObjects(updatedMetals);
  }, [dragHandlers, dragTarget, applyMagneticForces]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const magnetColor = magnet.polarity === "attract" ? "#e74c3c" : "#3498db";
  const magnetRingColor = magnet.polarity === "attract" ? "#c0392b" : "#2980b9";

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.instructions}>
          Drag the magnet | Tap button to switch polarity
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: magnetColor }]}
          onPress={togglePolarity}
        >
          <Text style={styles.buttonText}>
            {magnet.polarity === "attract" ? "Attract" : "Repel"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {/* Magnet force field indicator */}
          <Circle
            cx={magnet.x}
            cy={magnet.y}
            r={MAGNET_RADIUS * PIXELS_PER_METER * 2}
            color={`${magnetRingColor}30`}
          />

          {/* Magnet */}
          <Circle
            cx={magnet.x}
            cy={magnet.y}
            r={MAGNET_RADIUS * PIXELS_PER_METER}
            color={magnetColor}
          />
          <Circle
            cx={magnet.x}
            cy={magnet.y}
            r={MAGNET_RADIUS * PIXELS_PER_METER * 0.7}
            color="#ffffff30"
          />

          {/* Metal objects */}
          {metalObjects.map((metal) => (
            <Group
              key={`metal-${metal.id.value}`}
              transform={[
                { translateX: metal.x },
                { translateY: metal.y },
                { rotate: metal.angle },
              ]}
            >
              <Circle
                cx={0}
                cy={0}
                r={METAL_RADIUS * PIXELS_PER_METER}
                color="#bdc3c7"
              />
              <Circle
                cx={METAL_RADIUS * PIXELS_PER_METER * 0.3}
                cy={-METAL_RADIUS * PIXELS_PER_METER * 0.3}
                r={METAL_RADIUS * PIXELS_PER_METER * 0.25}
                color="#ffffff50"
              />
            </Group>
          ))}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  instructions: {
    color: "#bdc3c7",
    fontSize: 14,
    flex: 1,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function MagnetPlayground() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <MagnetPlaygroundCanvas />
    </ViewportRoot>
  );
}
