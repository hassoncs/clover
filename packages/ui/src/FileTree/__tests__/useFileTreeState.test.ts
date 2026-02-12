import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FileTreeData } from "../types";
import { pathsToTree } from "../types";
import type { FileTreeStateConfig } from "../useFileTreeState";
import { useFileTreeState } from "../useFileTreeState";

function makeSimpleTree(): { data: FileTreeData; roots: string[] } {
	const data = pathsToTree([
		{ filename: "src/index.ts", size: 100 },
		{ filename: "src/utils/helper.ts", size: 200 },
		{ filename: "README.md", size: 50 },
	]);
	const roots = Object.keys(data).filter((id) => data[id].parentId === null);
	return { data, roots };
}

type HookResult = ReturnType<
	typeof renderHook<ReturnType<typeof useFileTreeState>, unknown>
>;

function stabilize(hookResult: HookResult) {
	act(() => {
		const current = hookResult.result.current.expandedIds;
		hookResult.result.current.setExpandedIds([...current]);
	});
}

function renderFileTreeState(overrides: Partial<FileTreeStateConfig> = {}) {
	const { data, roots } = makeSimpleTree();
	const hookResult = renderHook(() =>
		useFileTreeState({
			data,
			roots,
			...overrides,
		}),
	);
	stabilize(hookResult);
	return hookResult;
}

describe("useFileTreeState", () => {
	describe("initial state", () => {
		it("starts with empty expanded and selected sets", () => {
			const { result } = renderFileTreeState();
			expect(result.current.expandedIds).toEqual([]);
			expect(result.current.selectedIds).toEqual([]);
		});

		it("starts with no focused item", () => {
			const { result } = renderFileTreeState();
			expect(result.current.focusedId).toBeNull();
		});

		it("starts with no search query", () => {
			const { result } = renderFileTreeState();
			expect(result.current.searchQuery).toBeNull();
		});

		it("starts with no renaming item", () => {
			const { result } = renderFileTreeState();
			expect(result.current.renamingId).toBeNull();
		});

		it("respects initialExpandedIds", () => {
			const { result } = renderFileTreeState({
				initialExpandedIds: ["src"],
			});
			expect(result.current.expandedIds).toContain("src");
		});
	});

	describe("expand/collapse", () => {
		it("setExpandedIds updates expanded state", () => {
			const { result } = renderFileTreeState();

			act(() => {
				result.current.setExpandedIds(["src", "src/utils"]);
			});

			expect(result.current.expandedIds).toEqual(["src", "src/utils"]);
		});

		it("collapseAll clears all expanded items", () => {
			const { result } = renderFileTreeState({
				initialExpandedIds: ["src", "src/utils"],
			});

			act(() => {
				result.current.collapseAll();
			});

			expect(result.current.expandedIds).toEqual([]);
		});

		it("expandAll expands all folder nodes", () => {
			const { data, roots } = makeSimpleTree();
			const hookResult = renderHook(() => useFileTreeState({ data, roots }));
			stabilize(hookResult);

			act(() => {
				hookResult.result.current.expandAll();
			});

			expect(hookResult.result.current.expandedIds).toContain("src");
			expect(hookResult.result.current.expandedIds).toContain("src/utils");
			const hasOnlyFolders = hookResult.result.current.expandedIds.every(
				(id) => data[id]?.type === "folder",
			);
			expect(hasOnlyFolders).toBe(true);
		});

		it("onExpandedChange fires when expanded state changes", () => {
			const onExpandedChange = vi.fn();
			const { result } = renderFileTreeState({ onExpandedChange });

			act(() => {
				result.current.setExpandedIds(["src"]);
			});

			expect(onExpandedChange).toHaveBeenCalledWith(["src"]);
		});
	});

	describe("selection", () => {
		it("setSelectedIds updates selected state", () => {
			const { result } = renderFileTreeState();

			act(() => {
				result.current.setSelectedIds(["src/index.ts"]);
			});

			expect(result.current.selectedIds).toEqual(["src/index.ts"]);
		});

		it("onSelectFile fires when a file is selected", () => {
			const onSelectFile = vi.fn();
			const { result } = renderFileTreeState({ onSelectFile });

			act(() => {
				result.current.setSelectedIds(["src/index.ts"]);
			});

			expect(onSelectFile).toHaveBeenCalledWith("src/index.ts");
		});

		it("onSelectFile does NOT fire when a folder is selected", () => {
			const onSelectFile = vi.fn();
			const { result } = renderFileTreeState({ onSelectFile });

			act(() => {
				result.current.setSelectedIds(["src"]);
			});

			expect(onSelectFile).not.toHaveBeenCalled();
		});
	});

	describe("search", () => {
		it("setSearchQuery updates search state", () => {
			const { result } = renderFileTreeState();

			act(() => {
				result.current.setSearchQuery("helper");
			});

			expect(result.current.searchQuery).toBe("helper");
		});

		it("clearing search sets it back to null", () => {
			const { result } = renderFileTreeState();

			act(() => {
				result.current.setSearchQuery("test");
			});
			act(() => {
				result.current.setSearchQuery(null);
			});

			expect(result.current.searchQuery).toBeNull();
		});
	});

	describe("visible nodes", () => {
		it("shows root-level items when nothing expanded", () => {
			const { result } = renderFileTreeState();
			const visibleIds = result.current.visibleNodes.map((n) => n.id);
			expect(visibleIds).toContain("src");
			expect(visibleIds).toContain("README.md");
			expect(visibleIds).not.toContain("src/index.ts");
		});

		it("shows children when folder is expanded", () => {
			const { result } = renderFileTreeState({
				initialExpandedIds: ["src"],
			});
			const visibleIds = result.current.visibleNodes.map((n) => n.id);
			expect(visibleIds).toContain("src");
			expect(visibleIds).toContain("src/index.ts");
			expect(visibleIds).toContain("src/utils");
		});

		it("assigns correct depth to nodes", () => {
			const { result } = renderFileTreeState({
				initialExpandedIds: ["src", "src/utils"],
			});

			const depthMap = new Map(
				result.current.visibleNodes.map((n) => [n.id, n.depth]),
			);
			// Root items are children of virtual root, so depth starts at 1
			expect(depthMap.get("src")).toBe(1);
			expect(depthMap.get("README.md")).toBe(1);
			expect(depthMap.get("src/index.ts")).toBe(2);
			expect(depthMap.get("src/utils")).toBe(2);
			expect(depthMap.get("src/utils/helper.ts")).toBe(3);
		});
	});

	describe("multi-root virtual root", () => {
		it("creates virtual root when multiple roots exist", () => {
			const { result } = renderFileTreeState();
			const topLevelIds = result.current.visibleNodes
				.filter((n) => n.depth === 1)
				.map((n) => n.id);

			expect(topLevelIds.length).toBeGreaterThan(1);
			expect(topLevelIds).toContain("src");
			expect(topLevelIds).toContain("README.md");
		});

		it("single root still works through virtual root", () => {
			const data = pathsToTree([{ filename: "src/a.ts", size: 10 }]);
			const roots = ["src"];

			const hookResult = renderHook(() => useFileTreeState({ data, roots }));
			stabilize(hookResult);

			expect(hookResult.result.current.visibleNodes).toHaveLength(1);
			expect(hookResult.result.current.visibleNodes[0].id).toBe("src");
		});
	});
});
