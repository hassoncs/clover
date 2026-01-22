import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
  Group,
} from "@shopify/react-native-skia";
import {
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const DOMINO_WIDTH = 0.2;
const DOMINO_HEIGHT = 1.0;
const DOMINO_COUNT = 15;
const DOMINO_SPACING = 0.8;

const BALL_RADIUS = 0.5;
const BALL_INITIAL_VELOCITY = 5;

interface EntityData {
  type: 'domino' | 'ball';
  width?: number;
  height?: number;
  radius?: number;
  color: string;
}

function DominoesCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady } = usePhysicsExample<EntityData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<EntityData>[] => {
      const worldWidth = vp.world.size.width;
      const worldHeight = vp.world.size.height;
      const groundY = worldHeight - 1;

      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, groundY + 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.6,
      });

      const bodies: BodyRecord<EntityData>[] = [];
      const dominoRowWidth = DOMINO_COUNT * DOMINO_SPACING;
      const dominoStartX = (worldWidth - dominoRowWidth) / 2 + DOMINO_SPACING / 2;

      for (let i = 0; i < DOMINO_COUNT; i++) {
        const x = dominoStartX + i * DOMINO_SPACING;
        const y = groundY - DOMINO_HEIGHT / 2;

        const bodyId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
        });

        physics.addFixture(bodyId, {
          shape: { type: "box", halfWidth: DOMINO_WIDTH / 2, halfHeight: DOMINO_HEIGHT / 2 },
          density: 5,
          friction: 0.5,
          restitution: 0.1,
        });

        bodies.push({
          id: bodyId,
          data: {
            type: 'domino',
            width: DOMINO_WIDTH * PIXELS_PER_METER,
            height: DOMINO_HEIGHT * PIXELS_PER_METER,
            color: '#e67e22',
          },
        });
      }

      const ballStartX = dominoStartX - 2;
      const ballStartY = groundY - 2;

      const ballId = physics.createBody({
        type: "dynamic",
        position: vec2(ballStartX, ballStartY),
      });
      physics.addFixture(ballId, {
        shape: { type: "circle", radius: BALL_RADIUS },
        density: 20,
        friction: 0.3,
        restitution: 0.2,
      });
      physics.setLinearVelocity(ballId, vec2(BALL_INITIAL_VELOCITY, 0));

      bodies.push({
        id: ballId,
        data: {
          type: 'ball',
          radius: BALL_RADIUS * PIXELS_PER_METER,
          color: '#2c3e50',
        },
      });

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const groundY = vp.world.size.height - 1;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          <Rect
            x={0}
            y={groundY * PIXELS_PER_METER}
            width={vp.size.width}
            height={PIXELS_PER_METER}
            color="#7f8c8d"
          />

          {transforms.map((entity) => {
            if (entity.data.type === 'domino') {
              return (
                <Group
                  key={`domino-${entity.id.value}`}
                  transform={[
                    { translateX: entity.x },
                    { translateY: entity.y },
                    { rotate: entity.angle },
                  ]}
                  origin={{ x: 0, y: 0 }}
                >
                  <Rect
                    x={-entity.data.width! / 2}
                    y={-entity.data.height! / 2}
                    width={entity.data.width!}
                    height={entity.data.height!}
                    color={entity.data.color}
                  />
                </Group>
              );
            } else {
              return (
                <Circle
                  key={`ball-${entity.id.value}`}
                  cx={entity.x}
                  cy={entity.y}
                  r={entity.data.radius!}
                  color={entity.data.color}
                />
              );
            }
          })}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function Dominoes() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <DominoesCanvas />
    </ViewportRoot>
  );
}
