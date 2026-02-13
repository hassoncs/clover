import type {
	GameDefinition,
	GameDialogDefinition,
	GameVariable,
} from "@slopcade/shared";
import {
	createComputedValueSystem,
	DependencyAnalyzer,
	getValue,
	PropertyCache,
} from "@slopcade/shared";
import type { PreviewContext } from "@slopcade/shared/types/preview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { hasTunables, TuningPanel } from "@/components/game";
import { DevToolbar } from "@/components/game/DevToolbar";
import { GameDialog } from "@/components/game/GameDialog";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";
import {
	DevToolsProvider,
	useDevToolsOptional,
} from "../contexts/DevToolsContext";
import {
	createGodotBridge,
	createGodotPhysicsAdapter,
	GodotView,
} from "../godot";
import type { GodotBridge } from "../godot/types";
import type { Physics2D } from "../physics2d/Physics2D";
import type { CollisionEvent, Unsubscribe } from "../physics2d/types";
import { TweenSystem } from "./animation/TweenSystem";
import type { GameState, InputState } from "./BehaviorContext";
import { cancelTweensForEntity } from "./behaviors/TweenBehaviors";
import { CameraSystem } from "./CameraSystem";
import { DebugOpsImpl } from "./DebugOpsImpl";
import {
	type GameStateValue,
	logger,
	type PlayerPhase,
	SlopcadeDebugBridge,
	type TimeControl,
} from "./debug";
import {
	GameEventQueue,
	isInputEvent,
	isLifecycleEvent,
	isPhysicsEvent,
} from "./GameEventQueue";
import type { LoadedGame } from "./GameLoader";
import { GameLoader } from "./GameLoader";
import { GameLoopController } from "./GameLoopController";
import { styles } from "./GameRuntimeStyles";
import { useTiltInput } from "./hooks/useTiltInput";
import { InputDebugOverlay } from "./InputDebugOverlay";
import { useGameProgressFromDefinition } from "./progress/useGameProgress";
import {
	type ReactGameState,
	subscribeToGameEvents,
} from "./runtime/GameEventSubscriber";
import * as StateHelpers from "./runtime/GameStateHelpers";
import type { GameRuntimeRef, VarValue } from "./runtime/types";
import type { Match3Config } from "./systems/Match3GameSystem";
import { GameSystemRunner } from "./systems/runner/GameSystemRunner";
import type { SystemContext, UpdateContext } from "./systems/runner/types";
import {
	BehaviorExecutorRuntimeSystem,
	CameraRuntimeSystem,
	ComputedValuesRuntimeSystem,
	ContainerRuntimeSystem,
	EconomyRuntimeSystem,
	type EconomySystemConfig,
	EntityManagerRuntimeSystem,
	HoverHighlightRuntimeSystem,
	InputRuntimeSystem,
	Match3RuntimeSystem,
	MockNetworkSystem,
	NetworkRuntimeSystem,
	PropertySyncRuntimeSystem,
	RulesSystem,
	ScriptSandboxRuntimeSystem,
	TargetPositionRuntimeSystem,
	TweenRuntimeSystem,
	ViewportRuntimeSystem,
} from "./systems/runner/wrappers";
import { TapZoneOverlay } from "./TapZoneOverlay";
import {
	buildBindingContext,
	ensureStateDialogs,
	evaluateExpression,
	OverlayRenderer,
} from "./ui/overlay";
import { handleDialogEvent } from "./ui/overlay/dialogEventRouter";
import { useInputHandlers } from "./useInputHandlers";
import { type ViewportRect, ViewportSystem } from "./ViewportSystem";
import { VirtualButtonsOverlay } from "./VirtualButtonsOverlay";
import { VirtualDPadOverlay } from "./VirtualDPadOverlay";
import { VirtualJoystickOverlay } from "./VirtualJoystickOverlay";
import { WorldOpsImpl } from "./WorldOpsImpl";

const EMPTY_TEXTURE_URLS: string[] = [];

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
	/** Called when the player requests the next level (for games with persistence) */
	onNextLevel?: () => void;
	/** Called when the player requests the previous level (for games with persistence) */
	onPreviousLevel?: () => void;
	/** Skip the "ready" screen and start playing immediately */
	autoStart?: boolean;
	/** Force paused state (overrides internal state) */
	paused?: boolean;
	/** Called when bridge is ready, provides full bridge access */
	onBridgeReady?: (api: GodotBridge) => void;
	/** Preview context for editor/inspector preview mode */
	previewContext?: PreviewContext;
	runtimeRef?: React.MutableRefObject<GameRuntimeRef | null>;
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
	preloadTextureUrls,
	onPreloadProgress,
	onReady,
	onNextLevel,
	onPreviousLevel,
	autoStart = false,
	paused,
	onBridgeReady,
	previewContext,
	runtimeRef,
}: GameRuntimeGodotProps) {
	const stablePreloadTextureUrls = preloadTextureUrls ?? EMPTY_TEXTURE_URLS;
	const progressHook = useGameProgressFromDefinition(definition);
	const progressHookRef = useRef(progressHook);
	progressHookRef.current = progressHook;
	const devToolsCheck = useDevToolsOptional();
	const definitionRef = useRef(definition);
	definitionRef.current = definition;
	const bridgeRef = useRef<GodotBridge | null>(null);
	const physicsRef = useRef<Physics2D | null>(null);
	const gameRef = useRef<LoadedGame | null>(null);
	const loaderRef = useRef<GameLoader | null>(null);
	const cameraRef = useRef<CameraSystem | null>(null);
	const viewportSystemRef = useRef<ViewportSystem | null>(null);
	const propertyCacheRef = useRef(new PropertyCache());
	const elapsedRef = useRef(0);
	const frameIdRef = useRef(0);
	const collisionUnsubRef = useRef<Unsubscribe | null>(null);
	const inputEventUnsubRef = useRef<Unsubscribe | null>(null);
	const screenSizeRef = useRef({ width: 0, height: 0 });
	const computedValuesRef = useRef(createComputedValueSystem());
	const inputRef = useRef<Record<string, unknown>>({});
	const debugBridgeRef = useRef<SlopcadeDebugBridge | null>(null);
	const timeControlRef = useRef<TimeControl>({
		mode: debugMode ? "inspect" : "normal",
		paused: debugMode,
		pendingSteps: 0,
	});
	const gameSystemRunnerRef = useRef<GameSystemRunner | null>(null);
	const eventBusUnsubRef = useRef<(() => void) | null>(null);
	const gameLoopControllerRef = useRef<GameLoopController | null>(null);
	const subscriptionsRef = useRef<(() => void)[]>([]);
	const match3EventBusRef = useRef<any>(null);

	// Store callback props in refs to prevent useEffect re-triggering when parent re-renders
	const onReadyRef = useRef(onReady);
	const onPreloadProgressRef = useRef(onPreloadProgress);
	const onGameEndRef = useRef(onGameEnd);
	const onScoreChangeRef = useRef(onScoreChange);
	const onBridgeReadyRef = useRef(onBridgeReady);
	const previewContextRef = useRef(previewContext);

	useEffect(() => {
		if (paused !== undefined) {
			setTimeControl((prev) => {
				if (prev.paused === paused) return prev;
				return { ...prev, paused };
			});
		}
	}, [paused]);

	useEffect(() => {
		onReadyRef.current = onReady;
		onPreloadProgressRef.current = onPreloadProgress;
		onGameEndRef.current = onGameEnd;
		onScoreChangeRef.current = onScoreChange;
		onBridgeReadyRef.current = onBridgeReady;
		previewContextRef.current = previewContext;

		if (runtimeRef) {
			runtimeRef.current = {
				getPhysics: () => physicsRef.current,
				getEntityManager: () => gameRef.current?.entityManager ?? null,
				getGameState: () => gameState,
				setVariable: (key: string, value: any) => {
					const game = gameRef.current;
					if (game) {
						StateHelpers.setVar(game.gameState, key, value, game.events);
					}
				},
			};
		}
	});

	const cleanupSubscriptions = useCallback(() => {
		subscriptionsRef.current.forEach((unsub) => {
			unsub();
		});
		subscriptionsRef.current = [];
	}, []);

	const setupSubscriptions = useCallback(
		(
			bridge: GodotBridge,
			physics: Physics2D,
			game: LoadedGame,
			match3EventBus: any,
		) => {
			cleanupSubscriptions();

			subscriptionsRef.current.push(
				match3EventBus.on("match3:score_add", (data: { points: number }) => {
					const currentGame = gameRef.current;
					if (!currentGame) return;
					const currentScore =
						(StateHelpers.getVar(currentGame.gameState, "score") as number) ??
						0;
					StateHelpers.setVar(
						currentGame.gameState,
						"score",
						currentScore + data.points,
						currentGame.events,
					);
				}),
			);

			subscriptionsRef.current.push(
				bridge.onEntitySpawned((event) => {
					gameRef.current?.entityManager.handleEntitySpawned(event);
				}),
			);
			subscriptionsRef.current.push(
				bridge.onEntityDestroyed((entityId) => {
					cancelTweensForEntity(entityId);
					gameRef.current?.entityManager.handleEntityDestroyed(entityId);
				}),
			);

			collisionUnsubRef.current = physics.onCollision(
				(event: CollisionEvent) => {
					const currentGame = gameRef.current;
					if (!currentGame) return;
					const entityA = currentGame.entityManager.getEntity(event.entityA);
					const entityB = currentGame.entityManager.getEntity(event.entityB);

					if (!entityA || !entityB) {
						return;
					}

					const impulse =
						event.contacts?.reduce(
							(sum: number, c: any) => sum + (c.normalImpulse || 0),
							0,
						) ?? 0;
					const normal = event.contacts?.[0]?.normal ?? { x: 0, y: 0 };

					eventQueueRef.current.push({
						type: "collision",
						entityA: event.entityA,
						entityB: event.entityB,
						normal,
						impulse,
					});
				},
			);
			subscriptionsRef.current.push(collisionUnsubRef.current);

			inputEventUnsubRef.current = bridge.onInputEvent(
				(type, x, y, entityId) => {
					if (type === "tap") {
						const ppm = definitionRef.current.world.pixelsPerMeter ?? 50;
						const screenX = x * ppm;
						const screenY = y * ppm;
						eventQueueRef.current.push({
							type: "tap",
							x: screenX,
							y: screenY,
							worldX: x,
							worldY: y,
							targetEntityId: entityId ?? undefined,
						});
					} else if (type === "drag_start") {
						const target = entityId ?? undefined;
						if (dragStartRef.current) {
							dragStartRef.current.targetEntityId = target;
						} else {
							dragStartRef.current = {
								x: 0,
								y: 0,
								worldX: x,
								worldY: y,
								targetEntityId: target,
							};
						}
						inputRef.current = {
							...inputRef.current,
							drag: {
								...(inputRef.current.drag ?? {
									startX: 0,
									startY: 0,
									currentX: 0,
									currentY: 0,
									startWorldX: x,
									startWorldY: y,
								}),
								currentWorldX: x,
								currentWorldY: y,
								targetEntityId: target,
							},
						};
					} else if (type === "drag_move") {
						const dragStart = dragStartRef.current;
						if (dragStart && inputRef.current.drag) {
							inputRef.current = {
								...inputRef.current,
								drag: {
									...inputRef.current.drag,
									currentWorldX: x,
									currentWorldY: y,
								},
							};
						}
					} else if (type === "drag_end") {
						dragStartRef.current = null;
						inputRef.current = {
							...inputRef.current,
							drag: undefined,
						};
					} else if (type === "mouse_move") {
						inputRef.current = {
							...inputRef.current,
							mouse: { x: 0, y: 0, worldX: x, worldY: y },
						};
					}
				},
			);
			subscriptionsRef.current.push(inputEventUnsubRef.current);

			eventBusUnsubRef.current = subscribeToGameEvents(game.events, {
				onGameStateChange: (state) => {
					onGameEndRef.current?.(state);
				},
				onScoreChange: (score) => onScoreChangeRef.current?.(score),
				setGameState,
			});
			subscriptionsRef.current.push(eventBusUnsubRef.current);
		},
		[cleanupSubscriptions],
	);

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
	const eventQueueRef = useRef(new GameEventQueue());
	const isSteppingRef = useRef(false);
	const autoStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastAutoStepTimeRef = useRef(0);

	const [isReady, setIsReady] = useState(false);
	const [godotReady, setGodotReady] = useState(false);
	const [timeControl, setTimeControl] = useState<TimeControl>(() => ({
		mode: debugMode ? "inspect" : "normal",
		paused: paused ?? debugMode,
		pendingSteps: 0,
	}));
	const [gameState, setGameState] = useState<ReactGameState>({
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

	const inputHandlers = useInputHandlers(
		{
			bridgeRef,
			gameRef,
			cameraRef,
			viewportSystemRef,
			eventQueueRef,
			inputRef,
		},
		viewportRect,
	);
	const {
		buttonsRef,
		dragStartRef,
		sharedHandleKeyDown,
		sharedHandleKeyUp,
		handleMouseMove,
		handleMouseLeave,
		handleClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleZonePress,
		handleVirtualButtonPress,
		handleJoystickMove,
		handleJoystickRelease,
		handleDPadPress,
	} = inputHandlers;

	const activeDialogVariable =
		definition.dialogs?.activeDialogVariable ?? "activeDialog";

	const dialogsConfig = useMemo(() => {
		const enhanced = ensureStateDialogs(definition);
		return enhanced.dialogs;
	}, [definition]);

	const overlayConfig = useMemo(() => {
		return definition.overlay;
	}, [definition.overlay]);

	const resolveActiveDialog = useCallback((): GameDialogDefinition | null => {
		const game = gameRef.current;
		if (!game || !dialogsConfig?.dialogs) return null;

		const activeId = game.gameState.vars[activeDialogVariable] as string;
		if (activeId) {
			return dialogsConfig.dialogs.find((d) => d.id === activeId) ?? null;
		}

		const currentState = gameState.state;
		if (
			currentState === "ready" ||
			currentState === "won" ||
			currentState === "lost" ||
			currentState === "paused"
		) {
			const stateDialog = dialogsConfig.dialogs.find(
				(d) => d.showOnState === currentState,
			);
			if (stateDialog) return stateDialog;
		}

		return null;
	}, [dialogsConfig, activeDialogVariable, gameState.state]);

	const handleDialogDismiss = useCallback(
		(dismissEventName?: string) => {
			const game = gameRef.current;
			if (!game) return;
			if (dismissEventName) {
				StateHelpers.triggerEvent(game.gameState, dismissEventName);
			} else {
				game.gameState.vars[activeDialogVariable] = "";
			}
		},
		[activeDialogVariable],
	);

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
		logger.info("lifecycle", "Exported game definition:", json);
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
			logger.info(
				"state",
				`Saved ${Object.keys(tunableOverrides).length} variable overrides for "${gameId}"`,
			);
		}
	}, [definition.variables, gameState.variables, storageKey, gameId]);

	const viewportSystem = useMemo(() => {
		const presentationConfig = definition.presentation;
		return new ViewportSystem(definition.world.bounds, {
			aspectRatio: presentationConfig?.aspectRatio,
			fit: presentationConfig?.fit,
			letterboxColor: presentationConfig?.letterboxColor,
		});
	}, [definition.presentation, definition.world.bounds]);

	viewportSystemRef.current = viewportSystem;

	const handleGodotReady = useCallback(() => {
		logger.info("lifecycle", "GodotView ready callback received");
		setGodotReady(true);
	}, []);

	const handleGodotError = useCallback((error: Error) => {
		logger.error("lifecycle", "Godot error:", error);
	}, []);

	const setupStartedRef = useRef(false);
	const loadedDefinitionRef = useRef<GameDefinition | null>(null);

	useEffect(() => {
		if (!godotReady) return;
		if (setupStartedRef.current) {
			return;
		}
		setupStartedRef.current = true;

		logger.info("lifecycle", "Setup starting - godotReady is true");

		const setup = async () => {
			try {
				logger.info("bridge", "Creating Godot bridge...");
				const bridge = await createGodotBridge();
				logger.info("bridge", "Bridge created, initializing...");
				await bridge.initialize();
				logger.info("bridge", "Bridge initialized");
				bridgeRef.current = bridge;

				onBridgeReadyRef.current?.(bridge);

				if (stablePreloadTextureUrls.length > 0) {
					logger.info(
						"assets",
						`Preloading ${stablePreloadTextureUrls.length} textures...`,
					);
					await bridge.preloadTextures(
						stablePreloadTextureUrls,
						(percent, completed, failed) => {
							onPreloadProgressRef.current?.(percent, completed, failed);
						},
					);
					logger.info("assets", "Textures preloaded");
				} else {
					logger.debug("assets", "No textures to preload");
				}

				const physics = createGodotPhysicsAdapter(bridge);
				physicsRef.current = physics;

				if (debugMode) {
					bridge.setInspectMode(true);
				}

				logger.info("lifecycle", "Loading game definition...");
				const initialDefinition = definitionRef.current;
				await bridge.loadGame(initialDefinition);
				logger.info("lifecycle", "Game loaded into Godot");

				bridge.pausePhysics();

				const analyzer = new DependencyAnalyzer(initialDefinition);
				const report = analyzer.analyze();
				const watches = analyzer.getWatchSpecs();

				if (report.errors.length > 0) {
					logger.warn(
						"lifecycle",
						"Property watching validation errors:",
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

				const loader = new GameLoader({ physics, bridge });
				loaderRef.current = loader;

				const game = loader.load(initialDefinition);
				gameRef.current = game;

				loader.applyEffects(initialDefinition);

				const camera = CameraSystem.fromGameConfig(
					initialDefinition.camera,
					initialDefinition.world.bounds,
					{ width: 800, height: 600 },
					initialDefinition.world.pixelsPerMeter ?? 50,
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

					const godotPixelsPerMeter =
						initialDefinition.world.pixelsPerMeter ?? 50;
					const godotZoom = currentViewport.scale / godotPixelsPerMeter;
					bridge.setCameraZoom(godotZoom);
				}

				// Get initial variables (filter out reserved vars)
				const initialVariables: Record<string, number | string | boolean> = {};
				for (const [key, value] of Object.entries(game.gameState.vars)) {
					if (!["score", "lives", "gameState", "elapsed"].includes(key)) {
						initialVariables[key] = value;
					}
				}

				let mergedVariables = { ...initialVariables };
				if (typeof window !== "undefined" && window.localStorage) {
					try {
						const tuningStorageKey = `tuning-overrides-${initialDefinition.metadata.title
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
					StateHelpers.setGameStateValue(
						game.gameState,
						"playing",
						game.events,
					);
					setGameState((s) => ({
						...s,
						state: "playing",
						variables: mergedVariables,
					}));
				} else {
					setGameState((s) => ({
						...s,
						state: autoStart ? "playing" : "ready",
						variables: mergedVariables,
					}));
				}
				setIsReady(true);

				if (typeof window !== "undefined") {
					(
						window as unknown as { slopcadeGameReady?: boolean }
					).slopcadeGameReady = true;
				}

				onReadyRef.current?.();

				const runner = new GameSystemRunner();
				const eventQueue = runner.getEventQueue();
				const tweenSystem = new TweenSystem({
					setEntityPosition: (entityId, x, y) =>
						bridge.setPosition(entityId, x, y),
					setEntityRotation: (entityId, angle) =>
						bridge.setRotation(entityId, angle),
					setEntityScale: (entityId, scaleX, scaleY) =>
						bridge.setScale(entityId, scaleX, scaleY),
					setEntityOpacity: (entityId, opacity) =>
						bridge.setOpacity(entityId, opacity),
				});
				const worldOps = new WorldOpsImpl(
					game.entityManager,
					physics,
					bridge,
					tweenSystem,
					eventQueue,
					() => ({
						variables: game.gameState.vars,
						constants: initialDefinition.constants as
							| Record<string, number | string | boolean>
							| undefined,
					}),
				);

				const presentationConfig = initialDefinition.presentation;
				runner.register(
					new ViewportRuntimeSystem({
						worldBounds: initialDefinition.world.bounds,
						aspectRatio: presentationConfig?.aspectRatio,
						fit: presentationConfig?.fit,
						letterboxColor: presentationConfig?.letterboxColor,
					}),
				);

				runner.register(
					new InputRuntimeSystem({
						debug: false,
					}),
				);

				runner.register(
					new CameraRuntimeSystem({
						cameraConfig: initialDefinition.camera ?? {
							type: "fixed",
							zoom: 1,
						},
						worldBounds: initialDefinition.world.bounds,
						viewport: { width: 800, height: 600 },
						pixelsPerMeter: initialDefinition.world.pixelsPerMeter ?? 50,
					}),
				);

				runner.register(new EntityManagerRuntimeSystem());

				runner.register(
					new ComputedValuesRuntimeSystem({
						system: computedValuesRef.current,
					}),
				);

				runner.register(
					new PropertySyncRuntimeSystem({
						propertyCache: propertyCacheRef.current,
					}),
				);

				runner.register(new TweenRuntimeSystem(tweenSystem));

				runner.register(
					new BehaviorExecutorRuntimeSystem({
						pixelsPerMeter: initialDefinition.world.pixelsPerMeter ?? 50,
					}),
				);

				if (initialDefinition.script) {
					runner.register(
						new ScriptSandboxRuntimeSystem({
							scriptCode: initialDefinition.script,
							scriptId: initialDefinition.metadata.id,
							gameId: initialDefinition.metadata.id,
							constants: initialDefinition.constants as
								| Record<string, number | string | boolean>
								| undefined,
						}),
					);
				}

				runner.register(
					new RulesSystem({
						rules: initialDefinition.rules ?? [],
						winCondition: initialDefinition.winCondition,
						loseCondition: initialDefinition.loseCondition,
						variables: initialDefinition.variables as
							| Record<string, number | string | boolean>
							| undefined,
						containers: initialDefinition.containers,
						stateMachines: initialDefinition.stateMachines,
					}),
				);

				if (initialDefinition.economy) {
					runner.register(
						new EconomyRuntimeSystem({
							economyGraph:
								initialDefinition.economy as EconomySystemConfig["economyGraph"],
						}),
					);
				}
				if (initialDefinition.match3) {
					runner.register(
						new Match3RuntimeSystem(initialDefinition.match3 as Match3Config),
					);
				}
				if (
					initialDefinition.containers &&
					initialDefinition.containers.length > 0
				) {
					runner.register(
						new ContainerRuntimeSystem({
							containers: initialDefinition.containers,
						}),
					);
				}
				if (initialDefinition.hoverHighlight) {
					runner.register(
						new HoverHighlightRuntimeSystem(initialDefinition.hoverHighlight),
					);
				}

				if (previewContextRef.current?.roomMock) {
					runner.register(
						new MockNetworkSystem({
							role: previewContextRef.current.roomMock.hostId
								? "host"
								: "player",
							roomMock: previewContextRef.current.roomMock,
						}),
					);
				} else if (initialDefinition.party) {
					runner.register(
						new NetworkRuntimeSystem({
							role: "host",
						}),
					);
				}

				runner.register(new TargetPositionRuntimeSystem());

				const { EventBus } = await import("@slopcade/shared");
				const eventBus = new EventBus();

				const systemContext: SystemContext = {
					bridge,
					physics,
					entityManager: game.entityManager,
					eventBus,
					eventQueue,
					worldOps,
				};

				const { EventBus: SharedEventBus } = await import("@slopcade/shared");
				const match3EventBus = new SharedEventBus();
				match3EventBusRef.current = match3EventBus;

				await runner.initialize(systemContext);

				setupSubscriptions(bridge, physics, game, match3EventBus);

				const behaviorSystem =
					runner.getSystem<BehaviorExecutorRuntimeSystem>("behavior-executor");
				const rulesSystem = runner.getSystem<RulesSystem>("rules");
				const computedValuesSystem =
					runner.getSystem<ComputedValuesRuntimeSystem>("computed-values");
				const cameraSystem = runner.getSystem<CameraRuntimeSystem>("camera");
				const inputSystem = runner.getSystem<InputRuntimeSystem>("input");

				if (cameraSystem) {
					cameraRef.current = cameraSystem.getCamera();
				}

				if (rulesSystem) {
					rulesSystem.setRuntimeState(game.gameState);
					rulesSystem.setEventBus(game.events);
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

				if (initialDefinition.script) {
					const scriptSystem =
						runner.getSystem<ScriptSandboxRuntimeSystem>("script-sandbox");
					if (scriptSystem && rulesSystem) {
						rulesSystem.setScriptSystem(scriptSystem);
						const sandbox = scriptSystem.getSandbox();
						if (sandbox) rulesSystem.setScriptSandbox(sandbox);
					}
				}

				gameSystemRunnerRef.current = runner;

				if (Platform.OS === "web" && debugMode) {
					(window as any).worldOps = worldOps;

					const checkDebugBridges = () => {
						const godotDebugBridge = (window as any).GodotDebugBridge;
						if (godotDebugBridge && debugBridgeRef.current) {
							const debugOps = new DebugOpsImpl(
								godotDebugBridge,
								debugBridgeRef.current,
								game.entityManager,
								physics,
								bridge,
								tweenSystem,
								eventQueue,
								() => ({
									variables: game.gameState.vars,
									constants: initialDefinition.constants as
										| Record<string, number | string | boolean>
										| undefined,
								}),
							);
							(window as any).debugOps = debugOps;

							if (previewContext?.id) {
								if (!(window as any).debugOpsRegistry) {
									(window as any).debugOpsRegistry = {};
									(window as any).debugOpsMetaRegistry = {};
								}
								(window as any).debugOpsRegistry[previewContext.id] = debugOps;
								(window as any).debugOpsMetaRegistry[previewContext.id] = {
									label: previewContext.label,
									mode: previewContext.mode,
								};
								(window as any).debugOpsFocusedId = previewContext.id;
							}

							logger.info(
								"lifecycle",
								"Exposed window.worldOps and window.debugOps",
							);
						} else {
							setTimeout(checkDebugBridges, 100);
						}
					};
					checkDebugBridges();
				}

				if (
					progressHookRef.current?.progress &&
					initialDefinition.persistence
				) {
					const progress = progressHookRef.current.progress as Record<
						string,
						unknown
					>;
					for (const key of Object.keys(initialDefinition.variables || {})) {
						if (key in progress && progress[key] !== undefined) {
							game.gameState.vars[key] = progress[key] as VarValue;
						}
					}
				}

				if (autoStart && !debugMode) {
					StateHelpers.setGameStateValue(
						game.gameState,
						"playing",
						game.events,
					);
					bridge.resumePhysics();
					eventQueueRef.current.push({ type: "game_started" });
				}

				eventQueueRef.current.push({ type: "game_loaded" });
				loadedDefinitionRef.current = initialDefinition;
			} catch (error) {
				logger.error("lifecycle", "Failed to initialize game:", error);
			}
		};

		setup();

		return () => {
			setupStartedRef.current = false;
			loadedDefinitionRef.current = null;
			cleanupSubscriptions();
			gameSystemRunnerRef.current?.destroy();
			gameSystemRunnerRef.current = null;
			bridgeRef.current?.dispose();
			bridgeRef.current = null;
			physicsRef.current = null;
			gameRef.current = null;
			loaderRef.current = null;
			cameraRef.current = null;

			if (Platform.OS === "web" && previewContext?.id) {
				const registry = (window as any).debugOpsRegistry;
				const metaRegistry = (window as any).debugOpsMetaRegistry;
				if (registry) delete registry[previewContext.id];
				if (metaRegistry) delete metaRegistry[previewContext.id];
			}
		};
	}, [
		godotReady,
		stablePreloadTextureUrls,
		debugMode,
		cleanupSubscriptions,
		setupSubscriptions,
	]);

	// Soft-reload: definition changes after initial mount use in-place clear/load
	// instead of full engine teardown (mirrors handleRestart flow).
	useEffect(() => {
		if (!loadedDefinitionRef.current) return;
		if (definition === loadedDefinitionRef.current) return;

		const bridge = bridgeRef.current;
		const loader = loaderRef.current;
		const camera = cameraRef.current;
		const physics = physicsRef.current;
		if (!bridge || !loader || !camera || !physics) return;

		logger.info("lifecycle", "Definition changed — performing soft reload");

		const softReload = async () => {
			try {
				bridge.clearGame();
				await bridge.loadGame(definition);
				bridge.pausePhysics();

				loader.applyEffects(definition);

				const prevGame = gameRef.current;
				if (!prevGame) return;

				const newGame = loader.reload(prevGame);
				gameRef.current = newGame;
				elapsedRef.current = 0;

				camera.setPosition({ x: 0, y: 0 });
				camera.setZoom(definition.camera?.zoom ?? 1);

				timeScaleRef.current = 1.0;

				if (match3EventBusRef.current) {
					setupSubscriptions(
						bridge,
						physics,
						newGame,
						match3EventBusRef.current,
					);
				}

				const initialVariables: Record<string, number | string | boolean> = {};
				for (const [key, value] of Object.entries(newGame.gameState.vars)) {
					if (!["score", "lives", "gameState", "elapsed"].includes(key)) {
						initialVariables[key] = value;
					}
				}

				let mergedVariables = { ...initialVariables };
				if (progressHookRef.current?.progress && definition.persistence) {
					const progress = progressHookRef.current.progress as Record<
						string,
						unknown
					>;
					mergedVariables = {
						...mergedVariables,
						...(progress as Record<string, any>),
					};
					for (const key of Object.keys(definition.variables || {})) {
						if (key in progress && progress[key] !== undefined) {
							newGame.gameState.vars[key] = progress[key] as VarValue;
						}
					}
				}

				setGameState({
					time: 0,
					state: autoStart ? "playing" : "ready",
					variables: mergedVariables,
				});

				if (autoStart) {
					StateHelpers.setGameStateValue(
						newGame.gameState,
						"playing",
						newGame.events,
					);
					bridge.resumePhysics();
					eventQueueRef.current.push({ type: "game_started" });
				}

				eventQueueRef.current.push({ type: "game_loaded" });
				loadedDefinitionRef.current = definition;

				logger.info("lifecycle", "Soft reload complete");
			} catch (error) {
				logger.error("lifecycle", "Soft reload failed:", error);
			}
		};

		softReload();
	}, [definition, autoStart, setupSubscriptions]);

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
	}, [
		showInputDebug,
		showPhysicsShapes,
		showZones,
		showFPS,
		godotReady,
		isReady,
	]);

	const setTimeScale = useCallback((scale: number, duration?: number) => {
		const controller = gameLoopControllerRef.current;
		if (controller) {
			controller.setTimeScale(scale, duration);
			timeScaleRef.current = controller.getTimeScale();
		} else {
			timeScaleRef.current = scale;
		}
	}, []);

	const stepGameFrameCountRef = useRef(0);

	const stepGame = useCallback(
		(dt: number) => {
			stepGameFrameCountRef.current++;
			const frameNum = stepGameFrameCountRef.current;

			const shouldLog = frameNum <= 5;
			if (shouldLog) logger.trace("loop", `frame ${frameNum} starting`);

			const physics = physicsRef.current;
			const game = gameRef.current;
			const camera = cameraRef.current;
			const bridge = bridgeRef.current;
			if (!physics || !game || !camera || !bridge) {
				if (shouldLog)
					logger.trace("loop", `frame ${frameNum} - missing refs, returning`);
				return;
			}

			if (StateHelpers.getGameStateValue(game.gameState) !== "playing") {
				if (shouldLog)
					logger.trace("loop", `frame ${frameNum} - not playing, returning`);
				return;
			}

			if (dt <= 0) return;

			const frameStart = enablePerfLogging ? performance.now() : 0;

			const runner = gameSystemRunnerRef.current;
			if (!runner) {
				if (shouldLog)
					logger.trace("loop", `frame ${frameNum} - no runner, returning`);
				return;
			}

			if (shouldLog)
				logger.trace("loop", `frame ${frameNum} - building game state`);

			const fullGameState: GameState = {
				time: StateHelpers.getElapsed(game.gameState),
				state: StateHelpers.getGameStateValue(game.gameState),
				variables: Object.fromEntries(
					Object.entries(game.gameState.vars).filter(
						([k]) => !["gameState", "elapsed"].includes(k),
					),
				),
			};

			const frameEvents = eventQueueRef.current.drain();
			const lifecycleEvents = frameEvents.filter(isLifecycleEvent);
			const inputEvents = frameEvents.filter(isInputEvent);
			const collisionEvents = frameEvents.filter(isPhysicsEvent);

			if (lifecycleEvents.length > 0) {
				logger.debug(
					"lifecycle",
					"stepGame processing lifecycle events:",
					lifecycleEvents,
				);
			}

			const currentGame = gameRef.current;
			const frameCollisions = collisionEvents
				.map((event) => {
					if (event.type === "collision") {
						const entityA = currentGame?.entityManager.getEntity(event.entityA);
						const entityB = currentGame?.entityManager.getEntity(event.entityB);
						if (entityA && entityB) {
							return {
								entityA,
								entityB,
								normal: event.normal,
								impulse: event.impulse,
							};
						}
					}
					return null;
				})
				.filter((c): c is NonNullable<typeof c> => c !== null);

			const updateContext: UpdateContext = {
				dt,
				elapsed: elapsedRef.current,
				frameId: frameIdRef.current,
				input: inputRef.current as InputState,
				gameState: fullGameState,
				frame: {
					inputEvents: [...lifecycleEvents, ...inputEvents],
					collisions: frameCollisions,
				},
			};

			if (shouldLog)
				logger.trace("loop", `frame ${frameNum} - calling runner.update`);
			runner.update(updateContext);
			if (shouldLog)
				logger.trace("loop", `frame ${frameNum} - runner.update complete`);

			elapsedRef.current += dt;
			frameIdRef.current += 1;

			const g = gameRef.current;
			if (g) {
				const engineVars = g.gameState.vars;
				const engineState = (engineVars.gameState as string) || "loading";
				setGameState((s) => ({
					...s,
					time: elapsedRef.current,
					variables: { ...engineVars },
					state: engineState as ReactGameState["state"],
				}));
			} else {
				setGameState((s) => ({ ...s, time: elapsedRef.current }));
			}
			if (shouldLog) logger.trace("loop", `frame ${frameNum} - complete`);

			if (enablePerfLogging) {
				const frameEnd = performance.now();
				const frameMs = frameEnd - frameStart;
				if (frameIdRef.current % 60 === 0) {
					logger.info("loop", `frame=${frameMs.toFixed(2)}ms`);
				}
			}
		},
		[enablePerfLogging],
	);

	const manualStep = useCallback(
		async (
			frames: number,
		): Promise<{
			ok: boolean;
			framesAdvanced: number;
			startFrame: number;
			endFrame: number;
		}> => {
			const bridge = bridgeRef.current;
			if (!bridge) {
				return {
					ok: false,
					framesAdvanced: 0,
					startFrame: frameIdRef.current,
					endFrame: frameIdRef.current,
				};
			}

			const startFrame = frameIdRef.current;
			isSteppingRef.current = true;

			try {
				// Step Godot physics (Rapier's space_step is synchronous)
				await bridge.stepPhysics(frames);

				for (let i = 0; i < frames; i++) {
					stepGame(FIXED_DT);
				}
			} finally {
				isSteppingRef.current = false;
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
		logger.trace(
			"loop",
			`isReady=${isReady}, state=${gameState.state}, mode=${timeControl.mode}, paused=${timeControl.paused}`,
		);

		if (timeControl.mode === "inspect") {
			logger.debug("loop", "Inspect mode - stopping");
			gameLoopControllerRef.current?.stop();
			return;
		}

		const playerPhase = gameState.state as PlayerPhase;
		const shouldRun =
			isReady && playerPhase === "playing" && !timeControl.paused;

		if (!shouldRun) {
			logger.trace("loop", "shouldRun=false - stopping");
			gameLoopControllerRef.current?.stop();
			return;
		}

		if (!gameLoopControllerRef.current) {
			logger.debug("loop", "Creating new GameLoopController");
			gameLoopControllerRef.current = new GameLoopController({
				onUpdate: stepGame,
				intervalMs: GAME_LOOP_INTERVAL,
			});
		}

		const controller = gameLoopControllerRef.current;
		if (timeControl.paused) {
			controller.pause();
		} else {
			controller.resume();
		}

		if (!controller.isRunning()) {
			logger.debug("loop", "Starting game loop");
			controller.start();
		}

		return () => {
			logger.trace("loop", "Cleanup - stopping");
			controller.stop();
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
				gameLoopControllerRef.current?.pause();
			},
			resumeGameLoop: () => {
				const newTc = { ...timeControlRef.current, paused: false };
				timeControlRef.current = newTc;
				setTimeControl(newTc);
				gameLoopControllerRef.current?.resume();
			},
			stepGame: (dt: number) => {
				stepGame(dt);
			},
			manualStep: (frames: number) => manualStep(frames),
			setTimeScale: (scale: number) => {
				if (gameLoopControllerRef.current) {
					gameLoopControllerRef.current.setTimeScale(scale);
					timeScaleRef.current = gameLoopControllerRef.current.getTimeScale();
				} else {
					timeScaleRef.current = scale;
				}
			},
			getGameState: () => ({
				state: gameState.state as GameStateValue,
				variables: gameState.variables,
				frame: frameIdRef.current,
				elapsed: elapsedRef.current,
				timeScale:
					gameLoopControllerRef.current?.getTimeScale() ?? timeScaleRef.current,
			}),
			getGodotBridge: () => bridgeRef.current,
			getTimeControl: () => timeControlRef.current,
		};

		const bridge = new SlopcadeDebugBridge(
			definition.metadata.id ?? "unknown",
			runtimeAPI,
		);

		bridge.setReady(true);
		debugBridgeRef.current = bridge;
		window.SlopcadeDebugBridge = bridge;

		bridge.pause();

		return () => {
			debugBridgeRef.current = null;
			delete window.SlopcadeDebugBridge;
		};
	}, [
		isReady,
		debugMode,
		definition.metadata.id,
		stepGame,
		manualStep,
		gameState,
	]);

	useEffect(() => {
		if (!isReady) return;

		const AUTO_STEP_RATE_LIMIT_MS = 16.67;

		const tryAutoStep = () => {
			const tc = timeControlRef.current;

			if (tc.mode !== "inspect" || !tc.paused) return;
			if (isSteppingRef.current) return;

			const now = performance.now();
			if (now - lastAutoStepTimeRef.current < AUTO_STEP_RATE_LIMIT_MS) return;

			if (!autoStepTimerRef.current) {
				autoStepTimerRef.current = setTimeout(() => {
					autoStepTimerRef.current = null;
					lastAutoStepTimeRef.current = performance.now();
					logger.debug("inspector", "auto-step triggered");
					manualStep(1);
				}, 0);
			}
		};

		eventQueueRef.current.setOnEventQueued(tryAutoStep);

		// If events were queued before this handler registered (e.g. game_loaded
		// pushed during setup, before isReady triggered this effect), kick off
		// an auto-step now so they aren't stranded.
		if (eventQueueRef.current.length > 0) {
			logger.debug(
				"inspector",
				`Found ${eventQueueRef.current.length} pre-queued event(s), triggering auto-step`,
			);
			tryAutoStep();
		}

		return () => {
			if (autoStepTimerRef.current) {
				clearTimeout(autoStepTimerRef.current);
				autoStepTimerRef.current = null;
			}
			eventQueueRef.current.setOnEventQueued(() => {});
		};
	}, [isReady, manualStep]);

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
			logger,
		};

		return () => {
			delete (window as any).__GAME_RUNTIME__;
		};
	}, []);

	const handleStart = useCallback(() => {
		eventQueueRef.current.push({ type: "game_started" });
		bridgeRef.current?.resumePhysics();
		if (gameRef.current) {
			StateHelpers.setGameStateValue(
				gameRef.current.gameState,
				"playing",
				gameRef.current.events,
			);
		}
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

			loaderRef.current.applyEffects(definition);

			const newGame = loaderRef.current.reload(gameRef.current);
			gameRef.current = newGame;
			elapsedRef.current = 0;

			cameraRef.current.setPosition({ x: 0, y: 0 });
			cameraRef.current.setZoom(definition.camera?.zoom ?? 1);

			timeScaleRef.current = 1.0;

			if (match3EventBusRef.current) {
				setupSubscriptions(
					bridgeRef.current,
					physicsRef.current!,
					newGame,
					match3EventBusRef.current,
				);
			}

			const initialVariables: Record<string, number | string | boolean> = {};
			for (const [key, value] of Object.entries(newGame.gameState.vars)) {
				if (!["score", "lives", "gameState", "elapsed"].includes(key)) {
					initialVariables[key] = value;
				}
			}

			let mergedVariables = { ...initialVariables };
			if (progressHookRef.current?.progress) {
				const progress = progressHookRef.current.progress as Record<
					string,
					unknown
				>;
				mergedVariables = {
					...mergedVariables,
					...(progress as Record<string, any>),
				};
				for (const key of Object.keys(definition.variables || {})) {
					if (key in progress && progress[key] !== undefined) {
						newGame.gameState.vars[key] = progress[key] as VarValue;
					}
				}
			}

			setGameState({
				time: 0,
				state: "ready",
				variables: mergedVariables,
			});

			logger.info(
				"lifecycle",
				"handleRestart emitting gameLoaded lifecycle event",
			);
			eventQueueRef.current.push({ type: "game_loaded" });
		}
	}, [onRequestRestart, definition, setupSubscriptions]);

	const handleDialogButtonPress = useCallback(
		(eventName: string, data?: Record<string, unknown>) => {
			handleDialogEvent(eventName, data, {
				onStart: handleStart,
				onRestart: handleRestart,
				onResume: () => {
					const game = gameRef.current;
					if (!game) return;
					StateHelpers.setGameStateValue(
						game.gameState,
						"playing",
						game.events,
					);
				},
				onBackToMenu,
				onPreviousLevel,
				triggerEvent: (forwardEvent, payload) => {
					const game = gameRef.current;
					if (!game) return;
					StateHelpers.triggerEvent(game.gameState, forwardEvent, payload);
				},
			});
		},
		[handleStart, handleRestart, onBackToMenu, onPreviousLevel],
	);

	const handleSaveProgress = useCallback(async () => {
		const game = gameRef.current;
		if (!game || !definition.persistence) return;

		const vars = game.gameState.vars;
		const currentLevel = (vars["currentLevel"] as number) || 1;

		if (progressHook?.saveProgress) {
			const progress = (progressHook.progress ?? {}) as Record<string, unknown>;
			await progressHook.saveProgress({
				currentLevel,
				highestLevelCompleted: Math.max(
					(progress.highestLevelCompleted as number) || 0,
					currentLevel - 1,
				),
				totalLevelsCompleted:
					((progress.totalLevelsCompleted as number) || 0) + 1,
			} as Partial<unknown>);
		} else if (definition.persistence.storageKey) {
			const key = definition.persistence.storageKey;
			const defaultProgress = definition.persistence.defaultProgress || {};
			const stored = (await getStorageItem(key, defaultProgress)) as Record<
				string,
				unknown
			>;
			await setStorageItem(key, {
				...stored,
				currentLevel,
				highestLevelCompleted: Math.max(
					(stored.highestLevelCompleted as number) || 0,
					currentLevel - 1,
				),
				totalLevelsCompleted:
					((stored.totalLevelsCompleted as number) || 0) + 1,
			});
		}
	}, [definition.persistence, progressHook]);

	const prevLevelRef = useRef<number | null>(null);
	useEffect(() => {
		const currentLevel = gameState.variables["currentLevel"] as
			| number
			| undefined;
		if (
			currentLevel != null &&
			prevLevelRef.current != null &&
			currentLevel !== prevLevelRef.current
		) {
			handleSaveProgress();
		}
		prevLevelRef.current = currentLevel ?? null;
	}, [gameState.variables, handleSaveProgress]);

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

	const viewportContainerRef = useRef<View>(null);

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

			<InputDebugOverlay inputRef={inputRef} viewportRect={viewportRect} />

			{overlayConfig && hasViewport && (
				<OverlayRenderer
					config={overlayConfig}
					gameState={gameState}
					viewportRect={viewportRect}
					getEntityCountByTag={(tag: string) =>
						gameRef.current?.entityManager.getEntitiesByTag(tag).length ?? 0
					}
					onButtonPress={(eventName, eventData) => {
						if (gameRef.current) {
							StateHelpers.triggerEvent(
								gameRef.current.gameState,
								eventName,
								eventData,
							);
						}
					}}
				/>
			)}

			{(() => {
				const dialog = resolveActiveDialog();
				if (!dialog) return null;
				const vars = gameRef.current?.gameState.vars ?? {};
				return (
					<GameDialog
						visible={true}
						title={dialog.title}
						message={dialog.message}
						stats={dialog.stats?.map((s) => {
							if (s.binding) {
								const ctx = buildBindingContext(
									gameState,
									(tag: string) =>
										gameRef.current?.entityManager.getEntitiesByTag(tag)
											.length ?? 0,
								);
								const result = evaluateExpression(s.binding, ctx);
								return { label: s.label, value: String(result ?? "") };
							}
							return {
								label: s.label,
								value: s.format
									? s.format.replace("{value}", String(vars[s.variable] ?? ""))
									: String(vars[s.variable] ?? ""),
							};
						})}
						buttons={dialog.buttons.map((b) => ({
							label: b.label,
							variant: b.variant,
							onPress: () => handleDialogButtonPress(b.eventName, b.data),
						}))}
						onClose={
							dialog.dismissible
								? () => handleDialogDismiss(dialog.dismissEventName)
								: undefined
						}
					/>
				);
			})()}

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
