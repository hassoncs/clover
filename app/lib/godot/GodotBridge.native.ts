import type { PropertySyncPayload } from "@slopcade/shared";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type {
	CollisionEvent,
	ContactInfo,
	DistanceJointDef,
	EntitySpawnedEvent,
	EntityTransform,
	GodotBridge,
	MouseJointDef,
	PrismaticJointDef,
	RevoluteJointDef,
	SensorEvent,
	Vec2,
	WeldJointDef,
} from "./types";
import "./react-native-godot.d";
import { BridgeCore, type BridgeMessage } from "./BridgeCore";
import {
	clearAllCallbacks,
	createCallbackArrays,
	createCallbackMethods,
} from "./callback-registry";
import { normalizeEffectsResult } from "./GodotBridgeBase";
import {
	createBridgeMethods,
	type PlatformDispatch,
} from "./generated/bridge-methods";

class NativeBridgeCore extends BridgeCore {
	protected send(msg: BridgeMessage): void {
		if (msg.id) {
			callGameBridge(
				"handle_request",
				msg.id,
				msg.type,
				JSON.stringify(msg.data ?? {}),
			);
		}
	}
}

type GodotModule = typeof import("@borndotcom/react-native-godot");

interface GodotGameBridge {
	entities: Record<
		string,
		{
			position: { x: number; y: number };
			rotation: number;
		}
	>;
	pixels_per_meter: number;
	poll_events(): string;
	native_dispatch(method_name: string, args_json: string): unknown;
}
let godotModule: GodotModule | null = null;
let isGodotInitialized = false;
let isDisposing = false;

const pendingQueries = new Map<number, (result: string | null) => void>();
const pendingJoints = new Map<number, (jointId: number) => void>();
const requestIdCounter = 0;
const pollIntervalId: ReturnType<typeof setInterval> | null = null;

async function getGodotModule(): Promise<GodotModule> {
	if (!godotModule) {
		godotModule = await import("@borndotcom/react-native-godot");
	}
	return godotModule;
}

function callGameBridge(methodName: string, ...args: unknown[]) {
	if (isDisposing || !isGodotInitialized) {
		return;
	}

	const argsJson = JSON.stringify(args);
	getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
		if (isDisposing) {
			return;
		}
		runOnGodotThread(() => {
			"worklet";
			const Godot = RTNGodot.API();
			const gameBridge = Godot.Engine.get_main_loop()
				.get_root()
				.get_node("GameBridge");
			if (gameBridge) {
				const result = gameBridge.native_dispatch(methodName, argsJson);
				if (
					result &&
					typeof result === "object" &&
					"error" in (result as object)
				) {
					console.warn(
						"[callGameBridge] Error for",
						methodName,
						":",
						JSON.stringify(result),
					);
				}
			} else {
				console.warn("[callGameBridge] gameBridge not found for", methodName);
			}
		});
	});
}

function callGameBridgeAsync(
	methodName: string,
	...args: unknown[]
): Promise<any> {
	return new Promise((resolve, reject) => {
		if (isDisposing || !isGodotInitialized) {
			reject(new Error("Godot not initialized"));
			return;
		}

		const argsJson = JSON.stringify(args);
		getGodotModule()
			.then(({ RTNGodot, runOnGodotThread }) => {
				if (isDisposing) {
					reject(new Error("Godot is disposing"));
					return;
				}

				runOnGodotThread(() => {
					"worklet";
					try {
						const Godot = RTNGodot.API();
						const gameBridge = Godot.Engine.get_main_loop()
							.get_root()
							.get_node("GameBridge");
						if (gameBridge) {
							return gameBridge.native_dispatch(methodName, argsJson);
						}
						return null;
					} catch (e) {
						return null;
					}
				})
					.then(resolve)
					.catch(reject);
			})
			.catch(reject);
	});
}

function callEffectsBridge(methodName: string, ...args: unknown[]) {
	if (isDisposing || !isGodotInitialized) return;

	const argsJson = JSON.stringify(args);
	getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
		if (isDisposing) return;
		runOnGodotThread(() => {
			"worklet";
			const Godot = RTNGodot.API();
			const effectsBridge = Godot.Engine.get_main_loop()
				.get_root()
				.get_node("GameBridgeEffects");
			if (effectsBridge) {
				effectsBridge.native_dispatch(methodName, argsJson);
			}
		});
	});
}

function handleQueryResult(requestId: number, result: string | null) {
	const resolve = pendingQueries.get(requestId);
	if (resolve) {
		pendingQueries.delete(requestId);
		resolve(result);
	}
}

function handleJointCreated(requestId: number, jointId: number) {
	const resolve = pendingJoints.get(requestId);
	if (resolve) {
		pendingJoints.delete(requestId);
		resolve(jointId);
	}
}

interface QueuedEvent {
	type: string;
	data: Record<string, unknown>;
}

export function createNativeGodotBridge(): GodotBridge {
	const cbs = createCallbackArrays();
	let eventPollTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let consecutiveEmptyPolls = 0;
	const bridgeCore = new NativeBridgeCore();

	function scheduleNextPoll() {
		if (isDisposing) return;
		const delay =
			consecutiveEmptyPolls === 0
				? 16
				: Math.min(16 * 2 ** consecutiveEmptyPolls, 100);
		eventPollTimeoutId = setTimeout(pollAndDispatchEvents, delay);
	}

	async function pollAndDispatchEvents() {
		if (!isGodotInitialized || isDisposing) return;

		try {
			const { RTNGodot, runOnGodotThread } = await getGodotModule();
			if (isDisposing) return;

			const eventsJson = await runOnGodotThread(() => {
				"worklet";
				try {
					const Godot = RTNGodot.API();
					const gameBridge = Godot.Engine.get_main_loop()
						.get_root()
						.get_node("GameBridge") as unknown as GodotGameBridge | null;
					if (gameBridge?.poll_events) {
						return gameBridge.poll_events();
					}
				} catch (e) {
					console.warn("[GodotBridge] Error polling events:", e);
				}
				return "[]";
			});

			const events: QueuedEvent[] = JSON.parse(eventsJson);

			if (events.length === 0) {
				consecutiveEmptyPolls++;
			} else {
				consecutiveEmptyPolls = 0;
			}

			for (const event of events) {
				switch (event.type) {
					case "collision": {
						const data = event.data as {
							entityA: string;
							entityB: string;
							impulse: number;
						};
						const collisionEvent: CollisionEvent = {
							entityA: data.entityA,
							entityB: data.entityB,
							contacts: [
								{
									point: { x: 0, y: 0 },
									normal: { x: 0, y: 1 },
									normalImpulse: data.impulse,
									tangentImpulse: 0,
								},
							],
						};
						for (const cb of cbs.collision) cb(collisionEvent);
						bridgeCore.dispatch({ type: "collision", data: collisionEvent });
						break;
					}
					case "collision_detailed": {
						const data = event.data as {
							entityA: string;
							entityB: string;
							contacts: ContactInfo[];
						};
						const collisionEvent: CollisionEvent = {
							entityA: data.entityA,
							entityB: data.entityB,
							contacts: data.contacts,
						};
						for (const cb of cbs.collision) cb(collisionEvent);
						bridgeCore.dispatch({ type: "collision", data: collisionEvent });
						break;
					}
					case "destroy": {
						const entityId = (event.data as { entityId: string }).entityId;
						for (const cb of cbs.destroy) cb(entityId);
						bridgeCore.dispatch({
							type: "entity_destroyed",
							data: { entityId },
						});
						break;
					}
					case "entity_spawned": {
						const data = event.data as unknown as EntitySpawnedEvent;
						for (const cb of cbs.entitySpawned) cb(data);
						bridgeCore.dispatch({ type: "entity_spawned", data });
						break;
					}
					case "sensor_begin": {
						const data = event.data as {
							sensorShapeIndex: number;
							otherEntityId: string;
							otherShapeIndex: number;
						};
						const sensorEvent: SensorEvent = {
							sensorShapeIndex: data.sensorShapeIndex,
							otherEntityId: data.otherEntityId,
							otherShapeIndex: data.otherShapeIndex,
						};
						for (const cb of cbs.sensorBegin) cb(sensorEvent);
						bridgeCore.dispatch({ type: "sensor_begin", data: sensorEvent });
						break;
					}
					case "sensor_end": {
						const data = event.data as {
							sensorShapeIndex: number;
							otherEntityId: string;
							otherShapeIndex: number;
						};
						const sensorEvent: SensorEvent = {
							sensorShapeIndex: data.sensorShapeIndex,
							otherEntityId: data.otherEntityId,
							otherShapeIndex: data.otherShapeIndex,
						};
						for (const cb of cbs.sensorEnd) cb(sensorEvent);
						bridgeCore.dispatch({ type: "sensor_end", data: sensorEvent });
						break;
					}
					case "ui_button": {
						const data = event.data as { eventType: string; buttonId: string };
						for (const cb of cbs.uiButton) {
							cb(
								data.eventType as
									| "button_down"
									| "button_up"
									| "button_pressed",
								data.buttonId,
							);
						}
						break;
					}
					case "input": {
						const data = event.data as {
							type: string;
							x: number;
							y: number;
							entityId: string | null;
						};
						for (const cb of cbs.inputEvent) {
							cb(data.type, data.x, data.y, data.entityId);
						}
						break;
					}
					case "property_sync": {
						const data = event.data as unknown as PropertySyncPayload;
						for (const cb of cbs.propertySync) {
							cb(data);
						}
						break;
					}
					case "score": {
						const data = event.data as { points: number; entityId: string };
						for (const cb of cbs.score) {
							cb(data.points, data.entityId);
						}
						break;
					}
				}
			}
		} catch (e) {
			console.error("[GodotBridge] Fatal error in pollAndDispatchEvents:", e);
		}

		scheduleNextPoll();
	}

	const executeEffects = async <T = void>(
		method: string,
		params?: Record<string, unknown>,
		mapData?: (rawData: unknown) => T,
	): Promise<import("./types").EffectsResult<T>> => {
		try {
			const response = await callGameBridgeAsync(
				"callRpc",
				JSON.stringify({ method, params }),
			);
			const parsed =
				typeof response === "string" ? JSON.parse(response) : response;
			const raw =
				parsed && typeof parsed === "object" && "result" in parsed
					? (parsed as { result: unknown }).result
					: parsed;

			return normalizeEffectsResult<T>(raw, mapData);
		} catch (error) {
			return normalizeEffectsResult<T>({ success: false, error });
		}
	};

	const nativeDispatch: PlatformDispatch = {
		sync(snakeName: string, ...args: unknown[]) {
			callGameBridge(snakeName, ...args);
		},
		async async<T>(snakeName: string, ...args: unknown[]): Promise<T> {
			const actualArgs = Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
			return callGameBridgeAsync(snakeName, ...actualArgs);
		},
		effectsSync(snakeName: string, ...args: unknown[]) {
			callEffectsBridge(snakeName, ...args);
		},
		effectsAsync: executeEffects,
	};

	const generatedMethods = createBridgeMethods(nativeDispatch);

	const bridge: GodotBridge = {
		...generatedMethods,
		...createCallbackMethods(cbs),

		// === NATIVE-SPECIFIC OVERRIDES ===

		// Lifecycle
		async initialize() {
			const { RTNGodot, runOnGodotThread } = await getGodotModule();

			if (isGodotInitialized) {
				return;
			}

			const bundleDir = FileSystem.bundleDirectory ?? "";
			const pckPath = bundleDir + "godot/main.pck";

			if (Platform.OS === "android") {
				runOnGodotThread(() => {
					"worklet";
					RTNGodot.createInstance([
						"--verbose",
						"--path",
						"/main",
						"--rendering-driver",
						"opengl3",
						"--rendering-method",
						"gl_compatibility",
						"--display-driver",
						"embedded",
					]);
				});
			} else {
				runOnGodotThread(() => {
					"worklet";
					RTNGodot.createInstance([
						"--verbose",
						"--main-pack",
						pckPath,
						"--rendering-driver",
						"opengl3",
						"--rendering-method",
						"gl_compatibility",
						"--display-driver",
						"embedded",
					]);
				});
			}

			return new Promise<void>((resolve, reject) => {
				let attempts = 0;
				const maxAttempts = 100;

				const checkReady = () => {
					attempts++;

					runOnGodotThread(() => {
						"worklet";
						try {
							const instance = RTNGodot.getInstance();
							if (!instance) {
								return { ready: false, stage: "no_instance" };
							}
							const api = RTNGodot.API();
							if (!api) {
								return { ready: false, stage: "no_api" };
							}
							if (!api.Engine) {
								return { ready: false, stage: "no_engine" };
							}
							const mainLoop = api.Engine.get_main_loop();
							if (!mainLoop) {
								return { ready: false, stage: "no_main_loop" };
							}
							const root = mainLoop.get_root();
							if (!root) {
								return { ready: false, stage: "no_root" };
							}
							return { ready: true, stage: "ready" };
						} catch (e) {
							return { ready: false, stage: "exception", error: String(e) };
						}
					})
						.then(
							(result: { ready: boolean; stage: string; error?: string }) => {
								if (result.ready) {
									isGodotInitialized = true;

									scheduleNextPoll();

									resolve();
								} else if (attempts >= maxAttempts) {
									console.error(
										`[GodotBridge] TIMEOUT: Godot never reached ready state. Last stage: ${result.stage}${result.error ? `, error: ${result.error}` : ""}`,
									);
									reject(
										new Error(
											`Godot engine failed to initialize after 10 seconds (stuck at: ${result.stage})`,
										),
									);
								} else {
									setTimeout(checkReady, 100);
								}
							},
						)
						.catch((err) => {
							if (attempts >= maxAttempts) {
								reject(
									new Error(
										`Godot engine failed to initialize (runOnGodotThread error: ${err})`,
									),
								);
							} else {
								setTimeout(checkReady, 100);
							}
						});
				};

				setTimeout(checkReady, 1000);
			});
		},

		dispose() {
			if (isDisposing) return;
			isDisposing = true;

			if (eventPollTimeoutId) {
				clearTimeout(eventPollTimeoutId);
				eventPollTimeoutId = null;
			}
			bridgeCore.cancelAllPending("Bridge disposed");

			clearAllCallbacks(cbs);

			if (!isGodotInitialized) {
				isDisposing = false;
				return;
			}

			getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
				runOnGodotThread(() => {
					"worklet";
					try {
						const Godot = RTNGodot.API();
						const gameBridge = Godot.Engine.get_main_loop()
							?.get_root()
							?.get_node("GameBridge");
						if (gameBridge) {
							gameBridge.native_dispatch("clear_game", "[]");
						}
					} catch (e) {
						console.warn("[GodotBridge] Error during dispose:", e);
					}
				});

				setTimeout(() => {
					runOnGodotThread(() => {
						"worklet";
						RTNGodot.destroyInstance();
					});
					isGodotInitialized = false;
					isDisposing = false;
				}, 100);
			});
		},

		// Inline worklets (direct Godot node access for performance)
		async getEntityTransform(
			entityId: string,
		): Promise<EntityTransform | null> {
			const { RTNGodot, runOnGodotThread } = await getGodotModule();

			return runOnGodotThread(() => {
				"worklet";
				try {
					const Godot = RTNGodot.API();
					const gameBridge = Godot.Engine.get_main_loop()
						.get_root()
						.get_node("GameBridge") as unknown as GodotGameBridge | null;
					if (gameBridge?.entities?.[entityId]) {
						const node = gameBridge.entities[entityId];
						if (node?.position) {
							const ppm = gameBridge.pixels_per_meter || 50.0;
							return {
								x: node.position.x / ppm,
								y: node.position.y / ppm,
								angle: node.rotation,
							} as EntityTransform;
						}
					}
				} catch (e) {
					console.warn("[GodotBridge] Error getting entity transform:", e);
				}
				return null;
			});
		},

		async getAllTransforms(): Promise<Record<string, EntityTransform>> {
			const { RTNGodot, runOnGodotThread } = await getGodotModule();

			return runOnGodotThread(() => {
				"worklet";
				try {
					const Godot = RTNGodot.API();
					const gameBridge = Godot.Engine.get_main_loop()
						.get_root()
						.get_node("GameBridge") as unknown as GodotGameBridge | null;
					if (gameBridge?.entities) {
						const result: Record<string, EntityTransform> = {};
						const ppm = gameBridge.pixels_per_meter || 50.0;
						const entityIds = Object.keys(gameBridge.entities);
						for (const entityId of entityIds) {
							const node = gameBridge.entities[entityId];
							if (node?.position) {
								result[entityId] = {
									x: node.position.x / ppm,
									y: node.position.y / ppm,
									angle: node.rotation || 0,
								};
							}
						}
						return result;
					}
				} catch (e) {
					console.warn("[GodotBridge] Error getting all transforms:", e);
				}
				return {};
			});
		},

		async screenToWorld(screenX: number, screenY: number): Promise<Vec2> {
			const { RTNGodot, runOnGodotThread } = await getGodotModule();

			return runOnGodotThread(() => {
				"worklet";
				try {
					const Godot = RTNGodot.API();
					const gameBridge = Godot.Engine.get_main_loop()
						.get_root()
						.get_node("GameBridge");
					if (gameBridge) {
						const argsJson = JSON.stringify([screenX, screenY]);
						const result = gameBridge.native_dispatch(
							"screen_to_world",
							argsJson,
						);
						if (result && typeof result === "object") {
							return result as Vec2;
						}
					}
				} catch (e) {
					console.warn("[GodotBridge] Error in screenToWorld:", e);
				}
				return { x: 0, y: 0 };
			});
		},

		// Custom response handling
		async getAllProperties(): Promise<PropertySyncPayload> {
			const result = await callGameBridgeAsync("get_all_properties");
			if (result && typeof result === "object") {
				return result as PropertySyncPayload;
			}
			return { frameId: 0, timestamp: 0, entities: {} };
		},

		// File downloads (native-specific)
		async setEntityImage(
			entityId: string,
			url: string,
			width: number,
			height: number,
		) {
			console.log(
				`[GodotBridge.native] setEntityImage called for ${entityId} with URL: ${url}`,
			);
			try {
				const filename = `texture_${entityId}_${Date.now()}.png`;
				const localPath = `${FileSystem.cacheDirectory}${filename}`;

				console.log(
					`[GodotBridge.native] Downloading from ${url} to ${localPath}`,
				);
				const downloadResult = await FileSystem.downloadAsync(url, localPath);
				console.log(
					`[GodotBridge.native] Download result status: ${downloadResult.status}`,
				);

				if (downloadResult.status === 200) {
					const godotPath = localPath.replace(/^file:\/\//, "");
					console.log(
						`[GodotBridge.native] Calling set_entity_image_from_file with path: ${godotPath}`,
					);
					callGameBridge(
						"set_entity_image_from_file",
						entityId,
						godotPath,
						width,
						height,
					);
				} else {
					console.error(
						`[GodotBridge.native] Download failed with status: ${downloadResult.status}`,
					);
				}
			} catch (e) {
				console.error(
					`[GodotBridge.native] setEntityImage error for ${entityId}:`,
					e,
				);
			}
		},

		async setEntityAtlasRegion(
			entityId: string,
			atlasUrl: string,
			x: number,
			y: number,
			w: number,
			h: number,
			width: number,
			height: number,
		) {
			try {
				const urlHash = atlasUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(-50);
				const filename = `atlas_${urlHash}.png`;
				const localPath = `${FileSystem.cacheDirectory}${filename}`;

				const fileInfo = await FileSystem.getInfoAsync(localPath);

				let godotPath: string;
				if (fileInfo.exists) {
					godotPath = localPath.replace(/^file:\/\//, "");
				} else {
					const downloadResult = await FileSystem.downloadAsync(
						atlasUrl,
						localPath,
					);

					if (downloadResult.status !== 200) {
						return;
					}
					godotPath = localPath.replace(/^file:\/\//, "");
				}

				callGameBridge(
					"set_entity_atlas_region_from_file",
					entityId,
					godotPath,
					x,
					y,
					w,
					h,
					width,
					height,
				);
			} catch (e) {
				console.error(`[GodotBridge.native] setEntityAtlasRegion error:`, e);
			}
		},

		async preloadTextures(
			urls: string[],
			onProgress?: (percent: number, completed: number, failed: number) => void,
		): Promise<{ completed: number; failed: number }> {
			if (urls.length === 0) {
				onProgress?.(100, 0, 0);
				return { completed: 0, failed: 0 };
			}

			let completed = 0;
			let failed = 0;
			const total = urls.length;

			for (const url of urls) {
				try {
					const urlHash = url.replace(/[^a-zA-Z0-9]/g, "_").slice(-50);
					const filename = `preload_${urlHash}.png`;
					const localPath = `${FileSystem.cacheDirectory}${filename}`;

					const fileInfo = await FileSystem.getInfoAsync(localPath);
					if (!fileInfo.exists) {
						const downloadResult = await FileSystem.downloadAsync(
							url,
							localPath,
						);
						if (downloadResult.status !== 200) {
							failed++;
						} else {
							completed++;
						}
					} else {
						completed++;
					}
				} catch {
					failed++;
				}

				const percent = Math.round(((completed + failed) / total) * 100);
				onProgress?.(percent, completed, failed);
			}

			return { completed, failed };
		},

		// Hardcoded/stubs
		async getAvailableEffects(): Promise<{
			sprite: string[];
			post: string[];
			particles: string[];
		}> {
			return {
				sprite: [
					"outline",
					"glow",
					"tint",
					"flash",
					"pixelate",
					"posterize",
					"silhouette",
					"rainbow",
					"dissolve",
					"holographic",
					"wave",
					"rim_light",
					"color_matrix",
					"inner_glow",
					"drop_shadow",
				],
				post: [
					"vignette",
					"scanlines",
					"chromatic_aberration",
					"shockwave",
					"blur",
					"crt",
					"color_grading",
					"glitch",
					"motion_blur",
					"pixelate_screen",
					"shimmer",
				],
				particles: [
					"fire",
					"smoke",
					"sparks",
					"magic",
					"explosion",
					"rain",
					"snow",
					"bubbles",
					"confetti",
					"dust",
					"leaves",
					"stars",
					"blood",
					"coins",
				],
			};
		},

		setInspectMode(_enabled: boolean) {
			// Not implemented for native yet - only web needs this
		},

		// Joint creation (uses Date.now() for ID + callGameBridge fire-and-forget)
		createRevoluteJoint(def: RevoluteJointDef): number {
			const jointId = Date.now();
			callGameBridge(
				"create_revolute_joint",
				def.bodyA,
				def.bodyB,
				def.anchor.x,
				def.anchor.y,
				def.enableLimit ?? false,
				def.lowerAngle ?? 0,
				def.upperAngle ?? 0,
				def.enableMotor ?? false,
				def.motorSpeed ?? 0,
				def.maxMotorTorque ?? 0,
			);
			return jointId;
		},

		createDistanceJoint(def: DistanceJointDef): number {
			const jointId = Date.now();
			callGameBridge(
				"create_distance_joint",
				def.bodyA,
				def.bodyB,
				def.anchorA.x,
				def.anchorA.y,
				def.anchorB.x,
				def.anchorB.y,
				def.length ?? 0,
				def.stiffness ?? 0,
				def.damping ?? 0,
			);
			return jointId;
		},

		createPrismaticJoint(def: PrismaticJointDef): number {
			const jointId = Date.now();
			callGameBridge(
				"create_prismatic_joint",
				def.bodyA,
				def.bodyB,
				def.anchor.x,
				def.anchor.y,
				def.axis.x,
				def.axis.y,
				def.enableLimit ?? false,
				def.lowerTranslation ?? 0,
				def.upperTranslation ?? 0,
				def.enableMotor ?? false,
				def.motorSpeed ?? 0,
				def.maxMotorForce ?? 0,
			);
			return jointId;
		},

		createWeldJoint(def: WeldJointDef): number {
			const jointId = Date.now();
			callGameBridge(
				"create_weld_joint",
				def.bodyA,
				def.bodyB,
				def.anchor.x,
				def.anchor.y,
				def.stiffness ?? 0,
				def.damping ?? 0,
			);
			return jointId;
		},

		createMouseJoint(def: MouseJointDef): number {
			console.warn(
				"[GodotBridge.native] createMouseJoint: sync API not recommended on native, use createMouseJointAsync",
			);
			const jointId = Date.now();
			callGameBridge(
				"create_mouse_joint",
				def.body,
				def.target.x,
				def.target.y,
				def.maxForce,
				def.stiffness ?? 5,
				def.damping ?? 0.7,
			);
			return jointId;
		},

		async createMouseJointAsync(def: MouseJointDef): Promise<number> {
			const result = await callGameBridgeAsync(
				"create_mouse_joint",
				def.body,
				def.target.x,
				def.target.y,
				def.maxForce,
				def.stiffness ?? 5,
				def.damping ?? 0.7,
			);
			return typeof result === "number" ? result : -1;
		},

		// RPC routing (uses callRpc/callGameBridgeAsync("callRpc", ...) not standard dispatch)
		loadRules(rules) {
			this.callRpc("load_rules", { rules });
		},

		async loadScript(source) {
			try {
				await this.callRpc("load_script", { source });
				return { ok: true };
			} catch (error) {
				return { ok: false, error: String(error) };
			}
		},

		async stepPhysics(
			frames: number,
		): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }> {
			const response = await callGameBridgeAsync(
				"callRpc",
				JSON.stringify({
					method: "time.step",
					params: { frames },
				}),
			);
			const result = JSON.parse(response);
			return {
				ok: result.ok ?? true,
				framesAdvanced: result.framesAdvanced ?? frames,
				endFrame: result.endFrame ?? 0,
			};
		},

		async callRpc(method: string, params?: unknown): Promise<any> {
			const response = await callGameBridgeAsync(
				"callRpc",
				JSON.stringify({ method, params }),
			);
			const parsed = JSON.parse(response);
			if (parsed.error) {
				throw new Error(parsed.error.message);
			}
			return parsed.result ?? parsed;
		},
	} as GodotBridge;

	return bridge;
}
