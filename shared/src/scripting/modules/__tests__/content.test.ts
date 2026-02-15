import { describe, expect, it } from "vitest";
import { SLOPCADE_MODULES } from "../index";

function loadModule(source: string) {
	const mod = { exports: {} as Record<string, unknown> };
	const fn = new Function("module", "exports", source);
	fn(mod, mod.exports);
	return mod.exports as Record<string, (...args: unknown[]) => unknown>;
}

describe("slopcade/content module", () => {
	const content = loadModule(SLOPCADE_MODULES["slopcade/content"]);

	describe("shuffle", () => {
		it("should return a new array with same elements", () => {
			const arr = [1, 2, 3, 4, 5];
			const result = content.shuffle(arr) as number[];

			expect(result).toHaveLength(5);
			expect(result.sort()).toEqual(arr.sort());
			expect(arr).toEqual([1, 2, 3, 4, 5]); // Original unchanged
		});

		it("should handle empty array", () => {
			const result = content.shuffle([]);
			expect(result).toEqual([]);
		});

		it("should handle single element", () => {
			const result = content.shuffle([42]);
			expect(result).toEqual([42]);
		});

		it("should handle objects", () => {
			const arr = [{ id: "a" }, { id: "b" }, { id: "c" }];
			const result = content.shuffle(arr) as Array<{ id: string }>;

			expect(result).toHaveLength(3);
			expect(result.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
		});
	});

	describe("selectForRound", () => {
		it("should select items not in usedIds", () => {
			const pool = [
				{ id: "a", text: "First" },
				{ id: "b", text: "Second" },
				{ id: "c", text: "Third" },
				{ id: "d", text: "Fourth" },
			];
			const usedIds = { a: true, c: true };

			const result = content.selectForRound(pool, 2, usedIds) as Array<{
				id: string;
				text: string;
			}>;

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("b");
			expect(result[1].id).toBe("d");
		});

		it("should respect count limit", () => {
			const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];
			const usedIds = {};

			const result = content.selectForRound(pool, 2, usedIds);

			expect(result).toHaveLength(2);
		});

		it("should return fewer items if not enough available", () => {
			const pool = [{ id: "a" }, { id: "b" }];
			const usedIds = { a: true };

			const result = content.selectForRound(pool, 5, usedIds);

			expect(result).toHaveLength(1);
		});

		it("should return empty array if all used", () => {
			const pool = [{ id: "a" }, { id: "b" }];
			const usedIds = { a: true, b: true };

			const result = content.selectForRound(pool, 2, usedIds);

			expect(result).toEqual([]);
		});

		it("should return empty array for empty pool", () => {
			const result = content.selectForRound([], 5, {});
			expect(result).toEqual([]);
		});
	});

	describe("markUsed", () => {
		it("should mark item IDs as used", () => {
			const usedIds: Record<string, boolean> = {};
			const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

			content.markUsed(usedIds, items);

			expect(usedIds.a).toBe(true);
			expect(usedIds.b).toBe(true);
			expect(usedIds.c).toBe(true);
		});

		it("should preserve existing used IDs", () => {
			const usedIds: Record<string, boolean> = { x: true, y: true };
			const items = [{ id: "a" }];

			content.markUsed(usedIds, items);

			expect(usedIds.x).toBe(true);
			expect(usedIds.y).toBe(true);
			expect(usedIds.a).toBe(true);
		});

		it("should handle items without id property", () => {
			const usedIds: Record<string, boolean> = {};
			const items = [{ name: "no-id" }, { id: "has-id" }];

			content.markUsed(usedIds, items);

			expect(usedIds["has-id"]).toBe(true);
			expect(Object.keys(usedIds)).toHaveLength(1);
		});

		it("should handle empty items array", () => {
			const usedIds: Record<string, boolean> = { existing: true };

			content.markUsed(usedIds, []);

			expect(Object.keys(usedIds)).toHaveLength(1);
		});
	});
});
