import { describe, expect, it } from "vitest";
import { compileBundle } from "../compiler";
import { VirtualFileReader } from "../FileReader";

/**
 * Helper to create a minimal valid bundle structure
 */
function createMinimalBundle(overrides?: {
	manifest?: Record<string, unknown>;
	prefabs?: unknown;
	rules?: unknown;
	scripts?: Record<string, string>;
	assets?: Record<string, unknown>;
	effects?: Record<string, unknown>;
}): Map<string, string> {
	const files = new Map<string, string>();

	// Minimal manifest
	const manifest = overrides?.manifest || {
		name: "test-game",
		version: "1.0.0",
	};
	files.set("manifest.json", JSON.stringify(manifest));

	// Minimal prefabs
	const prefabs = overrides?.prefabs || [{ id: "player", tags: ["player"] }];
	files.set("prefabs/prefabs.json", JSON.stringify(prefabs));

	// Minimal rules
	const rules = overrides?.rules || [];
	files.set("rules/gameplay.json", JSON.stringify(rules));

	// Optional scripts
	if (overrides?.scripts) {
		for (const [filename, content] of Object.entries(overrides.scripts)) {
			files.set(`scripts/${filename}.js`, content);
		}
	}

	// Optional assets
	if (overrides?.assets) {
		files.set("assets.json", JSON.stringify(overrides.assets));
		// Add dummy asset files
		for (const [assetId, assetDef] of Object.entries(overrides.assets)) {
			const def = assetDef as { localPath?: string };
			if (def.localPath) {
				files.set(`assets/${def.localPath}`, "dummy-asset-data");
			}
		}
	}

	if (overrides?.effects) {
		files.set("effects.json", JSON.stringify(overrides.effects));
	}

	return files;
}

describe("Virtual Bundle Integration", () => {
	it("compiles minimal virtual bundle", () => {
		const files = createMinimalBundle();
		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.gameDefinition).toBeDefined();
		expect(result.errors).toHaveLength(0);
		expect(result.gameDefinition?.metadata.id).toBe("test-game");
		expect(result.gameDefinition?.prefabs).toHaveProperty("player");
	});

	it("concatenates multiple script files alphabetically", () => {
		const files = createMinimalBundle({
			scripts: {
				z_last: 'exports.last = function() { return "last"; };',
				a_first: 'exports.first = function() { return "first"; };',
				m_middle: 'exports.middle = function() { return "middle"; };',
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.scripts).not.toBeNull();

		const moduleKeys = Object.keys(result.rawData.scripts!);
		expect(moduleKeys).toEqual(["a_first", "m_middle", "z_last"]);

		const allContent = Object.values(result.rawData.scripts!).join("\n");
		expect(allContent).toContain("exports.first");
		expect(allContent).toContain("exports.middle");
		expect(allContent).toContain("exports.last");
	});

	it("warns on duplicate exports", () => {
		const files = createMinimalBundle({
			scripts: {
				file1: 'exports.onInit = function() { console.log("file1"); };',
				file2: 'exports.onInit = function() { console.log("file2"); };',
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].code).toBe("DUPLICATE_EXPORT");
		expect(result.warnings[0].message).toContain("onInit");
		expect(result.warnings[0].message).toContain("multiple files");
	});

	it("errors on script without exports", () => {
		const files = createMinimalBundle({
			scripts: {
				invalid: 'console.log("no exports here");',
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("SCRIPT_SYNTAX_ERROR");
		expect(result.errors[0].message).toContain(
			"must contain at least one export",
		);
	});

	it("handles virtual bundle with assets", () => {
		const files = createMinimalBundle({
			assets: {
				ball: {
					localPath: "ball.png",
					type: "image",
				},
				background: {
					remoteUrl: "https://example.com/bg.png",
					type: "image",
				},
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.rawData.assets).toHaveProperty("ball");
		expect(result.rawData.assets).toHaveProperty("background");
		expect(result.rawData.assets?.ball.localPath).toBe("ball.png");
		expect(result.rawData.assets?.background.remoteUrl).toBe(
			"https://example.com/bg.png",
		);
	});

	it("loads effects definitions from effects.json", () => {
		const files = createMinimalBundle({
			effects: {
				shaders: {
					bloom: {
						filename: "bloom.frag",
						glsl: "void main() { gl_FragColor = vec4(1.0); }",
					},
					warp: {
						filename: "warp.frag",
						glsl: "void main() { gl_FragColor = vec4(0.5); }",
					},
				},
				graph: {
					passes: ["bloom", "warp"],
				},
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.gameDefinition?.effects?.shaders).toEqual({
			bloom: {
				filename: "bloom.frag",
				glsl: "void main() { gl_FragColor = vec4(1.0); }",
			},
			warp: {
				filename: "warp.frag",
				glsl: "void main() { gl_FragColor = vec4(0.5); }",
			},
		});
	});

	it("produces valid GameDefinition", () => {
		const files = createMinimalBundle({
			manifest: {
				name: "integration-test",
				title: "Integration Test Game",
				version: "2.0.0",
				description: "A test game for integration testing",
				world: {
					gravity: { x: 0, y: 9.8 },
					pixelsPerMeter: 50,
					bounds: { width: 20, height: 12 },
				},
			},
			prefabs: [
				{
					id: "player",
					tags: ["player"],
					sprite: { type: "circle", radius: 0.5 },
				},
				{
					id: "enemy",
					tags: ["enemy"],
					sprite: { type: "rect", width: 1, height: 1 },
				},
			],
			rules: [
				{
					id: "collision-rule",
					trigger: {
						type: "collision",
						entityATag: "player",
						entityBTag: "enemy",
					},
					actions: [{ type: "score", operation: "add", value: 100 }],
				},
			],
			scripts: {
				game: 'exports.onInit = function() { console.log("Game initialized"); };',
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);

		const gameDef = result.gameDefinition!;
		expect(gameDef.metadata.id).toBe("integration-test");
		expect(gameDef.metadata.title).toBe("Integration Test Game");
		expect(gameDef.metadata.version).toBe("2.0.0");
		expect(gameDef.metadata.description).toBe(
			"A test game for integration testing",
		);

		expect(gameDef.world.gravity).toEqual({ x: 0, y: 9.8 });
		expect(gameDef.world.pixelsPerMeter).toBe(50);
		expect(gameDef.world.bounds).toEqual({ width: 20, height: 12 });

		expect(Object.keys(gameDef.prefabs)).toHaveLength(2);
		expect(gameDef.prefabs.player).toBeDefined();
		expect(gameDef.prefabs.enemy).toBeDefined();

		expect(result.rawData.scripts).not.toBeNull();
		expect(result.rawData.scripts!.game).toContain("exports.onInit");
	});

	it("handles complex nested directory structure", () => {
		const files = new Map<string, string>();

		// Manifest
		files.set(
			"manifest.json",
			JSON.stringify({ name: "nested-test", version: "1.0.0" }),
		);

		// Prefabs in subdirectories
		files.set(
			"prefabs/player/player.json",
			JSON.stringify({ id: "player", tags: ["player"] }),
		);
		files.set(
			"prefabs/enemies/basic.json",
			JSON.stringify({ id: "basic-enemy", tags: ["enemy"] }),
		);
		files.set(
			"prefabs/enemies/boss.json",
			JSON.stringify({ id: "boss-enemy", tags: ["enemy", "boss"] }),
		);

		// Rules in subdirectories
		files.set(
			"rules/collision/player-enemy.json",
			JSON.stringify([
				{
					id: "player-hit",
					trigger: {
						type: "collision",
						entityATag: "player",
						entityBTag: "enemy",
					},
				},
			]),
		);
		files.set(
			"rules/scoring/points.json",
			JSON.stringify([
				{ id: "score-rule", trigger: { type: "timer", interval: 1 } },
			]),
		);

		// Scripts
		files.set("scripts/init.js", "exports.onInit = function() {};");
		files.set("scripts/update.js", "exports.onUpdate = function() {};");

		// Assets
		files.set(
			"assets.json",
			JSON.stringify({
				player: { localPath: "sprites/player.png", type: "image" },
				enemy: { localPath: "sprites/enemy.png", type: "image" },
			}),
		);
		files.set("assets/sprites/player.png", "player-data");
		files.set("assets/sprites/enemy.png", "enemy-data");

		const fileReader = new VirtualFileReader("/virtual/nested", files);
		const result = compileBundle("/virtual/nested", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);

		// Verify all prefabs loaded
		expect(Object.keys(result.gameDefinition!.prefabs)).toHaveLength(3);
		expect(result.gameDefinition!.prefabs.player).toBeDefined();
		expect(result.gameDefinition!.prefabs["basic-enemy"]).toBeDefined();
		expect(result.gameDefinition!.prefabs["boss-enemy"]).toBeDefined();

		// Verify scripts loaded as modules
		expect(result.rawData.scripts).not.toBeNull();
		expect(result.rawData.scripts!.init).toContain("exports.onInit");
		expect(result.rawData.scripts!.update).toContain("exports.onUpdate");

		// Verify assets loaded
		expect(result.rawData.assets?.player.localPath).toBe("sprites/player.png");
		expect(result.rawData.assets?.enemy.localPath).toBe("sprites/enemy.png");
	});

	it("handles missing local asset files", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));
		files.set(
			"assets.json",
			JSON.stringify({
				missing: {
					localPath: "nonexistent.png",
					type: "image",
				},
			}),
		);

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("MISSING_LOCAL_ASSET");
		expect(result.errors[0].message).toContain("nonexistent.png");
	});

	it("validates prefab references in entities", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);
		files.set(
			"entities/entities.json",
			JSON.stringify([
				{
					id: "player1",
					prefab: "player",
					transform: { x: 0, y: 0, angle: 0 },
				},
				{
					id: "enemy1",
					prefab: "nonexistent",
					transform: { x: 5, y: 5, angle: 0 },
				},
			]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("UNKNOWN_PREFAB");
		expect(result.errors[0].message).toContain("nonexistent");
	});

	it("handles malformed JSON gracefully", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));
		files.set("prefabs/broken.json", "{ invalid json syntax }");

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		const jsonError = result.errors.find((e) => e.code === "INVALID_JSON");
		expect(jsonError).toBeDefined();
		expect(jsonError?.message).toContain("Invalid JSON");
		expect(jsonError?.file).toContain("prefabs/broken.json");
	});

	it("resolves assets with both remoteUrl and localPath", () => {
		const files = createMinimalBundle({
			assets: {
				"player-sprite": {
					type: "image",
					remoteUrl: "https://cdn.example.com/player.png",
					localPath: "player.png",
				},
			},
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);

		const asset = result.rawData.assets?.["player-sprite"];
		expect(asset).toBeDefined();
		expect(asset?.remoteUrl).toBe("https://cdn.example.com/player.png");
		expect(asset?.localPath).toBe("player.png");
	});

	it("validates asset references in prefabs", () => {
		const files = createMinimalBundle({
			prefabs: [
				{
					id: "player",
					tags: ["player"],
					sprite: {
						type: "image",
						asset: "unknown-asset",
					},
				},
			],
		});

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("UNKNOWN_ASSET");
		expect(result.errors[0].message).toContain("unknown-asset");
	});

	it("resolves constant references in prefabs", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"constants.json",
			JSON.stringify({
				PLAYER_SPEED: 5,
				GRAVITY: 9.8,
			}),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([
				{
					id: "player",
					tags: ["player"],
					speed: { const: "PLAYER_SPEED" },
				},
			]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);

		const playerTemplate = result.gameDefinition?.prefabs.player as any;
		expect(playerTemplate).toBeDefined();
		expect(playerTemplate.speed).toBe(5);
	});

	it("errors on unknown constant reference", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([
				{
					id: "player",
					tags: ["player"],
					speed: { const: "UNKNOWN_CONSTANT" },
				},
			]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("UNKNOWN_CONSTANT");
		expect(result.errors[0].message).toContain("UNKNOWN_CONSTANT");
	});

	it("errors on duplicate entity IDs", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);
		files.set(
			"entities/entities.json",
			JSON.stringify([
				{
					id: "player1",
					prefab: "player",
					transform: { x: 0, y: 0, angle: 0 },
				},
				{
					id: "player1",
					prefab: "player",
					transform: { x: 5, y: 5, angle: 0 },
				},
			]),
		);
		files.set("rules/gameplay.json", JSON.stringify([]));

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("DUPLICATE_ID");
		expect(result.errors[0].message).toContain("player1");
		expect(result.errors[0].message).toContain("entities");
	});

	it("ignores rules directory (legacy, script-first migration)", () => {
		const files = new Map<string, string>();
		files.set(
			"manifest.json",
			JSON.stringify({ name: "test", version: "1.0.0" }),
		);
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);
		files.set(
			"rules/gameplay.json",
			JSON.stringify([
				{ id: "rule1", trigger: { type: "game_started" }, actions: [] },
				{ id: "rule1", trigger: { type: "game_started" }, actions: [] },
			]),
		);

		const fileReader = new VirtualFileReader("/virtual/test", files);
		const result = compileBundle("/virtual/test", { fileReader });

		// Rules are no longer processed — compiler succeeds regardless of rule content
		expect(result.success).toBe(true);
	});

	it("handles bundle without manifest", () => {
		const files = new Map<string, string>();
		files.set(
			"prefabs/prefabs.json",
			JSON.stringify([{ id: "player", tags: ["player"] }]),
		);

		const fileReader = new VirtualFileReader("/virtual/no-manifest", files);
		const result = compileBundle("/virtual/no-manifest", { fileReader });

		expect(result.success).toBe(false);
		expect(
			result.errors.some(
				(e) => e.code === "MISSING_FILE" && e.message.includes("manifest.json"),
			),
		).toBe(true);
	});

	it("processes all file types correctly", () => {
		const files = createMinimalBundle({
			manifest: {
				name: "complete-test",
				version: "1.0.0",
				title: "Complete Test",
			},
			prefabs: [
				{ id: "player", tags: ["player"] },
				{ id: "enemy", tags: ["enemy"] },
			],
			rules: [
				{
					id: "collision-rule",
					trigger: {
						type: "collision",
						entityATag: "player",
						entityBTag: "enemy",
					},
					actions: [{ type: "score", operation: "add", value: 100 }],
				},
			],
			scripts: {
				init: 'exports.onInit = function() { console.log("init"); };',
				update:
					'exports.onUpdate = function(dt) { console.log("update", dt); };',
			},
			assets: {
				background: {
					type: "image",
					remoteUrl: "https://example.com/bg.png",
				},
			},
		});

		const fileReader = new VirtualFileReader("/virtual/complete", files);
		const result = compileBundle("/virtual/complete", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.processedFiles).toContain("manifest.json");
		expect(result.processedFiles).toContain("prefabs/prefabs.json");
		expect(result.processedFiles).toContain("rules/gameplay.json");
		expect(result.processedFiles).toContain("scripts/init.js");
		expect(result.processedFiles).toContain("scripts/update.js");
		expect(result.processedFiles).toContain("assets.json");

		expect(result.gameDefinition?.metadata.id).toBe("complete-test");
		expect(Object.keys(result.gameDefinition!.prefabs)).toHaveLength(2);
		expect(result.rawData.scripts).not.toBeNull();
		expect(result.rawData.scripts!.init).toContain("exports.onInit");
		expect(result.rawData.scripts!.update).toContain("exports.onUpdate");
		expect(result.rawData.assets?.background).toBeDefined();
	});
});
