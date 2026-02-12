import type { GameDefinition } from "@slopcade/shared";
import type { ImageVisualComponent } from "@slopcade/shared/types/visual";

/**
 * Walks a GameDefinition, collects all assetId references,
 * batch-resolves them to URLs, and injects the URLs back.
 *
 * @param definition The game definition to resolve assets for
 * @param resolveUrls Callback to resolve a list of asset hashes to URLs
 * @returns A new GameDefinition with resolved URLs (shallow copy where possible, deep where needed)
 */
export async function resolveAssetIds(
	definition: GameDefinition,
	resolveUrls: (hashes: string[]) => Promise<Record<string, string>>,
): Promise<GameDefinition> {
	// 1. Collect all assetId values
	const hashes = new Set<string>();

	if (definition.prefabs) {
		for (const prefab of Object.values(definition.prefabs)) {
			if (
				prefab.visual &&
				prefab.visual.type === "image" &&
				(prefab.visual as ImageVisualComponent).assetId
			) {
				hashes.add((prefab.visual as ImageVisualComponent).assetId!);
			}
		}
	}

	if (definition.background) {
		if (
			definition.background.type === "static" &&
			definition.background.assetId
		) {
			hashes.add(definition.background.assetId);
		} else if (
			definition.background.type === "parallax" &&
			definition.background.layers
		) {
			for (const layer of definition.background.layers) {
				if (layer.assetId) {
					hashes.add(layer.assetId);
				}
			}
		}
	}

	if (definition.sounds) {
		for (const sound of Object.values(definition.sounds)) {
			if (sound.assetId) {
				hashes.add(sound.assetId);
			}
		}
	}

	if (hashes.size === 0) {
		return definition;
	}

	// 2. Batch resolve all unique hashes to URLs
	const resolvedUrls = await resolveUrls(Array.from(hashes));

	// 3. Clone and update definition
	const newDefinition = { ...definition };

	if (newDefinition.prefabs) {
		newDefinition.prefabs = { ...newDefinition.prefabs };
		for (const [id, prefab] of Object.entries(newDefinition.prefabs)) {
			if (
				prefab.visual &&
				prefab.visual.type === "image" &&
				(prefab.visual as ImageVisualComponent).assetId
			) {
				const assetId = (prefab.visual as ImageVisualComponent).assetId!;
				if (resolvedUrls[assetId]) {
					newDefinition.prefabs[id] = {
						...prefab,
						visual: {
							...prefab.visual,
							url: resolvedUrls[assetId],
						} as ImageVisualComponent,
					};
				}
			}
		}
	}

	if (newDefinition.background) {
		if (
			newDefinition.background.type === "static" &&
			newDefinition.background.assetId &&
			resolvedUrls[newDefinition.background.assetId]
		) {
			newDefinition.background = {
				...newDefinition.background,
				imageUrl: resolvedUrls[newDefinition.background.assetId],
			};
		} else if (
			newDefinition.background.type === "parallax" &&
			newDefinition.background.layers
		) {
			const newLayers = newDefinition.background.layers.map((layer) => {
				if (layer.assetId && resolvedUrls[layer.assetId]) {
					return {
						...layer,
						imageUrl: resolvedUrls[layer.assetId],
					};
				}
				return layer;
			});
			newDefinition.background = {
				...newDefinition.background,
				layers: newLayers,
			};
		}
	}

	if (newDefinition.sounds) {
		newDefinition.sounds = { ...newDefinition.sounds };
		for (const [id, sound] of Object.entries(newDefinition.sounds)) {
			if (sound.assetId && resolvedUrls[sound.assetId]) {
				newDefinition.sounds[id] = {
					...sound,
					url: resolvedUrls[sound.assetId],
				};
			}
		}
	}

	return newDefinition;
}
