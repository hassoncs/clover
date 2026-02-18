import type { WorkspaceTag } from "@slopcade/shared";
import { assetsHandler } from "./assets-handler";
import { effectsHandler } from "./effects-handler";
import { entitiesHandler } from "./entities-handler";
import { prefabsHandler } from "./prefabs-handler";
import { scriptsHandler } from "./scripts-handler";
import type { HotReloadContext, TagHotReloadHandler } from "./types";
import { worldHandler } from "./world-handler";

export function createTagHotReloadHandlers(
	_context: HotReloadContext,
): Map<WorkspaceTag, TagHotReloadHandler> {
	return new Map<WorkspaceTag, TagHotReloadHandler>([
		["world", worldHandler],
		["prefabs", prefabsHandler],
		["entities", entitiesHandler],
		["scripts", scriptsHandler],
		["effects", effectsHandler],
		["assets", assetsHandler],
	]);
}
