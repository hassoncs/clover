import type { TagHotReloadHandler } from "./types";

type AssetsPayload = {
	urls: Record<string, string>;
};

export const assetsHandler: TagHotReloadHandler<AssetsPayload> = {
	canHotSwap() {
		return true;
	},

	async hotSwap(_oldPayload, _newPayload, _context) {
		return;
	},

	async fullReload(_payload, _context) {
		return;
	},
};
