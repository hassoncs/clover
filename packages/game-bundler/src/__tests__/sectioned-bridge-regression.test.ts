import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const GAMES_DIR = path.resolve(__dirname, "../../../../r2/games");

function getGameDirs(): string[] {
	return fs
		.readdirSync(GAMES_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.filter((d) =>
			fs.existsSync(path.join(GAMES_DIR, d.name, "definition.json")),
		)
		.map((d) => d.name)
		.sort();
}

const gameDirs = getGameDirs();

describe("Sectioned Bridge Regression - All Games", () => {
	it("discovers at least 10 games", () => {
		expect(gameDirs.length).toBeGreaterThanOrEqual(10);
	});

	describe.each(gameDirs)("%s", (gameName) => {
		const defPath = path.join(GAMES_DIR, gameName, "definition.json");

		function loadDefinition(): Record<string, unknown> {
			const raw = fs.readFileSync(defPath, "utf-8");
			return JSON.parse(raw) as Record<string, unknown>;
		}

		it("parses as valid JSON", () => {
			expect(() => loadDefinition()).not.toThrow();
		});

		it("has valid world section with gravity and pixelsPerMeter", () => {
			const def = loadDefinition();
			const world = def.world as Record<string, unknown>;
			expect(world).toBeDefined();

			const gravity = world.gravity as Record<string, unknown>;
			expect(gravity).toBeDefined();
			expect(typeof gravity.x).toBe("number");
			expect(typeof gravity.y).toBe("number");

			expect(typeof world.pixelsPerMeter).toBe("number");
		});

		it("has world bounds", () => {
			const def = loadDefinition();
			const world = def.world as Record<string, unknown>;
			const bounds = world.bounds as Record<string, unknown>;
			expect(bounds).toBeDefined();
			expect(typeof bounds.width).toBe("number");
			expect(typeof bounds.height).toBe("number");
		});

		it("has prefabs object with at least 1 prefab", () => {
			const def = loadDefinition();
			const prefabs = def.prefabs as Record<string, unknown>;
			expect(prefabs).toBeDefined();
			expect(typeof prefabs).toBe("object");
			expect(Object.keys(prefabs).length).toBeGreaterThanOrEqual(1);
		});

		it("has entities array", () => {
			const def = loadDefinition();
			expect(Array.isArray(def.entities)).toBe(true);
		});

		it("has rules array or undefined", () => {
			const def = loadDefinition();
			if (def.rules !== undefined) {
				expect(Array.isArray(def.rules)).toBe(true);
			}
		});

		it("world section can be extracted for bridge setupWorld", () => {
			const def = loadDefinition();
			const world = def.world as Record<string, unknown>;

			const worldSection = {
				gravity: world.gravity,
				pixelsPerMeter: world.pixelsPerMeter,
				bounds: world.bounds,
			};

			expect(worldSection.gravity).toBeDefined();
			expect(worldSection.gravity).not.toBeNull();
			expect(worldSection.pixelsPerMeter).toBeDefined();
			expect(worldSection.pixelsPerMeter).not.toBeNull();
			expect(worldSection.bounds).toBeDefined();
			expect(worldSection.bounds).not.toBeNull();
		});

		it("prefabs section can be extracted for bridge registerPrefabs", () => {
			const def = loadDefinition();
			const prefabsSection = def.prefabs as Record<string, unknown>;

			expect(prefabsSection).toBeDefined();
			expect(prefabsSection).not.toBeNull();
			expect(typeof prefabsSection).toBe("object");

			for (const [key, prefab] of Object.entries(prefabsSection)) {
				expect(typeof key).toBe("string");
				expect(prefab).toBeDefined();
				expect(prefab).not.toBeNull();
			}
		});

		it("entities section can be extracted for bridge loadEntities", () => {
			const def = loadDefinition();
			const entitiesSection = def.entities as unknown[];

			expect(entitiesSection).toBeDefined();
			expect(entitiesSection).not.toBeNull();
			expect(Array.isArray(entitiesSection)).toBe(true);
		});
	});
});
