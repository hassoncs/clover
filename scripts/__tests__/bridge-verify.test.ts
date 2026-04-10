import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { parseGodotHandlers, verifyBridgeContract } from "../bridge-verify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const REGISTRY_PATH = resolve(
	ROOT,
	"packages/godot-bridge/src/generated/bridge-registry.json",
);

function createTempGdDir(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), "bridge-verify-"));
	for (const [name, content] of Object.entries(files)) {
		writeFileSync(join(dir, name), content);
	}
	return dir;
}

describe("bridge-verify", () => {
	describe("parseGodotHandlers", () => {
		it("extracts simple handler with positional args", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_set_position(args: Array) -> void:
	if args.size() < 3: return
	set_position(str(args[0]), float(args[1]), float(args[2]))
`,
			});
			const handlers = parseGodotHandlers(dir);
			expect(handlers).toHaveLength(1);
			expect(handlers[0].snakeName).toBe("set_position");
			expect(handlers[0].argCount).toBe(3);
			expect(handlers[0].argTypes).toEqual(["string", "float", "float"]);
			expect(handlers[0].isJsonBlob).toBe(false);
			expect(handlers[0].isNoArgs).toBe(false);
		});

		it("extracts no-args handler", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_clear_game(_args: Array) -> void: clear_game()
`,
			});
			const handlers = parseGodotHandlers(dir);
			expect(handlers).toHaveLength(1);
			expect(handlers[0].snakeName).toBe("clear_game");
			expect(handlers[0].argCount).toBe(0);
			expect(handlers[0].isNoArgs).toBe(true);
		});

		it("detects JSON blob handler", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_setup_world(args: Array) -> void:
	if args.size() < 1: return
	var world_json = args[0]
	if world_json is String:
		var json = JSON.new()
		if json.parse(world_json) != OK: return
		world_json = json.data
	setup_world(world_json)
`,
			});
			const handlers = parseGodotHandlers(dir);
			expect(handlers).toHaveLength(1);
			expect(handlers[0].isJsonBlob).toBe(true);
		});

		it("extracts typed signature handler args without args-array indexing", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_place_voxel(x: float, y: float, z: float, color: String) -> String:
	return "voxel_1"
`,
			});
			const handlers = parseGodotHandlers(dir);
			expect(handlers).toHaveLength(1);
			expect(handlers[0].snakeName).toBe("place_voxel");
			expect(handlers[0].argCount).toBe(4);
			expect(handlers[0].argTypes).toEqual([
				"float",
				"float",
				"float",
				"string",
			]);
			expect(handlers[0].isNoArgs).toBe(false);
		});

		it("detects alias handler", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_draw_commands(args: Array) -> void:
	if args.size() < 2: return
	draw_commands(str(args[0]), args[1])

func _js_pixel_buffer_draw(args: Array) -> void: _js_draw_commands(args)
`,
			});
			const handlers = parseGodotHandlers(dir);
			const alias = handlers.find((h) => h.snakeName === "pixel_buffer_draw");
			expect(alias).toBeDefined();
			expect(alias!.isAlias).toBe(true);
			expect(alias!.aliasTarget).toBe("draw_commands");
		});

		it("extracts arg count from size check when args not directly accessed", () => {
			const dir = createTempGdDir({
				"Test.gd": `func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	process_input(input_type, x, y)
`,
			});
			const handlers = parseGodotHandlers(dir);
			expect(handlers[0].argCount).toBe(4);
		});
	});

	describe("verifyBridgeContract", () => {
		it("detects arg count mismatch", () => {
			const dir = createTempGdDir({
				"TestModule.gd": `func _js_set_position(args: Array) -> void:
	set_position(str(args[0]), float(args[1]))
`,
			});
			const handlers = parseGodotHandlers(dir);

			const fakeRegistry = {
				methods: [
					{
						tsName: "setPosition",
						snakeName: "set_position",
						wireParams: [
							{
								name: "entityId",
								wireKind: "Primitive",
								optional: false,
								args: [
									{
										name: "entityId",
										type: "string",
										accessor: "entityId",
									},
								],
							},
							{
								name: "x",
								wireKind: "Primitive",
								optional: false,
								args: [{ name: "x", type: "number", accessor: "x" }],
							},
							{
								name: "y",
								wireKind: "Primitive",
								optional: false,
								args: [{ name: "y", type: "number", accessor: "y" }],
							},
						],
						tsOnly: false,
						source: "GodotBridge",
						dispatchTarget: "bridge",
					},
				],
			};

			const tmpRegistry = join(dir, "registry.json");
			writeFileSync(tmpRegistry, JSON.stringify(fakeRegistry));

			const result = verifyBridgeContract(handlers, tmpRegistry);
			expect(result.mismatches.some((m) => m.includes("set_position"))).toBe(
				true,
			);
		});

		it("matches when arg counts agree", () => {
			const dir = createTempGdDir({
				"TestModule.gd": `func _js_set_position(args: Array) -> void:
	set_position(str(args[0]), float(args[1]), float(args[2]))
`,
			});
			const handlers = parseGodotHandlers(dir);

			const fakeRegistry = {
				methods: [
					{
						tsName: "setPosition",
						snakeName: "set_position",
						wireParams: [
							{
								name: "entityId",
								wireKind: "Primitive",
								optional: false,
								args: [
									{
										name: "entityId",
										type: "string",
										accessor: "entityId",
									},
								],
							},
							{
								name: "x",
								wireKind: "Primitive",
								optional: false,
								args: [{ name: "x", type: "number", accessor: "x" }],
							},
							{
								name: "y",
								wireKind: "Primitive",
								optional: false,
								args: [{ name: "y", type: "number", accessor: "y" }],
							},
						],
						tsOnly: false,
						source: "GodotBridge",
						dispatchTarget: "bridge",
					},
				],
			};

			const tmpRegistry = join(dir, "registry.json");
			writeFileSync(tmpRegistry, JSON.stringify(fakeRegistry));

			const result = verifyBridgeContract(handlers, tmpRegistry);
			expect(result.matches.some((m) => m.includes("set_position"))).toBe(true);
			expect(result.mismatches).toHaveLength(0);
		});

		it("reports TS-only methods with no Godot handler", () => {
			const dir = createTempGdDir({
				"TestModule.gd": `func _js_clear_game(_args: Array) -> void: clear_game()
`,
			});
			const handlers = parseGodotHandlers(dir);

			const fakeRegistry = {
				methods: [
					{
						tsName: "clearGame",
						snakeName: "clear_game",
						wireParams: [],
						tsOnly: false,
						source: "GodotBridge",
						dispatchTarget: "bridge",
					},
					{
						tsName: "missingMethod",
						snakeName: "missing_method",
						wireParams: [
							{
								name: "x",
								wireKind: "Primitive",
								optional: false,
								args: [{ name: "x", type: "number", accessor: "x" }],
							},
						],
						tsOnly: false,
						source: "GodotBridge",
						dispatchTarget: "bridge",
					},
				],
			};

			const tmpRegistry = join(dir, "registry.json");
			writeFileSync(tmpRegistry, JSON.stringify(fakeRegistry));

			const result = verifyBridgeContract(handlers, tmpRegistry);
			expect(result.tsOnly.some((m) => m.includes("missing_method"))).toBe(
				true,
			);
		});
	});

	describe("full verification against real codebase", () => {
		it("passes with 0 errors on the real bridge", () => {
			const handlers = parseGodotHandlers(
				resolve(ROOT, "godot_project/scripts"),
			);
			const result = verifyBridgeContract(handlers, REGISTRY_PATH);

			const errors =
				result.mismatches.filter((m) => m.startsWith("❌")).length +
				result.tsOnly.length;
			expect(errors).toBe(0);
			expect(result.matches.length).toBeGreaterThan(90);
		});
	});
});
