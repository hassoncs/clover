import type {
	Behavior,
	EntityPrefab,
	EventBus,
	GameEntity,
	PhysicsComponent,
	TransformComponent,
	VisualComponent,
} from "@slopcade/shared";
import type { GodotBridge } from "../godot/types";

/**
 * EngineServices - Core primitives available to all game systems.
 * Part of the 5 core engine primitives (Unity-validated architecture).
 */
export interface EngineServices {
	/** System-to-system decoupled communication */
	eventBus: EventBus;
	// Future primitives will be added here:
	// entityManager: EntityManager;
	// tagManager: TagManager;
	// clock: Clock;
}

export type MarkedEffect = "glow" | "pulse" | "fade_partial";

export interface MovementTarget {
	x: number;
	y: number;
	startX: number;
	startY: number;
	startTime: number;
	duration: number;
	easing: string;
}

export interface PendingLifecycleTransition {
	oldGroupId: number;
	newGroupId: number;
}

export interface RuntimeEntity {
	id: string;
	name: string;
	prefab?: string;
	// Hierarchy tracking
	/** Parent entity ID (undefined if root entity) */
	parentId?: string;
	/** Child entity IDs */
	children: string[];
	// Dual transforms for hierarchy
	/** Transform relative to parent (or world if no parent) */
	localTransform: TransformComponent;
	/** Computed world transform (cached) */
	worldTransform: TransformComponent;
	transform: TransformComponent;
	visual?: VisualComponent;
	physics?: PhysicsComponent;
	collider?: {
		shape: "circle" | "box" | "polygon" | "capsule";
		width?: number;
		height?: number;
		radius?: number;
		friction?: number;
		restitution?: number;
		vertices?: { x: number; y: number }[];
	};

	behaviors?: RuntimeBehavior[];
	tags: string[];
	/** Interned tag IDs for O(1) tag operations. Managed by EntityManager. */
	tagBits: Set<number>;
	layer: number;
	visible: boolean;
	active: boolean;
	colliderId: number | null;
	markedForDestruction?: boolean;
	markedEffect?: MarkedEffect;
	markedColor?: string;
	markedAt?: number;
	movementTarget?: MovementTarget;
}

export interface RuntimeBehavior {
	definition: Behavior;
	enabled: boolean;
	state: Record<string, unknown>;
}

export interface EntityManagerOptions {
	prefabs?: Record<string, EntityPrefab>;
	bridge?: GodotBridge;
}
