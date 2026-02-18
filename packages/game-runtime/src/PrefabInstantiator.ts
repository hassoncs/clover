import type {
	PrefabDefinition,
	PrefabInstantiateOpts,
	PrefabInstantiateResult,
	PrefabRegistry,
} from "@slopcade/shared";
import type { GodotBridge, SpawnEntityRequest } from "@slopcade/godot-bridge";

export class PrefabInstantiator {
	private readonly bridge: GodotBridge;
	private readonly registry: Map<string, PrefabDefinition> = new Map();

	constructor(bridge: GodotBridge) {
		this.bridge = bridge;
	}

	registerPrefabs(prefabs: PrefabRegistry): void {
		for (const [id, definition] of Object.entries(prefabs)) {
			this.registry.set(id, definition);
		}
	}

	registerPrefab(id: string, definition: PrefabDefinition): void {
		this.registry.set(id, definition);
	}

	unregisterPrefab(id: string): void {
		this.registry.delete(id);
	}

	clearRegistry(): void {
		this.registry.clear();
	}

	getPrefab(id: string): PrefabDefinition | undefined {
		return this.registry.get(id);
	}

	getRegisteredIds(): string[] {
		return Array.from(this.registry.keys());
	}

	async instantiate(
		prefabId: string,
		opts?: PrefabInstantiateOpts,
	): Promise<PrefabInstantiateResult> {
		const definition = this.registry.get(prefabId);
		if (!definition) {
			throw new Error(`Prefab not found: ${prefabId}`);
		}

		const entityId = opts?.entityId ?? generateEntityId(prefabId);

		if (definition.type === "data") {
			return this.instantiateData(prefabId, entityId, definition, opts);
		}

		return this.instantiateScene(prefabId, entityId, definition, opts);
	}

	private instantiateData(
		prefabId: string,
		entityId: string,
		definition: Extract<PrefabDefinition, { type: "data" }>,
		opts?: PrefabInstantiateOpts,
	): PrefabInstantiateResult {
		const position = opts?.position ?? { x: 0, y: 0 };

		const request: SpawnEntityRequest = {
			prefabId: definition.entityPrefab.id,
			position,
			entityId,
			...(opts?.velocity ? { velocity: opts.velocity } : {}),
		};

		this.bridge.spawnEntity(request);

		return { entityId, prefabId, type: "data" };
	}

	private async instantiateScene(
		prefabId: string,
		entityId: string,
		definition: Extract<PrefabDefinition, { type: "scene" }>,
		opts?: PrefabInstantiateOpts,
	): Promise<PrefabInstantiateResult> {
		const position = opts?.position ?? { x: 0, y: 0 };

		await this.bridge.instantiateFromScene(
			definition.scenePath,
			entityId,
			position,
			opts?.properties,
		);

		return { entityId, prefabId, type: "scene" };
	}
}

function generateEntityId(prefabId: string): string {
	return `${prefabId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
