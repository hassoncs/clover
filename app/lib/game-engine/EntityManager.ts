import type {
	Behavior,
	ChildEntityDefinition,
	EntityPrefab,
	GameEntity,
	TransformComponent,
	VisualComponent,
} from "@slopcade/shared";
import { getGlobalTagRegistry } from "@slopcade/shared";
import type { GodotBridge, Vec2 } from "../godot/types";
import { recomputeActiveConditionalGroup } from "./behaviors/conditional";
import type {
	EntityManagerOptions,
	RuntimeBehavior,
	RuntimeEntity,
} from "./types";

export interface EntitySpawnedSnapshot {
	entityId: string;
	prefab: string;
	generation: number;
	tags: string[];
	transform: {
		x: number;
		y: number;
		angle: number;
		scaleX: number;
		scaleY: number;
	};
	colliderId?: { value: number };
}

export function combineTransforms(
	parent: TransformComponent,
	local: TransformComponent,
): TransformComponent {
	const cos = Math.cos(parent.angle);
	const sin = Math.sin(parent.angle);
	const rotatedX = local.x * cos - local.y * sin;
	const rotatedY = local.x * sin + local.y * cos;

	return {
		x: parent.x + rotatedX * parent.scaleX,
		y: parent.y + rotatedY * parent.scaleY,
		angle: parent.angle + local.angle,
		scaleX: parent.scaleX * local.scaleX,
		scaleY: parent.scaleY * local.scaleY,
	};
}

export function worldToLocal(
	world: TransformComponent,
	parent: TransformComponent,
): TransformComponent {
	const cos = Math.cos(-parent.angle);
	const sin = Math.sin(-parent.angle);

	const dx = world.x - parent.x;
	const dy = world.y - parent.y;

	const localX = (dx * cos - dy * sin) / parent.scaleX;
	const localY = (dx * sin + dy * cos) / parent.scaleY;

	return {
		x: localX,
		y: localY,
		angle: world.angle - parent.angle,
		scaleX: world.scaleX / parent.scaleX,
		scaleY: world.scaleY / parent.scaleY,
	};
}

export interface SpawnEntityOptions {
	prefabId: string;
	position: Vec2;
	velocity?: Vec2;
	angle?: number;
	tags?: string[];
	parentId?: string;
	/** Explicit ID — if omitted, a UUID is generated */
	entityId?: string;
}

function generateEntityId(): string {
	return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export class EntityManager {
	private entities = new Map<string, RuntimeEntity>();
	private prefabs = new Map<string, EntityPrefab>();
	private bridge: GodotBridge | null = null;

	private entitiesByTagId = new Map<number, Set<string>>();

	constructor(options: EntityManagerOptions = {}) {
		this.bridge = options.bridge ?? null;
		if (options.prefabs) {
			Object.entries(options.prefabs).forEach(([id, prefab]) => {
				this.prefabs.set(id, structuredClone(prefab));
			});
		}
	}

	setBridge(bridge: GodotBridge): void {
		this.bridge = bridge;
	}

	registerPrefab(prefab: EntityPrefab): void {
		this.prefabs.set(prefab.id, prefab);
	}

	getPrefab(id: string): EntityPrefab | undefined {
		return this.prefabs.get(id);
	}

	/**
	 * The ONE canonical way to create an entity at runtime.
	 * 1. JS generates the ID
	 * 2. Tells Godot to create the node (synchronous on web WASM)
	 * 3. Caches the RuntimeEntity locally
	 *
	 * Returns the entityId, or null if the prefab doesn't exist.
	 */
	spawnEntity(opts: SpawnEntityOptions): string | null {
		const prefab = this.prefabs.get(opts.prefabId);
		if (!prefab) {
			console.warn(`[EntityManager] Prefab "${opts.prefabId}" not found`);
			return null;
		}

		const entityId = opts.entityId ?? generateEntityId();

		if (this.entities.has(entityId)) {
			console.warn(`[EntityManager] Entity "${entityId}" already exists`);
			return entityId;
		}

		if (this.bridge) {
			this.bridge.spawnEntity({
				prefabId: opts.prefabId,
				position: opts.position,
				entityId,
			});
		}

		const runtime = this.cacheEntity(
			entityId,
			opts.prefabId,
			{
				x: opts.position.x,
				y: opts.position.y,
				angle: opts.angle ?? 0,
				scaleX: 1,
				scaleY: 1,
			},
			opts.tags,
		);

		if (opts.parentId && runtime) {
			this.attachChild(opts.parentId, entityId);
		}

		return entityId;
	}

	/**
	 * Cache a RuntimeEntity from external notification (e.g. Godot's entity_spawned event,
	 * or the initial game load). This is the internal bookkeeping — it does NOT create
	 * anything in Godot.
	 */
	cacheEntity(
		entityId: string,
		prefabId: string,
		transform: {
			x: number;
			y: number;
			angle: number;
			scaleX: number;
			scaleY: number;
		},
		extraTags?: string[],
	): RuntimeEntity | null {
		if (this.entities.has(entityId)) {
			return this.entities.get(entityId)!;
		}

		const prefab = this.prefabs.get(prefabId);
		const tags = [...(prefab?.tags ?? []), ...(extraTags ?? [])];

		const behaviors: RuntimeBehavior[] = (prefab?.behaviors ?? []).map(
			(b: Behavior) => ({
				definition: b,
				enabled: b.enabled !== false,
				state: {},
			}),
		);

		const runtime: RuntimeEntity = {
			id: entityId,
			name: prefab?.id ?? prefabId,
			prefab: prefabId,
			parentId: undefined,
			children: [],
			localTransform: { ...transform },
			worldTransform: { ...transform },
			transform: { ...transform },
			visual: prefab?.visual ? structuredClone(prefab.visual) : undefined,
			physics: prefab?.physics ? structuredClone(prefab.physics) : undefined,
			collider: prefab?.collider ? structuredClone(prefab.collider) : undefined,
			behaviors,
			tags,
			tagBits: new Set(),
			layer: prefab?.layer ?? 0,
			visible: true,
			active: true,
			colliderId: null,
			conditionalBehaviors: prefab?.conditionalBehaviors ?? [],
			activeConditionalGroupId: -1,
		};

		for (const tag of tags) {
			const tagId = getGlobalTagRegistry().intern(tag);
			runtime.tagBits.add(tagId);
			if (!this.entitiesByTagId.has(tagId)) {
				this.entitiesByTagId.set(tagId, new Set());
			}
			this.entitiesByTagId.get(tagId)!.add(entityId);
		}

		this.entities.set(entityId, runtime);
		return runtime;
	}

	/**
	 * Handle the legacy EntitySpawnedSnapshot from Godot callbacks.
	 * Delegates to cacheEntity.
	 */
	handleEntitySpawned(snapshot: EntitySpawnedSnapshot): RuntimeEntity | null {
		return this.cacheEntity(
			snapshot.entityId,
			snapshot.prefab,
			snapshot.transform,
			snapshot.tags,
		);
	}

	handleEntityDestroyed(entityId: string): void {
		const entity = this.entities.get(entityId);
		if (!entity) return;

		for (const tagId of entity.tagBits) {
			this.entitiesByTagId.get(tagId)?.delete(entityId);
		}

		this.entities.delete(entityId);
	}

	destroyEntity(id: string, options: { recursive?: boolean } = {}): void {
		const entity = this.entities.get(id);
		if (!entity) return;

		const { recursive = false } = options;

		if (recursive) {
			const descendants = this.getDescendants(id);
			for (const descendant of descendants.reverse()) {
				this.destroyEntityInternal(descendant.id);
			}
		} else {
			for (const childId of [...entity.children]) {
				this.detachChild(childId);
			}
		}

		if (entity.parentId) {
			const parent = this.entities.get(entity.parentId);
			if (parent) {
				parent.children = parent.children.filter((cid) => cid !== id);
			}
		}

		this.destroyEntityInternal(id);
	}

	private destroyEntityInternal(id: string): void {
		const entity = this.entities.get(id);
		if (!entity) return;

		if (this.bridge) {
			this.bridge.destroyEntity(entity.id);
		}

		for (const tagId of entity.tagBits) {
			this.entitiesByTagId.get(tagId)?.delete(id);
		}

		this.entities.delete(id);
	}

	getEntity(id: string): RuntimeEntity | undefined {
		return this.entities.get(id);
	}

	getEntitiesByTag(tag: string): RuntimeEntity[] {
		const tagId = getGlobalTagRegistry().getId(tag);
		if (tagId === undefined) {
			const results: RuntimeEntity[] = [];
			this.entities.forEach((entity) => {
				if (entity.tags.includes(tag)) {
					results.push(entity);
				}
			});
			return results;
		}

		const entityIds = this.entitiesByTagId.get(tagId);
		if (!entityIds) return [];

		const results: RuntimeEntity[] = [];
		for (const id of entityIds) {
			const entity = this.entities.get(id);
			if (entity) {
				results.push(entity);
			}
		}
		return results;
	}

	addTag(entityId: string, tag: string): boolean {
		const entity = this.entities.get(entityId);
		if (!entity) return false;

		if (entity.tags.includes(tag)) return false;

		entity.tags.push(tag);

		const tagId = getGlobalTagRegistry().intern(tag);
		entity.tagBits.add(tagId);

		if (!this.entitiesByTagId.has(tagId)) {
			this.entitiesByTagId.set(tagId, new Set());
		}
		this.entitiesByTagId.get(tagId)!.add(entityId);

		if (entity.conditionalBehaviors.length > 0) {
			const oldGroupId = entity.activeConditionalGroupId;
			const newGroupId = recomputeActiveConditionalGroup(entity);
			if (oldGroupId !== newGroupId) {
				entity.pendingLifecycleTransition = { oldGroupId, newGroupId };
				entity.activeConditionalGroupId = newGroupId;
			}
		}

		return true;
	}

	removeTag(entityId: string, tag: string): boolean {
		const entity = this.entities.get(entityId);
		if (!entity) return false;

		const index = entity.tags.indexOf(tag);
		if (index === -1) return false;

		entity.tags.splice(index, 1);

		const tagId = getGlobalTagRegistry().getId(tag);
		if (tagId !== undefined) {
			entity.tagBits.delete(tagId);
			this.entitiesByTagId.get(tagId)?.delete(entityId);
		}

		if (entity.conditionalBehaviors.length > 0) {
			const oldGroupId = entity.activeConditionalGroupId;
			const newGroupId = recomputeActiveConditionalGroup(entity);
			if (oldGroupId !== newGroupId) {
				entity.pendingLifecycleTransition = { oldGroupId, newGroupId };
				entity.activeConditionalGroupId = newGroupId;
			}
		}

		return true;
	}

	hasTag(entityId: string, tag: string): boolean {
		const entity = this.entities.get(entityId);
		if (!entity) return false;

		const tagId = getGlobalTagRegistry().getId(tag);
		if (tagId !== undefined) {
			return entity.tagBits.has(tagId);
		}

		return entity.tags.includes(tag);
	}

	getAllEntities(): RuntimeEntity[] {
		return Array.from(this.entities.values());
	}

	getActiveEntities(): RuntimeEntity[] {
		return this.getAllEntities().filter((e) => e.active);
	}

	getVisibleEntities(): RuntimeEntity[] {
		return this.getAllEntities()
			.filter((e) => e.visible)
			.sort((a, b) => a.layer - b.layer);
	}

	loadEntities(entities: GameEntity[]): void {
		for (const e of entities) {
			const entityId = e.id || generateEntityId();
			this.cacheEntity(entityId, e.prefab ?? "", e.transform, e.tags);
		}
	}

	clearAll(): void {
		const ids = Array.from(this.entities.keys());
		ids.forEach((id) => {
			this.destroyEntity(id);
		});
		this.entitiesByTagId.clear();
	}

	getEntityCount(): number {
		return this.entities.size;
	}

	getEntityCountByTag(tag: string): number {
		return this.getEntitiesByTag(tag).length;
	}

	getEntitiesInAABB(
		min: { x: number; y: number },
		max: { x: number; y: number },
	): RuntimeEntity[] {
		const results: RuntimeEntity[] = [];
		for (const entity of this.entities.values()) {
			const { x, y } = entity.transform;
			if (x >= min.x && x <= max.x && y >= min.y && y <= max.y) {
				results.push(entity);
			}
		}
		return results;
	}

	static readonly QUERYABLE_COMPONENTS = [
		"visual",
		"physics",
		"collider",
	] as const;

	query(options: {
		tags?: string[];
		prefab?: string;
		has?: Array<"visual" | "physics" | "collider">;
		withinAabb?: {
			min: { x: number; y: number };
			max: { x: number; y: number };
		};
	}): RuntimeEntity[] {
		const { tags, prefab, has, withinAabb } = options;

		let candidates: RuntimeEntity[] | null = null;

		if (withinAabb) {
			candidates = this.getEntitiesInAABB(withinAabb.min, withinAabb.max);
		}

		if (tags && tags.length > 0 && candidates === null) {
			candidates = this.getEntitiesByTag(tags[0]);

			for (let i = 1; i < tags.length && candidates.length > 0; i++) {
				const taggedIds = new Set(
					this.getEntitiesByTag(tags[i]).map((e) => e.id),
				);
				candidates = candidates.filter((e) => taggedIds.has(e.id));
			}
		}

		if (candidates === null) {
			candidates = Array.from(this.entities.values());
		}

		let result = candidates;

		if (tags && tags.length > 0 && withinAabb) {
			result = result.filter((entity) => {
				for (const tag of tags) {
					if (!entity.tags.includes(tag)) return false;
				}
				return true;
			});
		}

		if (prefab) {
			result = result.filter((entity) => entity.prefab === prefab);
		}

		if (has && has.length > 0) {
			result = result.filter((entity) => {
				for (const component of has) {
					switch (component) {
						case "visual":
							if (!entity.visual) return false;
							break;
						case "physics":
							if (!entity.physics) return false;
							break;
						case "collider":
							if (!entity.collider) return false;
							break;
					}
				}
				return true;
			});
		}

		return result;
	}

	updateWorldTransforms(entityId: string): void {
		const entity = this.entities.get(entityId);
		if (!entity) return;

		if (entity.parentId) {
			const parent = this.entities.get(entity.parentId);
			if (parent) {
				entity.worldTransform = combineTransforms(
					parent.worldTransform,
					entity.localTransform,
				);
			} else {
				entity.worldTransform = { ...entity.localTransform };
			}
		} else {
			entity.worldTransform = { ...entity.localTransform };
		}

		entity.transform = entity.worldTransform;

		for (const childId of entity.children) {
			this.updateWorldTransforms(childId);
		}
	}

	updateAllWorldTransforms(): void {
		for (const entity of this.entities.values()) {
			if (!entity.parentId) {
				this.updateWorldTransforms(entity.id);
			}
		}
	}

	getParent(entityId: string): RuntimeEntity | undefined {
		const entity = this.entities.get(entityId);
		if (!entity?.parentId) return undefined;
		return this.entities.get(entity.parentId);
	}

	getChildren(entityId: string): RuntimeEntity[] {
		const entity = this.entities.get(entityId);
		if (!entity) return [];

		const children: RuntimeEntity[] = [];
		for (const childId of entity.children) {
			const child = this.entities.get(childId);
			if (child) children.push(child);
		}
		return children;
	}

	getRoot(entityId: string): RuntimeEntity | undefined {
		let entity = this.entities.get(entityId);
		if (!entity) return undefined;

		while (entity.parentId) {
			const parent = this.entities.get(entity.parentId);
			if (!parent) break;
			entity = parent;
		}

		return entity;
	}

	getDescendants(entityId: string): RuntimeEntity[] {
		const entity = this.entities.get(entityId);
		if (!entity) return [];

		const descendants: RuntimeEntity[] = [];
		const stack = [...entity.children];

		while (stack.length > 0) {
			const childId = stack.pop()!;
			const child = this.entities.get(childId);
			if (child) {
				descendants.push(child);
				stack.push(...child.children);
			}
		}

		return descendants;
	}

	getAncestors(entityId: string): RuntimeEntity[] {
		const entity = this.entities.get(entityId);
		if (!entity) return [];

		const ancestors: RuntimeEntity[] = [];
		let currentId = entity.parentId;

		while (currentId) {
			const ancestor = this.entities.get(currentId);
			if (!ancestor) break;
			ancestors.push(ancestor);
			currentId = ancestor.parentId;
		}

		return ancestors;
	}

	attachChild(
		parentId: string,
		childId: string,
		localTransform?: TransformComponent,
	): void {
		const parent = this.entities.get(parentId);
		const child = this.entities.get(childId);

		if (!parent || !child) {
			console.warn(
				`attachChild: Missing entity - parent=${parentId}, child=${childId}`,
			);
			return;
		}

		if (child.parentId) {
			this.detachChild(childId);
		}

		child.parentId = parentId;
		parent.children.push(childId);

		if (localTransform) {
			child.localTransform = { ...localTransform };
		} else {
			child.localTransform = worldToLocal(
				child.worldTransform,
				parent.worldTransform,
			);
		}

		this.updateWorldTransforms(childId);
	}

	detachChild(childId: string): void {
		const child = this.entities.get(childId);
		if (!child || !child.parentId) return;

		const parent = this.entities.get(child.parentId);

		if (parent) {
			parent.children = parent.children.filter((id) => id !== childId);
		}

		child.parentId = undefined;

		child.localTransform = { ...child.worldTransform };
	}

	reparent(
		childId: string,
		newParentId: string,
		localTransform?: TransformComponent,
	): void {
		const child = this.entities.get(childId);
		const newParent = this.entities.get(newParentId);

		if (!child || !newParent) {
			console.warn(
				`reparent: Missing entity - child=${childId}, newParent=${newParentId}`,
			);
			return;
		}

		if (this.getAncestors(newParentId).some((a) => a.id === childId)) {
			console.error(
				`reparent: Would create circular reference - ${childId} is ancestor of ${newParentId}`,
			);
			return;
		}

		if (child.parentId) {
			this.detachChild(childId);
		}

		this.attachChild(newParentId, childId, localTransform);
	}

	setEntityVisible(
		id: string,
		visible: boolean,
		options: { recursive?: boolean } = {},
	): void {
		const entity = this.entities.get(id);
		if (!entity) return;

		entity.visible = visible;

		if (options.recursive) {
			for (const descendant of this.getDescendants(id)) {
				descendant.visible = visible;
			}
		}
	}

	setEntityActive(
		id: string,
		active: boolean,
		options: { recursive?: boolean } = {},
	): void {
		const entity = this.entities.get(id);
		if (!entity) return;

		entity.active = active;

		if (options.recursive) {
			for (const descendant of this.getDescendants(id)) {
				descendant.active = active;
			}
		}
	}
}
