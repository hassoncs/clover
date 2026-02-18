import type { EntityPrefab, GameEntity } from "@slopcade/shared";
import type { PrefabDiffResult } from "./PrefabDiff";
import type { PrefabInstanceIndex } from "./PrefabInstanceIndex";

export interface ReconcileBridge {
	registerPrefabs(prefabs: Record<string, EntityPrefab>): void;
	destroyEntity(entityId: string): void;
	spawnEntity(request: {
		entityId: string;
		prefabId: string;
		position: { x: number; y: number };
	}): void;
	getEntityTransform(
		entityId: string,
	): Promise<{ x: number; y: number; angle: number } | null>;
}

export interface ReconcileResult {
	strategy: "visual_update" | "recreate" | "skipped";
	entitiesAffected: number;
}

export class PrefabReconciler {
	constructor(
		private bridge: ReconcileBridge,
		private instanceIndex: PrefabInstanceIndex,
	) {}

	async reconcile(
		diff: PrefabDiffResult,
		allPrefabs: Record<string, EntityPrefab>,
		_entities: GameEntity[],
	): Promise<ReconcileResult> {
		const entityIds = this.instanceIndex.getEntitiesForPrefab(diff.prefabId);

		if (entityIds.size === 0) {
			return {
				strategy: "skipped",
				entitiesAffected: 0,
			};
		}

		if (diff.isVisualOnly) {
			this.bridge.registerPrefabs(allPrefabs);
			return {
				strategy: "visual_update",
				entitiesAffected: entityIds.size,
			};
		}

		if (!diff.requiresRecreate) {
			return {
				strategy: "skipped",
				entitiesAffected: 0,
			};
		}

		return this.recreateEntities(diff.prefabId, entityIds);
	}

	private async recreateEntities(
		prefabId: string,
		entityIds: Set<string>,
	): Promise<ReconcileResult> {
		for (const entityId of entityIds) {
			const transform = await this.bridge.getEntityTransform(entityId);
			const position =
				transform === null
					? { x: 0, y: 0 }
					: { x: transform.x, y: transform.y };
			this.bridge.destroyEntity(entityId);
			this.bridge.spawnEntity({
				entityId,
				prefabId,
				position,
			});
			this.instanceIndex.unregister(entityId);
			this.instanceIndex.register(entityId, prefabId);
		}

		return {
			strategy: "recreate",
			entitiesAffected: entityIds.size,
		};
	}
}
