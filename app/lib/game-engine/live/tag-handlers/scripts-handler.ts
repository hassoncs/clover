import type { TagHotReloadHandler } from "./types";

type ScriptsPayload = {
	script: string;
};

export const scriptsHandler: TagHotReloadHandler<ScriptsPayload> = {
	canHotSwap() {
		return true;
	},

	async hotSwap(_oldPayload, newPayload, context) {
		await context.runtime.applyScript(newPayload.script);
	},

	async fullReload(payload, context) {
		await context.runtime.applyScript(payload.script);
	},
};
