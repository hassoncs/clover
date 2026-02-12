import type { PropertySyncPayload } from "@slopcade/shared";
import { BridgeCore, type BridgeMessage } from "./BridgeCore";
import {
	clearAllCallbacks,
	createCallbackArrays,
	createCallbackMethods,
} from "./callback-registry";
import { injectGodotDebugBridge } from "./debug";
import { normalizeEffectsResult } from "./GodotBridgeBase";
import { createGeneratedMethods } from "./generated/web-bridge-methods";
import {
	type GodotBridgeBase,
	getGodotBridge as getSharedGodotBridge,
	setupQueryResolver,
	queryAsync as sharedQueryAsync,
} from "./query";
import type {
	CollisionEvent,
	ContactInfo,
	EffectsResult,
	EntitySpawnedEvent,
	EntityTransform,
	GodotBridge,
	SensorEvent,
} from "./types";

interface GodotBridgeCallbacks {
	onCollision(
		callback: (
			dataOrEntityA: string,
			entityB?: string,
			impulse?: number,
		) => void,
	): void;
	onEntityDestroyed(callback: (entityId: string) => void): void;
	onEntitySpawned?(callback: (jsonStr: string) => void): void;
	onSensorBegin(
		callback: (
			sensorShapeIndex: number,
			entityId: string,
			otherShapeIndex: number,
		) => void,
	): void;
	onSensorEnd(
		callback: (
			sensorShapeIndex: number,
			entityId: string,
			otherShapeIndex: number,
		) => void,
	): void;
	onInputEvent(callback: (jsonStr: string) => void): void;
	onTransformSync(callback: (transformsJson: string) => void): void;
	onPropertySync(callback: (propertiesJson: string) => void): void;
	onUIButtonEvent(
		callback: (eventType: string, buttonId: string) => void,
	): void;
}

type GodotBridgeWindow = NonNullable<Window["GodotBridge"]> &
	GodotBridgeCallbacks;

class WebBridgeCore extends BridgeCore {
	private getGodotBridge: () => Window["GodotBridge"] | null;

	constructor(getGodotBridge: () => Window["GodotBridge"] | null) {
		super();
		this.getGodotBridge = getGodotBridge;
	}

	protected send(msg: BridgeMessage): void {
		const bridge = this.getGodotBridge();
		if (!bridge) return;

		if (msg.id) {
			bridge.query(msg.id, msg.type, JSON.stringify(msg.data ?? {}));
		}
	}
}

function getGodotIframeWindow(): Window | null {
	const iframe = document.querySelector(
		'iframe[title="Godot Game Engine"]',
	) as HTMLIFrameElement | null;
	return iframe?.contentWindow ?? null;
}

function injectCameraHelpers(): void {
	const iframeWindow = getGodotIframeWindow();
	if (!iframeWindow) return;

	let video: HTMLVideoElement | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let animationFrameId: number | null = null;
	let lastFrameTime = 0;
	const frameRate = 20;

	const iframeWin = iframeWindow as Window & {
		_cameraFrameData: Uint8Array | null;
		_cameraFrameWidth: number;
		_cameraFrameHeight: number;
		startCamera: (entityId: string, width?: number, height?: number) => void;
		stopCamera: () => void;
	};

	iframeWin._cameraFrameData = null;
	iframeWin._cameraFrameWidth = 0;
	iframeWin._cameraFrameHeight = 0;

	function captureLoop(): void {
		if (!stream) return;

		const now = performance.now();
		if (now - lastFrameTime >= 1000 / frameRate) {
			lastFrameTime = now;
			if (
				video &&
				ctx &&
				canvas &&
				video.readyState === video.HAVE_ENOUGH_DATA
			) {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				iframeWin._cameraFrameData = new Uint8Array(imageData.data.buffer);
			}
		}

		animationFrameId = requestAnimationFrame(captureLoop);
	}

	function stopCamera(): void {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		if (stream) {
			for (const track of stream.getTracks()) track.stop();
			stream = null;
		}
		if (video) {
			video.srcObject = null;
		}
		iframeWin._cameraFrameData = null;
	}

	async function startCamera(
		entityId: string,
		width = 640,
		height = 480,
	): Promise<void> {
		if (stream) stopCamera();

		iframeWin._cameraFrameWidth = width;
		iframeWin._cameraFrameHeight = height;

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { width, height, facingMode: "user" },
			});

			if (!video) {
				video = document.createElement("video");
				video.autoplay = true;
				video.playsInline = true;
			}
			video.srcObject = stream;

			if (!canvas) {
				canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				ctx = canvas.getContext("2d", { willReadFrequently: true });
			}

			video.onloadedmetadata = () => {
				video!.play();
				lastFrameTime = performance.now();
				captureLoop();
			};

			console.log(`[CameraHelper] Camera started for entity: ${entityId}`);
		} catch (err) {
			console.error("[CameraHelper] Failed to start camera:", err);
		}
	}

	iframeWin.startCamera = startCamera as typeof iframeWin.startCamera;
	iframeWin.stopCamera = stopCamera;
}

export function createWebGodotBridge(): GodotBridge {
	const cbs = createCallbackArrays();

	const getGodotBridge = (): Window["GodotBridge"] | null => {
		const iframe = document.querySelector(
			'iframe[title="Godot Game Engine"]',
		) as HTMLIFrameElement | null;
		if (iframe?.contentWindow) {
			return (iframe.contentWindow as Window).GodotBridge ?? null;
		}
		return window.GodotBridge ?? null;
	};

	const bridgeCore = new WebBridgeCore(getGodotBridge);

	const queryAsync = <T>(
		method: string,
		args: unknown[] = [],
		timeoutMs = 5000,
	): Promise<T> => {
		const bridge = getSharedGodotBridge() as GodotBridgeBase | null;
		if (!bridge) {
			return Promise.reject(new Error("Godot bridge not available"));
		}
		return sharedQueryAsync<T>(bridge, method, args, { timeoutMs });
	};

	const executeEffects = async <T = void>(
		method: string,
		params?: Record<string, unknown>,
		mapData?: (rawData: unknown) => T,
	): Promise<EffectsResult<T>> => {
		try {
			const raw = await queryAsync<unknown>(method, params ? [params] : []);
			return normalizeEffectsResult<T>(raw, mapData);
		} catch (error) {
			return normalizeEffectsResult<T>({ success: false, error });
		}
	};

	const generatedMethods = createGeneratedMethods(
		getGodotBridge,
		queryAsync,
		executeEffects,
	);

	const bridge: GodotBridge = {
		...generatedMethods,
		...createCallbackMethods(cbs),

		async initialize() {
			setupQueryResolver();

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("Godot WASM load timeout")),
					30000,
				);

				const checkReady = setInterval(() => {
					const rawBridge = getGodotBridge();
					if (rawBridge) {
						clearInterval(checkReady);
						clearTimeout(timeout);
						const godotBridge = rawBridge as GodotBridgeWindow;

						godotBridge.onCollision(
							(dataOrEntityA: string, entityB?: string, impulse?: number) => {
								let event: CollisionEvent;

								if (!dataOrEntityA) {
									return;
								}

								const isNewJsonFormat = entityB === undefined;
								if (isNewJsonFormat) {
									try {
										const parsed = JSON.parse(dataOrEntityA);
										event = {
											entityA: parsed.entityA,
											entityB: parsed.entityB,
											contacts: parsed.contacts as ContactInfo[],
										};
									} catch {
										console.warn(
											"[GodotBridge.web] Failed to parse collision data:",
											dataOrEntityA,
										);
										return;
									}
								} else {
									event = {
										entityA: dataOrEntityA,
										entityB: entityB,
										contacts: [
											{
												point: { x: 0, y: 0 },
												normal: { x: 0, y: 1 },
												normalImpulse: impulse ?? 0,
												tangentImpulse: 0,
											},
										],
									};
								}

								for (const cb of cbs.collision) cb(event);
								bridgeCore.dispatch({ type: "collision", data: event });
							},
						);

						godotBridge.onEntityDestroyed((entityId: string) => {
							for (const cb of cbs.destroy) cb(entityId);
							bridgeCore.dispatch({
								type: "entity_destroyed",
								data: { entityId },
							});
						});

						godotBridge.onEntitySpawned?.((jsonStr: string) => {
							try {
								const event = JSON.parse(jsonStr) as EntitySpawnedEvent;
								for (const cb of cbs.entitySpawned) cb(event);
								bridgeCore.dispatch({ type: "entity_spawned", data: event });
							} catch {
								console.warn(
									"[GodotBridge.web] Failed to parse entity spawned event:",
									jsonStr,
								);
							}
						});

						godotBridge.onSensorBegin(
							(
								sensorShapeIndex: number,
								entityId: string,
								otherShapeIndex: number,
							) => {
								const event: SensorEvent = {
									sensorShapeIndex: sensorShapeIndex,
									otherEntityId: entityId,
									otherShapeIndex: otherShapeIndex,
								};
								for (const cb of cbs.sensorBegin) cb(event);
								bridgeCore.dispatch({ type: "sensor_begin", data: event });
							},
						);

						godotBridge.onSensorEnd(
							(
								sensorShapeIndex: number,
								entityId: string,
								otherShapeIndex: number,
							) => {
								const event: SensorEvent = {
									sensorShapeIndex: sensorShapeIndex,
									otherEntityId: entityId,
									otherShapeIndex: otherShapeIndex,
								};
								for (const cb of cbs.sensorEnd) cb(event);
								bridgeCore.dispatch({ type: "sensor_end", data: event });
							},
						);

						godotBridge.onInputEvent((jsonStr: unknown) => {
							try {
								const data = JSON.parse(jsonStr as string) as {
									type: string;
									x: number;
									y: number;
									entityId: string | null;
								};
								for (const cb of cbs.inputEvent)
									cb(data.type, data.x, data.y, data.entityId);
							} catch {}
						});

						godotBridge.onTransformSync((transformsJson: string) => {
							try {
								const transforms = JSON.parse(transformsJson) as Record<
									string,
									EntityTransform
								>;
								for (const cb of cbs.transformSync) cb(transforms);
							} catch {}
						});

						godotBridge.onPropertySync((propertiesJson: string) => {
							try {
								const properties = JSON.parse(
									propertiesJson,
								) as PropertySyncPayload;
								for (const cb of cbs.propertySync) cb(properties);
							} catch {}
						});

						injectCameraHelpers();

						if (
							process.env.NODE_ENV === "development" ||
							(typeof window !== "undefined" &&
								window.location?.search?.includes("debug=true"))
						) {
							injectGodotDebugBridge();
						}

						resolve();
					}
				}, 100);
			});
		},

		dispose() {
			getGodotBridge()?.clearGame();
			clearAllCallbacks(cbs);
		},

		onUIButtonEvent(
			callback: (
				eventType: "button_down" | "button_up" | "button_pressed",
				buttonId: string,
			) => void,
		): () => void {
			cbs.uiButton.push(callback);

			const godotBridge = getGodotBridge() as GodotBridgeWindow | null;
			if (godotBridge?.onUIButtonEvent && cbs.uiButton.length === 1) {
				godotBridge.onUIButtonEvent((...args: unknown[]) => {
					let eventType: string;
					let buttonId: string;

					if (Array.isArray(args[0])) {
						const arr = args[0] as string[];
						eventType = arr[0];
						buttonId = arr[1];
					} else {
						eventType = args[0] as string;
						buttonId = args[1] as string;
					}

					for (const cb of cbs.uiButton) {
						cb(
							eventType as "button_down" | "button_up" | "button_pressed",
							buttonId,
						);
					}
				});
			}

			return () => {
				const index = cbs.uiButton.indexOf(callback);
				if (index >= 0) cbs.uiButton.splice(index, 1);
			};
		},
	} as GodotBridge;

	return bridge;
}
