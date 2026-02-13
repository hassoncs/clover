import type {
	ComputedValueSystem,
	EvalContext,
	Vec2 as ExprVec2,
	ParticleEmitterType,
	Value,
} from "@slopcade/shared";
import type { CompiledPlan } from "@slopcade/shared/effects";
import type { Physics2D } from "../physics2d/Physics2D";
import type { Vec2 } from "../physics2d/types";
import type { EntityManager } from "./EntityManager";
import type { RuntimeEntity } from "./types";

export type CreateEvalContextForEntity = (
	entity?: RuntimeEntity,
) => EvalContext;

export interface InputState {
	tap?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	drag?: {
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
		startWorldX: number;
		startWorldY: number;
		currentWorldX: number;
		currentWorldY: number;
		targetEntityId?: string;
	};
	dragEnd?: {
		velocityX: number;
		velocityY: number;
		worldVelocityX: number;
		worldVelocityY: number;
	};
	tilt?: { x: number; y: number };
	buttons?: {
		left: boolean;
		right: boolean;
		up: boolean;
		down: boolean;
		jump: boolean;
		action: boolean;
	};
	joystick?: {
		x: number;
		y: number;
		magnitude: number;
		angle: number;
	};
	mouse?: { x: number; y: number; worldX: number; worldY: number };
	touch?: { x: number; y: number; worldX: number; worldY: number };
}

export interface InputEvents {
	tap?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	dragStart?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	dragEnd?: {
		velocityX: number;
		velocityY: number;
		worldVelocityX: number;
		worldVelocityY: number;
	};
	swipe?: { direction: "left" | "right" | "up" | "down" };
	buttonPressed?: Set<string>;
	buttonReleased?: Set<string>;
	gameStarted?: boolean;
	gameLoaded?: boolean;
}

export interface GameState {
	time: number;
	state: "loading" | "ready" | "playing" | "paused" | "won" | "lost";
	variables: Record<string, number | string | boolean>;
}

export interface ReactGameState extends GameState {
	score?: number;
	lives?: number;
}

export interface CollisionInfo {
	entityA: RuntimeEntity;
	entityB: RuntimeEntity;
	normal: Vec2;
	impulse: number;
}

export interface BehaviorContext {
	entity: RuntimeEntity;
	dt: number;
	elapsed: number;
	input: InputState;
	gameState: GameState;
	entityManager: EntityManager;
	physics: Physics2D;
	collisions: CollisionInfo[];
	pixelsPerMeter: number;

	computedValues: ComputedValueSystem;
	evalContext: EvalContext;
	createEvalContextForEntity: CreateEvalContextForEntity;

	setGameState(state: GameState["state"]): void;
	spawnEntity(prefabId: string, x: number, y: number): string | null;
	setEntityVelocity(entityId: string, velocity: Vec2): void;
	setEntityRotation(entityId: string, angle: number): void;
	setEntityPosition(entityId: string, x: number, y: number): void;
	setEntityOpacity(entityId: string, opacity: number): void;
	destroyEntity(entityId: string): void;
	triggerEvent(eventName: string, data?: Record<string, unknown>): void;
	triggerParticleEffect(type: ParticleEmitterType, x: number, y: number): void;
	createEntityEmitter(type: ParticleEmitterType, x: number, y: number): string;
	updateEmitterPosition(emitterId: string, x: number, y: number): void;
	stopEmitter(emitterId: string): void;
	playSound(soundId: string, volume?: number, pitch?: number): void;
	haptic(style?: string): void;
	hapticNotification(style?: string): void;
	hapticSelection(): void;

	applySpriteEffect(entityId: string, plan: CompiledPlan): Promise<void>;
	clearSpriteEffect(entityId: string): Promise<void>;
	updateSpriteEffectParams(
		entityId: string,
		passId: string,
		params: Record<string, unknown>,
	): Promise<void>;

	resolveNumber(value: Value<number>): number;
	resolveVec2(value: Value<ExprVec2>): ExprVec2;
}
