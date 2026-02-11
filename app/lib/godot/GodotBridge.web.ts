import type { GameDefinition, PropertySyncPayload } from "@slopcade/shared";
import { BridgeCore, type BridgeMessage } from "./BridgeCore";
import {
	clearAllCallbacks,
	createCallbackArrays,
	createCallbackMethods,
} from "./callback-registry";
import { injectGodotDebugBridge } from "./debug";
import {
	createEffectsSnapshotPayload,
	normalizeEffectsResult,
	normalizeEffectsSnapshot,
} from "./GodotBridgeBase";
import {
	type GodotBridgeBase,
	getGodotBridge as getSharedGodotBridge,
	setupQueryResolver,
	queryAsync as sharedQueryAsync,
} from "./query";
import type {
	CollisionEvent,
	ContactInfo,
	DistanceJointDef,
	DrawCommand,
	DynamicShaderResult,
	EffectsPipelineSnapshot,
	EffectsResult,
	EntitySpawnedEvent,
	EntityTransform,
	GodotBridge,
	MouseJointDef,
	NormalizedDrawCommand,
	PrismaticJointDef,
	RaycastHit,
	RevoluteJointDef,
	SensorEvent,
	SpawnEntityRequest,
	Vec2,
	WeldJointDef,
} from "./types";

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

declare global {
	interface Window {
		GodotBridge?: {
			_lastResult: unknown;
			_pendingQueries?: Map<string, (result: unknown) => void>;
			query: (requestId: string, method: string, argsJson: string) => void;
			loadGameJson: (json: string) => boolean;
			clearGame: () => void;
			setupWorld: (worldJson: string, backgroundJson: string) => void;
			registerPrefabs(prefabsJson: string): void;
			loadEntities: (entitiesJson: string) => number;
			clearEntities: () => void;
			spawnEntity: (
				prefabId: string,
				x: number,
				y: number,
				entityId: string,
				initialVelocityJson: string,
			) => void;
			destroyEntity: (entityId: string) => void;
			getEntityTransform: (entityId: string) => EntityTransform | null;
			getAllTransforms: () => Record<string, EntityTransform>;
			getAllProperties: () => PropertySyncPayload;
			onPropertySync: (callback: (propertiesJson: string) => void) => void;
			setWatchConfig: (configJson: string) => void;
			setTransform: (
				entityId: string,
				x: number,
				y: number,
				angle: number,
			) => void;
			setPosition: (entityId: string, x: number, y: number) => void;
			setRotation: (entityId: string, angle: number) => void;
			setScale: (entityId: string, scaleX: number, scaleY: number) => void;
			setOpacity: (entityId: string, opacity: number) => void;
			setVisible: (entityId: string, visible: boolean) => void;
			getLinearVelocity: (entityId: string) => { x: number; y: number } | null;
			setLinearVelocity: (entityId: string, vx: number, vy: number) => void;
			getAngularVelocity: (entityId: string) => number | null;
			setAngularVelocity: (entityId: string, v: number) => void;
			applyImpulse: (entityId: string, ix: number, iy: number) => void;
			applyForce: (entityId: string, fx: number, fy: number) => void;
			applyTorque: (entityId: string, torque: number) => void;
			createRevoluteJoint: (...args: (string | number | boolean)[]) => number;
			createDistanceJoint: (...args: (string | number)[]) => number;
			createPrismaticJoint: (...args: (string | number | boolean)[]) => number;
			createWeldJoint: (...args: (string | number)[]) => number;
			createMouseJoint: (...args: (string | number)[]) => number;
			getLastJointId: () => number;
			destroyJoint: (jointId: number) => void;
			destroyMouseJointForEntity: (entityId: string) => void;
			setMotorSpeed: (jointId: number, speed: number) => void;
			setMouseTarget: (jointId: number, x: number, y: number) => void;
			queryPoint: (x: number, y: number) => number | null;
			queryPointEntity: (x: number, y: number) => void;
			queryAABB: (
				minX: number,
				minY: number,
				maxX: number,
				maxY: number,
			) => number[];
			raycast: (
				originX: number,
				originY: number,
				dirX: number,
				dirY: number,
				maxDist: number,
			) => RaycastHit | null;
			setUserData: (entityId: string, data: unknown) => void;
			getUserData: (entityId: string) => unknown;
			getAllEntityIds: () => string[];
			sendInput: (type: string, x: number, y: number, entityId: string) => void;
			onCollision: (
				callback: (
					dataOrEntityA: string,
					entityB?: string,
					impulse?: number,
				) => void,
			) => void;
			onEntityDestroyed: (callback: (entityId: string) => void) => void;
			onEntitySpawned?: (callback: (jsonStr: string) => void) => void;
			onSensorBegin: (
				callback: (
					sensorShapeIndex: number,
					entityId: string,
					otherShapeIndex: number,
				) => void,
			) => void;
			onSensorEnd: (
				callback: (
					sensorShapeIndex: number,
					entityId: string,
					otherShapeIndex: number,
				) => void,
			) => void;
			onInputEvent: (callback: (jsonStr: string) => void) => void;
			onTransformSync: (callback: (transformsJson: string) => void) => void;
			setEntityImage: (
				entityId: string,
				url: string,
				width: number,
				height: number,
			) => void;
			setEntityAtlasRegion: (
				entityId: string,
				atlasUrl: string,
				x: number,
				y: number,
				w: number,
				h: number,
				width: number,
				height: number,
			) => void;
			clearTextureCache: (url: string) => void;
			preloadTextures: (
				urlsJson: string,
				progressCallback: (
					percent: number,
					completed: number,
					failed: number,
				) => void,
			) => void;
			createPixelBuffer: (
				entityId: string,
				width: number,
				height: number,
				clearColor: string,
				worldWidth?: number,
				worldHeight?: number,
			) => void;
			pixelBufferDraw: (entityId: string, commandsJson: string) => void;
			pixelBufferClear: (entityId: string, color: string) => void;
			destroyPixelBuffer: (entityId: string) => void;
			setDebugShowShapes: (show: boolean) => void;
			setDebugSettings: (settingsJson: string) => void;
			setCameraTarget: (entityId: string) => void;
			setCameraPosition: (x: number, y: number) => void;
			setCameraZoom: (zoom: number) => void;
			startCamera: (entityId: string, width?: number, height?: number) => void;
			stopCamera: () => void;
			spawnParticle: (type: string, x: number, y: number) => void;
			playSound: (resourcePath: string) => void;

			screenShake: (intensity: number, duration?: number) => void;
			zoomPunch: (intensity?: number, duration?: number) => void;
			triggerShockwave: (
				worldX: number,
				worldY: number,
				duration?: number,
			) => void;
			flashScreen: (color?: number[], duration?: number) => void;
			createDynamicShader: (shaderId: string, shaderCode: string) => void;
			applyDynamicShader: (
				entityId: string,
				shaderId: string,
				paramsJson?: string,
			) => void;
			applyDynamicPostShader: (shaderCode: string, paramsJson?: string) => void;
			hotSwapShader: (shaderId: string, source: string) => void;

			spawnParticlePreset: (
				presetName: string,
				worldX: number,
				worldY: number,
				paramsJson?: string,
			) => void;
			getAvailableEffects: () => void;
			applySpriteEffect: (
				entityId: string,
				effectName: string,
				paramsJson: string,
			) => void;
			updateSpriteEffectParam: (
				entityId: string,
				paramName: string,
				value: unknown,
			) => void;
			clearSpriteEffect: (entityId: string) => void;
			setPostEffect: (
				effectName: string,
				paramsJson: string,
				layer: string,
			) => void;
			updatePostEffectParam: (
				paramName: string,
				value: unknown,
				layer: string,
			) => void;
			clearPostEffect: (layer: string) => void;
			createUIButton: (
				buttonId: string,
				normalUrl: string,
				pressedUrl: string,
				x: number,
				y: number,
				width: number,
				height: number,
			) => void;
			destroyUIButton: (buttonId: string) => void;
			onUIButtonEvent: (
				callback: (eventType: string, buttonId: string) => void,
			) => void;
			show_3d_model: (path: string) => boolean;
			show_3d_model_from_url: (url: string) => void;
			set_3d_viewport_position: (x: number, y: number) => void;
			set_3d_viewport_size: (width: number, height: number) => void;
			rotate_3d_model: (x: number, y: number, z: number) => void;
			set_3d_model_position: (x: number, y: number, z: number) => void;
			set_3d_camera_distance: (distance: number) => void;
			set_3d_camera_size: (size: number) => void;
			clear_3d_models: () => void;
			create_3d_floor: (
				size?: number,
				colorHex?: string,
				style?: string,
			) => void;
			create_3d_cube: (
				x: number,
				y: number,
				z: number,
				size?: number,
				colorHex?: string,
			) => void;
			clear_3d_cubes: () => void;
			set_orbit_controls: (enabled: boolean) => void;
			set_3d_camera_position: (x: number, y: number, z: number) => void;
			set_3d_camera_look_at: (x: number, y: number, z: number) => void;
			captureScreenshot: (
				withOverlays: boolean,
				overlayTypesJson: string,
			) => void;
			getWorldInfo: () => void;
			getCameraInfo: () => void;
			getViewportInfo: () => void;
			pausePhysics: () => void;
			resumePhysics: () => void;
			setInspectMode: (enabled: boolean) => void;
			createThemedUIComponent: (
				componentId: string,
				componentType: number,
				metadataUrl: string,
				x: number,
				y: number,
				width: number,
				height: number,
				labelText: string,
			) => void;
			destroyThemedUIComponent: (componentId: string) => void;
			drawToActiveBuffer: (entityId: string, commandsJson: string) => void;
			setExternalInput: (name: string, imageData: string) => void;
			setScreenInput: (enable: boolean) => void;
		};
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

	const bridge: GodotBridge = {
		async initialize() {
			setupQueryResolver();

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("Godot WASM load timeout")),
					30000,
				);

				const checkReady = setInterval(() => {
					const godotBridge = getGodotBridge();
					if (godotBridge) {
						clearInterval(checkReady);
						clearTimeout(timeout);

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

						godotBridge.onEntityDestroyed((entityId) => {
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
							(sensorShapeIndex, entityId, otherShapeIndex) => {
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
							(sensorShapeIndex, entityId, otherShapeIndex) => {
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

						// GDScript calls window.startCamera() via JavaScriptBridge
						injectCameraHelpers();

						// Auto-inject debug bridge in dev mode or when ?debug=true
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
			// Clear game state in Godot to prevent stale state on remount
			getGodotBridge()?.clearGame();

			clearAllCallbacks(cbs);
		},

		async loadGame(definition: GameDefinition) {
			const godotBridge = getGodotBridge();
			if (!godotBridge) throw new Error("Godot not initialized");
			godotBridge.loadGameJson(JSON.stringify(definition));
		},

		clearGame() {
			getGodotBridge()?.clearGame();
		},

		setupWorld(world, background) {
			getGodotBridge()?.setupWorld(
				JSON.stringify(world),
				JSON.stringify(background ?? {}),
			);
		},

		registerPrefabs(prefabs) {
			getGodotBridge()?.registerPrefabs(JSON.stringify(prefabs));
		},

		loadEntities(entities) {
			getGodotBridge()?.loadEntities(JSON.stringify(entities));
		},

		clearEntities() {
			getGodotBridge()?.clearEntities();
		},

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

		pausePhysics() {
			getGodotBridge()?.pausePhysics?.();
		},
		resumePhysics() {
			getGodotBridge()?.resumePhysics?.();
		},
		setInspectMode(enabled: boolean) {
			getGodotBridge()?.setInspectMode?.(enabled);
		},

		async stepPhysics(
			frames: number,
		): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }> {
			return queryAsync<{
				ok: boolean;
				framesAdvanced: number;
				endFrame: number;
			}>("step", [frames]);
		},

		spawnEntity(request: SpawnEntityRequest): void {
			const velocityJson = request.velocity
				? JSON.stringify(request.velocity)
				: "";
			getGodotBridge()?.spawnEntity(
				request.prefabId,
				request.position.x,
				request.position.y,
				request.entityId,
				velocityJson,
			);
		},

		async instantiateFromScene(
			scenePath: string,
			entityId: string,
			position: Vec2,
			properties?: Record<string, unknown>,
		): Promise<{ entityId: string }> {
			const result = await queryAsync<{ entityId: string }>(
				"instantiate_scene",
				[
					scenePath,
					entityId,
					position.x,
					position.y,
					JSON.stringify(properties ?? {}),
				],
			);
			return result ?? { entityId };
		},

		destroyEntity(entityId: string) {
			getGodotBridge()?.destroyEntity(entityId);
		},

		async getEntityTransform(
			entityId: string,
		): Promise<EntityTransform | null> {
			return getGodotBridge()?.getEntityTransform(entityId) ?? null;
		},

		async getAllTransforms(): Promise<Record<string, EntityTransform>> {
			try {
				return await queryAsync<Record<string, EntityTransform>>(
					"getAllTransforms",
				);
			} catch {
				return {};
			}
		},

		async getAllProperties(): Promise<PropertySyncPayload> {
			try {
				return await queryAsync<PropertySyncPayload>("getAllProperties");
			} catch {
				return { frameId: 0, timestamp: 0, entities: {} };
			}
		},

		setTransform(entityId: string, x: number, y: number, angle: number) {
			getGodotBridge()?.setTransform(entityId, x, y, angle);
		},

		setPosition(entityId: string, x: number, y: number) {
			getGodotBridge()?.setPosition(entityId, x, y);
		},

		setRotation(entityId: string, angle: number) {
			getGodotBridge()?.setRotation(entityId, angle);
		},

		setScale(entityId: string, scaleX: number, scaleY: number) {
			getGodotBridge()?.setScale(entityId, scaleX, scaleY);
		},

		setOpacity(entityId: string, opacity: number) {
			getGodotBridge()?.setOpacity(entityId, opacity);
		},

		setVisible(entityId: string, visible: boolean) {
			getGodotBridge()?.setVisible(entityId, visible);
		},

		async getLinearVelocity(entityId: string): Promise<Vec2 | null> {
			return getGodotBridge()?.getLinearVelocity(entityId) ?? null;
		},

		setLinearVelocity(entityId: string, velocity: Vec2) {
			getGodotBridge()?.setLinearVelocity(entityId, velocity.x, velocity.y);
		},

		async getAngularVelocity(entityId: string): Promise<number | null> {
			return getGodotBridge()?.getAngularVelocity(entityId) ?? null;
		},

		setAngularVelocity(entityId: string, velocity: number) {
			getGodotBridge()?.setAngularVelocity(entityId, velocity);
		},

		applyImpulse(entityId: string, impulse: Vec2) {
			getGodotBridge()?.applyImpulse(entityId, impulse.x, impulse.y);
		},

		applyForce(entityId: string, force: Vec2) {
			getGodotBridge()?.applyForce(entityId, force.x, force.y);
		},

		applyTorque(entityId: string, torque: number) {
			getGodotBridge()?.applyTorque(entityId, torque);
		},

		createRevoluteJoint(def: RevoluteJointDef): number {
			return (
				getGodotBridge()?.createRevoluteJoint(
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
				) ?? -1
			);
		},

		createDistanceJoint(def: DistanceJointDef): number {
			return (
				getGodotBridge()?.createDistanceJoint(
					def.bodyA,
					def.bodyB,
					def.anchorA.x,
					def.anchorA.y,
					def.anchorB.x,
					def.anchorB.y,
					def.length ?? 0,
					def.stiffness ?? 0,
					def.damping ?? 0,
				) ?? -1
			);
		},

		createPrismaticJoint(def: PrismaticJointDef): number {
			return (
				getGodotBridge()?.createPrismaticJoint(
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
				) ?? -1
			);
		},

		createWeldJoint(def: WeldJointDef): number {
			return (
				getGodotBridge()?.createWeldJoint(
					def.bodyA,
					def.bodyB,
					def.anchor.x,
					def.anchor.y,
					def.stiffness ?? 0,
					def.damping ?? 0,
				) ?? -1
			);
		},

		createMouseJoint(def: MouseJointDef): number {
			const godotBridge = getGodotBridge();
			if (!godotBridge) return -1;

			godotBridge.createMouseJoint(
				def.body,
				def.target.x,
				def.target.y,
				def.maxForce,
				def.stiffness ?? 5,
				def.damping ?? 0.7,
			);

			const fromLastResult = godotBridge._lastResult as number | undefined;
			const fromWindow = (
				window as unknown as { _slopcadeLastJointId?: number }
			)._slopcadeLastJointId;
			return fromLastResult ?? fromWindow ?? -1;
		},

		async createMouseJointAsync(def: MouseJointDef): Promise<number> {
			return this.createMouseJoint(def);
		},

		destroyJoint(jointId: number) {
			getGodotBridge()?.destroyJoint(jointId);
		},

		setMotorSpeed(jointId: number, speed: number) {
			getGodotBridge()?.setMotorSpeed(jointId, speed);
		},

		setMouseTarget(jointId: number, target: Vec2) {
			getGodotBridge()?.setMouseTarget(jointId, target.x, target.y);
		},

		async screenToWorld(screenX: number, screenY: number): Promise<Vec2> {
			const result = await queryAsync<{ x: number; y: number }>(
				"screenToWorld",
				[screenX, screenY],
			);
			return result ?? { x: 0, y: 0 };
		},

		async queryPoint(point: Vec2): Promise<number | null> {
			return getGodotBridge()?.queryPoint(point.x, point.y) ?? null;
		},

		async queryPointEntity(point: Vec2): Promise<string | null> {
			return await queryAsync<string | null>("queryPointEntity", [
				point.x,
				point.y,
			]);
		},

		async queryAABB(min: Vec2, max: Vec2): Promise<number[]> {
			return getGodotBridge()?.queryAABB(min.x, min.y, max.x, max.y) ?? [];
		},

		async raycast(
			origin: Vec2,
			direction: Vec2,
			maxDistance: number,
		): Promise<RaycastHit | null> {
			return (
				getGodotBridge()?.raycast(
					origin.x,
					origin.y,
					direction.x,
					direction.y,
					maxDistance,
				) ?? null
			);
		},

		setUserData(_entityId: string, _data: unknown) {},

		async getUserData(_entityId: string): Promise<unknown> {
			return null;
		},

		async getAllEntities(): Promise<string[]> {
			return [];
		},

		...createCallbackMethods(cbs),

		setWatchConfig(config: unknown): void {
			getGodotBridge()?.setWatchConfig(JSON.stringify(config));
		},

		sendInput(type, data) {
			getGodotBridge()?.sendInput(type, data.x, data.y, data.entityId ?? "");
		},

		createPixelBuffer(
			entityId: string,
			width: number,
			height: number,
			clearColor: string,
			worldWidth?: number,
			worldHeight?: number,
		) {
			getGodotBridge()?.createPixelBuffer(
				entityId,
				width,
				height,
				clearColor,
				worldWidth ?? 0,
				worldHeight ?? 0,
			);
		},
		pixelBufferDraw(entityId: string, commands: DrawCommand[]) {
			getGodotBridge()?.pixelBufferDraw(entityId, JSON.stringify(commands));
		},
		pixelBufferClear(entityId: string, color: string) {
			getGodotBridge()?.pixelBufferClear(entityId, color);
		},
		destroyPixelBuffer(entityId: string) {
			getGodotBridge()?.destroyPixelBuffer(entityId);
		},

		drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]) {
			getGodotBridge()?.drawToActiveBuffer(entityId, JSON.stringify(commands));
		},

		setEntityImage(
			entityId: string,
			url: string,
			width: number,
			height: number,
		) {
			getGodotBridge()?.setEntityImage(entityId, url, width, height);
		},

		setEntityAtlasRegion(
			entityId: string,
			atlasUrl: string,
			x: number,
			y: number,
			w: number,
			h: number,
			width: number,
			height: number,
		) {
			getGodotBridge()?.setEntityAtlasRegion(
				entityId,
				atlasUrl,
				x,
				y,
				w,
				h,
				width,
				height,
			);
		},

		clearTextureCache(url?: string) {
			getGodotBridge()?.clearTextureCache(url ?? "");
		},

		preloadTextures(
			urls: string[],
			onProgress?: (percent: number, completed: number, failed: number) => void,
		): Promise<{ completed: number; failed: number }> {
			return new Promise((resolve) => {
				const bridge = getGodotBridge();
				if (!bridge) {
					resolve({ completed: 0, failed: urls.length });
					return;
				}

				if (urls.length === 0) {
					onProgress?.(100, 0, 0);
					resolve({ completed: 0, failed: 0 });
					return;
				}

				const progressCallback = (...args: unknown[]) => {
					const percent =
						typeof args[0] === "number" ? args[0] : Number(args[0]);
					const completed =
						typeof args[1] === "number" ? args[1] : Number(args[1]);
					const failed =
						typeof args[2] === "number" ? args[2] : Number(args[2]);
					onProgress?.(percent, completed, failed);
					if (percent >= 100) {
						resolve({ completed, failed });
					}
				};

				// Pass URLs as JSON string since JS Arrays don't auto-convert to GDScript Arrays
				bridge.preloadTextures(JSON.stringify(urls), progressCallback);
			});
		},

		setDebugShowShapes(show: boolean) {
			getGodotBridge()?.setDebugShowShapes(show);
		},

		setDebugSettings(settings: {
			showInputDebug: boolean;
			showPhysicsShapes: boolean;
			showZones: boolean;
			showFPS: boolean;
		}) {
			const bridge = getGodotBridge();
			if (bridge) {
				bridge.setDebugSettings(JSON.stringify(settings));
			}
		},

		setCameraTarget(entityId: string | null) {
			getGodotBridge()?.setCameraTarget(entityId ?? "");
		},

		setCameraPosition(x: number, y: number) {
			getGodotBridge()?.setCameraPosition(x, y);
		},

		setCameraZoom(zoom: number) {
			getGodotBridge()?.setCameraZoom(zoom);
		},

		startCamera(entityId: string, width?: number, height?: number) {
			getGodotBridge()?.startCamera(entityId, width, height);
		},

		stopCamera() {
			getGodotBridge()?.stopCamera();
		},

		spawnParticle(type: string, x: number, y: number) {
			getGodotBridge()?.spawnParticle(type, x, y);
		},

		playSound(resourcePath: string) {
			getGodotBridge()?.playSound(resourcePath);
		},

		screenShake(intensity: number, duration?: number) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.screenShake) {
				godotBridge.screenShake(intensity, duration);
			}
		},

		zoomPunch(intensity?: number, duration?: number) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.zoomPunch) {
				godotBridge.zoomPunch(intensity, duration);
			}
		},

		triggerShockwave(worldX: number, worldY: number, duration?: number) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.triggerShockwave) {
				godotBridge.triggerShockwave(worldX, worldY, duration);
			}
		},

		flashScreen(color?: [number, number, number, number?], duration?: number) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.flashScreen) {
				const colorArray = color
					? [color[0], color[1], color[2], color[3] ?? 1.0]
					: undefined;
				godotBridge.flashScreen(colorArray, duration);
			}
		},

		async createDynamicShader(
			shaderId: string,
			shaderCode: string,
		): Promise<DynamicShaderResult> {
			const godotBridge = getGodotBridge();
			if (!godotBridge?.createDynamicShader) {
				return {
					success: false,
					shader_id: shaderId,
					error: "Godot bridge not initialized",
				};
			}

			godotBridge.createDynamicShader(shaderId, shaderCode);

			// Wait a frame for Godot to process and set _lastResult
			await new Promise((resolve) => setTimeout(resolve, 16));

			const result = godotBridge._lastResult as DynamicShaderResult | undefined;
			if (result && typeof result === "object" && "success" in result) {
				return result;
			}

			// Fallback if no result (shouldn't happen)
			return { success: true, shader_id: shaderId };
		},

		applyDynamicShader(
			entityId: string,
			shaderId: string,
			params?: Record<string, unknown>,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.applyDynamicShader) {
				godotBridge.applyDynamicShader(
					entityId,
					shaderId,
					params ? JSON.stringify(params) : undefined,
				);
			}
		},

		applyDynamicPostShader(
			shaderCode: string,
			params?: Record<string, unknown>,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.applyDynamicPostShader) {
				godotBridge.applyDynamicPostShader(
					shaderCode,
					params ? JSON.stringify(params) : undefined,
				);
			}
		},

		hotSwapShader(shaderId: string, source: string) {
			getGodotBridge()?.hotSwapShader(shaderId, source);
		},

		spawnParticlePreset(
			presetName: string,
			worldX: number,
			worldY: number,
			params?: Record<string, unknown>,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.spawnParticlePreset) {
				godotBridge.spawnParticlePreset(
					presetName,
					worldX,
					worldY,
					params ? JSON.stringify(params) : undefined,
				);
			}
		},

		async getAvailableEffects(): Promise<{
			sprite: string[];
			post: string[];
			particles: string[];
		}> {
			const godotBridge = getGodotBridge();
			if (!godotBridge?.getAvailableEffects) {
				return { sprite: [], post: [], particles: [] };
			}
			godotBridge.getAvailableEffects();
			const result = godotBridge._lastResult;
			if (result && typeof result === "object") {
				return result as {
					sprite: string[];
					post: string[];
					particles: string[];
				};
			}
			return { sprite: [], post: [], particles: [] };
		},

		applySpriteEffect(
			entityId: string,
			effectName: string,
			params?: Record<string, unknown>,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.applySpriteEffect) {
				godotBridge.applySpriteEffect(
					entityId,
					effectName,
					params ? JSON.stringify(params) : "{}",
				);
			}
		},

		updateSpriteEffectParam(
			entityId: string,
			paramName: string,
			value: unknown,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.updateSpriteEffectParam) {
				godotBridge.updateSpriteEffectParam(entityId, paramName, value);
			}
		},

		clearSpriteEffect(entityId: string) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.clearSpriteEffect) {
				godotBridge.clearSpriteEffect(entityId);
			}
		},

		setPostEffect(
			effectName: string,
			params?: Record<string, unknown>,
			layer?: string,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.setPostEffect) {
				godotBridge.setPostEffect(
					effectName,
					params ? JSON.stringify(params) : "{}",
					layer ?? "main",
				);
			}
		},

		updatePostEffectParam(paramName: string, value: unknown, layer?: string) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.updatePostEffectParam) {
				godotBridge.updatePostEffectParam(paramName, value, layer ?? "main");
			}
		},

		clearPostEffect(layer?: string) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.clearPostEffect) {
				godotBridge.clearPostEffect(layer ?? "main");
			}
		},

		createUIButton(
			buttonId: string,
			normalImageUrl: string,
			pressedImageUrl: string,
			x: number,
			y: number,
			width: number,
			height: number,
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.createUIButton) {
				godotBridge.createUIButton(
					buttonId,
					normalImageUrl,
					pressedImageUrl,
					x,
					y,
					width,
					height,
				);
			}
		},

		destroyUIButton(buttonId: string) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.destroyUIButton) {
				godotBridge.destroyUIButton(buttonId);
			}
		},

		onUIButtonEvent(
			callback: (
				eventType: "button_down" | "button_up" | "button_pressed",
				buttonId: string,
			) => void,
		): () => void {
			cbs.uiButton.push(callback);

			const godotBridge = getGodotBridge();
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

		createThemedUIComponent(
			componentId: string,
			componentType: 0 | 1 | 2 | 3 | 4 | 5 | 6,
			metadataUrl: string,
			x: number,
			y: number,
			width: number,
			height: number,
			labelText: string = "",
		) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.createThemedUIComponent) {
				godotBridge.createThemedUIComponent(
					componentId,
					componentType,
					metadataUrl,
					x,
					y,
					width,
					height,
					labelText,
				);
			}
		},

		destroyThemedUIComponent(componentId: string) {
			const godotBridge = getGodotBridge();
			if (godotBridge?.destroyThemedUIComponent) {
				godotBridge.destroyThemedUIComponent(componentId);
			}
		},

		show3DModel(path: string): boolean {
			const godotBridge = getGodotBridge();
			return godotBridge?.show_3d_model?.(path) ?? false;
		},

		show3DModelFromUrl(url: string): void {
			const godotBridge = getGodotBridge();
			godotBridge?.show_3d_model_from_url?.(url);
		},

		set3DViewportPosition(x: number, y: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_viewport_position?.(x, y);
		},

		set3DViewportSize(width: number, height: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_viewport_size?.(width, height);
		},

		rotate3DModel(x: number, y: number, z: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.rotate_3d_model?.(x, y, z);
		},

		set3DModelPosition(x: number, y: number, z: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_model_position?.(x, y, z);
		},

		set3DCameraDistance(distance: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_camera_distance?.(distance);
		},

		set3DCameraSize(size: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_camera_size?.(size);
		},

		clear3DModels(): void {
			const godotBridge = getGodotBridge();
			godotBridge?.clear_3d_models?.();
		},

		create3DFloor(
			size?: number,
			colorHex?: string,
			style?: "plain" | "grid",
		): void {
			const godotBridge = getGodotBridge();
			godotBridge?.create_3d_floor?.(
				size ?? 10.0,
				colorHex ?? "555555",
				style ?? "plain",
			);
		},

		create3DCube(
			x: number,
			y: number,
			z: number,
			size?: number,
			colorHex?: string,
		): void {
			const godotBridge = getGodotBridge();
			godotBridge?.create_3d_cube?.(x, y, z, size ?? 0.5, colorHex ?? "ff0000");
		},

		clear3DCubes(): void {
			const godotBridge = getGodotBridge();
			godotBridge?.clear_3d_cubes?.();
		},

		set3DCameraPosition(x: number, y: number, z: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_camera_position?.(x, y, z);
		},

		set3DCameraLookAt(x: number, y: number, z: number): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_3d_camera_look_at?.(x, y, z);
		},

		setOrbitControls(enabled: boolean): void {
			const godotBridge = getGodotBridge();
			godotBridge?.set_orbit_controls?.(enabled);
		},

		setExternalInput(name: string, imageData: string) {
			getGodotBridge()?.setExternalInput?.(name, imageData);
		},

		setScreenInput(enable: boolean) {
			getGodotBridge()?.setScreenInput?.(enable);
		},

		async callRpc(method: string, params?: unknown): Promise<unknown> {
			const result = await queryAsync<unknown>(method, params ? [params] : []);
			return result;
		},

		async applyGraph(plan) {
			return executeEffects("effects.applyGraph", { plan });
		},

		async clearGraph() {
			return executeEffects("effects.clearGraph");
		},

		async updateParams(passId: string, params: Record<string, unknown>) {
			return executeEffects("effects.updateParams", { passId, params });
		},

		async start() {
			return executeEffects("effects.start");
		},

		async pause() {
			return executeEffects("effects.pause");
		},

		async resume() {
			return executeEffects("effects.resume");
		},

		async stop() {
			return executeEffects("effects.stop");
		},

		async reset() {
			return executeEffects("effects.reset");
		},

		async snapshot() {
			return executeEffects<EffectsPipelineSnapshot>(
				"effects.snapshot",
				undefined,
				normalizeEffectsSnapshot,
			);
		},

		async restore(snapshot: EffectsPipelineSnapshot) {
			return executeEffects("effects.restore", {
				snapshot: createEffectsSnapshotPayload(snapshot),
			});
		},

		effectsUpdateParams(
			passId: string,
			params: Record<string, number | boolean | string>,
		) {
			getGodotBridge()?.query?.(
				"effects_update_params",
				"effects.updateParams",
				JSON.stringify({ passId, params }),
			);
		},
	};

	return bridge;
}
