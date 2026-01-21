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

const BLOCK_SIZE = 0.6;
const TOWER_COLUMNS = 5;
const TOWER_ROWS = 10;
const PROJECTILE_RADIUS = 0.4;
const BREAK_THRESHOLD = 15;

interface BlockState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
  color: string;
  isBroken: boolean;
}

interface ProjectileState {
  id: BodyId;
  x: number;
  y: number;
}

function DestructibleTowerCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const blockIdsRef = useRef<BodyId[]>([]);
  const projectileIdRef = useRef<BodyId | null>(null);
  const activeBlocksRef = useRef<Map<number, boolean>>(new Map());
  
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [projectile, setProjectile] = useState<ProjectileState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [score, setScore] = useState(0);
  const [blocksRemaining, setBlocksRemaining] = useState(0);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const destroyBlock = useCallback((physics: Physics2D, blockId: BodyId) => {
    const blockValue = blockId.value;
    
    if (!activeBlocksRef.current.has(blockValue)) return;
    if (activeBlocksRef.current.get(blockValue) === false) return;

    activeBlocksRef.current.set(blockValue, false);
    setScore(s => s + 10);
    setBlocksRemaining(c => c - 1);

    // Destroy the block
    physics.destroyBody(blockId);

    // Create smaller debris
    const transform = physics.getTransform(blockId);
    const x = transform.position.x;
    const y = transform.position.y;

    const debrisCount = 4;
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = BLOCK_SIZE / 2;
      const offsetX = (Math.random() - 0.5) * debrisSize;
      const offsetY = (Math.random() - 0.5) * debrisSize;
      
      const debrisId = physics.createBody({
        type: "dynamic",
        position: vec2(x + offsetX, y + offsetY),
        angle: Math.random() * Math.PI * 2,
      });

      physics.addFixture(debrisId, {
        shape: { type: "box", halfWidth: debrisSize / 2, halfHeight: debrisSize / 2 },
        density: 1,
        friction: 0.5,
        restitution: 0.2,
      });

      // Apply random impulse to debris
      const impulseX = (Math.random() - 0.5) * 5;
      const impulseY = -Math.random() * 5;
      physics.applyImpulseToCenter(debrisId, vec2(impulseX, impulseY));
    }
  }, []);

  const createTower = useCallback((physics: Physics2D, centerX: number) => {
    const worldHeight = vp.world.size.height;
    const startY = worldHeight - 2;
    const newBlockIds: BodyId[] = [];
    const newBlocks: BlockState[] = [];
    const colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"];

    for (let row = 0; row < TOWER_ROWS; row++) {
      for (let col = 0; col < TOWER_COLUMNS; col++) {
        const x = centerX + (col - TOWER_COLUMNS / 2) * BLOCK_SIZE;
        const y = startY - row * BLOCK_SIZE - BLOCK_SIZE / 2;
        const color = colors[(row + col) % colors.length];

        const blockId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
          linearDamping: 0.5,
          angularDamping: 0.5,
        });

        physics.addFixture(blockId, {
          shape: { type: "box", halfWidth: BLOCK_SIZE / 2, halfHeight: BLOCK_SIZE / 2 },
          density: 1,
          friction: 0.5,
          restitution: 0.1,
        });

        newBlockIds.push(blockId);
        newBlocks.push({
          id: blockId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
          angle: 0,
          color,
          isBroken: false,
        });
        activeBlocksRef.current.set(blockId.value, true);
      }
    }

    blockIdsRef.current = newBlockIds;
    setBlocks(newBlocks);
    setBlocksRemaining(newBlockIds.length);
  }, [vp.world.size.height]);

  const launchProjectile = useCallback((targetX?: number, targetY?: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    const worldWidth = vp.world.size.width;
    const startX = 2;
    const startY = vp.world.size.height - 5;

    if (projectileIdRef.current) {
      physics.destroyBody(projectileIdRef.current);
    }

    const projectileId = physics.createBody({
      type: "dynamic",
      position: vec2(startX, startY),
      bullet: true,
    });

    physics.addFixture(projectileId, {
      shape: { type: "circle", radius: PROJECTILE_RADIUS },
      density: 5,
      friction: 0.3,
      restitution: 0.5,
    });

    // Launch toward click position or tower center
    const targetXPos = targetX ?? worldWidth / 2;
    const targetYPos = targetY ?? (vp.world.size.height - TOWER_ROWS * BLOCK_SIZE);
    const dx = targetXPos - startX;
    const dy = targetYPos - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 25;
    
    physics.applyImpulseToCenter(projectileId, vec2(
      (dx / dist) * speed,
      (dy / dist) * speed
    ));

    projectileIdRef.current = projectileId;
    setProjectile({
      id: projectileId,
      x: startX * PIXELS_PER_METER,
      y: startY * PIXELS_PER_METER,
    });
  }, [vp.world.size.width, vp.world.size.height]);

  // Handle tap on canvas to launch projectile
  const handleCanvasTap = useCallback((event: any) => {
    const location = event.nativeEvent;
    if (!location) return;

    // Convert screen coordinates to world coordinates
    const canvasRect = event.currentTarget.getBoundingClientRect
      ? event.currentTarget.getBoundingClientRect()
      : { left: 0, top: 0, width: vp.size.width, height: vp.size.height };
    
    const clickX = location.pageX - canvasRect.left;
    const clickY = location.pageY - canvasRect.top;
    
    // Convert to physics world coordinates
    const worldX = clickX / PIXELS_PER_METER;
    const worldY = clickY / PIXELS_PER_METER;
    
    launchProjectile(worldX, worldY);
  }, [launchProjectile, vp.size]);

  const resetTower = useCallback(() => {
    const physics = physicsRef.current;
    if (!physics) return;

    // Destroy all blocks
    for (const blockId of blockIdsRef.current) {
      if (activeBlocksRef.current.get(blockId.value) !== false) {
        physics.destroyBody(blockId);
      }
    }
    activeBlocksRef.current.clear();
    blockIdsRef.current = [];

    // Destroy projectile if exists
    if (projectileIdRef.current) {
      physics.destroyBody(projectileIdRef.current);
      projectileIdRef.current = null;
      setProjectile(null);
    }

    setScore(0);
    createTower(physics, vp.world.size.width / 2);
  }, [createTower, vp.world.size.width]);

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

      // Ground
      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, worldHeight - 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.8,
      });

      // Create tower
      createTower(physics, worldWidth / 2);

      // Collision detection for destruction
      physics.onCollisionBegin((event) => {
        if (!projectileIdRef.current) return;

        const projectileColliderId = 1; // First fixture is projectile
        
        for (const blockId of blockIdsRef.current) {
          if (activeBlocksRef.current.get(blockId.value) === false) continue;

          const impactVel = physics.getLinearVelocity(projectileIdRef.current);
          const speed = Math.sqrt(impactVel.x * impactVel.x + impactVel.y * impactVel.y);

          if (speed > BREAK_THRESHOLD) {
            destroyBlock(physics, blockId);
          }
        }
      });

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      blockIdsRef.current = [];
      projectileIdRef.current = null;
      activeBlocksRef.current.clear();
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady, createTower, destroyBlock]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const updatedBlocks = blockIdsRef.current.map((id, i) => {
      if (activeBlocksRef.current.get(id.value) === false) {
        return blocks[i];
      }
      const transform = physics.getTransform(id);
      return {
        ...blocks[i],
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setBlocks(updatedBlocks);

    if (projectileIdRef.current) {
      const transform = physics.getTransform(projectileIdRef.current);
      setProjectile({
        id: projectileIdRef.current,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
      });
    }
  }, [dragHandlers, blocks]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const worldHeight = vp.world.size.height;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.stats}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.remaining}>Blocks: {blocksRemaining}</Text>
        </View>
        <Text style={styles.instructions}>Tap anywhere to launch!</Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetTower}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.canvasContainer}
        onPress={handleCanvasTap}
        onStartShouldSetResponder={() => true}
        onResponderGrant={dragHandlers.onTouchStart}
        onResponderMove={dragHandlers.onTouchMove}
        onResponderRelease={dragHandlers.onTouchEnd}
        onResponderTerminate={dragHandlers.onTouchEnd}
        activeOpacity={0.9}
      >
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {/* Ground */}
          <Rect
            x={0}
            y={(worldHeight - 1) * PIXELS_PER_METER}
            width={vp.size.width}
            height={PIXELS_PER_METER}
            color="#2d3436"
          />

          {/* Blocks */}
          {blocks.map((block, index) => {
            if (activeBlocksRef.current.get(block.id.value) === false) return null;
            
            return (
              <Group
                key={`block-${index}`}
                transform={[
                  { translateX: block.x },
                  { translateY: block.y },
                  { rotate: block.angle },
                ]}
              >
                <Rect
                  x={-BLOCK_SIZE * PIXELS_PER_METER / 2}
                  y={-BLOCK_SIZE * PIXELS_PER_METER / 2}
                  width={BLOCK_SIZE * PIXELS_PER_METER}
                  height={BLOCK_SIZE * PIXELS_PER_METER}
                  color={block.color}
                />
              </Group>
            );
          })}

          {/* Projectile */}
          {projectile && (
            <Circle
              cx={projectile.x}
              cy={projectile.y}
              r={PROJECTILE_RADIUS * PIXELS_PER_METER}
              color="#ffffff"
            />
          )}
        </Canvas>
      </TouchableOpacity>
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
  stats: {
    flexDirection: "row",
    gap: 20,
  },
  score: {
    color: "#f1c40f",
    fontSize: 20,
    fontWeight: "bold",
  },
  remaining: {
    color: "#bdc3c7",
    fontSize: 20,
  },
  instructions: {
    color: "#3498db",
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#3498db",
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

export default function DestructibleTower() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <DestructibleTowerCanvas />
    </ViewportRoot>
  );
}
