import type { CharacterComponent } from "./character";
import type {
	ColliderComponent,
	EntityArchetype,
	PhysicsComponent,
} from "./physics";
import type { VisualComponent } from "./visual";

export interface TransformComponent {
	x: number;
	y: number;
	angle: number;
	scaleX: number;
	scaleY: number;
}

export const DEFAULT_TRANSFORM: TransformComponent = {
	x: 0,
	y: 0,
	angle: 0,
	scaleX: 1,
	scaleY: 1,
};

export interface ChildEntityDefinition {
	id?: string;
	name: string;
	prefab: string;
	localTransform: TransformComponent;
	slot?: string;
	visual?: Partial<VisualComponent>;
	physics?: Partial<PhysicsComponent>;
	collider?: Partial<ColliderComponent>;
	character?: Partial<CharacterComponent>;
	tags?: string[];
	visible?: boolean;
	children?: ChildEntityDefinition[];
}

export interface GameEntity {
	id: string;
	name: string;
	prefab?: string;
	/**
	 * Script module reference. Overrides prefab.scriptRef at compile time.
	 * Points to a module key in the script payload's module map.
	 */
	scriptRef?: string;
	transform: TransformComponent;
	visual?: VisualComponent;
	physics?: PhysicsComponent;
	collider?: ColliderComponent;
	character?: CharacterComponent;

	tags?: string[];
	layer?: number;
	visible?: boolean;
	active?: boolean;
	children?: ChildEntityDefinition[];
}

export interface SlotDefinition {
	x: number;
	y: number;
	layer?: number;
}

export interface ChildPrefabDefinition {
	name: string;
	prefab: string;
	localTransform: TransformComponent;
	slot?: string;
	visual?: Partial<VisualComponent>;
	physics?: Partial<PhysicsComponent>;
	collider?: Partial<ColliderComponent>;
	character?: Partial<CharacterComponent>;
	tags?: string[];
	children?: ChildPrefabDefinition[];
}

export interface BaseEntityPrefab {
	id: string;
	description?: string;
	/**
	 * Short description of WHAT this entity is, used for AI asset generation.
	 * Format: lowercase, with article (e.g., "a bouncing ball", "a glass tube container")
	 * This describes the functional nature, NOT the visual style (style comes from pack theme).
	 */
	whatDescription?: string;
	/**
	 * Script module reference. Points to a module key in the script payload's module map.
	 * Entity-level scriptRef overrides this at compile time.
	 */
	scriptRef?: string;
	archetype?: EntityArchetype;
	visual?: VisualComponent;
	physics?: PhysicsComponent;
	collider?: ColliderComponent;
	character?: CharacterComponent;

	tags?: string[];
	layer?: number;
	slots?: Record<string, SlotDefinition>;
	children?: ChildPrefabDefinition[];
}

export type EntityPrefab = BaseEntityPrefab & {
	type?: "body";
	physics?: PhysicsComponent;
};

export interface BaseEntityDefinition {
	id: string;
	name: string;
	prefab?: string;
	transform: TransformComponent;
	visual?: VisualComponent;
	physics?: PhysicsComponent;
	collider?: ColliderComponent;
	character?: CharacterComponent;

	tags?: string[];
	layer?: number;
	visible?: boolean;
	active?: boolean;
	children?: ChildEntityDefinition[];
}

export interface BodyEntityDefinition extends BaseEntityDefinition {
	type: "body";
	physics: PhysicsComponent;
}
