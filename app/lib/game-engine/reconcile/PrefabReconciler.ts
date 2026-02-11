import type { EntityPrefab, GameEntity } from "@slopcade/shared";
import type { GodotBridge } from "@/lib/godot/types";
import type { PrefabDiffResult } from "./PrefabDiff";
import type { PrefabInstanceIndex } from "./PrefabInstanceIndex";

export interface ReconcileResult {
	prefabId: string;
	strategy: "visual_update" | "recreate" | "skipped";
	entitiesAffected: number;
}

export class PrefabReconciler {
	constructor(
		private bridge: GodotBridge,
		private instanceIndex: PrefabInstanceIndex,
	) {}

	async reconcile(
		diff: PrefabDiffResult,
		newPrefabs: Record<string, EntityPrefab>,
		currentEntities: GameEntity[],
	): Promise<ReconcileResult> {
		const entityIds = this.instanceIndex.getEntitiesForPrefab(diff.prefabId);

		if (entityIds.size === 0) {
			return {
				prefabId: diff.prefabId,
				strategy: "skipped",
				entitiesAffected: 0,
			};
		}

		// Always register updated prefabs first
		this.bridge.registerPrefabs(newPrefabs);

		if (diff.isVisualOnly) {
			return this.applyVisualUpdate(diff.prefabId, entityIds);
		}

		return this.applyRecreate(diff.prefabId, entityIds, currentEntities);
	}

	private async applyVisualUpdate(
		prefabId: string,
		entityIds: ReadonlySet<string>,
	): Promise<ReconcileResult> {
		// Visual-only: re-register prefabs triggers Godot to update visuals
		// without destroying/recreating physics bodies
		// The bridge.registerPrefabs() call above handles this
		return {
			prefabId,
			strategy: "visual_update",
			entitiesAffected: entityIds.size,
		};
	}

	private async applyRecreate(
		prefabId: string,
		entityIds: ReadonlySet<string>,
		currentEntities: GameEntity[],
	): Promise<ReconcileResult> {
		// Capture positions of affected entities before destruction
		const entityPositions = new Map<
			string,
			{ x: number; y: number; angle: number }
		>();

		for (const entityId of entityIds) {
			const transform = await this.bridge.getEntityTransform(entityId);
			if (transform) {
				entityPositions.set(entityId, {
					x: transform.x,
					y: transform.y,
					angle: transform.angle,
				});
			}
		}

		// Destroy affected entities
		for (const entityId of entityIds) {
			this.bridge.destroyEntity(entityId);
			this.instanceIndex.unregister(entityId);
		}

		// Respawn at captured positions
		for (const entityId of entityIds) {
			const pos = entityPositions.get(entityId) ?? { x: 0, y: 0, angle: 0 };
			this.bridge.spawnEntity({
				entityId,
				prefabId,
				position: { x: pos.x, y: pos.y },
			});
			this.instanceIndex.register(entityId, prefabId);
		}

		return {
			prefabId,
			strategy: "recreate",
			entitiesAffected: entityIds.size,
		};
	}

	async reconcileAll(
		diffs: Map<string, PrefabDiffResult>,
		newPrefabs: Record<string, EntityPrefab>,
		currentEntities: GameEntity[],
	): Promise<ReconcileResult[]> {
		const results: ReconcileResult[] = [];
		for (const [, diff] of diffs) {
			if (diff.changed) {
				const result = await this.reconcile(diff, newPrefabs, currentEntities);
				results.push(result);
			}
		}
		return results;
	}
}
