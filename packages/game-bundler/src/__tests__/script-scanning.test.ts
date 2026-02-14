import { describe, expect, it } from "vitest";
import { compileBundle } from "../compiler";
import { VirtualFileReader } from "../FileReader";

describe("Script Scanning", () => {
	it("should process single script file and populate rawData.scripts module map", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"scripts/game.js",
				'exports.onInit = function() { console.log("init"); };',
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.rawData.scripts).toEqual({
			game: 'exports.onInit = function() { console.log("init"); };',
		});
		expect(result.processedFiles).toContain("scripts/game.js");
	});

	it("should produce SCRIPT_SYNTAX_ERROR when script lacks exports", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			["scripts/game.js", 'console.log("no exports here");'],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("SCRIPT_SYNTAX_ERROR");
		expect(result.errors[0].message).toContain(
			"must contain at least one export",
		);
	});

	it("should handle empty scripts directory", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.scripts).toBeNull();
	});

	it("should concatenate multiple scripts alphabetically", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			["scripts/zebra.js", "exports.zebra = 1;"],
			["scripts/alpha.js", "exports.alpha = 2;"],
			["scripts/middle.js", "exports.middle = 3;"],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.scripts).not.toBeNull();

		const moduleKeys = Object.keys(result.rawData.scripts!);
		expect(moduleKeys).toEqual(["alpha", "middle", "zebra"]);

		expect(result.rawData.scripts).toEqual({
			alpha: "exports.alpha = 2;",
			middle: "exports.middle = 3;",
			zebra: "exports.zebra = 1;",
		});
	});

	it("should emit DUPLICATE_EXPORT warning for conflicting exports", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			["scripts/a.js", "exports.onInit = function() {};"],
			["scripts/b.js", "exports.onInit = function() {};"],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].code).toBe("DUPLICATE_EXPORT");
		expect(result.warnings[0].message).toContain("onInit");
		expect(result.warnings[0].message).toContain("multiple files");
	});

	it("should emit NESTED_SCRIPTS_IGNORED warning for subdirectories", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			["scripts/game.js", "exports.game = 1;"],
			["scripts/nested/ignored.js", "exports.ignored = 2;"],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].code).toBe("NESTED_SCRIPTS_IGNORED");
		expect(result.warnings[0].message).toContain("scripts/nested");
		expect(result.processedFiles).toContain("scripts/game.js");
		expect(result.processedFiles).not.toContain("scripts/nested/ignored.js");
	});

	it("should handle multiple exports in single file", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"scripts/multi.js",
				"exports.onInit = function() {};\nexports.onUpdate = function() {};",
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.scripts).not.toBeNull();
		const allContent = Object.values(result.rawData.scripts!).join("\n");
		expect(allContent).toContain("exports.onInit");
		expect(allContent).toContain("exports.onUpdate");
	});
});
