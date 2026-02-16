import type { Vec2, Vec3 } from "./common";
import type { SpriteEffectParams, SpriteEffectType } from "./effects";
import type { HapticStyle, NotificationStyle } from "./haptics";
import type { VoiceHandleId, VoicePrepareOptions } from "./voice-handle";
import type {
	AnimateOptions,
	AnimateTarget,
	CloneOptions,
	RaycastOptions,
	ReparentOptions,
	SpawnOptions,
	WorldEntityData,
	WorldEntityQuery,
	WorldRaycastHit,
} from "./world-ops";

/**
 * Synchronous world operations for game scripts.
 * All methods return immediately (no Promises).
 * Used in onStart, onUpdate, onInput, onCollision hooks.
 */
export interface SyncWorldOps {
	// ═══════════════════════════════════════════════════════════════
	// Entity Lifecycle
	// ═══════════════════════════════════════════════════════════════
	spawnEntity(
		prefabId: string,
		position: Vec2,
		opts?: SpawnOptions,
	): string | null;
	destroyEntity(entityId: string): void;
	cloneEntity(entityId: string, opts?: CloneOptions): string | null;
	reparentEntity(
		entityId: string,
		newParentId: string,
		opts?: ReparentOptions,
	): void;

	// ═══════════════════════════════════════════════════════════════
	// Transform
	// ═══════════════════════════════════════════════════════════════
	getEntityPosition(entityId: string): Vec2 | null;
	setEntityPosition(entityId: string, position: Vec2): void;
	getEntityRotation(entityId: string): number | null;
	setEntityRotation(entityId: string, angle: number): void;
	getEntityScale(entityId: string): Vec2 | null;
	setEntityScale(entityId: string, scale: Vec2): void;
	setEntityVisible(entityId: string, visible: boolean): void;

	// ═══════════════════════════════════════════════════════════════
	// Physics
	// ═══════════════════════════════════════════════════════════════
	getEntityVelocity(entityId: string): Vec2 | null;
	setEntityVelocity(entityId: string, velocity: Vec2): void;
	getEntityAngularVelocity(entityId: string): number | null;
	setEntityAngularVelocity(entityId: string, velocity: number): void;
	applyImpulse(entityId: string, impulse: Vec2): void;
	applyForce(entityId: string, force: Vec2): void;

	// ═══════════════════════════════════════════════════════════════
	// 3D Entity Lifecycle
	// ═══════════════════════════════════════════════════════════════
	spawnEntity3D(
		prefabId: string,
		position: Vec3,
		opts?: SpawnOptions,
	): string | null;
	destroyEntity3D(entityId: string): void;

	// ═══════════════════════════════════════════════════════════════
	// 3D Transform
	// ═══════════════════════════════════════════════════════════════
	getEntityPosition3D(entityId: string): Vec3 | null;
	setEntityPosition3D(entityId: string, position: Vec3): void;
	getEntityRotation3D(entityId: string): Vec3 | null;
	setEntityRotation3D(entityId: string, rotation: Vec3): void;
	getEntityScale3D(entityId: string): Vec3 | null;
	setEntityScale3D(entityId: string, scale: Vec3): void;
	setEntityVisible3D(entityId: string, visible: boolean): void;

	// ═══════════════════════════════════════════════════════════════
	// 3D Physics
	// ═══════════════════════════════════════════════════════════════
	getEntityVelocity3D(entityId: string): Vec3 | null;
	setEntityVelocity3D(entityId: string, velocity: Vec3): void;
	applyImpulse3D(entityId: string, impulse: Vec3): void;
	applyForce3D(entityId: string, force: Vec3): void;

	// ═══════════════════════════════════════════════════════════════
	// 3D Camera
	// ═══════════════════════════════════════════════════════════════
	setCameraPosition3D(position: Vec3): void;
	setCameraLookAt3D(target: Vec3): void;
	setCameraFov3D(fov: number): void;
	setCameraTarget3D(entityId: string): void;
	cameraShake3D(intensity: number, duration: number): void;
	createVoxelBatch(
		voxels: Array<{ x: number; y: number; z: number; color: string }>,
	): string;
	updateVoxelBatch(
		batchId: string,
		voxels: Array<{ x: number; y: number; z: number; color: string }>,
	): void;
	destroyVoxelBatch(batchId: string): void;
	placeVoxel(x: number, y: number, z: number, color: string): string;
	removeVoxel(voxelId: string): void;

	// ═══════════════════════════════════════════════════════════════
	// Entity Metadata
	// ═══════════════════════════════════════════════════════════════
	getEntityTags(entityId: string): string[];
	addTag(entityId: string, tag: string): void;
	removeTag(entityId: string, tag: string): boolean;
	hasTag(entityId: string, tag: string): boolean;
	getEntityPrefab(entityId: string): string | undefined;
	getEntityData(entityId: string): WorldEntityData | null;

	// ═══════════════════════════════════════════════════════════════
	// Queries
	// ═══════════════════════════════════════════════════════════════
	queryEntities(query?: WorldEntityQuery): string[];
	queryEntitiesWithData(query?: WorldEntityQuery): WorldEntityData[];
	queryPoint(point: Vec2): string | null;
	queryAABB(min: Vec2, max: Vec2): string[];
	raycast(from: Vec2, to: Vec2, opts?: RaycastOptions): WorldRaycastHit | null;

	// ═══════════════════════════════════════════════════════════════
	// Pixel Buffer
	// ═══════════════════════════════════════════════════════════════
	createPixelBuffer(
		entityId: string,
		width: number,
		height: number,
		clearColor: string,
	): void;
	pixelBufferDraw(
		entityId: string,
		commands: Array<{ type: string; [key: string]: unknown }>,
	): void;
	pixelBufferClear(entityId: string, color: string): void;

	// ═══════════════════════════════════════════════════════════════
	// Animation (fire-and-forget, runs over time in background)
	// ═══════════════════════════════════════════════════════════════
	animateEntity(
		entityId: string,
		target: AnimateTarget,
		opts?: AnimateOptions,
	): void;

	// ═══════════════════════════════════════════════════════════════
	// Game State
	// ═══════════════════════════════════════════════════════════════
	getVariable(name: string): unknown;
	setVariable(name: string, value: unknown): void;
	getConstant(name: string): unknown;
	emit(eventName: string, data?: Record<string, unknown>): void;
	win(): void;
	lose(): void;

	// ═══════════════════════════════════════════════════════════════
	// Sound
	// ═══════════════════════════════════════════════════════════════
	playSound(soundId: string, opts?: { volume?: number; pitch?: number }): void;

	// ═══════════════════════════════════════════════════════════════
	// Voice (prepare-play pattern for party game announcers)
	// ═══════════════════════════════════════════════════════════════
	prepareVoice(
		voicePreset: string,
		text: string,
		opts?: VoicePrepareOptions,
	): VoiceHandleId;
	isVoiceReady(handleId: VoiceHandleId): boolean;
	playVoice(
		handleId: VoiceHandleId,
		opts?: { volume?: number; pitch?: number },
	): void;

	// ═══════════════════════════════════════════════════════════════
	// Camera
	// ═══════════════════════════════════════════════════════════════
	cameraShake(intensity: number, duration: number): void;
	cameraZoom(scale: number, duration?: number): void;
	applySpriteEffect(
		entityId: string,
		effect: SpriteEffectType,
		params?: SpriteEffectParams,
	): string;
	updateSpriteEffectParam(
		entityId: string,
		effectId: string,
		paramName: string,
		value: unknown,
	): void;
	clearSpriteEffect(entityId: string, effectId?: string): void;

	// ═══════════════════════════════════════════════════════════════
	// Time
	// ═══════════════════════════════════════════════════════════════
	setTimeScale(scale: number, duration?: number): void;

	// ═══════════════════════════════════════════════════════════════
	// Dialog
	// ═══════════════════════════════════════════════════════════════
	showDialog(dialogId: string, data?: Record<string, unknown>): void;
	dismissDialog(): void;

	// ═══════════════════════════════════════════════════════════════
	// Bulk Operations
	// ═══════════════════════════════════════════════════════════════
	destroyByTag(tag: string): void;

	// ═══════════════════════════════════════════════════════════════
	// Haptics
	// ═══════════════════════════════════════════════════════════════
	haptic(style?: HapticStyle): void;
	hapticNotification(style?: NotificationStyle): void;
	hapticSelection(): void;
}
