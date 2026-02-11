export class PrefabInstanceIndex {
	private entityToPrefab = new Map<string, string>();
	private prefabToEntities = new Map<string, Set<string>>();

	register(entityId: string, prefabId: string): void {
		const existingPrefabId = this.entityToPrefab.get(entityId);
		if (existingPrefabId && existingPrefabId !== prefabId) {
			const existingEntities = this.prefabToEntities.get(existingPrefabId);
			existingEntities?.delete(entityId);
			if (existingEntities && existingEntities.size === 0) {
				this.prefabToEntities.delete(existingPrefabId);
			}
		}

		this.entityToPrefab.set(entityId, prefabId);
		if (!this.prefabToEntities.has(prefabId)) {
			this.prefabToEntities.set(prefabId, new Set());
		}
		this.prefabToEntities.get(prefabId)?.add(entityId);
	}

	unregister(entityId: string): void {
		const prefabId = this.entityToPrefab.get(entityId);
		if (prefabId) {
			this.entityToPrefab.delete(entityId);
			const entities = this.prefabToEntities.get(prefabId);
			entities?.delete(entityId);
			if (entities?.size === 0) {
				this.prefabToEntities.delete(prefabId);
			}
		}
	}

	getEntitiesForPrefab(prefabId: string): Set<string> {
		return this.prefabToEntities.get(prefabId) ?? new Set();
	}

	getPrefabForEntity(entityId: string): string | undefined {
		return this.entityToPrefab.get(entityId);
	}
	clear(): void {
		this.entityToPrefab.clear();
		this.prefabToEntities.clear();
	}

	get size(): number {
		return this.entityToPrefab.size;
	}
}
