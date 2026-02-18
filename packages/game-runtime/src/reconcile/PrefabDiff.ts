import type { EntityPrefab } from "@slopcade/shared";

export type PrefabDiffCategory = "visual" | "physics" | "structural";

export interface PrefabDiffResult {
	prefabId: string;
	changed: boolean;
	isVisualOnly: boolean;
	requiresRecreate: boolean;
	categories: Set<PrefabDiffCategory>;
}

export function diffPrefab(
	prefabId: string,
	oldPrefab: EntityPrefab | undefined,
	newPrefab: EntityPrefab | undefined,
): PrefabDiffResult {
	if (!oldPrefab || !newPrefab) {
		return {
			prefabId,
			changed: true,
			categories: new Set<PrefabDiffCategory>(["structural"]),
			isVisualOnly: false,
			requiresRecreate: true,
		};
	}

	const categories = new Set<PrefabDiffCategory>();

	if (JSON.stringify(oldPrefab.visual) !== JSON.stringify(newPrefab.visual)) {
		categories.add("visual");
	}

	if (JSON.stringify(oldPrefab.physics) !== JSON.stringify(newPrefab.physics)) {
		categories.add("physics");
	}

	const { visual: _oldVisual, physics: _oldPhysics, ...oldCore } = oldPrefab;
	const { visual: _newVisual, physics: _newPhysics, ...newCore } = newPrefab;

	if (JSON.stringify(oldCore) !== JSON.stringify(newCore)) {
		categories.add("structural");
	}

	const changed = categories.size > 0;
	const isVisualOnly =
		changed && categories.size === 1 && categories.has("visual");
	const requiresRecreate =
		categories.has("physics") || categories.has("structural");

	return { prefabId, changed, categories, isVisualOnly, requiresRecreate };
}

export function diffAllPrefabs(
	oldPrefabs: Record<string, EntityPrefab>,
	newPrefabs: Record<string, EntityPrefab>,
): Map<string, PrefabDiffResult> {
	const results = new Map<string, PrefabDiffResult>();
	const allIds = new Set([
		...Object.keys(oldPrefabs),
		...Object.keys(newPrefabs),
	]);

	for (const id of allIds) {
		const result = diffPrefab(id, oldPrefabs[id], newPrefabs[id]);
		results.set(id, result);
	}

	return results;
}
