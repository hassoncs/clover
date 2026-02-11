/**
 * PrefabInstanceIndex
 *
 * Tracks which live entities were spawned from which prefab.
 * Enables targeted reconciliation when a prefab changes.
 *
 * Maintains bidirectional mapping:
 * - entityId → prefabId (which prefab spawned this entity)
 * - prefabId → Set<entityId> (all entities spawned from this prefab)
 */
export class PrefabInstanceIndex {
	private entityToPrefab = new Map<string, string>();
	private prefabToEntities = new Map<string, Set<string>>();

	/**
	 * Register an entity as spawned from a prefab
	 */
	register(entityId: string, prefabId: string): void {
		this.entityToPrefab.set(entityId, prefabId);
		if (!this.prefabToEntities.has(prefabId)) {
			this.prefabToEntities.set(prefabId, new Set());
		}
		this.prefabToEntities.get(prefabId)!.add(entityId);
	}

	/**
	 * Unregister an entity (e.g., when destroyed)
	 */
	unregister(entityId: string): void {
		const prefabId = this.entityToPrefab.get(entityId);
		if (prefabId) {
			this.entityToPrefab.delete(entityId);
			this.prefabToEntities.get(prefabId)?.delete(entityId);
			if (this.prefabToEntities.get(prefabId)?.size === 0) {
				this.prefabToEntities.delete(prefabId);
			}
		}
	}

	/**
	 * Get all entities spawned from a specific prefab
	 */
	getEntitiesForPrefab(prefabId: string): ReadonlySet<string> {
		return this.prefabToEntities.get(prefabId) ?? new Set();
	}

	/**
	 * Get the prefab that spawned a specific entity
	 */
	getPrefabForEntity(entityId: string): string | undefined {
		return this.entityToPrefab.get(entityId);
	}

	/**
	 * Get all prefab IDs that have spawned entities
	 */
	getAllPrefabIds(): string[] {
		return Array.from(this.prefabToEntities.keys());
	}

	/**
	 * Clear all mappings
	 */
	clear(): void {
		this.entityToPrefab.clear();
		this.prefabToEntities.clear();
	}

	/**
	 * Get total number of tracked entities
	 */
	get size(): number {
		return this.entityToPrefab.size;
	}
}
