import { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import { Canvas, Fill, Group } from "@shopify/react-native-skia";
import type { GameDefinition, ParallaxConfig } from "@slopcade/shared";
import { ParallaxBackground, type ParallaxBackgroundConfig } from "./renderers/ParallaxBackground";
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  type Physics2D,
  type CollisionEvent,
  type Unsubscribe,
} from "../physics2d";
import { GameLoader, type LoadedGame } from "./GameLoader";
import { EntityRenderer } from "./renderers";
import type { RuntimeEntity } from "./types";
import type {
  BehaviorContext,
  InputState,
  GameState,
  CollisionInfo,
} from "./BehaviorContext";
import { CameraSystem, type CameraConfig } from "./CameraSystem";

export interface GameRuntimeProps {
  definition: GameDefinition;
  onGameEnd?: (state: "won" | "lost") => void;
  onScoreChange?: (score: number) => void;
  onBackToMenu?: () => void;
  showHUD?: boolean;
  renderMode?: "default" | "primitive";
  showDebugOverlays?: boolean;
  activeAssetPackId?: string;
}

export function GameRuntime({
  definition,
  onGameEnd,
  onScoreChange,
  onBackToMenu,
  showHUD = true,
  renderMode = "default",
  showDebugOverlays = false,
  activeAssetPackId,
}: GameRuntimeProps) {
  const physicsRef = useRef<Physics2D | null>(null);
  const gameRef = useRef<LoadedGame | null>(null);
  const loaderRef = useRef<GameLoader | null>(null);
  const cameraRef = useRef<CameraSystem | null>(null);
  const elapsedRef = useRef(0);
  const inputRef = useRef<InputState>({});
  const collisionsRef = useRef<CollisionInfo[]>([]);
  const collisionUnsubRef = useRef<Unsubscribe | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });
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

  const [isReady, setIsReady] = useState(false);
  const [entities, setEntities] = useState<RuntimeEntity[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    time: 0,
    state: "loading",
  });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const activePackId = activeAssetPackId ?? definition.activeAssetPackId;
  const assetOverrides =
    activePackId && definition.assetPacks
      ? definition.assetPacks[activePackId]?.assets
      : undefined;

  useEffect(() => {
    const setup = async () => {
      try {
        console.log("[GameRuntime] Starting setup...");
        const physics = await createPhysics2D();
        console.log("[GameRuntime] Physics initialized:", !!physics);
        physicsRef.current = physics;

        const loader = new GameLoader({ physics });
        loaderRef.current = loader;

        const game = loader.load(definition);
        gameRef.current = game;

        collisionUnsubRef.current = physics.onCollisionBegin(
          (event: CollisionEvent) => {
            console.log('[GameRuntime] onCollisionBegin received - bodyA:', event.bodyA.value, 'bodyB:', event.bodyB.value);
            const entityA = game.entityManager
              .getActiveEntities()
              .find((e) => e.bodyId?.value === event.bodyA.value);
            const entityB = game.entityManager
              .getActiveEntities()
              .find((e) => e.bodyId?.value === event.bodyB.value);

            console.log('[GameRuntime] Found entities - A:', entityA?.id, 'B:', entityB?.id);
            if (entityA && entityB) {
              const impulse = event.contacts.reduce(
                (sum, c) => sum + c.normalImpulse,
                0,
              );
              const normal = event.contacts[0]?.normal ?? { x: 0, y: 0 };

              collisionsRef.current.push({
                entityA,
                entityB,
                normal,
                impulse,
              });
              console.log('[GameRuntime] Collision recorded between', entityA.id, 'and', entityB.id);
            }
          },
        );

        const worldWidth = definition.world.bounds?.width ?? 20;
        const worldHeight = definition.world.bounds?.height ?? 12;
        const cameraConfig: CameraConfig = {
          position: { x: worldWidth / 2, y: worldHeight / 2 },
          zoom: definition.camera?.zoom ?? 1,
          followTarget: definition.camera?.followTarget,
          followSmoothing: 0.1,
          bounds: definition.camera?.bounds,
        };
        const initialViewport =
          viewportRef.current.width > 0
            ? viewportRef.current
            : { width: 800, height: 600 };
        const pixelsPerMeter = definition.world.pixelsPerMeter ?? 50;
        const camera = new CameraSystem(
          cameraConfig,
          initialViewport,
          pixelsPerMeter,
        );
        cameraRef.current = camera;

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
            if (state === "won" || state === "lost") {
              onGameEnd?.(state);
            }
          },
        });

        const visibleEntities = game.entityManager.getVisibleEntities();
        setEntities(visibleEntities);
        setGameState((s) => ({ ...s, state: "ready" }));
        setIsReady(true);
      } catch (error) {
        console.error("[GameRuntime] Failed to initialize game:", error);
      }
    };

    setup();

    return () => {
      collisionUnsubRef.current?.();
      collisionUnsubRef.current = null;
      if (gameRef.current && loaderRef.current) {
        loaderRef.current.unload(gameRef.current);
      }
      physicsRef.current = null;
      gameRef.current = null;
      loaderRef.current = null;
      cameraRef.current = null;
    };
  }, [definition, onGameEnd, onScoreChange]);

  const stepGame = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const game = gameRef.current;
    const camera = cameraRef.current;
    if (!physics || !game || !camera) {
      return;
    }

    if (game.rulesEvaluator.getGameState() !== "playing") return;

    physics.step(dt, 8, 3);

    game.entityManager.syncTransformsFromPhysics();

    camera.update(dt, (id) => game.entityManager.getEntity(id));

    elapsedRef.current += dt;

    const behaviorContext: Omit<BehaviorContext, "entity"> = {
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
        if (state === "won") game.rulesEvaluator["setGameState"]("won");
        else if (state === "lost") game.rulesEvaluator["setGameState"]("lost");
        else if (state === "paused") game.rulesEvaluator.pause();
        else if (state === "playing") game.rulesEvaluator.resume();
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
      triggerEvent: (name, data) =>
        game.rulesEvaluator.triggerEvent(name, data),
      
      computedValues: {} as any,
      evalContext: {} as any,
      resolveNumber: (value) => typeof value === 'number' ? value : 0,
      resolveVec2: (value) => (value && typeof value === 'object' && 'x' in value && !('type' in value)) ? value as any : { x: 0, y: 0 },
    };

    if (collisionsRef.current.length > 0) {
      console.log(
        "[GameRuntime] stepGame - passing",
        collisionsRef.current.length,
        "collisions to behaviors",
      );
    }

    game.behaviorExecutor.executeAll(
      game.entityManager.getActiveEntities(),
      behaviorContext,
    );

    game.rulesEvaluator.update(dt, game.entityManager, collisionsRef.current);

    inputRef.current = {};
    collisionsRef.current = [];

    setEntities([...game.entityManager.getVisibleEntities()]);
    setGameState((s) => ({ ...s, time: elapsedRef.current }));
  }, []);

  useSimplePhysicsLoop(stepGame, isReady && gameState.state === "playing");

  const handleStart = useCallback(() => {
    gameRef.current?.rulesEvaluator.start();
  }, []);

  const handleRestart = useCallback(() => {
    if (gameRef.current && loaderRef.current && cameraRef.current) {
      const newGame = loaderRef.current.reload(gameRef.current);
      gameRef.current = newGame;
      elapsedRef.current = 0;

      cameraRef.current.setPosition({ x: 0, y: 0 });
      cameraRef.current.setZoom(definition.camera?.zoom ?? 1);

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
          if (state === "won" || state === "lost") {
            onGameEnd?.(state);
          }
        },
      });
      setEntities(newGame.entityManager.getVisibleEntities());
      setGameState({ score: 0, lives: 3, time: 0, state: "ready" });
    }
  }, [onGameEnd, onScoreChange, definition.camera?.zoom]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      console.log("[GameRuntime] onLayout fired, viewport:", { width, height });
      viewportRef.current = { width, height };
      setViewportSize({ width, height });
      cameraRef.current?.updateViewport({ width, height });
    },
    [],
  );

  const handleTap = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const camera = cameraRef.current;
      if (!camera) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const worldPos = camera.screenToWorld(x, y);

      inputRef.current.tap = {
        x,
        y,
        worldX: worldPos.x,
        worldY: worldPos.y,
      };
    },
    [],
  );

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const game = gameRef.current;
    if (!camera || !game) return;

    const { locationX: x, locationY: y } = event.nativeEvent;
    const worldPos = camera.screenToWorld(x, y);

    const physics = physicsRef.current;
    let targetEntityId: string | undefined;
    if (physics) {
      const bodyId = physics.queryPoint(worldPos);
      if (bodyId) {
        const entity = game.entityManager
          .getActiveEntities()
          .find((e) => e.bodyId === bodyId);
        if (entity) {
          targetEntityId = entity.id;
        }
      }
    }

    dragStartRef.current = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetEntityId,
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
  }, []);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const dragStart = dragStartRef.current;
    if (!camera || !dragStart) return;

    const { locationX: x, locationY: y } = event.nativeEvent;
    const worldPos = camera.screenToWorld(x, y);

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
  }, []);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    const camera = cameraRef.current;
    const dragStart = dragStartRef.current;
    if (!camera) return;

    const { locationX: x, locationY: y } = event.nativeEvent;
    const worldPos = camera.screenToWorld(x, y);

    inputRef.current.tap = {
      x,
      y,
      worldX: worldPos.x,
      worldY: worldPos.y,
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
  }, []);

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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const pixelsPerMeter = gameRef.current?.pixelsPerMeter ?? 50;
  const backgroundColor = definition.ui?.backgroundColor ?? "#87CEEB";

  const cameraTransform = cameraRef.current?.getWorldToScreenTransform();
  const matrix = cameraTransform
    ? [
        cameraTransform.scaleX,
        0,
        cameraTransform.translateX,
        0,
        cameraTransform.scaleY,
        cameraTransform.translateY,
        0,
        0,
        1,
      ]
    : undefined;

  const cameraPosition = cameraRef.current?.getPosition() ?? { x: 0, y: 0 };
  const cameraZoom = cameraRef.current?.getZoom() ?? 1;

  const parallaxBgConfig: ParallaxBackgroundConfig | null = 
    definition.parallaxConfig?.enabled && definition.parallaxConfig.layers.length > 0
      ? {
          layers: definition.parallaxConfig.layers
            .filter((l) => l.visible !== false && l.imageUrl)
            .map((l) => ({
              imageUrl: l.imageUrl!,
              depth: l.depth,
              parallaxFactor: l.parallaxFactor,
              zIndex: ['sky', 'far', 'mid', 'near'].indexOf(l.depth),
              visible: l.visible ?? true,
            })),
        }
      : null;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
      >
        <Canvas style={styles.canvas}>
          <Fill color={backgroundColor} />
          {parallaxBgConfig && viewportSize.width > 0 && (
            <ParallaxBackground
              config={parallaxBgConfig}
              cameraX={cameraPosition.x}
              cameraY={cameraPosition.y}
              cameraZoom={cameraZoom}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              pixelsPerMeter={pixelsPerMeter}
            />
          )}
          <Group matrix={matrix}>
            {entities.map((entity) => (
              <EntityRenderer
                key={entity.id}
                entity={entity}
                pixelsPerMeter={pixelsPerMeter}
                renderMode={renderMode}
                showDebugOverlays={showDebugOverlays}
                assetOverrides={assetOverrides}
              />
            ))}
          </Group>
        </Canvas>
      </View>

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
          {gameState.state === "playing" && (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => gameRef.current?.rulesEvaluator.pause()}
            >
              <Text style={styles.pauseButtonText}>⏸</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {gameState.state === "paused" && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Paused</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => gameRef.current?.rulesEvaluator.resume()}
          >
            <Text style={styles.buttonText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#888", marginTop: 12 }]}
            onPress={handleRestart}
          >
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState.state === "ready" && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{definition.metadata.title}</Text>
          {definition.metadata.instructions && (
            <Text style={styles.instructions}>
              {definition.metadata.instructions}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Play</Text>
          </TouchableOpacity>
        </View>
      )}

      {(gameState.state === "won" || gameState.state === "lost") && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {gameState.state === "won" ? "🎉 You Win!" : "💀 Game Over"}
          </Text>
          <Text style={styles.finalScore}>Final Score: {gameState.score}</Text>
          <TouchableOpacity style={styles.button} onPress={handleRestart}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
          {onBackToMenu && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onBackToMenu}
            >
              <Text style={styles.buttonText}>Back to Menu</Text>
            </TouchableOpacity>
          )}
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
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  livesText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pauseButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseButtonText: {
    color: "#fff",
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 12,
  },
  instructions: {
    color: "#ccc",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 30,
    lineHeight: 24,
  },
  finalScore: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: "#666",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
