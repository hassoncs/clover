import type { GameEntity } from "@slopcade/shared";
import type { TagHotReloadHandler } from "./types";

type EntitiesPayload = {
	entities: GameEntity[];
};

export const entitiesHandler: TagHotReloadHandler<EntitiesPayload> = {
	canHotSwap(_oldHash, _newHash, context) {
		return context.mode === "author";
	},

	async hotSwap(_oldPayload, newPayload, context) {
		context.bridge.clearEntities();
		context.bridge.loadEntities(newPayload.entities);
	},

	async fullReload(payload, context) {
		context.bridge.clearEntities();
		context.bridge.loadEntities(payload.entities);
	},
};
