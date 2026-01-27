import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { GodotView } from '@/lib/godot';
import { createGodotBridge, type GodotBridge } from '@/lib/godot';

const RENDERING_TEST_GAME = {
  metadata: {
    id: 'rendering-test',
    title: 'Rendering Test',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 18 },
  },
  templates: {
    foundation: {
      id: 'foundation',
      tags: ['ground'],
      sprite: { type: 'rect', width: 12, height: 0.5, color: '#4a4a4a' },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 12,
        height: 0.5,
        friction: 0.9,
        restitution: 0,
      },
    },
    rectBlock: {
      id: 'rectBlock',
      tags: ['block'],
      sprite: { type: 'rect', width: 1.5, height: 1, color: '#e74c3c', opacity: 0.9, zIndex: 1 },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 1.5,
        height: 1,
        density: 1,
        friction: 0.6,
        restitution: 0.2,
      },
    },
    circleBlock: {
      id: 'circleBlock',
      tags: ['ball'],
      sprite: { type: 'circle', radius: 0.5, color: '#3498db', opacity: 1.0, zIndex: 2 },
      physics: {
        bodyType: 'dynamic',
        shape: 'circle',
        radius: 0.5,
        density: 1.2,
        friction: 0.4,
        restitution: 0.6,
      },
    },
    triangleBlock: {
      id: 'triangleBlock',
      tags: ['block'],
      sprite: {
        type: 'polygon',
        vertices: [
          { x: 0, y: -0.6 },
          { x: 0.6, y: 0.4 },
          { x: -0.6, y: 0.4 },
        ],
        color: '#2ecc71',
        opacity: 0.85,
        zIndex: 1,
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'polygon',
        vertices: [
          { x: 0, y: -0.6 },
          { x: 0.6, y: 0.4 },
          { x: -0.6, y: 0.4 },
        ],
        density: 0.8,
        friction: 0.5,
        restitution: 0.3,
      },
    },
    hexBlock: {
      id: 'hexBlock',
      tags: ['block'],
      sprite: {
        type: 'polygon',
        vertices: [
          { x: 0.5, y: 0 },
          { x: 0.25, y: 0.43 },
          { x: -0.25, y: 0.43 },
          { x: -0.5, y: 0 },
          { x: -0.25, y: -0.43 },
          { x: 0.25, y: -0.43 },
        ],
        color: '#9b59b6',
        opacity: 0.9,
        zIndex: 1,
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'polygon',
        vertices: [
          { x: 0.5, y: 0 },
          { x: 0.25, y: 0.43 },
          { x: -0.25, y: 0.43 },
          { x: -0.5, y: 0 },
          { x: -0.25, y: -0.43 },
          { x: 0.25, y: -0.43 },
        ],
        density: 1.0,
        friction: 0.5,
        restitution: 0.2,
      },
    },
    scoreLabel: {
      id: 'scoreLabel',
      tags: ['ui'],
      sprite: {
        type: 'text',
        text: 'SCORE: 0',
        fontSize: 24,
        color: '#ffffff',
        opacity: 1.0,
        zIndex: 100,
      },
    },
    ghostBlock: {
      id: 'ghostBlock',
      tags: ['decoration'],
      sprite: { type: 'rect', width: 2, height: 2, color: '#ffffff', opacity: 0.2, zIndex: -1 },
    },
  },
  entities: [
    {
      id: 'foundation',
      name: 'Foundation',
      template: 'foundation',
      transform: { x: 7, y: 16.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'leftWall',
      name: 'Left Wall',
      template: 'foundation',
      transform: { x: 1, y: 9, angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'rightWall',
      name: 'Right Wall',
      template: 'foundation',
      transform: { x: 13, y: 9, angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'ghost1',
      name: 'Ghost Background',
      template: 'ghostBlock',
      transform: { x: 4, y: 10, angle: 0.2, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'ghost2',
      name: 'Ghost Background 2',
      template: 'ghostBlock',
      transform: { x: 10, y: 8, angle: -0.3, scaleX: 1, scaleY: 1 },
    },
  ],
} as const;

const SHAPE_TEMPLATES = ['rectBlock', 'circleBlock', 'triangleBlock', 'hexBlock'];

export default function GodotTestScreen() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const [score, setScore] = useState(0);
  const [selectedShape, setSelectedShape] = useState(0);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const godotBridge = await createGodotBridge();
        await godotBridge.initialize();
        
        if (!mounted) return;
        setBridge(godotBridge);
        setStatus('Godot initialized');

        godotBridge.onCollision((event: { entityA: string; entityB: string }) => {
          if (event.entityA.includes('Block') || event.entityB.includes('Block')) {
            setScore((s) => s + 10);
          }
        });

        await godotBridge.loadGame(RENDERING_TEST_GAME as any);
        setStatus('Game loaded - tap buttons to spawn shapes');
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSpawnShape = useCallback((templateId: string) => {
    if (!bridge) return;
    const x = 7 + (Math.random() - 0.5) * 6;
    const y = 2 + Math.random() * 2;
    bridge.spawnEntity(templateId, x, y);
    setScore((s) => s + 5);
  }, [bridge]);

  const handleClearGame = useCallback(() => {
    if (!bridge) return;
    bridge.clearGame();
    bridge.loadGame(RENDERING_TEST_GAME as any);
    setScore(0);
  }, [bridge]);

  const handleReady = useCallback(() => {
    setStatus('Godot view ready');
  }, []);

  const handleError = useCallback((error: Error) => {
    setStatus(`View error: ${error.message}`);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Godot Rendering Test</Text>
        <Text style={styles.status}>{status}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.platform}>Platform: {Platform.OS}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <GodotView style={styles.game} onReady={handleReady} onError={handleError} />
      </View>

      <View style={styles.controls}>
        <Text style={styles.controlsLabel}>Spawn Shapes:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buttonRow}>
          <Pressable 
            style={[styles.shapeButton, { backgroundColor: '#e74c3c' }]} 
            onPress={() => handleSpawnShape('rectBlock')}
          >
            <Text style={styles.buttonText}>Rect</Text>
          </Pressable>
          <Pressable 
            style={[styles.shapeButton, { backgroundColor: '#3498db' }]} 
            onPress={() => handleSpawnShape('circleBlock')}
          >
            <Text style={styles.buttonText}>Circle</Text>
          </Pressable>
          <Pressable 
            style={[styles.shapeButton, { backgroundColor: '#2ecc71' }]} 
            onPress={() => handleSpawnShape('triangleBlock')}
          >
            <Text style={styles.buttonText}>Triangle</Text>
          </Pressable>
          <Pressable 
            style={[styles.shapeButton, { backgroundColor: '#9b59b6' }]} 
            onPress={() => handleSpawnShape('hexBlock')}
          >
            <Text style={styles.buttonText}>Hexagon</Text>
          </Pressable>
        </ScrollView>
        
        <Pressable style={styles.clearButton} onPress={handleClearGame}>
          <Text style={styles.buttonText}>Reset Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    fontSize: 18,
    color: '#4ade80',
  },
  platform: {
    fontSize: 12,
    color: '#666',
  },
  gameContainer: {
    flex: 1,
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  game: {
    flex: 1,
  },
  controls: {
    padding: 16,
    paddingBottom: 32,
  },
  controlsLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  shapeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 14,
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
