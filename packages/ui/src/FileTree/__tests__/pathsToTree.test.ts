import { describe, expect, it } from "vitest";
import { pathsToTree } from "../types";

describe("pathsToTree", () => {
	describe("empty and minimal inputs", () => {
		it("returns empty object for empty input", () => {
			const result = pathsToTree([]);
			expect(result).toEqual({});
		});

		it("returns single file node for a single root-level file", () => {
			const result = pathsToTree([{ filename: "README.md", size: 50 }]);
			expect(Object.keys(result)).toHaveLength(1);
			expect(result["README.md"]).toEqual({
				id: "README.md",
				name: "README.md",
				type: "file",
				parentId: null,
				meta: { size: 50, extension: "md" },
			});
		});

		it("creates no folder nodes for root-level files", () => {
			const result = pathsToTree([
				{ filename: "a.ts", size: 10 },
				{ filename: "b.ts", size: 20 },
			]);
			const folders = Object.values(result).filter((n) => n.type === "folder");
			expect(folders).toHaveLength(0);
			expect(Object.keys(result)).toHaveLength(2);
		});
	});

	describe("nested paths and folder hierarchy", () => {
		it("creates folder nodes for nested file", () => {
			const result = pathsToTree([{ filename: "src/utils/a.ts", size: 100 }]);

			expect(result["src"]).toEqual({
				id: "src",
				name: "src",
				type: "folder",
				children: ["src/utils"],
				parentId: null,
			});
			expect(result["src/utils"]).toEqual({
				id: "src/utils",
				name: "utils",
				type: "folder",
				children: ["src/utils/a.ts"],
				parentId: "src",
			});
			expect(result["src/utils/a.ts"]).toEqual({
				id: "src/utils/a.ts",
				name: "a.ts",
				type: "file",
				parentId: "src/utils",
				meta: { size: 100, extension: "ts" },
			});
		});

		it("shares intermediate folder nodes across files", () => {
			const result = pathsToTree([
				{ filename: "src/utils/a.ts", size: 100 },
				{ filename: "src/utils/b.ts", size: 200 },
				{ filename: "src/index.ts", size: 50 },
			]);

			expect(result["src"].type).toBe("folder");
			expect(result["src/utils"].type).toBe("folder");

			expect(result["src/utils"].children).toContain("src/utils/a.ts");
			expect(result["src/utils"].children).toContain("src/utils/b.ts");
			expect(result["src"].children).toContain("src/utils");
			expect(result["src"].children).toContain("src/index.ts");
		});

		it("sets correct parentId chain", () => {
			const result = pathsToTree([{ filename: "a/b/c/file.ts", size: 10 }]);

			expect(result["a"].parentId).toBeNull();
			expect(result["a/b"].parentId).toBe("a");
			expect(result["a/b/c"].parentId).toBe("a/b");
			expect(result["a/b/c/file.ts"].parentId).toBe("a/b/c");
		});
	});

	describe("deep nesting (10+ levels)", () => {
		it("handles deeply nested paths", () => {
			const deepPath = "a/b/c/d/e/f/g/h/i/j/k/deep-file.ts";
			const result = pathsToTree([{ filename: deepPath, size: 1 }]);

			const parts = deepPath.split("/");
			// Should have 11 folders + 1 file = 12 total nodes
			expect(Object.keys(result)).toHaveLength(12);

			// Verify chain
			for (let i = 0; i < parts.length - 1; i++) {
				const folderPath = parts.slice(0, i + 1).join("/");
				expect(result[folderPath]).toBeDefined();
				expect(result[folderPath].type).toBe("folder");
				expect(result[folderPath].name).toBe(parts[i]);
			}

			expect(result[deepPath].type).toBe("file");
			expect(result[deepPath].name).toBe("deep-file.ts");
		});
	});

	describe("special characters in filenames", () => {
		it("handles filenames with spaces", () => {
			const result = pathsToTree([
				{ filename: "my folder/my file.ts", size: 10 },
			]);
			expect(result["my folder"].name).toBe("my folder");
			expect(result["my folder/my file.ts"].name).toBe("my file.ts");
		});

		it("handles filenames with dots", () => {
			const result = pathsToTree([
				{ filename: "src/config.env.local", size: 10 },
			]);
			expect(result["src/config.env.local"].name).toBe("config.env.local");
			expect(result["src/config.env.local"].meta?.extension).toBe("local");
		});

		it("handles filenames with dashes and underscores", () => {
			const result = pathsToTree([
				{ filename: "my-folder/my_file-name.ts", size: 10 },
			]);
			expect(result["my-folder"].name).toBe("my-folder");
			expect(result["my-folder/my_file-name.ts"].name).toBe("my_file-name.ts");
		});

		it("handles dotfiles (no extension)", () => {
			const result = pathsToTree([{ filename: ".gitignore", size: 5 }]);
			expect(result[".gitignore"].meta?.extension).toBe("gitignore");
		});

		it("handles files with no extension", () => {
			const result = pathsToTree([{ filename: "Makefile", size: 20 }]);
			expect(result["Makefile"].meta?.extension).toBeUndefined();
		});
	});

	describe("duplicate paths", () => {
		it("last entry wins for duplicate file paths", () => {
			const result = pathsToTree([
				{ filename: "src/a.ts", size: 100 },
				{ filename: "src/a.ts", size: 999 },
			]);
			expect(result["src/a.ts"].meta?.size).toBe(999);
		});

		it("does not duplicate children for same folder", () => {
			const result = pathsToTree([
				{ filename: "src/a.ts", size: 100 },
				{ filename: "src/a.ts", size: 200 },
			]);
			expect(result["src"].children).toHaveLength(1);
		});
	});

	describe("sorting: folders before files, alphabetical within groups", () => {
		it("sorts folders before files in children array", () => {
			const result = pathsToTree([
				{ filename: "root/zebra.ts", size: 1 },
				{ filename: "root/alpha/file.ts", size: 1 },
				{ filename: "root/apple.ts", size: 1 },
			]);

			const rootChildren = result["root"].children!;
			expect(rootChildren[0]).toBe("root/alpha");
			expect(rootChildren[1]).toBe("root/apple.ts");
			expect(rootChildren[2]).toBe("root/zebra.ts");
		});

		it("sorts multiple folders alphabetically", () => {
			const result = pathsToTree([
				{ filename: "root/zeta/file.ts", size: 1 },
				{ filename: "root/alpha/file.ts", size: 1 },
				{ filename: "root/beta/file.ts", size: 1 },
			]);

			const rootChildren = result["root"].children!;
			expect(rootChildren[0]).toBe("root/alpha");
			expect(rootChildren[1]).toBe("root/beta");
			expect(rootChildren[2]).toBe("root/zeta");
		});

		it("sorts files alphabetically after folders", () => {
			const result = pathsToTree([
				{ filename: "root/z.ts", size: 1 },
				{ filename: "root/a.ts", size: 1 },
				{ filename: "root/m.ts", size: 1 },
			]);

			const rootChildren = result["root"].children!;
			expect(rootChildren[0]).toBe("root/a.ts");
			expect(rootChildren[1]).toBe("root/m.ts");
			expect(rootChildren[2]).toBe("root/z.ts");
		});

		it("complex mixed sort: folders first, then files, both alphabetical", () => {
			const result = pathsToTree([
				{ filename: "root/zebra.ts", size: 1 },
				{ filename: "root/utils/helper.ts", size: 1 },
				{ filename: "root/alpha.ts", size: 1 },
				{ filename: "root/components/Button.ts", size: 1 },
				{ filename: "root/beta.ts", size: 1 },
			]);

			const rootChildren = result["root"].children!;
			expect(rootChildren).toEqual([
				"root/components",
				"root/utils",
				"root/alpha.ts",
				"root/beta.ts",
				"root/zebra.ts",
			]);
		});
	});

	describe("meta extraction", () => {
		it("extracts extension from filename", () => {
			const result = pathsToTree([
				{ filename: "file.tsx", size: 10 },
				{ filename: "data.json", size: 20 },
				{ filename: "style.css", size: 30 },
			]);

			expect(result["file.tsx"].meta?.extension).toBe("tsx");
			expect(result["data.json"].meta?.extension).toBe("json");
			expect(result["style.css"].meta?.extension).toBe("css");
		});

		it("preserves size in meta", () => {
			const result = pathsToTree([
				{ filename: "big.ts", size: 999999 },
				{ filename: "tiny.ts", size: 0 },
			]);

			expect(result["big.ts"].meta?.size).toBe(999999);
			expect(result["tiny.ts"].meta?.size).toBe(0);
		});
	});

	describe("multi-root structures", () => {
		it("handles multiple root-level folders", () => {
			const result = pathsToTree([
				{ filename: "src/a.ts", size: 10 },
				{ filename: "tests/b.ts", size: 20 },
				{ filename: "docs/c.md", size: 30 },
			]);

			expect(result["src"].parentId).toBeNull();
			expect(result["tests"].parentId).toBeNull();
			expect(result["docs"].parentId).toBeNull();
		});

		it("handles mix of root files and root folders", () => {
			const result = pathsToTree([
				{ filename: "README.md", size: 50 },
				{ filename: "src/utils/a.ts", size: 100 },
				{ filename: "package.json", size: 200 },
			]);

			expect(result["README.md"].parentId).toBeNull();
			expect(result["package.json"].parentId).toBeNull();
			expect(result["src"].parentId).toBeNull();
		});
	});
});
