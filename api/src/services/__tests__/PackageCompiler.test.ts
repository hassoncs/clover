import type { TagGroup } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	BuildArtifactWriter,
	WriteBuildResult,
} from "../BuildArtifactWriter";
import type {
	WorkspaceFile,
	WorkspaceReader,
	WorkspaceReadResult,
} from "../GitWorkspaceReader";
import {
	buildTagPayloads,
	contentHash,
	PackageCompiler,
	parseWorkspace,
} from "../PackageCompiler";

function createMockReader(
	files: WorkspaceFile[],
	errors: string[] = [],
): WorkspaceReader {
	return {
		listFiles: vi.fn().mockResolvedValue(files.map((f) => f.path)),
		readFile: vi.fn().mockImplementation((_gameId: string, path: string) => {
			const file = files.find((f) => f.path === path);
			return Promise.resolve(file?.content ?? null);
		}),
		readAllFiles: vi
			.fn()
			.mockResolvedValue({ files, errors } satisfies WorkspaceReadResult),
	} as unknown as WorkspaceReader;
}

function createMockWriter(): BuildArtifactWriter & {
	writeArtifact: ReturnType<typeof vi.fn>;
	writeManifest: ReturnType<typeof vi.fn>;
	writeBuild: ReturnType<typeof vi.fn>;
} {
	return {
		writeArtifact: vi.fn().mockResolvedValue("mock-key"),
		writeManifest: vi.fn().mockResolvedValue("mock-manifest-key"),
		writeBuild: vi.fn().mockResolvedValue({
			manifestKey: "mock-manifest-key",
			artifactKeys: ["k1", "k2"],
		} satisfies WriteBuildResult),
	} as unknown as BuildArtifactWriter & {
		writeArtifact: ReturnType<typeof vi.fn>;
		writeManifest: ReturnType<typeof vi.fn>;
		writeBuild: ReturnType<typeof vi.fn>;
	};
}

const MINIMAL_WORKSPACE: WorkspaceFile[] = [
	{
		path: "slopcade.json",
		content: JSON.stringify({
			id: "test-game",
			name: "Test Game",
			version: "1.0.0",
		}),
	},
	{
		path: "world.json",
		content: JSON.stringify({
			gravity: { x: 0, y: 9.8 },
			pixelsPerMeter: 50,
		}),
	},
	{
		path: "entities.json",
		content: JSON.stringify([
			{
				id: "ball",
				name: "Ball",
				prefab: "ball-prefab",
				transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
			},
		]),
	},
	{
		path: "prefabs/ball-prefab.json",
		content: JSON.stringify({ id: "ball-prefab", name: "Ball Prefab" }),
	},
	{
		path: "scripts/main.js",
		content: "exports.onTick = function(dt) { /* game loop */ };",
	},
	{
		path: "assets.json",
		content: JSON.stringify({
			"ball-sprite": { url: "https://example.com/ball.png" },
		}),
	},
];

describe("PackageCompiler", () => {
	let writer: ReturnType<typeof createMockWriter>;

	beforeEach(() => {
		writer = createMockWriter();
	});

	describe("compile", () => {
		it("compiles a minimal workspace successfully", async () => {
			const reader = createMockReader(MINIMAL_WORKSPACE);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("test-game");

			expect(result.success).toBe(true);
			expect(result.buildId).toBeTruthy();
			expect(result.manifest.packageManifest.id).toBe("test-game");
			expect(result.manifest.packageManifest.name).toBe("Test Game");
			expect(result.manifest.artifacts).toHaveLength(5);
			expect(result.processedFiles).toContain("slopcade.json");
			expect(result.processedFiles).toContain("world.json");
			expect(result.processedFiles).toContain("entities.json");
			expect(result.processedFiles).toContain("prefabs/ball-prefab.json");
			expect(result.processedFiles).toContain("scripts/main.js");
			expect(result.processedFiles).toContain("assets.json");
		});

		it("writes all tag group artifacts to R2", async () => {
			const reader = createMockReader(MINIMAL_WORKSPACE);
			const compiler = new PackageCompiler(reader, writer);

			await compiler.compile("test-game");

			expect(writer.writeBuild).toHaveBeenCalledTimes(1);
			const [gameId, buildId, manifest, artifacts] =
				writer.writeBuild.mock.calls[0];
			expect(gameId).toBe("test-game");
			expect(buildId).toBeTruthy();
			expect(manifest.artifacts).toHaveLength(5);

			const tags = artifacts.map((a: { tag: TagGroup }) => a.tag);
			expect(tags).toContain("world");
			expect(tags).toContain("prefabs");
			expect(tags).toContain("entities");
			expect(tags).toContain("scripts");
			expect(tags).toContain("assets");
		});

		it("returns error when no workspace files exist", async () => {
			const reader = createMockReader([]);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("empty-game");

			expect(result.success).toBe(false);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					severity: "error",
					message: expect.stringContaining("No workspace files found"),
				}),
			);
		});

		it("handles missing manifest gracefully with defaults", async () => {
			const files: WorkspaceFile[] = [
				{ path: "script.js", content: "exports.onTick = function() {};" },
			];
			const reader = createMockReader(files);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("no-manifest-game");

			expect(result.success).toBe(true);
			expect(result.manifest.packageManifest.id).toBe("no-manifest-game");
			expect(result.manifest.packageManifest.version).toBe("0.0.0");
		});

		it("reports JSON parse errors as diagnostics", async () => {
			const files: WorkspaceFile[] = [
				{ path: "slopcade.json", content: "{ invalid json }" },
				{ path: "script.js", content: "exports.onTick = function() {};" },
			];
			const reader = createMockReader(files);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("bad-json-game");

			expect(result.success).toBe(false);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					severity: "error",
					message: expect.stringContaining("Invalid JSON"),
					file: "slopcade.json",
				}),
			);
		});

		it("reports R2 read errors as diagnostics", async () => {
			const reader = createMockReader(MINIMAL_WORKSPACE, [
				"Failed to read some-file.json: timeout",
			]);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("test-game");

			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					severity: "error",
					message: expect.stringContaining("Failed to read some-file.json"),
				}),
			);
		});

		it("reports write failures as diagnostics", async () => {
			const reader = createMockReader(MINIMAL_WORKSPACE);
			writer.writeBuild.mockRejectedValue(new Error("R2 write failed"));
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("test-game");

			expect(result.success).toBe(false);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					severity: "error",
					message: expect.stringContaining("Failed to write build artifacts"),
				}),
			);
		});

		it("includes content hashes in artifacts", async () => {
			const reader = createMockReader(MINIMAL_WORKSPACE);
			const compiler = new PackageCompiler(reader, writer);

			const result = await compiler.compile("test-game");

			for (const artifact of result.manifest.artifacts) {
				expect(artifact.hash).toBeTruthy();
				expect(artifact.hash.length).toBeGreaterThan(0);
				expect(artifact.sizeBytes).toBeGreaterThan(0);
			}
		});
	});

	describe("parseWorkspace", () => {
		it("parses all workspace file types", () => {
			const parsed = parseWorkspace(MINIMAL_WORKSPACE);

			expect(parsed.manifest).toBeTruthy();
			expect(parsed.manifest?.id).toBe("test-game");
			expect(parsed.world).toBeTruthy();
			expect(parsed.world?.world.gravity).toEqual({ x: 0, y: 9.8 });
			expect(parsed.entities).toHaveLength(1);
			expect(Object.keys(parsed.prefabs)).toContain("ball-prefab");
			expect(Object.values(parsed.scriptModules).join("")).toContain("onTick");
			expect(parsed.assetUrls["ball-sprite"]).toBe(
				"https://example.com/ball.png",
			);
		});

		it("handles script.js as single entry point", () => {
			const files: WorkspaceFile[] = [
				{
					path: "script.js",
					content: "exports.onTick = function() { return 1; };",
				},
			];
			const parsed = parseWorkspace(files);

			expect(parsed.scriptModules["main"]).toContain("onTick");
			expect(parsed.scriptModules["main"]).toContain("return 1");
			expect(parsed.scriptEntrypoint).toBe("main");
		});

		it("produces module-map with sorted keys from multiple script files", () => {
			const files: WorkspaceFile[] = [
				{
					path: "scripts/b-utils.js",
					content: "exports.helper = function() {};",
				},
				{
					path: "scripts/a-main.js",
					content: "exports.onTick = function() {};",
				},
			];
			const parsed = parseWorkspace(files);

			const keys = Object.keys(parsed.scriptModules);
			expect(keys).toEqual(["a-main", "b-utils"]);
			expect(parsed.scriptEntrypoint).toBe("a-main");
		});

		it("handles multiple prefab files", () => {
			const files: WorkspaceFile[] = [
				{
					path: "prefabs/ball.json",
					content: JSON.stringify({ id: "ball", name: "Ball" }),
				},
				{
					path: "prefabs/wall.json",
					content: JSON.stringify({ id: "wall", name: "Wall" }),
				},
			];
			const parsed = parseWorkspace(files);

			expect(Object.keys(parsed.prefabs)).toHaveLength(2);
			expect(parsed.prefabs["ball"]).toBeTruthy();
			expect(parsed.prefabs["wall"]).toBeTruthy();
		});

		it("handles prefab arrays in a single file", () => {
			const files: WorkspaceFile[] = [
				{
					path: "prefabs/all.json",
					content: JSON.stringify([
						{ id: "a", name: "A" },
						{ id: "b", name: "B" },
					]),
				},
			];
			const parsed = parseWorkspace(files);

			expect(Object.keys(parsed.prefabs)).toHaveLength(2);
		});

		it("warns on duplicate prefab IDs", () => {
			const files: WorkspaceFile[] = [
				{
					path: "prefabs/a.json",
					content: JSON.stringify({ id: "dup", name: "First" }),
				},
				{
					path: "prefabs/b.json",
					content: JSON.stringify({ id: "dup", name: "Second" }),
				},
			];
			const parsed = parseWorkspace(files);

			expect(parsed.diagnostics).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					message: expect.stringContaining("Duplicate prefab ID"),
				}),
			);
		});

		it("provides default world config when world.json is missing", () => {
			const files: WorkspaceFile[] = [
				{ path: "script.js", content: "exports.onTick = function() {};" },
			];
			const parsed = parseWorkspace(files);
			const payloads = buildTagPayloads(parsed);
			const worldPayload = payloads.get("world") as {
				world: Record<string, unknown>;
			};

			expect(worldPayload.world.gravity).toEqual({ x: 0, y: 10 });
			expect(worldPayload.world.pixelsPerMeter).toBe(50);
		});
	});

	describe("contentHash", () => {
		it("produces consistent hashes for same input", () => {
			const data = { foo: "bar", num: 42 };
			expect(contentHash(data)).toBe(contentHash(data));
		});

		it("produces different hashes for different input", () => {
			expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
		});

		it("returns a hex string", () => {
			const hash = contentHash({ test: true });
			expect(hash).toMatch(/^[0-9a-f]+$/);
		});
	});

	describe("buildTagPayloads", () => {
		it("creates payloads for all 5 tag groups", () => {
			const parsed = parseWorkspace(MINIMAL_WORKSPACE);
			const payloads = buildTagPayloads(parsed);

			expect(payloads.size).toBe(5);
			expect(payloads.has("world")).toBe(true);
			expect(payloads.has("prefabs")).toBe(true);
			expect(payloads.has("entities")).toBe(true);
			expect(payloads.has("scripts")).toBe(true);
			expect(payloads.has("assets")).toBe(true);
		});

		it("world payload contains gravity and pixelsPerMeter", () => {
			const parsed = parseWorkspace(MINIMAL_WORKSPACE);
			const payloads = buildTagPayloads(parsed);
			const world = payloads.get("world") as { world: Record<string, unknown> };

			expect(world.world.gravity).toEqual({ x: 0, y: 9.8 });
			expect(world.world.pixelsPerMeter).toBe(50);
		});

		it("scripts payload produces module-map with entrypoint", () => {
			const parsed = parseWorkspace(MINIMAL_WORKSPACE);
			const payloads = buildTagPayloads(parsed);
			const scripts = payloads.get("scripts") as {
				modules: Record<string, string>;
				entrypoint?: string;
			};

			expect(scripts.modules).toBeDefined();
			expect(Object.values(scripts.modules).join("")).toContain("onTick");
		});

		it("assets payload maps IDs to URLs", () => {
			const parsed = parseWorkspace(MINIMAL_WORKSPACE);
			const payloads = buildTagPayloads(parsed);
			const assets = payloads.get("assets") as { urls: Record<string, string> };

			expect(assets.urls["ball-sprite"]).toBe("https://example.com/ball.png");
		});
	});
});
