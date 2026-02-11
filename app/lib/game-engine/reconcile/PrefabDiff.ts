import type { EntityPrefab } from "@slopcade/shared";

export type PrefabChangeCategory =
	| "visual"
	| "physics"
	| "behaviors"
	| "children"
	| "structural";

export interface PrefabDiffResult {
	prefabId: string;
	changed: boolean;
	categories: Set<PrefabChangeCategory>;
	isVisualOnly: boolean;
	requiresRecreate: boolean;
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
			categories: new Set(["structural"]),
			isVisualOnly: false,
			requiresRecreate: true,
		};
	}

	const categories = new Set<PrefabChangeCategory>();

	if (JSON.stringify(oldPrefab.visual) !== JSON.stringify(newPrefab.visual)) {
		categories.add("visual");
	}

	if (
		JSON.stringify(oldPrefab.physics) !== JSON.stringify(newPrefab.physics) ||
		JSON.stringify(oldPrefab.collider) !== JSON.stringify(newPrefab.collider)
	) {
		categories.add("physics");
	}

	if (
		JSON.stringify(oldPrefab.behaviors) !==
			JSON.stringify(newPrefab.behaviors) ||
		JSON.stringify(oldPrefab.conditionalBehaviors) !==
			JSON.stringify(newPrefab.conditionalBehaviors)
	) {
		categories.add("behaviors");
	}

	if (
		JSON.stringify(oldPrefab.children) !== JSON.stringify(newPrefab.children)
	) {
		categories.add("children");
	}

	if (
		JSON.stringify(oldPrefab.tags) !== JSON.stringify(newPrefab.tags) ||
		oldPrefab.archetype !== newPrefab.archetype ||
		oldPrefab.layer !== newPrefab.layer
	) {
		categories.add("structural");
	}

	const changed = categories.size > 0;
	const isVisualOnly =
		changed && categories.size === 1 && categories.has("visual");
	const requiresRecreate =
		categories.has("physics") ||
		categories.has("structural") ||
		categories.has("children");

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
		if (result.changed) {
			results.set(id, result);
		}
	}

	return results;
}
