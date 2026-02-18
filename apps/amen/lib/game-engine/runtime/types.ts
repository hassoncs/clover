import type { GameDefinition } from "@slopcade/shared";
import type { GodotBridge } from "../../godot/types";
import type { Physics2D } from "../../physics2d/Physics2D";
import type { EntityManager } from "../EntityManager";
import type { ReactGameState } from "./GameEventSubscriber";

// =============================================================================
// Variable Types
// =============================================================================

export type VarValue = number | string | boolean;

export type ListValue = Array<number | string | boolean>;

export const RESERVED_VARS = {
	GAME_STATE: "gameState",
	ELAPSED: "elapsed",
} as const;

export type GameStateValue = "ready" | "playing" | "paused" | "won" | "lost";

// =============================================================================
// GameState - The Mutable Bag of State
// =============================================================================

export interface StateMachineRuntimeState {
	previous: string;
	enteredAt: number;
	transitionCount: number;
}

export interface GameState {
	vars: Record<string, VarValue>;
	initialVars: Record<string, VarValue>;

	stateMachines: Record<string, StateMachineRuntimeState>;
	initialStateMachines: Record<string, StateMachineRuntimeState>;

	firedOnce: Set<string>;
	cooldowns: Map<string, number>;
	lists: Map<string, ListValue>;
	pendingEvents: Map<string, unknown>;

	changedVars: Set<string>;
}

// =============================================================================
// GameServices - External Dependencies
// =============================================================================

export interface GameServices {
	bridge: GodotBridge;
	physics: Physics2D;
	entityManager: EntityManager;
}

// =============================================================================
// GameEventBus - React UI Updates
// =============================================================================

export type GameEventType =
	| { type: "varChanged"; key: string; value: VarValue }
	| { type: "gameStateChanged"; state: GameStateValue };

export type GameEventHandler = (event: GameEventType) => void;

export interface GameEventBus {
	subscribe(handler: GameEventHandler): () => void;
	emit(event: GameEventType): void;
	flush(): void;
}

// =============================================================================
// GameRuntime - The Single Owner
// =============================================================================

export interface GameRuntime {
	readonly def: Readonly<GameDefinition>;
	state: GameState;
	services: GameServices;
	events: GameEventBus;
}

// =============================================================================
// System Context - What Systems Receive
// =============================================================================

export interface RuntimeUpdateContext {
	dt: number;
	elapsed: number;
	frameId: number;
	def: Readonly<GameDefinition>;
	state: GameState;
	events: GameEventBus;
	services: GameServices;
}

export interface GameRuntimeRef {
	getPhysics: () => Physics2D | null;
	getEntityManager: () => EntityManager | null;
	getGameState: () => ReactGameState;
	setVariable: (key: string, value: any) => void;
}
