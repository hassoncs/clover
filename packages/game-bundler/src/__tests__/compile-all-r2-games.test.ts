import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { compileBundle } from "../compiler";
import { NodeFileReader } from "../FileReader";

const GAMES_DIR = path.resolve(__dirname, "../../../../r2/games");

function getBundleGameDirs(): string[] {
	return fs
		.readdirSync(GAMES_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.filter((d) => fs.existsSync(path.join(GAMES_DIR, d.name, "manifest.json")))
		.map((d) => d.name)
		.sort();
}

const gameDirs = getBundleGameDirs();
const fileReader = new NodeFileReader();

describe("Compile All R2 Games", () => {
	it("discovers at least 20 bundle-format games", () => {
		expect(gameDirs.length).toBeGreaterThanOrEqual(20);
	});

	describe.each(gameDirs)("%s", (gameName) => {
		const gamePath = path.join(GAMES_DIR, gameName);

		it("compiles with no errors", () => {
			const result = compileBundle(gamePath, { fileReader });
			expect(result.errors).toEqual([]);
			expect(result.success).toBe(true);
			expect(result.gameDefinition).not.toBeNull();
		});

		it("has metadata with title", () => {
			const result = compileBundle(gamePath, { fileReader });
			const def = result.gameDefinition!;
			expect(def.metadata).toBeDefined();
			expect(def.metadata.title).toBeTruthy();
		});

		it("has modules if scripts/ directory exists", () => {
			const scriptsDir = path.join(gamePath, "scripts");
			const hasScripts =
				fs.existsSync(scriptsDir) &&
				fs.readdirSync(scriptsDir).some((f) => f.endsWith(".js"));

			const result = compileBundle(gamePath, { fileReader });
			const def = result.gameDefinition!;

			if (hasScripts) {
				expect(def.modules).toBeDefined();
				expect(Object.keys(def.modules!).length).toBeGreaterThan(0);
			}
		});
	});
});
