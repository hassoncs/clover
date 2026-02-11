import type { BackgroundConfig, WorldConfig } from "@slopcade/shared";
import type { TagHotReloadHandler } from "./types";

type WorldPayload = {
	world: WorldConfig;
	background?: BackgroundConfig;
};

export const worldHandler: TagHotReloadHandler<WorldPayload> = {
	canHotSwap(_oldHash, _newHash, context) {
		return context.mode === "edit";
	},

	async hotSwap(_oldPayload, newPayload, context) {
		context.bridge.setupWorld(newPayload.world, newPayload.background);
	},

	async fullReload(payload, context) {
		context.bridge.setupWorld(payload.world, payload.background);
	},
};
