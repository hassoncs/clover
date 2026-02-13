import type { EntityPrefab } from "@slopcade/shared";
import type { TagHotReloadHandler } from "./types";

type PrefabsPayload = {
	prefabs: Record<string, EntityPrefab>;
};

export const prefabsHandler: TagHotReloadHandler<PrefabsPayload> = {
	canHotSwap(_oldHash, _newHash, context) {
		return context.mode === "author";
	},

	async hotSwap(_oldPayload, newPayload, context) {
		context.bridge.registerPrefabs(newPayload.prefabs);
		context.bridge.clearEntities();
		context.bridge.loadEntities([]);
	},

	async fullReload(payload, context) {
		context.bridge.registerPrefabs(payload.prefabs);
		context.bridge.clearEntities();
		context.bridge.loadEntities([]);
	},
};
