import type {
	AsyncWorldOps,
	SequenceHandle,
	SyncWorldOps,
	WorldEntityData,
	WorldEntityQuery,
	WorldOps,
} from "@slopcade/shared/types";
import type { Vec2, Vec3 } from "@slopcade/shared/types/common";
import type { InputEvents } from "@slopcade/game-runtime/BehaviorContext";

export interface ScriptBudgetConfig {
	maxExecutionTimeMs: number;
	loadTimeoutMs: number;
	maxInstructions: number;
	maxMemoryBytes: number;
}

export const DEFAULT_SCRIPT_BUDGET: ScriptBudgetConfig = {
	maxExecutionTimeMs: 2,
	loadTimeoutMs: 5000,
	maxInstructions: 100_000,
	maxMemoryBytes: 1 * 1024 * 1024,
};

export interface DragSnapshot {
	isDragging: boolean;
	startPosition: { x: number; y: number } | null;
	currentPosition: { x: number; y: number } | null;
	entityId: string | null;
}

/**
 * ScriptContext with flat sync operations + worldAsync for multi-frame work.
 * This is the canonical interface for script hooks.
 */
export interface ScriptContext extends SyncWorldOps {
	applySpriteEffect(
		entityId: string,
		effect: string,
		params?: Record<string, unknown>,
	): string;
	updateSpriteEffectParam(
		entityId: string,
		effectId: string,
		paramName: string,
		value: unknown,
	): void;
	clearSpriteEffect(entityId: string, effectId?: string): void;

	// ═══════════════════════════════════════════════════════════════
	// ASYNC WORLD OPS — animate + wait only
	// ═══════════════════════════════════════════════════════════════
	worldAsync: AsyncWorldOps;

	// ═══════════════════════════════════════════════════════════════
	// SEQUENCE MANAGEMENT — bridge from sync onUpdate to async work
	// ═══════════════════════════════════════════════════════════════
	startSequence(
		name: string,
		fn: (world: WorldOps) => Promise<void>,
	): SequenceHandle;
	isSequenceRunning(name: string): boolean;
	cancelSequence(name: string): void;

	// ═══════════════════════════════════════════════════════════════
	// FRAME INFO + INPUT (sync, per-frame)
	// ═══════════════════════════════════════════════════════════════
	readonly dt: number;
	readonly elapsed: number;
	readonly frameId: number;
	input: InputSnapshot | null;
	mouse: Vec2 | null;
	drag: DragSnapshot | null;

	// ═══════════════════════════════════════════════════════════════
	// UTILITIES (sync, pure functions)
	// ═══════════════════════════════════════════════════════════════
	random(): number;
	randomInt(min: number, max: number): number;
	randomChoice<T>(array: readonly T[]): T;
	clamp(value: number, min: number, max: number): number;
	lerp(a: number, b: number, t: number): number;
	distance(a: Vec2, b: Vec2): number;
	vec3(x: number, y: number, z: number): Vec3;
	addVec3(a: Vec3, b: Vec3): Vec3;
	subVec3(a: Vec3, b: Vec3): Vec3;
	scaleVec3(v: Vec3, s: number): Vec3;
	normalizeVec3(v: Vec3): Vec3;
	dotVec3(a: Vec3, b: Vec3): number;
	crossVec3(a: Vec3, b: Vec3): Vec3;
	lengthVec3(v: Vec3): number;
	distance3D(a: Vec3, b: Vec3): number;
	lerpVec3(a: Vec3, b: Vec3, t: number): Vec3;
}

export interface InputSnapshot {
	type: keyof InputEvents;
	position?: { x: number; y: number };
	entityId?: string | null;
	timestamp: number;
}

/**
 * Script lifecycle exports.
 * All hooks return void — no async hooks allowed.
 */
export interface ScriptLifecycleExports {
	onStart?(ctx: ScriptContext): void;
	onUpdate?(ctx: ScriptContext, dt: number): void;
	onInput?(ctx: ScriptContext, event: ScriptInputEvent): void;
	onCollision?(ctx: ScriptContext, collision: ScriptCollisionEvent): void;
	onCollisionEnter?(ctx: ScriptContext, event: ScriptCollisionEnterEvent): void;
	onCollisionExit?(ctx: ScriptContext, event: ScriptCollisionExitEvent): void;
	onNetworkState?(ctx: ScriptContext, state: Record<string, unknown>): void;
	onPhaseChange?(
		ctx: ScriptContext,
		phase: string,
		data?: Record<string, unknown>,
	): void;
}

export interface ScriptInputEvent {
	type:
		| "tap"
		| "dragStart"
		| "dragMove"
		| "dragEnd"
		| "gameStarted"
		| "gameRestarted";
	position?: { x: number; y: number };
	entityId?: string | null;
	timestamp: number;
}

export interface ScriptCollisionEvent {
	entityA: string;
	entityB: string;
	normal: { x: number; y: number };
	impulse: number;
	contactPoint: { x: number; y: number };
	timestamp: number;
}

export interface ScriptCollisionEnterEvent {
	entityA: string;
	entityB: string;
	tagsA: string[];
	tagsB: string[];
	normal: { x: number; y: number };
	impulse: number;
}

export interface ScriptCollisionExitEvent {
	entityA: string;
	entityB: string;
	tagsA: string[];
	tagsB: string[];
}

export type ScriptErrorType =
	| "syntax"
	| "runtime"
	| "timeout"
	| "memory"
	| "unknown";

export interface ScriptErrorReport {
	message: string;
	type: ScriptErrorType;
	stack?: string;
	phase:
		| "load"
		| "start"
		| "update"
		| "input"
		| "collision"
		| "collisionEnter"
		| "collisionExit"
		| "networkState"
		| "phaseChange";
	hookName?: string;
	frameId: number;
	timestamp: number;
}

export interface ScriptResult<T = unknown> {
	success: boolean;
	value?: T;
	error?: ScriptErrorReport;
}

export interface ScriptSandboxConfig {
	scriptCode: string;
	scriptId: string;
	budget?: Partial<ScriptBudgetConfig>;
	gameId: string;
}
