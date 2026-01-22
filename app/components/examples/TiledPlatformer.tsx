import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Group, Circle } from '@shopify/react-native-skia';
import { createPhysics2D, vec2, useSimplePhysicsLoop, type Physics2D, type BodyId } from '@/lib/physics2d';
import { TileMapRenderer } from '@/lib/game-engine/renderers/TileMapRenderer';
import { createCollisionBodiesFromTileMap } from '@/lib/game-engine/TileMapPhysics';
import type { TileSheet, TileMap } from '@slopcade/shared';
import type { ExampleMeta } from '@/lib/registry/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIXELS_PER_METER = 50;

const tileSheet: TileSheet = {
  id: 'grass-tiles',
  name: 'Grass Platformer Tiles',
  imageUrl: require('@/assets/tilesets/grass-platformer-32x32.jpg'),
  tileWidth: 32,
  tileHeight: 32,
  columns: 8,
  rows: 4,
  source: 'generated',
  style: 'pixel',
};

const tileMap: TileMap = {
  id: 'level-1',
  name: 'Level 1',
  tileSheetId: 'grass-tiles',
  width: 20,
  height: 12,
  layers: [
    {
      id: 'bg',
      name: 'Background',
      type: 'background',
      visible: true,
      opacity: 0.6,
      parallaxFactor: 0.5,
      zIndex: 0,
      data: Array(20 * 12).fill(-1).map((_, i) => {
        const y = Math.floor(i / 20);
        if (y === 0 || y === 11) return 16;
        return -1;
      }),
    },
    {
      id: 'collision',
      name: 'Collision',
      type: 'collision',
      visible: true,
      opacity: 1,
      zIndex: 1,
      data: [
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1, 0, 0, 0,-1,-1,-1,-1,-1, 0, 0, 0,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
         1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      ],
    },
  ],
};

export const metadata: ExampleMeta = {
  title: 'Tiled Platformer',
  description: 'Platformer level using tile maps with collision physics',
};

export default function TiledPlatformer() {
  const physicsRef = useRef<Physics2D | null>(null);
  const playerBodyRef = useRef<BodyId | null>(null);
  const tileBodyIdsRef = useRef<BodyId[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 2, y: 2 });
  const cameraX = useRef(0);
  const cameraY = useRef(0);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const p = await createPhysics2D();
      if (!mounted) return;

      p.createWorld(vec2(0, 20));

      const tileBodies = createCollisionBodiesFromTileMap(
        p,
        tileMap,
        tileSheet,
        { x: 0, y: 0 },
        PIXELS_PER_METER
      );
      tileBodyIdsRef.current = tileBodies;

      const player = p.createBody({
        type: 'dynamic',
        position: vec2(2, 2),
        fixedRotation: true,
      });

      p.addFixture(player, {
        shape: { type: 'circle', radius: 0.5 },
        density: 1,
        friction: 0.3,
        restitution: 0,
      });

      playerBodyRef.current = player;
      physicsRef.current = p;
      setIsReady(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const playerBody = playerBodyRef.current;
    if (!physics || !playerBody) return;

    physics.step(dt, 8, 3);

    const { position } = physics.getTransform(playerBody);
    cameraX.current = position.x * PIXELS_PER_METER - SCREEN_WIDTH / 2;
    cameraY.current = position.y * PIXELS_PER_METER - SCREEN_HEIGHT / 2;
    setPlayerPos({ x: position.x, y: position.y });
  }, []);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Group
          transform={[
            { translateX: -cameraX.current },
            { translateY: -cameraY.current },
          ]}
        >
          <TileMapRenderer
            tileMap={tileMap}
            tileSheet={tileSheet}
            position={{ x: 0, y: 0 }}
            pixelsPerMeter={PIXELS_PER_METER}
            cameraX={cameraX.current / PIXELS_PER_METER}
            cameraY={cameraY.current / PIXELS_PER_METER}
          />

          <Group
            transform={[
              { translateX: playerPos.x * PIXELS_PER_METER },
              { translateY: playerPos.y * PIXELS_PER_METER },
            ]}
          >
            <Circle
              cx={0}
              cy={0}
              r={0.5 * PIXELS_PER_METER}
              color="#3498db"
            />
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  canvas: {
    flex: 1,
  },
});
