import type {
	BuildManifest,
	GameDefinition,
	TagPayloads,
} from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GodotBridge } from "../../godot/types";
import { InMemoryArtifactResolver } from "../ArtifactResolver";
import { PackageRuntimeAdapter } from "../PackageRuntimeAdapter";

function createManifest(overrides?: Partial<BuildManifest>): BuildManifest {
	return {
		packageManifest: { id: "test-game", name: "Test Game", version: "1.0.0" },
		buildId: "build-001",
		createdAt: Date.now(),
		artifacts: [
			{ tag: "world", hash: "abc123", sizeBytes: 100 },
			{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
			{ tag: "entities", hash: "ghi789", sizeBytes: 150 },
			{ tag: "rules", hash: "jkl012", sizeBytes: 50 },
			{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
			{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
		],
		...overrides,
	};
}

const testArtifacts: Record<string, unknown> = {
	world: {
		world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
		background: { type: "static", color: "#112233" },
	} satisfies TagPayloads["world"],
	prefabs: {
		prefabs: {
			box: { id: "box", physics: { bodyType: "dynamic" } },
		},
	} satisfies TagPayloads["prefabs"],
	entities: {
		entities: [
			{
				id: "box-1",
				name: "Box 1",
				prefab: "box",
				transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
			},
		],
	} satisfies TagPayloads["entities"],
	rules: { rules: [] } satisfies TagPayloads["rules"],
	scripts: { script: "function onStart() {}" } satisfies TagPayloads["scripts"],
	assets: {
		urls: { bg: "https://cdn.example.com/bg.png" },
	} satisfies TagPayloads["assets"],
};

function createMockBridge(): GodotBridge {
	return {
		loadGame: vi.fn().mockResolvedValue(undefined),
		clearGame: vi.fn(),
		preloadTextures: vi.fn().mockResolvedValue({ completed: 1, failed: 0 }),
		setupWorld: vi.fn(),
		registerPrefabs: vi.fn(),
		loadEntities: vi.fn(),
		clearEntities: vi.fn(),
		pausePhysics: vi.fn(),
		resumePhysics: vi.fn(),
		initialize: vi.fn(),
		dispose: vi.fn(),
	} as unknown as GodotBridge;
}

describe("PackageRuntimeAdapter", () => {
	let bridge: GodotBridge;
	let resolver: InMemoryArtifactResolver;
	let adapter: PackageRuntimeAdapter;

	beforeEach(() => {
		bridge = createMockBridge();
		resolver = new InMemoryArtifactResolver(testArtifacts);
		adapter = new PackageRuntimeAdapter(bridge, resolver);
	});

	describe("loadPackage", () => {
		it("resolves all artifacts and calls bridge.loadGame", async () => {
			const manifest = createManifest();
			const result = await adapter.loadPackage(manifest);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual([
				"world",
				"prefabs",
				"entities",
				"rules",
				"scripts",
				"assets",
			]);
			expect(bridge.loadGame).toHaveBeenCalledTimes(1);
		});

		it("converts artifacts to valid GameDefinition", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			const loadGameCall = vi.mocked(bridge.loadGame).mock.calls[0][0];
			const definition = loadGameCall as GameDefinition;

			expect(definition.metadata.id).toBe("test-game");
			expect(definition.metadata.title).toBe("Test Game");
			expect(definition.metadata.version).toBe("1.0.0");
			expect(definition.world.gravity).toEqual({ x: 0, y: 10 });
			expect(definition.world.pixelsPerMeter).toBe(50);
			expect(definition.background).toEqual({
				type: "static",
				color: "#112233",
			});
			expect(definition.prefabs).toEqual({
				box: { id: "box", physics: { bodyType: "dynamic" } },
			});
			expect(definition.entities).toHaveLength(1);
			expect(definition.entities[0].id).toBe("box-1");
			expect(definition.script).toBe("function onStart() {}");
		});

		it("preloads asset textures before loading game", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			expect(bridge.preloadTextures).toHaveBeenCalledWith([
				"https://cdn.example.com/bg.png",
			]);
			const preloadOrder = vi.mocked(bridge.preloadTextures).mock
				.invocationCallOrder[0];
			const loadOrder = vi.mocked(bridge.loadGame).mock.invocationCallOrder[0];
			expect(preloadOrder).toBeLessThan(loadOrder);
		});

		it("skips texture preload when no asset URLs", async () => {
			resolver.set("assets", { urls: {} });
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			expect(bridge.preloadTextures).not.toHaveBeenCalled();
		});

		it("updates load state after successful load", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			const state = adapter.getState();
			expect(state.manifest).toBe(manifest);
			expect(state.loadedTags.has("world")).toBe(true);
			expect(state.loadedTags.has("prefabs")).toBe(true);
			expect(state.artifactHashes.world).toBe("abc123");
		});

		it("reports errors for missing artifacts but still loads available ones", async () => {
			const sparseResolver = new InMemoryArtifactResolver({
				world: testArtifacts.world,
				entities: testArtifacts.entities,
			});
			const sparseAdapter = new PackageRuntimeAdapter(bridge, sparseResolver);
			const manifest = createManifest();

			const result = await sparseAdapter.loadPackage(manifest);

			expect(result.success).toBe(false);
			expect(result.loadedTags).toContain("world");
			expect(result.loadedTags).toContain("entities");
			expect(result.errors).toBeDefined();
			expect(result.errors!.length).toBeGreaterThan(0);
		});

		it("reports bridge error when loadGame fails", async () => {
			vi.mocked(bridge.loadGame).mockRejectedValue(new Error("Bridge crashed"));
			const manifest = createManifest();

			const result = await adapter.loadPackage(manifest);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors!.some((e) => e.code === "BRIDGE_ERROR")).toBe(true);
		});

		it("provides default world when world artifact is missing", async () => {
			const noWorldResolver = new InMemoryArtifactResolver({
				prefabs: testArtifacts.prefabs,
				entities: testArtifacts.entities,
				rules: testArtifacts.rules,
				scripts: testArtifacts.scripts,
				assets: testArtifacts.assets,
			});
			const noWorldManifest = createManifest({
				artifacts: createManifest().artifacts.filter((a) => a.tag !== "world"),
			});
			const noWorldAdapter = new PackageRuntimeAdapter(bridge, noWorldResolver);

			await noWorldAdapter.loadPackage(noWorldManifest);

			const definition = vi.mocked(bridge.loadGame).mock
				.calls[0][0] as GameDefinition;
			expect(definition.world.gravity).toEqual({ x: 0, y: 10 });
			expect(definition.world.pixelsPerMeter).toBe(50);
		});

		it("includes durationMs in result", async () => {
			const manifest = createManifest();
			const result = await adapter.loadPackage(manifest);

			expect(result.durationMs).toBeDefined();
			expect(typeof result.durationMs).toBe("number");
		});
	});

	describe("loadByTag", () => {
		it("fails when no manifest is loaded", async () => {
			const result = await adapter.loadByTag("world");

			expect(result.success).toBe(false);
			expect(result.errors![0].code).toBe("MANIFEST_INVALID");
		});

		it("resolves single tag and reloads full game", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);
			vi.mocked(bridge.loadGame).mockClear();
			vi.mocked(bridge.clearGame).mockClear();

			const result = await adapter.loadByTag("entities");

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual(["entities"]);
			expect(bridge.clearGame).toHaveBeenCalledTimes(1);
			expect(bridge.loadGame).toHaveBeenCalledTimes(1);
		});

		it("reports error when artifact resolution fails", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			const failResolver = new InMemoryArtifactResolver({});
			const failAdapter = new PackageRuntimeAdapter(bridge, failResolver);
			(failAdapter as any).state.manifest = manifest;

			const result = await failAdapter.loadByTag("world");
			expect(result.success).toBe(false);
			expect(result.errors![0].code).toBe("ARTIFACT_NOT_FOUND");
		});
	});

	describe("reloadChangedTags", () => {
		it("detects changed tags by hash comparison", async () => {
			const manifest1 = createManifest();
			await adapter.loadPackage(manifest1);
			vi.mocked(bridge.loadGame).mockClear();
			vi.mocked(bridge.clearGame).mockClear();

			const manifest2 = createManifest({
				buildId: "build-002",
				artifacts: [
					{ tag: "world", hash: "abc123", sizeBytes: 100 },
					{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
					{ tag: "entities", hash: "CHANGED", sizeBytes: 150 },
					{ tag: "rules", hash: "jkl012", sizeBytes: 50 },
					{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
					{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
				],
			});

			const result = await adapter.reloadChangedTags(manifest2);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual(["entities"]);
			expect(bridge.clearGame).toHaveBeenCalledTimes(1);
			expect(bridge.loadGame).toHaveBeenCalledTimes(1);
		});

		it("skips reload when no hashes changed", async () => {
			const manifest = createManifest();
			await adapter.loadPackage(manifest);
			vi.mocked(bridge.loadGame).mockClear();

			const result = await adapter.reloadChangedTags(manifest);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual([]);
			expect(bridge.loadGame).not.toHaveBeenCalled();
		});
	});

	describe("artifactsToGameDefinition mapping", () => {
		it("maps script to undefined when empty", async () => {
			resolver.set("scripts", { script: "" });
			const manifest = createManifest();
			await adapter.loadPackage(manifest);

			const definition = vi.mocked(bridge.loadGame).mock
				.calls[0][0] as GameDefinition;
			expect(definition.script).toBeUndefined();
		});

		it("maps workspace manifest fields to metadata", async () => {
			const manifest = createManifest({
				packageManifest: {
					id: "my-game",
					name: "My Game",
					version: "2.0.0",
					slug: "my-game",
					description: "A test game",
					author: "Test Author",
				},
			});
			await adapter.loadPackage(manifest);

			const definition = vi.mocked(bridge.loadGame).mock
				.calls[0][0] as GameDefinition;
			expect(definition.metadata).toEqual({
				id: "my-game",
				title: "My Game",
				version: "2.0.0",
				slug: "my-game",
				description: "A test game",
				author: "Test Author",
			});
		});
	});
});
