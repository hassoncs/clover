import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { compileBundle, compileSectioned } from "../compiler";
import { NodeFileReader } from "../FileReader";

const BUNDLE_PATH = path.resolve(
	__dirname,
	"../../../../r2/games/ballSort/bundle",
);

describe("Ball Sort Migration", () => {
	const fileReader = new NodeFileReader();

	it("compileBundle succeeds with no errors", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });

		expect(result.errors).toEqual([]);
		expect(result.success).toBe(true);
		expect(result.gameDefinition).not.toBeNull();
	});

	it("produces correct metadata from manifest", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });
		const def = result.gameDefinition!;

		expect(def.metadata.id).toBe("ballSort");
		expect(def.metadata.title).toBe("Ball Sort");
		expect(def.metadata.description).toBe(
			"Sort colored balls into tubes - each tube should contain only one color",
		);
		expect(def.metadata.version).toBe("2.0.0");
	});

	it("produces correct world config", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });
		const def = result.gameDefinition!;

		expect(def.world.gravity).toEqual({ x: 0, y: 0 });
		expect(def.world.pixelsPerMeter).toBe(50);
		expect(def.world.bounds).toEqual({ width: 14.4, height: 25.6 });
	});

	it("has all 12 prefabs", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });
		const def = result.gameDefinition!;

		const prefabKeys = Object.keys(def.prefabs);
		expect(prefabKeys).toHaveLength(12);

		expect(def.prefabs).toHaveProperty("background");
		expect(def.prefabs).toHaveProperty("tube");
		expect(def.prefabs).toHaveProperty("tubeHoverHighlight");
		expect(def.prefabs).toHaveProperty("heldBallIndicator");

		for (let i = 0; i <= 7; i++) {
			expect(def.prefabs).toHaveProperty(`ball${i}`);
		}
	});

	it("has all 2 entities", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });
		const def = result.gameDefinition!;

		expect(def.entities).toHaveLength(2);
		expect(def.entities[0].id).toBe("background");
		expect(def.entities[1].id).toBe("tube-hover-highlight");
	});

	it("has script modules with expected exports", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });
		const scripts = result.rawData.scripts;

		expect(scripts).not.toBeNull();
		const moduleNames = Object.keys(scripts!);
		expect(moduleNames.length).toBeGreaterThan(0);

		const allScriptContent = Object.values(scripts!).join("\n");
		expect(allScriptContent).toContain("exports.generateLevel");
		expect(allScriptContent).toContain("exports.nextLevel");
		expect(allScriptContent).toContain("exports.replayLevel");
		expect(allScriptContent).toContain("exports.onStart");
	});

	it("compileSectioned succeeds", () => {
		const result = compileSectioned(BUNDLE_PATH, fileReader);

		expect(result.errors).toEqual([]);
		expect(result.success).toBe(true);
		expect(result.bundle).not.toBeNull();
	});

	it("compileSectioned produces valid sections", () => {
		const result = compileSectioned(BUNDLE_PATH, fileReader);
		const sections = result.bundle!.sections;

		expect(sections.world).toBeDefined();
		expect(sections.world.gravity).toEqual({ x: 0, y: 0 });

		expect(Object.keys(sections.prefabs)).toHaveLength(12);
		expect(sections.entities).toHaveLength(2);
		expect(sections.modules).toBeDefined();
		expect(Object.keys(sections.modules!).length).toBeGreaterThan(0);
	});

	it("compileSectioned produces a content hash", () => {
		const result = compileSectioned(BUNDLE_PATH, fileReader);

		expect(result.bundle!.contentHash).toBeDefined();
		expect(result.bundle!.contentHash).toMatch(/^[a-f0-9]{64}$/);
		expect(result.bundle!.version).toBe("1.0");
	});

	it("processes all expected files", () => {
		const result = compileBundle(BUNDLE_PATH, { fileReader });

		expect(result.processedFiles).toContain("manifest.json");
		expect(result.processedFiles.some((f) => f.startsWith("prefabs/"))).toBe(
			true,
		);
		expect(result.processedFiles.some((f) => f.startsWith("entities/"))).toBe(
			true,
		);
		expect(result.processedFiles.some((f) => f.startsWith("rules/"))).toBe(
			true,
		);
		expect(result.processedFiles.some((f) => f.startsWith("scripts/"))).toBe(
			true,
		);
	});
});
