import type { EntityPrefab } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { diffAllPrefabs, diffPrefab } from "../PrefabDiff";
import { PrefabInstanceIndex } from "../PrefabInstanceIndex";
import { PrefabReconciler } from "../PrefabReconciler";

describe("PrefabInstanceIndex", () => {
	let index: PrefabInstanceIndex;

	beforeEach(() => {
		index = new PrefabInstanceIndex();
	});

	it("registers entity to prefab", () => {
		index.register("entity1", "player");

		expect(index.getPrefabForEntity("entity1")).toBe("player");
		expect(index.getEntitiesForPrefab("player").has("entity1")).toBe(true);
	});

	it("unregisters entity", () => {
		index.register("entity1", "player");
		index.unregister("entity1");

		expect(index.getPrefabForEntity("entity1")).toBeUndefined();
		expect(index.getEntitiesForPrefab("player").size).toBe(0);
	});

	it("tracks multiple entities per prefab", () => {
		index.register("e1", "player");
		index.register("e2", "player");

		expect(index.getEntitiesForPrefab("player").size).toBe(2);
	});

	it("returns empty set for unknown prefab", () => {
		expect(index.getEntitiesForPrefab("missing").size).toBe(0);
	});

	it("clears all entries", () => {
		index.register("e1", "player");
		index.register("e2", "enemy");

		index.clear();

		expect(index.size).toBe(0);
		expect(index.getEntitiesForPrefab("player").size).toBe(0);
		expect(index.getEntitiesForPrefab("enemy").size).toBe(0);
	});
});

describe("diffPrefab", () => {
	const basePrefab: EntityPrefab = {
		id: "player",
		visual: { type: "circle", radius: 1, color: "#ff0000" },
		physics: { bodyType: "dynamic" },
	} as EntityPrefab;

	it("detects visual-only change", () => {
		const newPrefab = {
			...basePrefab,
			visual: { type: "circle", radius: 2, color: "#00ff00" },
		} as EntityPrefab;

		const result = diffPrefab("player", basePrefab, newPrefab);

		expect(result.changed).toBe(true);
		expect(result.isVisualOnly).toBe(true);
		expect(result.requiresRecreate).toBe(false);
		expect(result.categories.has("visual")).toBe(true);
	});

	it("detects physics change requires recreate", () => {
		const newPrefab = {
			...basePrefab,
			physics: { bodyType: "static" },
		} as EntityPrefab;

		const result = diffPrefab("player", basePrefab, newPrefab);

		expect(result.changed).toBe(true);
		expect(result.requiresRecreate).toBe(true);
		expect(result.isVisualOnly).toBe(false);
		expect(result.categories.has("physics")).toBe(true);
	});

	it("detects structural change requires recreate", () => {
		const newPrefab = { ...basePrefab, layer: 2 } as EntityPrefab;

		const result = diffPrefab("player", basePrefab, newPrefab);

		expect(result.changed).toBe(true);
		expect(result.requiresRecreate).toBe(true);
		expect(result.isVisualOnly).toBe(false);
		expect(result.categories.has("structural")).toBe(true);
	});

	it("reports no change for identical prefabs", () => {
		const result = diffPrefab("player", basePrefab, { ...basePrefab });

		expect(result.changed).toBe(false);
		expect(result.categories.size).toBe(0);
		expect(result.requiresRecreate).toBe(false);
	});

	it("reports structural for added prefab", () => {
		const result = diffPrefab("player", undefined, basePrefab);

		expect(result.changed).toBe(true);
		expect(result.requiresRecreate).toBe(true);
		expect(result.categories.has("structural")).toBe(true);
	});

	it("reports structural for removed prefab", () => {
		const result = diffPrefab("player", basePrefab, undefined);

		expect(result.changed).toBe(true);
		expect(result.requiresRecreate).toBe(true);
		expect(result.categories.has("structural")).toBe(true);
	});
});

describe("diffAllPrefabs", () => {
	it("diffs all prefabs between old and new", () => {
		const oldPrefabs = { a: { id: "a" } as EntityPrefab };
		const newPrefabs = {
			a: {
				id: "a",
				visual: { type: "circle", radius: 1, color: "red" },
			} as EntityPrefab,
		};

		const results = diffAllPrefabs(oldPrefabs, newPrefabs);

		expect(results.size).toBe(1);
		expect(results.get("a")?.changed).toBe(true);
	});
});

describe("PrefabReconciler", () => {
	const mockBridge = {
		registerPrefabs: vi.fn(),
		destroyEntity: vi.fn(),
		spawnEntity: vi.fn(),
		getEntityTransform: vi.fn().mockResolvedValue({ x: 5, y: 10, angle: 0.5 }),
	};

	let index: PrefabInstanceIndex;
	let reconciler: PrefabReconciler;

	beforeEach(() => {
		vi.clearAllMocks();
		index = new PrefabInstanceIndex();
		reconciler = new PrefabReconciler(mockBridge as never, index);
	});

	it("skips when no instances exist", async () => {
		const diff = {
			prefabId: "player",
			changed: true,
			categories: new Set(["visual" as const]),
			isVisualOnly: true,
			requiresRecreate: false,
		};

		const result = await reconciler.reconcile(diff, {}, []);

		expect(result.strategy).toBe("skipped");
		expect(result.entitiesAffected).toBe(0);
		expect(mockBridge.registerPrefabs).not.toHaveBeenCalled();
	});

	it("uses visual_update for visual-only changes", async () => {
		index.register("e1", "player");
		const diff = {
			prefabId: "player",
			changed: true,
			categories: new Set(["visual" as const]),
			isVisualOnly: true,
			requiresRecreate: false,
		};

		const result = await reconciler.reconcile(
			diff,
			{ player: { id: "player" } as EntityPrefab },
			[],
		);

		expect(result.strategy).toBe("visual_update");
		expect(result.entitiesAffected).toBe(1);
		expect(mockBridge.registerPrefabs).toHaveBeenCalled();
		expect(mockBridge.destroyEntity).not.toHaveBeenCalled();
	});

	it("recreates entities preserving position for physics changes", async () => {
		const isolatedIndex = {
			getEntitiesForPrefab: vi.fn().mockReturnValue(new Set(["e1"])),
			unregister: vi.fn(),
			register: vi.fn(),
		};
		const isolatedReconciler = new PrefabReconciler(
			mockBridge as never,
			isolatedIndex as never,
		);
		const diff = {
			prefabId: "player",
			changed: true,
			categories: new Set(["physics" as const]),
			isVisualOnly: false,
			requiresRecreate: true,
		};

		const result = await isolatedReconciler.reconcile(
			diff,
			{ player: { id: "player" } as EntityPrefab },
			[],
		);

		expect(result.strategy).toBe("recreate");
		expect(mockBridge.getEntityTransform).toHaveBeenCalledWith("e1");
		expect(mockBridge.destroyEntity).toHaveBeenCalledWith("e1");
		expect(mockBridge.spawnEntity).toHaveBeenCalledWith(
			expect.objectContaining({
				entityId: "e1",
				prefabId: "player",
				position: { x: 5, y: 10 },
			}),
		);
		expect(isolatedIndex.unregister).toHaveBeenCalledWith("e1");
		expect(isolatedIndex.register).toHaveBeenCalledWith("e1", "player");
	});
});
