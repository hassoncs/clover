import { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Canvas, Fill } from '@shopify/react-native-skia';
import type { GameDefinition } from '@clover/shared';
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  type Physics2D,
} from '../physics2d';
import { GameLoader, type LoadedGame } from './GameLoader';
import { EntityRenderer } from './renderers';
import type { RuntimeEntity } from './types';
import type { BehaviorContext, InputState, GameState, CollisionInfo } from './BehaviorContext';

interface GameRuntimeProps {
  definition: GameDefinition;
  onGameEnd?: (state: 'won' | 'lost') => void;
  onScoreChange?: (score: number) => void;
  showHUD?: boolean;
}

export function GameRuntime({
  definition,
  onGameEnd,
  onScoreChange,
  showHUD = true,
}: GameRuntimeProps) {
  const physicsRef = useRef<Physics2D | null>(null);
  const gameRef = useRef<LoadedGame | null>(null);
  const loaderRef = useRef<GameLoader | null>(null);
  const elapsedRef = useRef(0);
  const inputRef = useRef<InputState>({});
  const collisionsRef = useRef<CollisionInfo[]>([]);

  const [isReady, setIsReady] = useState(false);
  const [entities, setEntities] = useState<RuntimeEntity[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    time: 0,
    state: 'loading',
  });

  useEffect(() => {
    const setup = async () => {
      try {
        const physics = await createPhysics2D();
        physicsRef.current = physics;

        const loader = new GameLoader({ physics });
        loaderRef.current = loader;

        const game = loader.load(definition);
        gameRef.current = game;

        game.rulesEvaluator.setCallbacks({
          onScoreChange: (score) => {
            setGameState((s) => ({ ...s, score }));
            onScoreChange?.(score);
          },
          onLivesChange: (lives) => {
            setGameState((s) => ({ ...s, lives }));
          },
          onGameStateChange: (state) => {
            setGameState((s) => ({ ...s, state }));
            if (state === 'won' || state === 'lost') {
              onGameEnd?.(state);
            }
          },
        });

        setEntities(game.entityManager.getVisibleEntities());
        setGameState((s) => ({ ...s, state: 'ready' }));
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };

    setup();

    return () => {
      if (gameRef.current && loaderRef.current) {
        loaderRef.current.unload(gameRef.current);
      }
      physicsRef.current = null;
      gameRef.current = null;
      loaderRef.current = null;
    };
  }, [definition, onGameEnd, onScoreChange]);

  const stepGame = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const game = gameRef.current;
    if (!physics || !game) return;

    if (game.rulesEvaluator.getGameState() !== 'playing') return;

    physics.step(dt, 8, 3);

    game.entityManager.syncTransformsFromPhysics();

    elapsedRef.current += dt;

    const behaviorContext: Omit<BehaviorContext, 'entity'> = {
      dt,
      elapsed: elapsedRef.current,
      input: inputRef.current,
      gameState: game.rulesEvaluator.getFullState(),
      entityManager: game.entityManager,
      physics,
      collisions: collisionsRef.current,
      pixelsPerMeter: game.pixelsPerMeter,
      addScore: (points) => game.rulesEvaluator.addScore(points),
      setGameState: (state) => {
        if (state === 'won') game.rulesEvaluator['setGameState']('won');
        else if (state === 'lost') game.rulesEvaluator['setGameState']('lost');
        else if (state === 'paused') game.rulesEvaluator.pause();
        else if (state === 'playing') game.rulesEvaluator.resume();
      },
      spawnEntity: (templateId, x, y) => {
        const template = game.entityManager.getTemplate(templateId);
        if (!template) return null;
        return game.entityManager.createEntity({
          id: `spawned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: templateId,
          template: templateId,
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
      },
      destroyEntity: (id) => game.entityManager.destroyEntity(id),
      triggerEvent: (name, data) => game.rulesEvaluator.triggerEvent(name, data),
    };

    game.behaviorExecutor.executeAll(
      game.entityManager.getActiveEntities(),
      behaviorContext
    );

    game.rulesEvaluator.update(dt, game.entityManager, collisionsRef.current);

    inputRef.current = {};
    collisionsRef.current = [];

    setEntities([...game.entityManager.getVisibleEntities()]);
    setGameState((s) => ({ ...s, time: elapsedRef.current }));
  }, []);

  useSimplePhysicsLoop(stepGame, isReady && gameState.state === 'playing');

  const handleStart = useCallback(() => {
    gameRef.current?.rulesEvaluator.start();
  }, []);

  const handleRestart = useCallback(() => {
    if (gameRef.current && loaderRef.current) {
      const newGame = loaderRef.current.reload(gameRef.current);
      gameRef.current = newGame;
      elapsedRef.current = 0;
      newGame.rulesEvaluator.setCallbacks({
        onScoreChange: (score) => {
          setGameState((s) => ({ ...s, score }));
          onScoreChange?.(score);
        },
        onLivesChange: (lives) => {
          setGameState((s) => ({ ...s, lives }));
        },
        onGameStateChange: (state) => {
          setGameState((s) => ({ ...s, state }));
          if (state === 'won' || state === 'lost') {
            onGameEnd?.(state);
          }
        },
      });
      setEntities(newGame.entityManager.getVisibleEntities());
      setGameState({ score: 0, lives: 3, time: 0, state: 'ready' });
    }
  }, [onGameEnd, onScoreChange]);

  const handleTap = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const game = gameRef.current;
      if (!game) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      inputRef.current.tap = {
        x,
        y,
        worldX: x / game.pixelsPerMeter,
        worldY: y / game.pixelsPerMeter,
      };
    },
    []
  );

  const pixelsPerMeter = gameRef.current?.pixelsPerMeter ?? 50;
  const backgroundColor = definition.ui?.backgroundColor ?? '#87CEEB';

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas} onTouchEnd={handleTap}>
        <Fill color={backgroundColor} />
        {entities.map((entity) => (
          <EntityRenderer
            key={entity.id}
            entity={entity}
            pixelsPerMeter={pixelsPerMeter}
          />
        ))}
      </Canvas>

      {showHUD && (
        <View style={styles.hud}>
          {definition.ui?.showScore !== false && (
            <Text style={styles.scoreText}>Score: {gameState.score}</Text>
          )}
          {definition.ui?.showTimer && (
            <Text style={styles.timerText}>
              Time: {Math.floor(gameState.time)}s
            </Text>
          )}
          {definition.ui?.showLives && (
            <Text style={styles.livesText}>Lives: {gameState.lives}</Text>
          )}
        </View>
      )}

      {gameState.state === 'ready' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{definition.metadata.title}</Text>
          <TouchableOpacity style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Play</Text>
          </TouchableOpacity>
        </View>
      )}

      {(gameState.state === 'won' || gameState.state === 'lost') && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {gameState.state === 'won' ? 'You Win!' : 'Game Over'}
          </Text>
          <Text style={styles.finalScore}>Final Score: {gameState.score}</Text>
          <TouchableOpacity style={styles.button} onPress={handleRestart}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  livesText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
