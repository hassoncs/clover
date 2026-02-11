import { describe, expect, it } from "vitest";
import {
	extractDepsForPath,
	extractEffectGraphDeps,
	extractEntityDeps,
	extractPrefabDeps,
} from "../dependency-extractors";
import { WorkspaceModuleGraph } from "../module-graph";
import { inferTagHints } from "../tag-inference";

describe("WorkspaceModuleGraph", () => {
	it("shader change propagates to effects tag via importer", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode(
			"shaders/crt.gdshader",
			inferTagHints("shaders/crt.gdshader"),
		);
		graph.upsertNode(
			"effects/screen.json",
			inferTagHints("effects/screen.json"),
		);
		graph.setDeps("effects/screen.json", ["shaders/crt.gdshader"]);

		const result = graph.invalidate(["shaders/crt.gdshader"]);

		expect(result.changedPaths).toEqual(["shaders/crt.gdshader"]);
		expect(result.affectedPaths).toContain("effects/screen.json");
		expect(result.affectedTags).toContain("effects");
	});

	it("asset change propagates through prefab to prefabs tag", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode("assets/player.png", inferTagHints("assets/player.png"));
		graph.upsertNode(
			"prefabs/player.json",
			inferTagHints("prefabs/player.json"),
		);
		graph.setDeps("prefabs/player.json", ["assets/player.png"]);

		const result = graph.invalidate(["assets/player.png"]);

		expect(result.affectedPaths).toContain("prefabs/player.json");
		expect(result.affectedTags).toContain("assets");
		expect(result.affectedTags).toContain("prefabs");
	});

	it("multiple changes produce union of affected tags", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode("world.json", inferTagHints("world.json"));
		graph.upsertNode("rules.json", inferTagHints("rules.json"));

		const result = graph.invalidate(["world.json", "rules.json"]);

		expect(result.affectedTags).toContain("world");
		expect(result.affectedTags).toContain("rules");
	});

	it("handles cycles without infinite loop", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode("prefabs/a.json", ["prefabs"]);
		graph.upsertNode("prefabs/b.json", ["prefabs"]);
		graph.setDeps("prefabs/a.json", ["prefabs/b.json"]);
		graph.setDeps("prefabs/b.json", ["prefabs/a.json"]);

		const result = graph.invalidate(["prefabs/a.json"]);

		expect(result.changedPaths).toEqual(["prefabs/a.json"]);
		expect(result.affectedPaths).toContain("prefabs/b.json");
		expect(result.affectedTags).toContain("prefabs");
	});

	it("missing refs are still tracked as nodes", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode("prefabs/player.json", ["prefabs"]);
		graph.setDeps("prefabs/player.json", ["assets/missing.png"]);

		const missingNode = graph.getNode("assets/missing.png");
		expect(missingNode).toBeDefined();
		expect(missingNode!.importers.has("prefabs/player.json")).toBe(true);

		const result = graph.invalidate(["assets/missing.png"]);
		expect(result.affectedPaths).toContain("prefabs/player.json");
	});

	it("unknown paths infer all tags", () => {
		const tags = inferTagHints("some/random/file.txt");
		expect(tags).toHaveLength(7);
		expect(tags).toContain("world");
		expect(tags).toContain("effects");
	});

	it("setDeps cleans up old reverse edges", () => {
		const graph = new WorkspaceModuleGraph();
		graph.upsertNode("prefabs/a.json", ["prefabs"]);
		graph.upsertNode("assets/old.png", ["assets"]);
		graph.upsertNode("assets/new.png", ["assets"]);

		graph.setDeps("prefabs/a.json", ["assets/old.png"]);
		expect(
			graph.getNode("assets/old.png")!.importers.has("prefabs/a.json"),
		).toBe(true);

		graph.setDeps("prefabs/a.json", ["assets/new.png"]);
		expect(
			graph.getNode("assets/old.png")!.importers.has("prefabs/a.json"),
		).toBe(false);
		expect(
			graph.getNode("assets/new.png")!.importers.has("prefabs/a.json"),
		).toBe(true);
	});
});

describe("inferTagHints", () => {
	it.each([
		["slopcade.json", 7],
		["world.json", 1],
		["entities.json", 1],
		["rules.json", 1],
		["prefabs/player.json", 1],
		["scripts/main.js", 1],
		["effects/screen.json", 1],
		["shaders/crt.gdshader", 1],
		["assets/player.png", 1],
		["scenes/main/entities.json", 1],
		["scenes/main/rules.json", 1],
	])("infers correct tag count for %s", (path, expectedCount) => {
		expect(inferTagHints(path)).toHaveLength(expectedCount);
	});
});

describe("dependency extractors", () => {
	it("extracts prefab child deps", () => {
		const content = JSON.stringify({
			id: "parent",
			children: [{ prefab: "child1" }, { prefab: "child2" }],
		});
		expect(extractPrefabDeps(content)).toEqual([
			"prefabs/child1.json",
			"prefabs/child2.json",
		]);
	});

	it("extracts prefab visual url dep", () => {
		const content = JSON.stringify({
			id: "player",
			visual: { type: "sprite", url: "assets/player.png" },
		});
		expect(extractPrefabDeps(content)).toEqual(["assets/player.png"]);
	});

	it("extracts entity prefab refs", () => {
		const content = JSON.stringify([
			{ id: "e1", prefab: "player" },
			{ id: "e2", prefab: "enemy" },
			{ id: "e3" },
		]);
		expect(extractEntityDeps(content)).toEqual([
			"prefabs/player.json",
			"prefabs/enemy.json",
		]);
	});

	it("extracts effect graph custom shader refs", () => {
		const content = JSON.stringify({
			nodes: [
				{ type: "custom:shaders/crt.gdshader" },
				{ type: "builtin:blur" },
				{ type: "custom:shaders/vignette.gdshader" },
			],
			connections: [],
		});
		expect(extractEffectGraphDeps(content)).toEqual([
			"shaders/crt.gdshader",
			"shaders/vignette.gdshader",
		]);
	});

	it("extractDepsForPath routes to correct extractor", () => {
		const prefabContent = JSON.stringify({
			id: "p",
			children: [{ prefab: "x" }],
		});
		expect(extractDepsForPath("prefabs/p.json", prefabContent)).toEqual([
			"prefabs/x.json",
		]);

		expect(extractDepsForPath("world.json", "{}")).toEqual([]);
		expect(extractDepsForPath("unknown.txt", "")).toEqual([]);
	});

	it("handles malformed JSON gracefully", () => {
		expect(extractPrefabDeps("not json")).toEqual([]);
		expect(extractEntityDeps("{")).toEqual([]);
		expect(extractEffectGraphDeps("")).toEqual([]);
	});
});
