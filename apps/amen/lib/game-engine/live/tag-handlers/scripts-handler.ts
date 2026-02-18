import type { TagPayloads } from "@slopcade/shared";
import type { TagHotReloadHandler } from "./types";

type ScriptsPayload = TagPayloads["scripts"];

function concatenateModules(payload: ScriptsPayload): string {
	const keys = Object.keys(payload.modules).sort();
	return keys.map((key) => payload.modules[key]).join("\n\n");
}

async function applyPayload(
	payload: ScriptsPayload,
	context: {
		runtime: {
			applyScript: (source: string) => Promise<void>;
			applyModules?: (
				modules: Record<string, string>,
				entrypoint?: string,
			) => Promise<void>;
		};
	},
): Promise<void> {
	if (context.runtime.applyModules) {
		await context.runtime.applyModules(payload.modules, payload.entrypoint);
	} else {
		await context.runtime.applyScript(concatenateModules(payload));
	}
}

export const scriptsHandler: TagHotReloadHandler<ScriptsPayload> = {
	canHotSwap() {
		return true;
	},

	async hotSwap(_oldPayload, newPayload, context) {
		await applyPayload(newPayload, context);
	},

	async fullReload(payload, context) {
		await applyPayload(payload, context);
	},
};
