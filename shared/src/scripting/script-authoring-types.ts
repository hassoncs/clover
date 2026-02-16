import type { AsyncWorldOps } from "../types/async-world-ops";
import type { Vec2, Vec3 } from "../types/common";
import type { SyncWorldOps } from "../types/sync-world-ops";

export interface ScriptInputEvent {
	type:
		| "tap"
		| "dragStart"
		| "dragMove"
		| "dragEnd"
		| "gameStarted"
		| "gameRestarted";
	position?: Vec2;
	entityId?: string | null;
	timestamp: number;
}

export interface ScriptCollisionEvent {
	entityA: string;
	entityB: string;
	normal: Vec2;
	impulse: number;
	contactPoint: Vec2;
	timestamp: number;
}

export interface ScriptContext extends SyncWorldOps {
	worldAsync: AsyncWorldOps;
	readonly dt: number;
	readonly elapsed: number;
	readonly frameId: number;
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

export type ScriptFunction<TArgs = Record<string, unknown>> = (
	ctx: ScriptContext,
	args?: TArgs,
) => unknown;

export type {
	EffectStateGroup,
	SpriteEffectConfig,
	SpriteEffectParams,
	SpriteEffectType,
} from "../types/effects";
