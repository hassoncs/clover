import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import { Canvas, Fill, Group } from "@shopify/react-native-skia";
import type { GameDefinition, ParallaxConfig, EvalContext, ParticleEmitterType } from "@slopcade/shared";
import { createComputedValueSystem } from "@slopcade/shared";
import { createParticleEffectManager, type ParticleEffectManager } from "./ParticleEffectManager";
import { ParticleSystemRenderer } from "../particles/ParticleRenderer";
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
import { DebugInputOverlay } from "./renderers/DebugInputOverlay";
import { useGameInput } from "./hooks/useGameInput";
import type { RuntimeEntity } from "./types";
import type {
  BehaviorContext,
  InputState,
  GameState,
  CollisionInfo,
} from "./BehaviorContext";
import { CameraSystem, type CameraConfig } from "./CameraSystem";
import { ViewportSystem, type ViewportRect } from "./ViewportSystem";

export interface GameRuntimeProps {
  definition: GameDefinition;
  onGameEnd?: (state: "won" | "lost") => void;
  onScoreChange?: (score: number) => void;
  onBackToMenu?: () => void;
  onRequestRestart?: () => void;
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
  onRequestRestart,
  showHUD = true,
  renderMode = "default",
  showDebugOverlays = false,
  activeAssetPackId,
}: GameRuntimeProps) {
  const physicsRef = useRef<Physics2D | null>(null);
  const gameRef = useRef<LoadedGame | null>(null);
  const loaderRef = useRef<GameLoader | null>(null);
  const cameraRef = useRef<CameraSystem | null>(null);
  const viewportSystemRef = useRef<ViewportSystem | null>(null);
  const elapsedRef = useRef(0);
  const frameIdRef = useRef(0);
  const collisionsRef = useRef<CollisionInfo[]>([]);
  const collisionUnsubRef = useRef<Unsubscribe | null>(null);
  const sensorUnsubRef = useRef<Unsubscribe | null>(null);
  const screenSizeRef = useRef({ width: 0, height: 0 });
  const computedValuesRef = useRef(createComputedValueSystem());
  const particleManagerRef = useRef<ParticleEffectManager>(createParticleEffectManager());
  const gameVariablesRef = useRef<Record<string, any>>({});
  const [particleEffects, setParticleEffects] = useState<Array<{ particles: any[]; config: any }>>([]);

  const timeScaleRef = useRef(1.0);
  const timeScaleTargetRef = useRef(1.0);
  const timeScaleTransitionRef = useRef<{ startScale: number; endScale: number; duration: number; elapsed: number; restoreAfter?: number } | null>(null);

  const {
    inputRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useGameInput({
    cameraRef,
    gameRef,
    physicsRef,
    viewportSystemRef,
  });

  const [isReady, setIsReady] = useState(false);
  const [entities, setEntities] = useState<RuntimeEntity[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    time: 0,
    state: "loading",
    variables: {},
  });
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [viewportRect, setViewportRect] = useState<ViewportRect>({ x: 0, y: 0, width: 0, height: 0, scale: 1 });

  const viewportSystem = useMemo(() => {
    const presentationConfig = definition.presentation;
    return new ViewportSystem(definition.world.bounds, {
      aspectRatio: presentationConfig?.aspectRatio,
      fit: presentationConfig?.fit,
      letterboxColor: presentationConfig?.letterboxColor ?? definition.ui?.backgroundColor,
    });
  }, [definition.presentation, definition.world.bounds, definition.ui?.backgroundColor]);

  viewportSystemRef.current = viewportSystem;

  const activePackId = activeAssetPackId ?? definition.activeAssetPackId;
  const assetOverrides =
    activePackId && definition.assetPacks
      ? definition.assetPacks[activePackId]?.assets
      : undefined;
  const allAssetPacks = definition.assetPacks;

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

        if (definition.variables) {
          const resolvedVars: Record<string, any> = {};
          for (const [key, value] of Object.entries(definition.variables)) {
            if (typeof value === 'object' && value !== null && 'expr' in value) {
              resolvedVars[key] = 0;
            } else {
              resolvedVars[key] = value;
            }
          }
          gameVariablesRef.current = resolvedVars;
        }

        collisionUnsubRef.current = physics.onCollisionBegin(
          (event: CollisionEvent) => {
            const entityA = game.entityManager
              .getActiveEntities()
              .find((e) => e.bodyId?.value === event.bodyA.value);
            const entityB = game.entityManager
              .getActiveEntities()
              .find((e) => e.bodyId?.value === event.bodyB.value);

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
            }
          },
        );

        sensorUnsubRef.current = physics.onSensorBegin((event) => {
          const sensorEntity = game.entityManager
            .getActiveEntities()
            .find((e) => e.colliderId?.value === event.sensor.value);
          const otherEntity = game.entityManager
            .getActiveEntities()
            .find((e) => e.bodyId?.value === event.otherBody.value);

          if (sensorEntity && otherEntity) {
            collisionsRef.current.push({
              entityA: sensorEntity,
              entityB: otherEntity,
              normal: { x: 0, y: 0 },
              impulse: 0,
            });
          }
        });

        const camera = CameraSystem.fromGameConfig(
          definition.camera,
          definition.world.bounds,
          { width: 800, height: 600 },
          definition.world.pixelsPerMeter ?? 50,
        );
        cameraRef.current = camera;
        
        if (screenSizeRef.current.width > 0 && viewportSystemRef.current) {
          viewportSystemRef.current.updateScreenSize(screenSizeRef.current);
          const currentViewport = viewportSystemRef.current.getViewportRect();
          camera.updateViewport({ width: currentViewport.width, height: currentViewport.height });
          camera.updatePixelsPerMeter(currentViewport.scale);
          setViewportRect(currentViewport);
        }

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
          onVariablesChange: (variables) => {
            setGameState((s) => ({ ...s, variables }));
          },
        });

        const visibleEntities = game.entityManager.getVisibleEntities();
        setEntities(visibleEntities);
        const initialVariables = game.rulesEvaluator.getVariables();
        setGameState((s) => ({ ...s, state: "ready", variables: initialVariables }));
        setIsReady(true);
      } catch (error) {
        console.error("[GameRuntime] Failed to initialize game:", error);
      }
    };

    setup();

    return () => {
      collisionUnsubRef.current?.();
      collisionUnsubRef.current = null;
      sensorUnsubRef.current?.();
      sensorUnsubRef.current = null;
      if (gameRef.current && loaderRef.current) {
        loaderRef.current.unload(gameRef.current);
      }
      physicsRef.current = null;
      gameRef.current = null;
      loaderRef.current = null;
      cameraRef.current = null;
    };
  }, [definition, onGameEnd, onScoreChange]); // handleTouchStart/End depend on this scope, or we rely on ref freshness. 
  // Actually, handleTouchStart uses refs mostly, but let's check.
  // It uses `showDebugOverlays` which is a prop.
  // So we should add it.

  const setTimeScale = useCallback((scale: number, duration?: number) => {
    const transition = timeScaleTransitionRef.current;
    const currentScale = timeScaleRef.current;
    
    if (duration && duration > 0) {
      timeScaleTransitionRef.current = {
        startScale: currentScale,
        endScale: scale,
        duration: 0.2,
        elapsed: 0,
        restoreAfter: duration,
      };
    } else {
      timeScaleRef.current = scale;
      timeScaleTargetRef.current = scale;
      timeScaleTransitionRef.current = null;
    }
  }, []);

  const stepGame = useCallback((rawDt: number) => {
    const physics = physicsRef.current;
    const game = gameRef.current;
    const camera = cameraRef.current;
    if (!physics || !game || !camera) {
      return;
    }

    if (game.rulesEvaluator.getGameStateValue() !== "playing") return;

    const transition = timeScaleTransitionRef.current;
    if (transition) {
      transition.elapsed += rawDt;
      const t = Math.min(1, transition.elapsed / transition.duration);
      const eased = t * t * (3 - 2 * t);
      timeScaleRef.current = transition.startScale + (transition.endScale - transition.startScale) * eased;
      
      if (t >= 1) {
        timeScaleRef.current = transition.endScale;
        if (transition.restoreAfter) {
          timeScaleTransitionRef.current = {
            startScale: transition.endScale,
            endScale: 1.0,
            duration: 0.2,
            elapsed: -transition.restoreAfter,
          };
        } else {
          timeScaleTransitionRef.current = null;
        }
      }
    }

    const dt = rawDt * timeScaleRef.current;
    if (dt <= 0) return;

    physics.step(dt, 8, 3);

    game.entityManager.syncTransformsFromPhysics();

    camera.update(dt, (id) => game.entityManager.getEntity(id));

    elapsedRef.current += dt;
    frameIdRef.current += 1;

    const fullGameState = game.rulesEvaluator.getFullState();
    const computedValues = computedValuesRef.current;
    
    const createEvalContext = (entity?: RuntimeEntity): EvalContext => {
      const velocity = entity?.bodyId ? physics.getLinearVelocity(entity.bodyId) : { x: 0, y: 0 };
      return {
        score: fullGameState.score,
        lives: fullGameState.lives,
        time: elapsedRef.current,
        wave: 1,
        dt,
        frameId: frameIdRef.current,
        variables: gameVariablesRef.current,
        random: Math.random,
        entityManager: game.entityManager,
        self: entity ? {
          id: entity.id,
          transform: entity.transform,
          velocity,
          health: 100,
          maxHealth: 100,
        } : undefined,
      };
    };

    const baseEvalContext = createEvalContext();

    const behaviorContext: Omit<BehaviorContext, "entity" | "resolveNumber" | "resolveVec2"> = {
      dt,
      elapsed: elapsedRef.current,
      input: inputRef.current,
      gameState: fullGameState,
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
      triggerParticleEffect: (type: ParticleEmitterType, x: number, y: number) => {
        const worldX = x * game.pixelsPerMeter;
        const worldY = y * game.pixelsPerMeter;
        particleManagerRef.current.triggerEffect(type, worldX, worldY);
      },
      createEntityEmitter: (type: ParticleEmitterType, x: number, y: number) => {
        const worldX = x * game.pixelsPerMeter;
        const worldY = y * game.pixelsPerMeter;
        return particleManagerRef.current.triggerEffect(type, worldX, worldY, { continuous: true });
      },
      updateEmitterPosition: (emitterId: string, x: number, y: number) => {
        const worldX = x * game.pixelsPerMeter;
        const worldY = y * game.pixelsPerMeter;
        particleManagerRef.current.updateEffectPosition(emitterId, worldX, worldY);
      },
      stopEmitter: (emitterId: string) => {
        particleManagerRef.current.stopEffect(emitterId);
      },
      
      computedValues,
      evalContext: baseEvalContext,
      createEvalContextForEntity: createEvalContext,
    };

    game.behaviorExecutor.executeAll(
      game.entityManager.getActiveEntities(),
      behaviorContext,
    );

    const inputEvents: import('./BehaviorContext').InputEvents = {};
    if (inputRef.current.tap) {
      inputEvents.tap = inputRef.current.tap;
      console.log('[GameRuntime] Passing tap to rules:', inputEvents.tap);
    }
    if (inputRef.current.dragEnd) {
      inputEvents.dragEnd = inputRef.current.dragEnd;
      console.log('[GameRuntime] Passing dragEnd to rules:', inputEvents.dragEnd);
    }

    game.rulesEvaluator.update(
      dt,
      game.entityManager,
      collisionsRef.current,
      inputRef.current,
      inputEvents,
      physics,
      computedValues,
      baseEvalContext,
      camera,
      setTimeScale
    );

    inputRef.current = {};
    collisionsRef.current = [];

    particleManagerRef.current.update(dt);
    setParticleEffects(particleManagerRef.current.getAllActiveParticles());

    setEntities([...game.entityManager.getVisibleEntities()]);
    setGameState((s) => ({ ...s, time: elapsedRef.current }));
  }, [inputRef, setTimeScale]);

  useSimplePhysicsLoop(stepGame, isReady && gameState.state === "playing");

  const handleStart = useCallback(() => {
    gameRef.current?.rulesEvaluator.start();
  }, []);

  const handleRestart = useCallback(() => {
    if (onRequestRestart) {
      onRequestRestart();
      return;
    }
    
    if (gameRef.current && loaderRef.current && cameraRef.current) {
      const newGame = loaderRef.current.reload(gameRef.current);
      gameRef.current = newGame;
      elapsedRef.current = 0;

      cameraRef.current.setPosition({ x: 0, y: 0 });
      cameraRef.current.setZoom(definition.camera?.zoom ?? 1);

      timeScaleRef.current = 1.0;
      timeScaleTargetRef.current = 1.0;
      timeScaleTransitionRef.current = null;

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
      particleManagerRef.current.clear();
      setParticleEffects([]);
      setEntities(newGame.entityManager.getVisibleEntities());
      const initialVariables = newGame.rulesEvaluator.getVariables();
      setGameState({ score: 0, lives: 3, time: 0, state: "ready", variables: initialVariables });
    }
  }, [onGameEnd, onScoreChange, onRequestRestart, definition.camera?.zoom]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      console.log("[GameRuntime] onLayout fired, screen:", { width, height });
      screenSizeRef.current = { width, height };
      setScreenSize({ width, height });
      
      if (viewportSystemRef.current) {
        viewportSystemRef.current.updateScreenSize({ width, height });
        const newViewportRect = viewportSystemRef.current.getViewportRect();
        setViewportRect(newViewportRect);
        
        cameraRef.current?.updateViewport({ 
          width: newViewportRect.width, 
          height: newViewportRect.height 
        });
        cameraRef.current?.updatePixelsPerMeter(newViewportRect.scale);
      }
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
    [inputRef],
  );

  const pixelsPerMeter = viewportRect.scale > 0 ? viewportRect.scale : (gameRef.current?.pixelsPerMeter ?? 50);

  const backgroundColor = definition.ui?.backgroundColor ?? "#87CEEB";
  const letterboxColor = definition.presentation?.letterboxColor ?? "#000000";

  const shakeOffset = cameraRef.current?.getShakeOffset() ?? { x: 0, y: 0 };
  const zoomEffectScale = cameraRef.current?.getZoomEffectScale() ?? 1;

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

  const hasViewport = viewportRect.width > 0 && viewportRect.height > 0;

  return (
    <View style={[styles.container, { backgroundColor: letterboxColor }]} onLayout={handleLayout}>
      {hasViewport && (
        <View
          style={[
            styles.viewportContainer,
            {
              left: viewportRect.x,
              top: viewportRect.y,
              width: viewportRect.width,
              height: viewportRect.height,
            },
          ]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
        >
          <Canvas style={styles.canvas}>
            <Fill color={backgroundColor} />
            {parallaxBgConfig && (
              <ParallaxBackground
                config={parallaxBgConfig}
                cameraX={cameraPosition.x}
                cameraY={cameraPosition.y}
                cameraZoom={cameraZoom}
                viewportWidth={viewportRect.width}
                viewportHeight={viewportRect.height}
                pixelsPerMeter={pixelsPerMeter}
              />
            )}
            <Group 
              transform={[
                { translateX: shakeOffset.x }, 
                { translateY: shakeOffset.y },
                { translateX: viewportRect.width / 2 },
                { translateY: viewportRect.height / 2 },
                { scale: zoomEffectScale },
                { translateX: -viewportRect.width / 2 },
                { translateY: -viewportRect.height / 2 },
              ]}
            >
              {entities.map((entity) => (
                <EntityRenderer
                  key={entity.id}
                  entity={entity}
                  pixelsPerMeter={pixelsPerMeter}
                  renderMode={renderMode}
                  showDebugOverlays={showDebugOverlays}
                  assetOverrides={assetOverrides}
                  allAssetPacks={allAssetPacks}
                />
              ))}
              {particleEffects.map((effect, index) => (
                <ParticleSystemRenderer
                  key={`particles-${index}`}
                  particles={effect.particles}
                  renderStyle={effect.config.renderStyle}
                  blendMode={effect.config.blendMode}
                />
              ))}
            </Group>
            {showDebugOverlays && (
              <DebugInputOverlay
                input={inputRef}
                width={viewportRect.width}
                height={viewportRect.height}
              />
            )}
          </Canvas>
        </View>
      )}

      {showHUD && hasViewport && (
        <View style={[
          styles.hud,
          {
            left: viewportRect.x + 20,
            top: viewportRect.y + 40,
            right: screenSize.width - viewportRect.x - viewportRect.width + 20,
          }
        ]}>
          {definition.ui?.showScore !== false && (
            <Text style={styles.scoreText}>Score: {gameState.score}</Text>
          )}
          {definition.ui?.showTimer && (
            <Text style={styles.timerText}>
              Time: {Math.floor(gameState.time)}s
            </Text>
          )}
          {definition.ui?.showLives && (
            <Text style={styles.livesText}>{definition.ui?.livesLabel ?? 'Lives'}: {gameState.lives}</Text>
          )}
          {definition.ui?.entityCountDisplays?.map((display) => {
            const count = gameRef.current?.entityManager.getEntitiesByTag(display.tag).length ?? 0;
            return (
              <Text 
                key={display.tag} 
                style={[styles.livesText, display.color ? { color: display.color } : undefined]}
              >
                {display.label}: {count}
              </Text>
            );
          })}
          {definition.ui?.variableDisplays?.map((display) => {
            const value = gameState.variables[display.name];
            const shouldShow = display.showWhen !== 'not_default' || value !== display.defaultValue;
            if (!shouldShow) return null;
            const formattedValue = display.format 
              ? display.format.replace('{value}', String(value))
              : String(value);
            return (
              <Text 
                key={display.name} 
                style={[styles.livesText, display.color ? { color: display.color } : undefined]}
              >
                {display.label}: {formattedValue}
              </Text>
            );
          })}
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
  viewportContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
  },
  hud: {
    position: "absolute",
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
