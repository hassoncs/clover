import type { GameRule } from "@slopcade/shared";
import type { TagHotReloadHandler } from "./types";

type RulesPayload = {
	rules: GameRule[];
};

export const rulesHandler: TagHotReloadHandler<RulesPayload> = {
	canHotSwap() {
		return true;
	},

	async hotSwap(_oldPayload, newPayload, context) {
		context.runtime.applyRules(newPayload.rules);
	},

	async fullReload(payload, context) {
		context.runtime.applyRules(payload.rules);
	},
};
