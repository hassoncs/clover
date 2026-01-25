import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import type { GameDefinition, ParticleEmitterType, EvalContext, ExpressionValueType, TapZoneButton, VirtualButtonType, DPadDirection, AssetSheet, PropertyWatchSpec } from "@slopcade/shared";
import { createComputedValueSystem, getAllSystemExpressionFunctions, DependencyAnalyzer, PropertyCache, EntityContextProxy } from "@slopcade/shared";
import { GodotView, createGodotBridge, createGodotPhysicsAdapter } from "../godot";
import { PropertySyncManager } from "../godot/PropertySyncManager";
import type { GodotBridge } from "../godot/types";
import type { Physics2D, CollisionEvent, Unsubscribe } from "../physics2d";
import { GameLoader, type LoadedGame } from "./GameLoader";
import type { RuntimeEntity } from "./types";
import type {
  BehaviorContext,
  GameState,
  CollisionInfo,
} from "./BehaviorContext";
import { CameraSystem } from "./CameraSystem";
import { ViewportSystem, type ViewportRect } from "./ViewportSystem";
import { InputEntityManager, type InputState as InputEntityState } from "./InputEntityManager";
import { TapZoneOverlay } from "./TapZoneOverlay";
import { VirtualButtonsOverlay } from "./VirtualButtonsOverlay";
import { VirtualJoystickOverlay, type JoystickState } from "./VirtualJoystickOverlay";
import { VirtualDPadOverlay } from "./VirtualDPadOverlay";
import { useTiltInput } from "./hooks/useTiltInput";
import { Match3GameSystem, type Match3Config } from "./systems/Match3GameSystem";

export interface GameRuntimeGodotProps {
  definition: GameDefinition;
  onGameEnd?: (state: "won" | "lost") => void;
  onScoreChange?: (score: number) => void;
  onBackToMenu?: () => void;
  onRequestRestart?: () => void;
  showHUD?: boolean;
  enablePerfLogging?: boolean;
}

const GAME_LOOP_INTERVAL = 16;

export function GameRuntimeGodot({
  definition,
  onGameEnd,
  onScoreChange,
  onBackToMenu,
  onRequestRestart,
  showHUD = true,
  enablePerfLogging = false,
}: GameRuntimeGodotProps) {
  const bridgeRef = useRef<GodotBridge | null>(null);
  const physicsRef = useRef<Physics2D | null>(null);
  const gameRef = useRef<LoadedGame | null>(null);
  const loaderRef = useRef<GameLoader | null>(null);
  const cameraRef = useRef<CameraSystem | null>(null);
  const viewportSystemRef = useRef<ViewportSystem | null>(null);
  const inputEntityManagerRef = useRef<InputEntityManager | null>(null);
  const match3SystemRef = useRef<Match3GameSystem | null>(null);
  const propertyCacheRef = useRef(new PropertyCache());
  const propertySyncManagerRef = useRef<PropertySyncManager | null>(null);
  const elapsedRef = useRef(0);
  const frameIdRef = useRef(0);
  const collisionsRef = useRef<CollisionInfo[]>([]);
  const collisionUnsubRef = useRef<Unsubscribe | null>(null);
  const sensorUnsubRef = useRef<Unsubscribe | null>(null);
  const inputEventUnsubRef = useRef<Unsubscribe | null>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(0);
  const screenSizeRef = useRef({ width: 0, height: 0 });
  const computedValuesRef = useRef(createComputedValueSystem());
  const gameVariablesRef = useRef<Record<string, ExpressionValueType>>({});
  const inputRef = useRef<Record<string, unknown>>({});
  const buttonsRef = useRef<Record<string, boolean>>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false,
  });
  const joystickRef = useRef<JoystickState>({
    x: 0,
    y: 0,
    magnitude: 0,
    angle: 0,
  });
  const gameJustStartedRef = useRef(false);

  const handleTiltUpdate = useCallback((tilt: { x: number; y: number }) => {
    inputRef.current.tilt = tilt;
  }, []);

  useTiltInput(
    {
      enabled: definition.input?.tilt?.enabled ?? false,
      sensitivity: definition.input?.tilt?.sensitivity,
      updateInterval: definition.input?.tilt?.updateInterval,
    },
    handleTiltUpdate
  );

  const timeScaleRef = useRef(1.0);
  const timeScaleTargetRef = useRef(1.0);
  const timeScaleTransitionRef = useRef<{ 
    startScale: number; 
    endScale: number; 
    duration: number; 
    elapsed: number; 
    restoreAfter?: number 
  } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [godotReady, setGodotReady] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    time: 0,
    state: "loading",
    variables: {},
  });
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [viewportRect, setViewportRect] = useState<ViewportRect>({ 
    x: 0, y: 0, width: 0, height: 0, scale: 1 
  });

  const viewportSystem = useMemo(() => {
    const presentationConfig = definition.presentation;
    return new ViewportSystem(definition.world.bounds, {
      aspectRatio: presentationConfig?.aspectRatio,
      fit: presentationConfig?.fit,
      letterboxColor: presentationConfig?.letterboxColor ?? definition.ui?.backgroundColor,
    });
  }, [definition.presentation, definition.world.bounds, definition.ui?.backgroundColor]);

  viewportSystemRef.current = viewportSystem;

  const handleGodotReady = useCallback(() => {
    console.log("[GameRuntime.godot] Godot view ready");
    setGodotReady(true);
  }, []);

  const handleGodotError = useCallback((error: Error) => {
    console.error("[GameRuntime.godot] Godot error:", error);
  }, []);

  useEffect(() => {
    if (!godotReady) return;

    const setup = async () => {
      try {
        console.log("[GameRuntime.godot] Starting setup...");
        
        const bridge = await createGodotBridge();
        await bridge.initialize();
        bridgeRef.current = bridge;
        console.log("[GameRuntime.godot] Bridge initialized");

        const physics = createGodotPhysicsAdapter(bridge);
        physicsRef.current = physics;
        console.log("[GameRuntime.godot] Physics adapter created");

        await bridge.loadGame(definition);
        console.log("[GameRuntime.godot] Game loaded into Godot");

        const analyzer = new DependencyAnalyzer(definition);
        const report = analyzer.analyze();
        const watches = analyzer.getWatchSpecs();
        
        if (report.errors.length > 0) {
          console.warn('[GameRuntime.godot] Property watching validation errors:', report.errors);
        }
        if (report.warnings.length > 0) {
          console.log('[GameRuntime.godot] Property watching warnings:', report.warnings);
        }
        
        console.log('[GameRuntime.godot] Property watching:', {
          valid: report.valid,
          watchCount: watches.length,
          properties: [...new Set(watches.map((w: PropertyWatchSpec) => w.property))],
          stats: report.stats,
        });

        const { WatchRegistry } = await import("@slopcade/shared");
        const registry = new WatchRegistry();
        registry.addWatches(watches);
        const activeConfig = registry.getActiveConfig();
        
        const serializeMapOfSetsToJSON = (map: Map<string, Set<string>>): Record<string, string[]> => {
          const result: Record<string, string[]> = {};
          for (const [key, set] of map.entries()) {
            result[key] = Array.from(set);
          }
          return result;
        };
        
        const serializableConfig = {
          frameProperties: Array.from(activeConfig.frameProperties),
          changeProperties: serializeMapOfSetsToJSON(activeConfig.changeProperties),
          entityWatches: serializeMapOfSetsToJSON(activeConfig.entityWatches),
          tagWatches: serializeMapOfSetsToJSON(activeConfig.tagWatches),
        };
        
        bridge.setWatchConfig(serializableConfig);
        console.log('[GameRuntime.godot] Sent watch config to Godot:', serializableConfig);

        const propertySync = new PropertySyncManager(propertyCacheRef.current);
        propertySync.start(bridge);
        propertySyncManagerRef.current = propertySync;
        console.log("[GameRuntime.godot] Property sync started");

        const loader = new GameLoader({ physics });
        loaderRef.current = loader;

        const game = loader.load(definition);
        gameRef.current = game;

        const inputEntityManager = new InputEntityManager();
        inputEntityManagerRef.current = inputEntityManager;

        if (definition.match3) {
          const match3System = new Match3GameSystem(
            definition.match3 as Match3Config,
            game.entityManager,
            {
              onScoreAdd: (points) => game.rulesEvaluator.addScore(points),
              onMatchFound: (count, cascade) => {
                console.log(`[Match3] Match found: ${count} pieces, cascade #${cascade}`);
              },
              onBoardReady: () => {
                console.log('[Match3] Board ready');
              },
            }
          );
          match3System.setBridge(bridge);
          match3SystemRef.current = match3System;
        }

        if (definition.variables) {
          const resolvedVars: Record<string, ExpressionValueType> = {};
          for (const [key, value] of Object.entries(definition.variables)) {
            if (typeof value === 'object' && value !== null && 'expr' in value) {
              resolvedVars[key] = 0;
            } else {
              resolvedVars[key] = value as ExpressionValueType;
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

        inputEventUnsubRef.current = bridge.onInputEvent((type, x, y, _entityId) => {
          if (type === "tap") {
            const ppm = definition.world.pixelsPerMeter ?? 50;
            const screenX = x * ppm;
            const screenY = y * ppm;
            console.log('[GameRuntime] onInputEvent tap received:', { x, y, screenX, screenY });
            inputRef.current = {
              ...inputRef.current,
              tap: { x: screenX, y: screenY, worldX: x, worldY: y },
            };
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

        // Camera stays at origin (0,0) - Godot owns camera positioning now
        // We still keep the CameraSystem for screen-to-world coordinate transforms

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

        const initialVariables = game.rulesEvaluator.getVariables();
        setGameState((s) => ({ ...s, state: "ready", variables: initialVariables }));
        setIsReady(true);

         if (match3SystemRef.current) {
           const match3Config = definition.match3 as Match3Config;
           if (match3Config.variantSheet?.enabled && match3Config.variantSheet.metadataUrl) {
             try {
               const response = await fetch(match3Config.variantSheet.metadataUrl);
               const metadata = await response.json();
               match3SystemRef.current.setSheetMetadata(metadata as AssetSheet);
             } catch (error) {
               console.error('[GameRuntime.godot] Failed to load variant sheet metadata:', error);
             }
           }
           match3SystemRef.current.initialize();
         }
      } catch (error) {
        console.error("[GameRuntime.godot] Failed to initialize game:", error);
      }
    };

    setup();

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      collisionUnsubRef.current?.();
      collisionUnsubRef.current = null;
      sensorUnsubRef.current?.();
      sensorUnsubRef.current = null;
      inputEventUnsubRef.current?.();
      inputEventUnsubRef.current = null;
      match3SystemRef.current?.destroy();
      match3SystemRef.current = null;
      propertySyncManagerRef.current?.stop();
      propertySyncManagerRef.current = null;
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
      physicsRef.current = null;
      gameRef.current = null;
      loaderRef.current = null;
      cameraRef.current = null;
    };
  }, [godotReady, definition, onGameEnd, onScoreChange]);

  const setTimeScale = useCallback((scale: number, duration?: number) => {
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
    const bridge = bridgeRef.current;
    if (!physics || !game || !camera || !bridge) {
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

    const frameStart = enablePerfLogging ? performance.now() : 0;

    game.entityManager.syncTransformsFromPhysics();

    const inputEntityManager = inputEntityManagerRef.current;
    if (inputEntityManager) {
      const currentInput = inputRef.current as Record<string, unknown>;
      inputEntityManager.syncFromInput({
        mouse: currentInput.mouse as InputEntityState['mouse'],
        tap: currentInput.tap as InputEntityState['tap'],
        drag: currentInput.drag as InputEntityState['drag'],
      });
    }

    camera.update(dt, (id) => game.entityManager.getEntity(id));

    elapsedRef.current += dt;
    frameIdRef.current += 1;

    const fullGameState = game.rulesEvaluator.getFullState();
    const computedValues = computedValuesRef.current;

    const createEvalContext = (entity?: RuntimeEntity): EvalContext => {
      let selfContext: EvalContext['self'] | undefined;
      
      if (entity) {
        const propertySyncEnabled = propertyCacheRef.current;
        
        if (propertySyncEnabled) {
          const entityProxy = EntityContextProxy.createEntityContext(
            propertyCacheRef.current,
            entity.id
          );
          
          const velocity = entity.bodyId ? physics.getLinearVelocity(entity.bodyId) : { x: 0, y: 0 };
          const transform = (entityProxy.transform as { x: number; y: number; angle: number }) || entity.transform;
          const syncedVelocity = (entityProxy.velocity as { x: number; y: number }) || velocity;
          
          selfContext = {
            id: entity.id,
            transform,
            velocity: syncedVelocity,
            health: (entityProxy.health as number) ?? 100,
            maxHealth: (entityProxy.maxHealth as number) ?? 100,
          };
        } else {
          const velocity = entity.bodyId ? physics.getLinearVelocity(entity.bodyId) : { x: 0, y: 0 };
          selfContext = {
            id: entity.id,
            transform: entity.transform,
            velocity,
            health: 100,
            maxHealth: 100,
          };
        }
      }
      
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
        customFunctions: getAllSystemExpressionFunctions(),
        self: selfContext,
      };
    };

    const baseEvalContext = createEvalContext();

    const inputSnapshot = inputRef.current;

    const match3System = match3SystemRef.current;
    if (match3System) {
      const tapInput = inputSnapshot.tap as { worldX: number; worldY: number } | undefined;
      if (tapInput) {
        match3System.handleTap(tapInput.worldX, tapInput.worldY);
      }
      const mouseInput = inputSnapshot.mouse as { worldX: number; worldY: number } | undefined;
      if (mouseInput) {
        match3System.handleMouseMove(mouseInput.worldX, mouseInput.worldY);
      }
      match3System.update(dt);
    }
    
    const behaviorContext: Omit<BehaviorContext, "entity" | "resolveNumber" | "resolveVec2"> = {
      dt,
      elapsed: elapsedRef.current,
      input: inputSnapshot,
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
        bridge.spawnParticle(type, x, y);
      },
      createEntityEmitter: (_type: ParticleEmitterType, _x: number, _y: number) => {
        return `emitter_${Date.now()}`;
      },
      updateEmitterPosition: (_emitterId: string, _x: number, _y: number) => {
      },
      stopEmitter: (_emitterId: string) => {
      },
      playSound: (soundId: string) => {
        bridge.playSound(soundId);
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
    const currentInput = inputRef.current as Record<string, unknown>;
    if (currentInput.tap) {
      inputEvents.tap = currentInput.tap as { x: number; y: number; worldX: number; worldY: number };
      console.log('[GameRuntime] inputEvents.tap SET:', inputEvents.tap);
    }
    if (currentInput.dragEnd) {
      inputEvents.dragEnd = currentInput.dragEnd as { velocityX: number; velocityY: number; worldVelocityX: number; worldVelocityY: number };
    }
    if (gameJustStartedRef.current) {
      inputEvents.gameStarted = true;
      gameJustStartedRef.current = false;
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
      setTimeScale,
      inputEntityManager ?? undefined,
      (soundId: string, _volume?: number) => {
        bridge.playSound(soundId);
      },
      bridge
    );

    const preservedDrag = inputRef.current.drag;
    const preservedButtons = inputRef.current.buttons;
    const preservedMouse = inputRef.current.mouse;
    const preservedTilt = inputRef.current.tilt;
    inputRef.current = {};
    if (preservedDrag && !inputEvents.dragEnd) {
      inputRef.current.drag = preservedDrag;
    }
    if (preservedButtons) {
      inputRef.current.buttons = preservedButtons;
    }
    if (preservedMouse) {
      inputRef.current.mouse = preservedMouse;
    }
    if (preservedTilt) {
      inputRef.current.tilt = preservedTilt;
    }
    collisionsRef.current = [];

    setGameState((s) => ({ ...s, time: elapsedRef.current }));

    if (enablePerfLogging) {
      const frameEnd = performance.now();
      const frameMs = frameEnd - frameStart;
      if (frameIdRef.current % 60 === 0) {
        console.log(`[Perf.godot] frame=${frameMs.toFixed(2)}ms`);
      }
    }
  }, [setTimeScale, enablePerfLogging]);

  useEffect(() => {
    if (!isReady || gameState.state !== "playing") {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    lastTickRef.current = performance.now();
    gameLoopRef.current = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTickRef.current) / 1000, 0.1);
      lastTickRef.current = now;
      stepGame(dt);
    }, GAME_LOOP_INTERVAL);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [isReady, gameState.state, stepGame]);

  // Keyboard input handling (web only)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let changed = false;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          if (!buttonsRef.current.left) {
            buttonsRef.current.left = true;
            changed = true;
          }
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (!buttonsRef.current.right) {
            buttonsRef.current.right = true;
            changed = true;
          }
          break;
        case "ArrowUp":
        case "w":
        case "W":
          if (!buttonsRef.current.up) {
            buttonsRef.current.up = true;
            changed = true;
          }
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (!buttonsRef.current.down) {
            buttonsRef.current.down = true;
            changed = true;
          }
          break;
        case " ":
          if (!buttonsRef.current.jump) {
            buttonsRef.current.jump = true;
            changed = true;
          }
          break;
      }
      if (changed) {
        inputRef.current.buttons = { ...buttonsRef.current };
      }
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

    // Use capture phase to catch events before iframe steals focus
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = viewportContainerRef.current;
      if (!container) return;
      
      const rect = (container as unknown as HTMLElement).getBoundingClientRect?.();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        inputRef.current.mouse = undefined;
        return;
      }

      const camera = cameraRef.current;
      const viewportSystem = viewportSystemRef.current;
      
      let world = { x: 0, y: 0 };
      if (camera && viewportSystem) {
        world = viewportSystem.viewportToWorld(x, y, camera.getPosition(), camera.getZoom());
        
        if (Math.random() < 0.02) {
          const viewportRect = viewportSystem.getViewportRect();
          console.log('[handleMouseMove] Debug:', {
            containerXY: { x: x.toFixed(1), y: y.toFixed(1) },
            viewportRect: { w: viewportRect.width.toFixed(0), h: viewportRect.height.toFixed(0), scale: viewportRect.scale.toFixed(2) },
            cameraPos: camera.getPosition(),
            world: { x: world.x.toFixed(2), y: world.y.toFixed(2) },
          });
        }
      }

      inputRef.current.mouse = { x, y, worldX: world.x, worldY: world.y };
    };

    const handleMouseLeave = () => {
      inputRef.current.mouse = undefined;
    };

    const handleClick = (e: MouseEvent) => {
      const container = viewportContainerRef.current;
      if (!container) return;
      
      const rect = (container as unknown as HTMLElement).getBoundingClientRect?.();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return;
      }
      
      const camera = cameraRef.current;
      const viewportSystem = viewportSystemRef.current;
      
      let world = { x: 0, y: 0 };
      if (camera && viewportSystem) {
        world = viewportSystem.viewportToWorld(x, y, camera.getPosition(), camera.getZoom());
      }
      
      console.log('[CLICK] Mouse clicked - setting tap:', {
        containerXY: { x, y },
        worldXY: world,
      });
      
      inputRef.current = {
        ...inputRef.current,
        tap: { x, y, worldX: world.x, worldY: world.y },
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  const handleStart = useCallback(() => {
    gameRef.current?.rulesEvaluator.start();
    gameJustStartedRef.current = true;
  }, []);

  const handleRestart = useCallback(() => {
    if (onRequestRestart) {
      onRequestRestart();
      return;
    }

    if (gameRef.current && loaderRef.current && cameraRef.current && bridgeRef.current) {
      bridgeRef.current.clearGame();
      bridgeRef.current.loadGame(definition);

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

      const initialVariables = newGame.rulesEvaluator.getVariables();
      setGameState({ score: 0, lives: 3, time: 0, state: "ready", variables: initialVariables });
    }
  }, [onGameEnd, onScoreChange, onRequestRestart, definition]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      console.log("[GameRuntime.godot] onLayout fired, screen:", { width, height });
      screenSizeRef.current = { width, height };
      setScreenSize({ width, height });

      if (viewportSystemRef.current) {
        viewportSystemRef.current.updateScreenSize({ width, height });
        const newViewportRect = viewportSystemRef.current.getViewportRect();
        setViewportRect(newViewportRect);

        cameraRef.current?.updateViewport({
          width: newViewportRect.width,
          height: newViewportRect.height,
        });
        cameraRef.current?.updatePixelsPerMeter(newViewportRect.scale);
      }
    },
    [],
  );

  const dragStartRef = useRef<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
  const viewportContainerRef = useRef<View>(null);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const camera = cameraRef.current;
    const vs = viewportSystemRef.current;
    if (!camera) return { x: 0, y: 0 };
    
    if (vs) {
      return vs.viewportToWorld(screenX, screenY, camera.getPosition(), camera.getZoom());
    }
    return camera.screenToWorld(screenX, screenY);
  }, []);

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    
    const { locationX: x, locationY: y } = event.nativeEvent;
    const world = screenToWorld(x, y);
    
    dragStartRef.current = { x, y, worldX: world.x, worldY: world.y };
    
    inputRef.current = {
      ...inputRef.current,
      drag: {
        startX: x, startY: y, currentX: x, currentY: y,
        startWorldX: world.x, startWorldY: world.y,
        currentWorldX: world.x, currentWorldY: world.y,
      },
    };
    
    bridge.sendInput('drag_start', { x: world.x, y: world.y });
  }, [screenToWorld]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const bridge = bridgeRef.current;
    const dragStart = dragStartRef.current;
    if (!bridge || !dragStart) return;
    
    const { locationX: x, locationY: y } = event.nativeEvent;
    const world = screenToWorld(x, y);
    
    inputRef.current = {
      ...inputRef.current,
      drag: {
        startX: dragStart.x, startY: dragStart.y,
        currentX: x, currentY: y,
        startWorldX: dragStart.worldX, startWorldY: dragStart.worldY,
        currentWorldX: world.x, currentWorldY: world.y,
      },
    };
    
    bridge.sendInput('drag_move', { x: world.x, y: world.y });
  }, [screenToWorld]);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    const bridge = bridgeRef.current;
    const dragStart = dragStartRef.current;
    if (!bridge) return;
    
    const { locationX: x, locationY: y } = event.nativeEvent;
    const world = screenToWorld(x, y);
    
    console.log('[GameRuntime] handleTouchEnd - SETTING tap:', { x, y, worldX: world.x, worldY: world.y });
    inputRef.current = {
      ...inputRef.current,
      tap: { x, y, worldX: world.x, worldY: world.y },
    };
    console.log('[GameRuntime] handleTouchEnd - inputRef.current now:', inputRef.current);
    
    if (dragStart) {
      const VELOCITY_SCALE = 0.1;
      inputRef.current.dragEnd = {
        velocityX: (x - dragStart.x) * VELOCITY_SCALE,
        velocityY: (y - dragStart.y) * VELOCITY_SCALE,
        worldVelocityX: (world.x - dragStart.worldX) * VELOCITY_SCALE,
        worldVelocityY: (world.y - dragStart.worldY) * VELOCITY_SCALE,
      };
    }
    
    bridge.sendInput('tap', { x: world.x, y: world.y });
    bridge.sendInput('drag_end', { x: world.x, y: world.y });
    
    dragStartRef.current = null;
    inputRef.current.drag = undefined;
  }, [screenToWorld]);

  const handleZonePress = useCallback((button: TapZoneButton, pressed: boolean) => {
    buttonsRef.current[button] = pressed;
    inputRef.current.buttons = { ...buttonsRef.current };
  }, []);

  const handleVirtualButtonPress = useCallback((button: VirtualButtonType, pressed: boolean) => {
    buttonsRef.current[button] = pressed;
    inputRef.current.buttons = { ...buttonsRef.current };
  }, []);

  const handleJoystickMove = useCallback((state: JoystickState) => {
    joystickRef.current = state;

    const threshold = 0.5;
    buttonsRef.current.left = state.x < -threshold;
    buttonsRef.current.right = state.x > threshold;
    buttonsRef.current.up = state.y < -threshold;
    buttonsRef.current.down = state.y > threshold;

    inputRef.current.buttons = { ...buttonsRef.current };
    inputRef.current.joystick = { ...joystickRef.current };
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickRef.current = { x: 0, y: 0, magnitude: 0, angle: 0 };

    buttonsRef.current.left = false;
    buttonsRef.current.right = false;
    buttonsRef.current.up = false;
    buttonsRef.current.down = false;

    inputRef.current.buttons = { ...buttonsRef.current };
    inputRef.current.joystick = { ...joystickRef.current };
  }, []);

  const handleDPadPress = useCallback((direction: DPadDirection, pressed: boolean) => {
    buttonsRef.current[direction] = pressed;
    inputRef.current.buttons = { ...buttonsRef.current };
  }, []);

  const letterboxColor = definition.presentation?.letterboxColor ?? "#000000";
  const hasViewport = viewportRect.width > 0 && viewportRect.height > 0;

  return (
    <View style={[styles.container, { backgroundColor: letterboxColor }]} onLayout={handleLayout}>
      {hasViewport && (
        <View
          ref={viewportContainerRef}
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
          <GodotView
            style={styles.godotView}
            onReady={handleGodotReady}
            onError={handleGodotError}
          />
        </View>
      )}

      {hasViewport && definition.input?.tapZones && (
        <TapZoneOverlay
          zones={definition.input.tapZones}
          viewportRect={viewportRect}
          debug={definition.input.debugTapZones}
          onZonePress={handleZonePress}
        />
      )}

      {hasViewport && definition.input?.virtualJoystick && (
        <VirtualJoystickOverlay
          config={definition.input.virtualJoystick}
          viewportRect={viewportRect}
          onJoystickMove={handleJoystickMove}
          onJoystickRelease={handleJoystickRelease}
          enableHaptics={definition.input.enableHaptics}
        />
      )}

      {hasViewport && definition.input?.virtualDPad && (
        <VirtualDPadOverlay
          config={definition.input.virtualDPad}
          viewportRect={viewportRect}
          onDirectionPress={handleDPadPress}
          enableHaptics={definition.input.enableHaptics}
        />
      )}

      {hasViewport && definition.input?.virtualButtons && (
        <VirtualButtonsOverlay
          buttons={definition.input.virtualButtons}
          viewportRect={viewportRect}
          onButtonPress={handleVirtualButtonPress}
          enableHaptics={definition.input.enableHaptics}
        />
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
  godotView: {
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
