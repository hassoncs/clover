import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  type GestureResponderEvent,
} from "react-native";
import type {
  GameDefinition,
  ParticleEmitterType,
  EvalContext,
  ExpressionValueType,
  TapZoneButton,
  VirtualButtonType,
  DPadDirection,
  AssetSheet,
  PropertyWatchSpec,
  GameVariable,
} from "@slopcade/shared";
import {
  createComputedValueSystem,
  getAllSystemExpressionFunctions,
  DependencyAnalyzer,
  PropertyCache,
  EntityContextProxy,
  getValue,
} from "@slopcade/shared";
import {
  GodotView,
  createGodotBridge,
  createGodotPhysicsAdapter,
} from "../godot";
import { PropertySyncManager } from "../godot/PropertySyncManager";
import type { GodotBridge } from "../godot/types";
import type { Physics2D } from "../physics2d/Physics2D";
import type { Unsubscribe, CollisionEvent } from "../physics2d/types";
import { GameLoader, type LoadedGame } from "./GameLoader";
import type { RuntimeEntity } from "./types";
import type {
  BehaviorContext,
  GameState,
  CollisionInfo,
  InputState,
} from "./BehaviorContext";
import { CameraSystem } from "./CameraSystem";
import { ViewportSystem, type ViewportRect } from "./ViewportSystem";
import {
  InputEntityManager,
  type InputState as InputEntityState,
} from "./InputEntityManager";
import { TapZoneOverlay } from "./TapZoneOverlay";
import { VirtualButtonsOverlay } from "./VirtualButtonsOverlay";
import {
  VirtualJoystickOverlay,
  type JoystickState,
} from "./VirtualJoystickOverlay";
import { VirtualDPadOverlay } from "./VirtualDPadOverlay";
import { InputDebugOverlay } from "./InputDebugOverlay";
import { useTiltInput } from "./hooks/useTiltInput";
import {
  DevToolsProvider,
  useDevToolsOptional,
} from "../contexts/DevToolsContext";
import { DevToolbar } from "@/components/game/DevToolbar";
import {
  Match3GameSystem,
  type Match3Config,
} from "./systems/Match3GameSystem";
import {
  SlotMachineSystem,
  type SlotMachineConfig,
} from "./systems/slotMachine";
import { TuningPanel, hasTunables } from "@/components/game";
import {
  SlopcadeDebugBridge,
  type SlopcadeDebugBridgeInterface,
  type GameStateValue,
  type TimeControl,
  type PlayerPhase,
  framesToAdvance,
} from "./debug";
import {
  ScriptSandbox,
  type SandboxRuntimeContext,
  type ScriptInputEvent,
  type ScriptCollisionEvent,
} from "@/lib/scripting";
import { cancelTweensForEntity } from "./behaviors/TweenBehaviors";
import { GameSystemRunner } from "./systems/runner/GameSystemRunner";
import type { SystemContext, UpdateContext } from "./systems/runner/types";
import {
  ViewportRuntimeSystem,
  InputRuntimeSystem,
  CameraRuntimeSystem,
  EntityManagerRuntimeSystem,
  ComputedValuesRuntimeSystem,
  PropertySyncRuntimeSystem,
  BehaviorExecutorRuntimeSystem,
  ScriptSandboxRuntimeSystem,
  RulesRuntimeSystem,
  TweenRuntimeSystem,
  TargetPositionRuntimeSystem,
  Match3RuntimeSystem,
  SlotMachineRuntimeSystem,
  ContainerRuntimeSystem,
  HoverHighlightRuntimeSystem,
} from "./systems/runner/wrappers";

export interface GameRuntimeGodotProps {
  definition: GameDefinition;
  onGameEnd?: (state: "won" | "lost") => void;
  onScoreChange?: (score: number) => void;
  onBackToMenu?: () => void;
  onRequestRestart?: () => void;
  showHUD?: boolean;
  enablePerfLogging?: boolean;
  debugMode?: boolean;
  preloadTextureUrls?: string[];
  onPreloadProgress?: (
    percent: number,
    completed: number,
    failed: number,
  ) => void;
  /** Called when Godot is fully initialized and textures are preloaded - safe to show the game */
  onReady?: () => void;
}

const GAME_LOOP_INTERVAL = 16;
const FIXED_DT = 1 / 60;

export function GameRuntimeGodot({
  definition,
  onGameEnd,
  onScoreChange,
  onBackToMenu,
  onRequestRestart,
  showHUD = true,
  enablePerfLogging = false,
  debugMode = false,
  preloadTextureUrls = [],
  onPreloadProgress,
  onReady,
}: GameRuntimeGodotProps) {
  const devToolsCheck = useDevToolsOptional();
  const bridgeRef = useRef<GodotBridge | null>(null);
  const physicsRef = useRef<Physics2D | null>(null);
  const gameRef = useRef<LoadedGame | null>(null);
  const loaderRef = useRef<GameLoader | null>(null);
  const cameraRef = useRef<CameraSystem | null>(null);
  const viewportSystemRef = useRef<ViewportSystem | null>(null);
  const inputEntityManagerRef = useRef<InputEntityManager | null>(null);
  const match3SystemRef = useRef<Match3GameSystem | null>(null);
  const slotMachineSystemRef = useRef<SlotMachineSystem | null>(null);
  const propertyCacheRef = useRef(new PropertyCache());
  const propertySyncManagerRef = useRef<PropertySyncManager | null>(null);
  const elapsedRef = useRef(0);
  const frameIdRef = useRef(0);
  const collisionsRef = useRef<CollisionInfo[]>([]);
  const collisionUnsubRef = useRef<Unsubscribe | null>(null);
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
  const lastKeyEventRef = useRef<{ key: string; code: string; type: 'keydown' | 'keyup'; timeStamp: number } | null>(null);
  const debugBridgeRef = useRef<SlopcadeDebugBridge | null>(null);
  const scriptSandboxRef = useRef<ScriptSandbox | null>(null);
  const scriptStartedRef = useRef(false);
  const timeControlRef = useRef<TimeControl>({
    mode: debugMode ? "inspect" : "normal",
    paused: debugMode,
    pendingSteps: 0,
  });
  const gameSystemRunnerRef = useRef<GameSystemRunner | null>(null);

  const handleTiltUpdate = useCallback((tilt: { x: number; y: number }) => {
    inputRef.current.tilt = tilt;
  }, []);

  useTiltInput(
    {
      enabled: definition.input?.tilt?.enabled ?? false,
      sensitivity: definition.input?.tilt?.sensitivity,
      updateInterval: definition.input?.tilt?.updateInterval,
    },
    handleTiltUpdate,
  );

  const timeScaleRef = useRef(1.0);
  const timeScaleTargetRef = useRef(1.0);
  const timeScaleTransitionRef = useRef<{
    startScale: number;
    endScale: number;
    duration: number;
    elapsed: number;
    restoreAfter?: number;
  } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [godotReady, setGodotReady] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl>(() => ({
    mode: debugMode ? "inspect" : "normal",
    paused: debugMode, // In inspect mode, start paused; in normal mode, start unpaused (ready state controls this)
    pendingSteps: 0,
  }));
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    time: 0,
    state: "loading",
    variables: {},
  });
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [viewportRect, setViewportRect] = useState<ViewportRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 1,
  });

  const handleVariableChange = useCallback((key: string, value: number) => {
    setGameState((prev) => ({
      ...prev,
      variables: {
        ...prev.variables,
        [key]: value,
      },
    }));
  }, []);

  const handleReset = useCallback(() => {
    const defaults: Record<string, number | string | boolean> = {};
    for (const [key, variable] of Object.entries(definition.variables || {})) {
      const value = getValue(variable as GameVariable);
      if (
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean"
      ) {
        defaults[key] = value;
      }
    }
    setGameState((prev) => ({ ...prev, variables: defaults }));
  }, [definition.variables]);

  const handleExport = useCallback(() => {
    const exported = {
      ...definition,
      variables: Object.fromEntries(
        Object.entries(definition.variables || {}).map(([key, variable]) => {
          const currentValue = gameState.variables[key];
          return [key, currentValue ?? getValue(variable as GameVariable)];
        }),
      ),
    };
    const json = JSON.stringify(exported, null, 2);
    console.log("Exported game definition:", json);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json);
    }
  }, [definition, gameState.variables]);

  const gameId = definition.metadata.title.toLowerCase().replace(/\s+/g, "-");
  const storageKey = `tuning-overrides-${gameId}`;

  const [savedValues, setSavedValues] = useState<
    Record<string, number | boolean | string>
  >(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const hasUnsavedChanges = useMemo(() => {
    const tunableKeys = Object.entries(definition.variables || {})
      .filter(([_, v]) => {
        if (
          typeof v === "object" &&
          v !== null &&
          "value" in v &&
          "tuning" in v
        ) {
          return true;
        }
        return false;
      })
      .map(([k]) => k);

    for (const key of tunableKeys) {
      const current = gameState.variables[key];
      const saved = savedValues[key];
      if (saved !== undefined && current !== saved) {
        return true;
      }
      if (saved === undefined) {
        const original = getValue(definition.variables![key] as GameVariable);
        if (current !== original) {
          return true;
        }
      }
    }
    return false;
  }, [gameState.variables, savedValues, definition.variables]);

  const handleSave = useCallback(() => {
    const tunableOverrides: Record<string, number | boolean | string> = {};
    for (const [key, variable] of Object.entries(definition.variables || {})) {
      if (
        typeof variable === "object" &&
        variable !== null &&
        "value" in variable &&
        "tuning" in variable
      ) {
        const current = gameState.variables[key];
        if (current !== undefined) {
          tunableOverrides[key] = current;
        }
      }
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify(tunableOverrides));
      setSavedValues(tunableOverrides);
      console.log(
        `[Tuning] Saved ${
          Object.keys(tunableOverrides).length
        } variable overrides for "${gameId}"`,
      );
    }
  }, [definition.variables, gameState.variables, storageKey, gameId]);

  const viewportSystem = useMemo(() => {
    const presentationConfig = definition.presentation;
    return new ViewportSystem(definition.world.bounds, {
      aspectRatio: presentationConfig?.aspectRatio,
      fit: presentationConfig?.fit,
      letterboxColor:
        presentationConfig?.letterboxColor ?? definition.ui?.backgroundColor,
    });
  }, [
    definition.presentation,
    definition.world.bounds,
    definition.ui?.backgroundColor,
  ]);

  viewportSystemRef.current = viewportSystem;

  const handleGodotReady = useCallback(() => {
    setGodotReady(true);
  }, []);

  const handleGodotError = useCallback((error: Error) => {
    console.error("[GameRuntime.godot] Godot error:", error);
  }, []);

  useEffect(() => {
    if (!godotReady) return;

    const setup = async () => {
      try {
        const bridge = await createGodotBridge();
        await bridge.initialize();
        bridgeRef.current = bridge;

        if (preloadTextureUrls && preloadTextureUrls.length > 0) {
          await bridge.preloadTextures(preloadTextureUrls, onPreloadProgress);
        }

        const physics = createGodotPhysicsAdapter(bridge);
        physicsRef.current = physics;

        if (debugMode) {
          bridge.setInspectMode(true);
        }

        await bridge.loadGame(definition);

        bridge.pausePhysics();

        const analyzer = new DependencyAnalyzer(definition);
        const report = analyzer.analyze();
        const watches = analyzer.getWatchSpecs();

        if (report.errors.length > 0) {
          console.warn(
            "[GameRuntime.godot] Property watching validation errors:",
            report.errors,
          );
        }

        const { WatchRegistry } = await import("@slopcade/shared");
        const registry = new WatchRegistry();
        registry.addWatches(watches);
        const activeConfig = registry.getActiveConfig();

        const serializeMapOfSetsToJSON = (
          map: Map<string, Set<string>>,
        ): Record<string, string[]> => {
          const result: Record<string, string[]> = {};
          for (const [key, set] of map.entries()) {
            result[key] = Array.from(set);
          }
          return result;
        };

        const serializableConfig = {
          frameProperties: Array.from(activeConfig.frameProperties),
          changeProperties: serializeMapOfSetsToJSON(
            activeConfig.changeProperties,
          ),
          entityWatches: serializeMapOfSetsToJSON(activeConfig.entityWatches),
          tagWatches: serializeMapOfSetsToJSON(activeConfig.tagWatches),
        };

        bridge.setWatchConfig(serializableConfig);

        const propertySync = new PropertySyncManager(propertyCacheRef.current);
        propertySync.start(bridge);
        propertySyncManagerRef.current = propertySync;

        // Create ScriptSandbox early if game has scripts (for run_script actions)
        let scriptSandbox: ScriptSandbox | undefined;
        if (definition.script) {
          scriptSandbox = new ScriptSandbox({
            scriptCode: definition.script,
            scriptId: definition.metadata.id,
            gameId: definition.metadata.id,
          });
          scriptSandboxRef.current = scriptSandbox;
        }

        const loader = new GameLoader({ physics, scriptSandbox });
        loaderRef.current = loader;

        const game = loader.load(definition);
        gameRef.current = game;
        
        // Initialize script sandbox after game is loaded
        if (scriptSandbox) {
          scriptSandbox.initialize().then((result) => {
            if (!result.success) {
              console.error('[GameRuntime] Script initialization failed:', result.error);
            }
          });
        }

        bridge.onEntitySpawned((event) => {
          game.entityManager.handleEntitySpawned(event);
        });
        bridge.onEntityDestroyed((entityId) => {
          cancelTweensForEntity(entityId);
          game.entityManager.handleEntityDestroyed(entityId);
        });

        const inputEntityManager = new InputEntityManager();
        inputEntityManagerRef.current = inputEntityManager;

        if (definition.match3) {
          const match3System = new Match3GameSystem(
            definition.match3 as Match3Config,
            game.entityManager,
            {
              onScoreAdd: (points) => game.rulesEvaluator.addScore(points),
              onMatchFound: () => {},
              onBoardReady: () => {},
            },
          );
          match3System.setBridge(bridge);
          match3SystemRef.current = match3System;
        }

        if (definition.slotMachine) {
          const slotMachineSystem = new SlotMachineSystem(
            definition.slotMachine as SlotMachineConfig,
            game.entityManager,
            {
              onSpinStart: () => {
                let currentCredits =
                  (game.rulesEvaluator.getVariable("credits") as number) ??
                  1000;
                const bet =
                  (game.rulesEvaluator.getVariable("bet") as number) ?? 1;

                // Auto-refill if credits are depleted
                if (currentCredits <= 0) {
                  currentCredits = 1000;
                  game.rulesEvaluator.setVariable("credits", currentCredits);
                  console.log("[SlotMachine] Credits refilled to 1000");
                }

                game.rulesEvaluator.setVariable(
                  "credits",
                  currentCredits - bet,
                );
                game.rulesEvaluator.setVariable("lastWin", 0);
                console.log(
                  `[SlotMachine] Spin started - deducted ${bet} credits, remaining: ${
                    currentCredits - bet
                  }`,
                );
              },
              onSpinComplete: (wins, totalPayout) => {
                const currentCredits =
                  (game.rulesEvaluator.getVariable("credits") as number) ??
                  1000;
                game.rulesEvaluator.setVariable(
                  "credits",
                  currentCredits + totalPayout,
                );
                game.rulesEvaluator.setVariable("lastWin", totalPayout);
                console.log(
                  `[SlotMachine] Spin complete - payout: ${totalPayout}, new credits: ${
                    currentCredits + totalPayout
                  }`,
                );
              },
              onWinFound: () => {},
              onBonusTrigger: (bonusType) => {
                if (bonusType === "free_spins") {
                  const remaining =
                    slotMachineSystemRef.current?.getFreeSpinsRemaining() ?? 0;
                  game.rulesEvaluator.setVariable("freeSpins", remaining);
                  console.log(
                    `[SlotMachine] Bonus triggered - free spins: ${remaining}`,
                  );
                }
              },
              onCascadeComplete: () => {},
              onBoardReady: () => {},
              onFreeSpinStart: (remaining) => {
                game.rulesEvaluator.setVariable("freeSpins", remaining);
                console.log(
                  `[SlotMachine] Free spin started - remaining: ${remaining}`,
                );
              },
              onFreeSpinsComplete: () => {
                game.rulesEvaluator.setVariable("freeSpins", 0);
                console.log(`[SlotMachine] Free spins complete`);
              },
              onPickReveal: () => {},
              onPickBonusComplete: (totalPrize) => {
                const currentCredits =
                  (game.rulesEvaluator.getVariable("credits") as number) ??
                  1000;
                game.rulesEvaluator.setVariable(
                  "credits",
                  currentCredits + totalPrize,
                );
                game.rulesEvaluator.setVariable("lastWin", totalPrize);
                console.log(
                  `[SlotMachine] Pick bonus complete - prize: ${totalPrize}, new credits: ${
                    currentCredits + totalPrize
                  }`,
                );
              },
            },
          );
          slotMachineSystem.setBridge(bridge);
          slotMachineSystemRef.current = slotMachineSystem;
        }

        if (definition.variables) {
          const resolvedVars: Record<string, ExpressionValueType> = {};
          for (const [key, value] of Object.entries(definition.variables)) {
            if (
              typeof value === "object" &&
              value !== null &&
              "expr" in value
            ) {
              resolvedVars[key] = 0;
            } else {
              resolvedVars[key] = value as ExpressionValueType;
            }
          }
          gameVariablesRef.current = resolvedVars;
        }

        collisionUnsubRef.current = physics.onCollision(
          (event: CollisionEvent) => {
            const entityA = game.entityManager.getEntity(event.entityA);
            const entityB = game.entityManager.getEntity(event.entityB);

            if (!entityA || !entityB) {
              return;
            }

            const impulse = event.contacts?.reduce(
              (sum: number, c: any) => sum + (c.normalImpulse || 0),
              0,
            ) ?? 0;
            const normal = event.contacts?.[0]?.normal ?? { x: 0, y: 0 };

            collisionsRef.current.push({
              entityA,
              entityB,
              normal,
              impulse,
            });
          },
        );

        inputEventUnsubRef.current = bridge.onInputEvent(
          (type, x, y, entityId) => {
            if (type === "tap") {
              const ppm = definition.world.pixelsPerMeter ?? 50;
              const screenX = x * ppm;
              const screenY = y * ppm;
              inputRef.current = {
                ...inputRef.current,
                tap: {
                  x: screenX,
                  y: screenY,
                  worldX: x,
                  worldY: y,
                  targetEntityId: entityId ?? undefined,
                },
              };
            } else if (type === "mouse_move") {
              inputRef.current = {
                ...inputRef.current,
                mouse: { x: 0, y: 0, worldX: x, worldY: y },
              };
            }
          },
        );

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
          camera.updateViewport({
            width: currentViewport.width,
            height: currentViewport.height,
          });
          camera.updatePixelsPerMeter(currentViewport.scale);
          setViewportRect(currentViewport);

          const godotPixelsPerMeter = definition.world.pixelsPerMeter ?? 50;
          const godotZoom = currentViewport.scale / godotPixelsPerMeter;
          bridge.setCameraZoom(godotZoom);
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

        let mergedVariables = { ...initialVariables };
        if (typeof window !== "undefined" && window.localStorage) {
          try {
            const tuningStorageKey = `tuning-overrides-${definition.metadata.title
              .toLowerCase()
              .replace(/\s+/g, "-")}`;
            const savedOverrides =
              window.localStorage.getItem(tuningStorageKey);
            if (savedOverrides) {
              const parsed = JSON.parse(savedOverrides);
              mergedVariables = { ...mergedVariables, ...parsed };
            }
          } catch {}
        }

        if (debugMode) {
          game.rulesEvaluator.start();
          setGameState((s) => ({
            ...s,
            state: "playing",
            variables: mergedVariables,
          }));
        } else {
          setGameState((s) => ({
            ...s,
            state: "ready",
            variables: mergedVariables,
          }));
        }
        setIsReady(true);
        
        if (typeof window !== 'undefined') {
          (window as unknown as { slopcadeGameReady?: boolean }).slopcadeGameReady = true;
        }
        
        onReady?.();

        if (match3SystemRef.current) {
          const match3Config = definition.match3 as Match3Config;
          if (
            match3Config.variantSheet?.enabled &&
            match3Config.variantSheet.metadataUrl
          ) {
            try {
              const response = await fetch(
                match3Config.variantSheet.metadataUrl,
              );
              const metadata = await response.json();
              match3SystemRef.current.setSheetMetadata(metadata as AssetSheet);
            } catch (error) {
              console.error(
                "[GameRuntime.godot] Failed to load variant sheet metadata:",
                error,
              );
            }
          }
          match3SystemRef.current.initialize();
        }

        if (slotMachineSystemRef.current) {
          slotMachineSystemRef.current.initialize();
        }

        const runner = new GameSystemRunner();

        const presentationConfig = definition.presentation;
        runner.register(new ViewportRuntimeSystem({
          worldBounds: definition.world.bounds,
          aspectRatio: presentationConfig?.aspectRatio,
          fit: presentationConfig?.fit,
          letterboxColor: presentationConfig?.letterboxColor ?? definition.ui?.backgroundColor,
        }));

        runner.register(new InputRuntimeSystem({
          debug: false,
        }));

        runner.register(new CameraRuntimeSystem({
          cameraConfig: definition.camera ?? { type: 'fixed', zoom: 1 },
          worldBounds: definition.world.bounds,
          viewport: { width: 800, height: 600 },
          pixelsPerMeter: definition.world.pixelsPerMeter ?? 50,
        }));

        runner.register(new EntityManagerRuntimeSystem());

        runner.register(new ComputedValuesRuntimeSystem({
          system: computedValuesRef.current,
        }));

        runner.register(new PropertySyncRuntimeSystem({
          propertyCache: propertyCacheRef.current,
        }));

        runner.register(new BehaviorExecutorRuntimeSystem({
          pixelsPerMeter: definition.world.pixelsPerMeter ?? 50,
        }));

        if (definition.script) {
          runner.register(new ScriptSandboxRuntimeSystem({
            scriptCode: definition.script,
            scriptId: definition.metadata.id,
            gameId: definition.metadata.id,
            constants: definition.constants as Record<string, number | string | boolean> | undefined,
          }));
        }

        runner.register(new RulesRuntimeSystem({
          rules: definition.rules ?? [],
          winCondition: definition.winCondition,
          loseCondition: definition.loseCondition,
          variables: definition.variables as Record<string, number | string | boolean> | undefined,
          containers: definition.containers,
          stateMachines: definition.stateMachines,
        }));

        if (definition.match3) {
          runner.register(new Match3RuntimeSystem(definition.match3 as Match3Config));
        }
        if (definition.slotMachine) {
          runner.register(new SlotMachineRuntimeSystem(definition.slotMachine as SlotMachineConfig));
        }
        if (definition.containers && definition.containers.length > 0) {
          runner.register(new ContainerRuntimeSystem({
            containers: definition.containers,
          }));
        }
        if (definition.hoverHighlight) {
          runner.register(new HoverHighlightRuntimeSystem(definition.hoverHighlight));
        }

        runner.register(new TweenRuntimeSystem());
        runner.register(new TargetPositionRuntimeSystem());

        const { EventBus } = await import('@slopcade/shared');
        const eventBus = new EventBus();

        const systemContext: SystemContext = {
          bridge,
          physics,
          entityManager: game.entityManager,
          eventBus,
          eventQueue: (runner as any).eventQueue,
        };

        await runner.initialize(systemContext);

        const behaviorSystem = runner.getSystem<BehaviorExecutorRuntimeSystem>('behavior-executor');
        const rulesSystem = runner.getSystem<RulesRuntimeSystem>('rules');
        const computedValuesSystem = runner.getSystem<ComputedValuesRuntimeSystem>('computed-values');
        const cameraSystem = runner.getSystem<CameraRuntimeSystem>('camera');
        const inputSystem = runner.getSystem<InputRuntimeSystem>('input');
        
        // Set game to playing state immediately (even in inspect mode)
        if (rulesSystem) {
          const rulesEval = rulesSystem.getRulesEvaluator();
          if (rulesEval) {
            rulesEval.setGameState('playing');
          }
        }

        if (behaviorSystem && computedValuesSystem) {
          const cvs = computedValuesSystem.getSystem();
          if (cvs) behaviorSystem.setComputedValues(cvs);
        }
        if (behaviorSystem && cameraSystem) {
          const cam = cameraSystem.getCamera();
          if (cam) behaviorSystem.setCamera(cam);
        }
        if (behaviorSystem && inputSystem) {
          const iem = inputSystem.getInputEntityManager();
          if (iem) behaviorSystem.setInputEntityManager(iem);
        }
        if (rulesSystem && computedValuesSystem) {
          const cvs = computedValuesSystem.getSystem();
          if (cvs) rulesSystem.setComputedValues(cvs);
        }
        if (rulesSystem && cameraSystem) {
          const cam = cameraSystem.getCamera();
          if (cam) rulesSystem.setCamera(cam);
        }
        if (rulesSystem && inputSystem) {
          const iem = inputSystem.getInputEntityManager();
          if (iem) rulesSystem.setInputEntityManager(iem);
        }

        gameSystemRunnerRef.current = runner;
      } catch (error) {
        console.error("[GameRuntime] Failed to initialize game:", error);
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
      inputEventUnsubRef.current?.();
      inputEventUnsubRef.current = null;
      match3SystemRef.current?.destroy();
      match3SystemRef.current = null;
      slotMachineSystemRef.current?.destroy();
      slotMachineSystemRef.current = null;
      propertySyncManagerRef.current?.stop();
      propertySyncManagerRef.current = null;
      scriptSandboxRef.current?.dispose();
      scriptSandboxRef.current = null;
      scriptStartedRef.current = false;
      gameSystemRunnerRef.current?.destroy();
      gameSystemRunnerRef.current = null;
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
      physicsRef.current = null;
      gameRef.current = null;
      loaderRef.current = null;
      cameraRef.current = null;
    };
  }, [
    godotReady,
    definition,
    onGameEnd,
    onScoreChange,
    preloadTextureUrls,
    onPreloadProgress,
    onReady,
    debugMode,
  ]);

  const showInputDebug = devToolsCheck?.state?.showInputDebug ?? false;
  const showPhysicsShapes = devToolsCheck?.state?.showPhysicsShapes ?? false;
  const showZones = devToolsCheck?.state?.showZones ?? false;
  const showFPS = devToolsCheck?.state?.showFPS ?? false;

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    bridge.setDebugSettings({
      showInputDebug,
      showPhysicsShapes,
      showZones,
      showFPS,
    });
  }, [showInputDebug, showPhysicsShapes, showZones, showFPS]);

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

  const stepGame = useCallback(
    (rawDt: number) => {
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
        timeScaleRef.current =
          transition.startScale +
          (transition.endScale - transition.startScale) * eased;

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

      const runner = gameSystemRunnerRef.current;
      if (!runner) {
        return;
      }

      const fullGameState = game.rulesEvaluator.getFullState();
      
      const frameCollisions = collisionsRef.current.slice();
      collisionsRef.current = [];
      
      const updateContext: UpdateContext = {
        dt,
        elapsed: elapsedRef.current,
        frameId: frameIdRef.current,
        input: inputRef.current as InputState,
        gameState: fullGameState,
        frame: {
          inputEvents: [],
          collisions: frameCollisions,
        },
      };
      
      if (inputRef.current.tap) {
        inputRef.current = { ...inputRef.current, tap: undefined };
      }

      runner.update(updateContext);

      elapsedRef.current += dt;
      frameIdRef.current += 1;

      setGameState((s) => ({ ...s, time: elapsedRef.current }));

      if (enablePerfLogging) {
        const frameEnd = performance.now();
        const frameMs = frameEnd - frameStart;
        if (frameIdRef.current % 60 === 0) {
          console.log(`[Perf.godot] frame=${frameMs.toFixed(2)}ms`);
        }
      }
    },
    [enablePerfLogging],
  );

  const manualStep = useCallback(
    async (frames: number): Promise<{ ok: boolean; framesAdvanced: number; startFrame: number; endFrame: number }> => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }

      const bridge = bridgeRef.current;
      if (!bridge) {
        return { ok: false, framesAdvanced: 0, startFrame: frameIdRef.current, endFrame: frameIdRef.current };
      }

      const startFrame = frameIdRef.current;

      // Step Godot physics (Rapier's space_step is synchronous)
      await bridge.stepPhysics(frames);
      
      for (let i = 0; i < frames; i++) {
        stepGame(FIXED_DT);
      }

      return {
        ok: true,
        framesAdvanced: frames,
        startFrame,
        endFrame: frameIdRef.current,
      };
    },
    [stepGame],
  );

  useEffect(() => {
    // In inspect mode, game loop doesn't run - only manualStep() advances physics
    if (timeControl.mode === "inspect") {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // In normal mode, run game loop when playing and not paused
    const playerPhase = gameState.state as PlayerPhase;
    const shouldRun = isReady && playerPhase === "playing" && !timeControl.paused;
    
    if (!shouldRun) {
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
  }, [isReady, gameState.state, stepGame, timeControl]);

  useEffect(() => {
    if (!isReady || !debugMode || typeof window === "undefined") {
      return;
    }

    const runtimeAPI = {
      pauseGameLoop: () => {
        const newTc = { ...timeControlRef.current, paused: true };
        timeControlRef.current = newTc;
        setTimeControl(newTc);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
          gameLoopRef.current = null;
        }
      },
      resumeGameLoop: () => {
        const newTc = { ...timeControlRef.current, paused: false };
        timeControlRef.current = newTc;
        setTimeControl(newTc);
      },
      stepGame: (dt: number) => {
        stepGame(dt);
      },
      manualStep: (frames: number) => manualStep(frames),
      setTimeScale: (scale: number) => {
        timeScaleRef.current = scale;
        timeScaleTargetRef.current = scale;
        timeScaleTransitionRef.current = null;
      },
      getGameState: () => ({
        score: gameState.score,
        lives: gameState.lives,
        state: gameState.state as GameStateValue,
        variables: gameState.variables,
        frame: frameIdRef.current,
        elapsed: elapsedRef.current,
        timeScale: timeScaleRef.current,
      }),
      getGodotBridge: () => bridgeRef.current,
      getTimeControl: () => timeControlRef.current,
    };

    const bridge = new SlopcadeDebugBridge(
      definition.metadata.id ?? "unknown",
      runtimeAPI
    );

    bridge.setReady(true);
    debugBridgeRef.current = bridge;
    window.SlopcadeDebugBridge = bridge;

    bridge.pause();

    return () => {
      debugBridgeRef.current = null;
      delete window.SlopcadeDebugBridge;
    };
  }, [isReady, debugMode, definition.metadata.id, stepGame, manualStep, gameState]);

  // Keyboard input handling (web only) - shared handlers with deduplication
  const sharedHandleKeyDown = useCallback((e: KeyboardEvent) => {
    // Deduplication: ignore if same key/code received within 20ms
    if (
      lastKeyEventRef.current?.key === e.key &&
      lastKeyEventRef.current?.code === e.code &&
      lastKeyEventRef.current?.type === 'keydown' &&
      Math.abs(e.timeStamp - lastKeyEventRef.current.timeStamp) < 20
    ) {
      return;
    }
    lastKeyEventRef.current = { key: e.key, code: e.code, type: 'keydown', timeStamp: e.timeStamp };

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
      case " ": {
        if (!buttonsRef.current.jump) {
          buttonsRef.current.jump = true;
          changed = true;
        }
        const game = gameRef.current;
        if (game) {
          const cannon = game.entityManager.getActiveEntities().find(
            (entity) => game.entityManager.hasTag(entity.id, "cannon")
          );
          if (cannon) {
            const angle = cannon.transform.angle;
            const distance = 10;
            const targetX = cannon.transform.x + Math.cos(angle) * distance;
            const targetY = cannon.transform.y + Math.sin(angle) * distance;

            inputRef.current.tap = {
              x: 0,
              y: 0,
              worldX: targetX,
              worldY: targetY,
            };
            inputRef.current.dragEnd = {
              velocityX: 0,
              velocityY: 0,
              worldVelocityX: 0,
              worldVelocityY: 0,
            };
          }
        }
        break;
      }
    }
    if (changed) {
      inputRef.current.buttons = { ...buttonsRef.current };
    }
  }, []);

  const sharedHandleKeyUp = useCallback((e: KeyboardEvent) => {
    // Deduplication: ignore if same key/code received within 20ms
    if (
      lastKeyEventRef.current?.key === e.key &&
      lastKeyEventRef.current?.code === e.code &&
      lastKeyEventRef.current?.type === 'keyup' &&
      Math.abs(e.timeStamp - lastKeyEventRef.current.timeStamp) < 20
    ) {
      return;
    }
    lastKeyEventRef.current = { key: e.key, code: e.code, type: 'keyup', timeStamp: e.timeStamp };

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
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Use capture phase to catch events before iframe steals focus
    window.addEventListener("keydown", sharedHandleKeyDown, { capture: true });
    window.addEventListener("keyup", sharedHandleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", sharedHandleKeyDown, { capture: true });
      window.removeEventListener("keyup", sharedHandleKeyUp, { capture: true });
    };
  }, [sharedHandleKeyDown, sharedHandleKeyUp]);

  // Iframe events: e.clientX/Y are already iframe-local (0,0 = top-left of canvas)
  const mouseMoveCountRef = useRef(0);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseMoveCountRef.current++;
    const shouldLog = mouseMoveCountRef.current % 30 === 1;
    
    const viewportX = e.clientX;
    const viewportY = e.clientY;
    
    if (shouldLog) {
      console.log('[Mouse] canvas:', viewportX, viewportY, 'viewportRect:', viewportRect.width, 'x', viewportRect.height);
    }

    if (
      viewportX < 0 ||
      viewportX > viewportRect.width ||
      viewportY < 0 ||
      viewportY > viewportRect.height
    ) {
      inputRef.current.mouse = undefined;
      return;
    }

    const camera = cameraRef.current;
    const viewportSystem = viewportSystemRef.current;
    if (!camera || !viewportSystem) {
      return;
    }

    const world = viewportSystem.viewportToWorld(
      viewportX,
      viewportY,
      camera.getPosition(),
      camera.getZoom(),
    );
    if (shouldLog) console.log('[Mouse] world:', world.x.toFixed(2), world.y.toFixed(2));

    inputRef.current.mouse = {
      x: viewportX,
      y: viewportY,
      worldX: world.x,
      worldY: world.y,
    };
  }, [viewportRect.width, viewportRect.height]);

  const handleMouseLeave = useCallback(() => {
    inputRef.current.mouse = undefined;
  }, []);

  const handleClick = useCallback(async (e: MouseEvent) => {
    const viewportX = e.clientX;
    const viewportY = e.clientY;

    if (
      viewportX < 0 ||
      viewportX > viewportRect.width ||
      viewportY < 0 ||
      viewportY > viewportRect.height
    ) {
      return;
    }

    const camera = cameraRef.current;
    const viewportSystem = viewportSystemRef.current;
    const bridge = bridgeRef.current;
    if (!camera || !viewportSystem) return;

    const world = viewportSystem.viewportToWorld(
      viewportX,
      viewportY,
      camera.getPosition(),
      camera.getZoom(),
    );

    let targetEntityId: string | undefined;
    if (bridge) {
      const entityId = await bridge.queryPointEntity(world);
      if (entityId) {
        targetEntityId = entityId;
      }
    }

    inputRef.current = {
      ...inputRef.current,
      tap: {
        x: viewportX,
        y: viewportY,
        worldX: world.x,
        worldY: world.y,
        targetEntityId,
      },
    };
  }, [viewportRect.width, viewportRect.height]);

  // Expose input API for external tools (game-inspector)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    (window as any).__GAME_RUNTIME__ = {
      setInput: (type: string, value: any) => {
        switch (type) {
          case "mouse":
            inputRef.current.mouse = value;
            break;
          case "tap":
            inputRef.current.tap = value;
            break;
          case "drag":
            inputRef.current.drag = value;
            break;
          case "dragEnd":
            inputRef.current.dragEnd = value;
            break;
        }
      },
      getInput: (type: string) => {
        return (inputRef.current as any)[type];
      },
      setButtonState: (button: string, pressed: boolean) => {
        if (!buttonsRef.current) {
          buttonsRef.current = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false,
            action: false,
          };
        }
        (buttonsRef.current as any)[button] = pressed;
        inputRef.current.buttons = { ...buttonsRef.current };
      },
      clearInput: (type: string) => {
        (inputRef.current as any)[type] = undefined;
      },
      refs: {
        gameSystemRunner: gameSystemRunnerRef,
        game: gameRef,
        input: inputRef,
        bridge: bridgeRef,
      },
    };

    return () => {
      delete (window as any).__GAME_RUNTIME__;
    };
  }, []);

  const handleStart = useCallback(() => {
    bridgeRef.current?.resumePhysics();
    gameRef.current?.rulesEvaluator.start();
    gameJustStartedRef.current = true;
  }, []);



  const handleRestart = useCallback(() => {
    if (onRequestRestart) {
      onRequestRestart();
      return;
    }

    if (
      gameRef.current &&
      loaderRef.current &&
      cameraRef.current &&
      bridgeRef.current
    ) {
      bridgeRef.current.clearGame();
      bridgeRef.current.loadGame(definition);
      bridgeRef.current.pausePhysics();

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
      setGameState({
        score: 0,
        lives: 3,
        time: 0,
        state: "ready",
        variables: initialVariables,
      });
    }
  }, [onGameEnd, onScoreChange, onRequestRestart, definition]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
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

        if (bridgeRef.current) {
          const godotPixelsPerMeter = definition.world.pixelsPerMeter ?? 50;
          const godotZoom = newViewportRect.scale / godotPixelsPerMeter;
          bridgeRef.current.setCameraZoom(godotZoom);
        }
      }
    },
    [definition.world.pixelsPerMeter],
  );

  const dragStartRef = useRef<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const viewportContainerRef = useRef<View>(null);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const camera = cameraRef.current;
    const vs = viewportSystemRef.current;
    if (!camera) return { x: 0, y: 0 };

    if (vs) {
      return vs.viewportToWorld(
        screenX,
        screenY,
        camera.getPosition(),
        camera.getZoom(),
      );
    }
    return camera.screenToWorld(screenX, screenY);
  }, []);

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      if (!bridge) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      dragStartRef.current = { x, y, worldX: world.x, worldY: world.y };

      inputRef.current = {
        ...inputRef.current,
        drag: {
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          startWorldX: world.x,
          startWorldY: world.y,
          currentWorldX: world.x,
          currentWorldY: world.y,
        },
      };

      bridge.sendInput("drag_start", { x: world.x, y: world.y });
    },
    [screenToWorld],
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      const dragStart = dragStartRef.current;
      if (!bridge || !dragStart) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      inputRef.current = {
        ...inputRef.current,
        drag: {
          startX: dragStart.x,
          startY: dragStart.y,
          currentX: x,
          currentY: y,
          startWorldX: dragStart.worldX,
          startWorldY: dragStart.worldY,
          currentWorldX: world.x,
          currentWorldY: world.y,
        },
      };

      bridge.sendInput("drag_move", { x: world.x, y: world.y });
    },
    [screenToWorld],
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      const bridge = bridgeRef.current;
      const dragStart = dragStartRef.current;
      if (!bridge) return;

      const { locationX: x, locationY: y } = event.nativeEvent;
      const world = screenToWorld(x, y);

      inputRef.current = {
        ...inputRef.current,
        tap: { x, y, worldX: world.x, worldY: world.y },
      };

      if (dragStart) {
        const VELOCITY_SCALE = 0.1;
        inputRef.current.dragEnd = {
          velocityX: (x - dragStart.x) * VELOCITY_SCALE,
          velocityY: (y - dragStart.y) * VELOCITY_SCALE,
          worldVelocityX: (world.x - dragStart.worldX) * VELOCITY_SCALE,
          worldVelocityY: (world.y - dragStart.worldY) * VELOCITY_SCALE,
        };
      }

      bridge.sendInput("tap", { x: world.x, y: world.y });
      bridge.sendInput("drag_end", { x: world.x, y: world.y });

      dragStartRef.current = null;
      inputRef.current.drag = undefined;
    },
    [screenToWorld],
  );

  const handleZonePress = useCallback(
    (button: TapZoneButton, pressed: boolean) => {
      buttonsRef.current[button] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [],
  );

  const handleVirtualButtonPress = useCallback(
    (button: VirtualButtonType, pressed: boolean) => {
      buttonsRef.current[button] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [],
  );

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

  const handleDPadPress = useCallback(
    (direction: DPadDirection, pressed: boolean) => {
      buttonsRef.current[direction] = pressed;
      inputRef.current.buttons = { ...buttonsRef.current };
    },
    [],
  );

  const letterboxColor = definition.presentation?.letterboxColor ?? "#000000";
  const hasViewport = viewportRect.width > 0 && viewportRect.height > 0;

  return (
    <View
      style={[styles.container, { backgroundColor: letterboxColor }]}
      onLayout={handleLayout}
    >
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
            onKeyDown={sharedHandleKeyDown}
            onKeyUp={sharedHandleKeyUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          />
        </View>
      )}

      {hasViewport && definition.input?.tapZones && (
        <TapZoneOverlay
          zones={definition.input.tapZones}
          viewportRect={viewportRect}
          debug={definition.input.debugTapZones || showInputDebug}
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

      <InputDebugOverlay
        inputRef={inputRef}
        viewportRect={viewportRect}
      />

      {showHUD && hasViewport && (
        <View
          style={[
            styles.hud,
            {
              left: viewportRect.x + 20,
              top: viewportRect.y + 40,
              right:
                screenSize.width - viewportRect.x - viewportRect.width + 20,
            },
          ]}
        >
          {definition.ui?.showScore !== false && (
            <Text style={styles.scoreText}>Score: {gameState.score}</Text>
          )}
          {definition.ui?.showTimer && (
            <Text style={styles.timerText}>
              Time: {Math.floor(gameState.time)}s
            </Text>
          )}
          {definition.ui?.showLives && (
            <Text style={styles.livesText}>
              {definition.ui?.livesLabel ?? "Lives"}: {gameState.lives}
            </Text>
          )}
          {definition.ui?.entityCountDisplays?.map((display) => {
            const count =
              gameRef.current?.entityManager.getEntitiesByTag(display.tag)
                .length ?? 0;
            return (
              <Text
                key={display.tag}
                style={[
                  styles.livesText,
                  display.color ? { color: display.color } : undefined,
                ]}
              >
                {display.label}: {count}
              </Text>
            );
          })}
          {definition.ui?.variableDisplays?.map((display) => {
            const value = gameState.variables[display.name];
            const shouldShow =
              display.showWhen !== "not_default" ||
              value !== display.defaultValue;
            if (!shouldShow) return null;
            const formattedValue = display.format
              ? display.format.replace("{value}", String(value))
              : String(value);
            return (
              <Text
                key={display.name}
                style={[
                  styles.livesText,
                  display.color ? { color: display.color } : undefined,
                ]}
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

      {gameState.state === "ready" && !debugMode && (
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

      {__DEV__ && hasTunables(definition.variables as any) && (
        <TuningPanel
          variables={(definition.variables as any) || {}}
          currentValues={gameState.variables}
          onVariableChange={handleVariableChange}
          onReset={handleReset}
          onExport={handleExport}
          onSave={handleSave}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}

      {__DEV__ && <DevToolbar />}
    </View>
  );
}

export function GameRuntimeGodotWithDevTools(props: GameRuntimeGodotProps) {
  return (
    <DevToolsProvider>
      <GameRuntimeGodot {...props} />
    </DevToolsProvider>
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
