import type { BuildManifest, TagPayloads } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GodotBridge } from "../../godot/types";
import { InMemoryArtifactResolver } from "../ArtifactResolver";
import { PackageRuntimeAdapter } from "../PackageRuntimeAdapter";
import { PackageRuntimeOrchestrator } from "../PackageRuntimeOrchestrator";

function createManifest(overrides?: Partial<BuildManifest>): BuildManifest {
	return {
		packageManifest: { id: "test-game", name: "Test Game", version: "1.0.0" },
		buildId: "build-001",
		createdAt: Date.now(),
		artifacts: [
			{ tag: "world", hash: "abc123", sizeBytes: 100 },
			{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
			{ tag: "entities", hash: "ghi789", sizeBytes: 150 },
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
	scripts: {
		modules: { main: "function onStart() {}" },
		entrypoint: "main",
	} satisfies TagPayloads["scripts"],
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

describe("PackageRuntimeOrchestrator", () => {
	let bridge: GodotBridge;
	let resolver: InMemoryArtifactResolver;
	let orchestrator: PackageRuntimeOrchestrator;

	beforeEach(() => {
		bridge = createMockBridge();
		resolver = new InMemoryArtifactResolver(testArtifacts);
		orchestrator = new PackageRuntimeOrchestrator(bridge, resolver);
	});

	describe("loadPackage", () => {
		it("calls bridge section methods instead of loadGame", async () => {
			const manifest = createManifest();
			const result = await orchestrator.loadPackage(manifest);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual([
				"world",
				"prefabs",
				"entities",
				"scripts",
				"assets",
			]);
			expect(bridge.loadGame).not.toHaveBeenCalled();
			expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
			expect(bridge.registerPrefabs).toHaveBeenCalledTimes(1);
			expect(bridge.loadEntities).toHaveBeenCalledTimes(1);
			expect(bridge.preloadTextures).toHaveBeenCalledTimes(1);
		});

		it("passes correct payloads to bridge section methods", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);

			expect(bridge.setupWorld).toHaveBeenCalledWith(
				{ gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				{ type: "static", color: "#112233" },
			);
			expect(bridge.registerPrefabs).toHaveBeenCalledWith({
				box: { id: "box", physics: { bodyType: "dynamic" } },
			});
			expect(bridge.loadEntities).toHaveBeenCalledWith([
				{
					id: "box-1",
					name: "Box 1",
					prefab: "box",
					transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
				},
			]);
			expect(bridge.preloadTextures).toHaveBeenCalledWith([
				"https://cdn.example.com/bg.png",
			]);
		});

		it("calls section methods in correct order: setupWorld → registerPrefabs → loadEntities", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);

			const setupOrder = vi.mocked(bridge.setupWorld).mock
				.invocationCallOrder[0];
			const registerOrder = vi.mocked(bridge.registerPrefabs).mock
				.invocationCallOrder[0];
			const loadOrder = vi.mocked(bridge.loadEntities).mock
				.invocationCallOrder[0];

			expect(setupOrder).toBeLessThan(registerOrder);
			expect(registerOrder).toBeLessThan(loadOrder);
		});

		it("provides default world when world artifact is missing", async () => {
			const noWorldResolver = new InMemoryArtifactResolver({
				prefabs: testArtifacts.prefabs,
				entities: testArtifacts.entities,
				scripts: testArtifacts.scripts,
				assets: testArtifacts.assets,
			});
			const noWorldManifest = createManifest({
				artifacts: createManifest().artifacts.filter((a) => a.tag !== "world"),
			});
			const noWorldOrch = new PackageRuntimeOrchestrator(
				bridge,
				noWorldResolver,
			);

			await noWorldOrch.loadPackage(noWorldManifest);

			expect(bridge.setupWorld).toHaveBeenCalledWith(
				{ gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				undefined,
			);
		});

		it("updates load state after successful load", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);

			const state = orchestrator.getState();
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
			const sparseOrch = new PackageRuntimeOrchestrator(bridge, sparseResolver);
			const manifest = createManifest();

			const result = await sparseOrch.loadPackage(manifest);

			expect(result.success).toBe(false);
			expect(result.loadedTags).toContain("world");
			expect(result.loadedTags).toContain("entities");
			expect(result.errors).toBeDefined();
			expect(result.errors!.length).toBeGreaterThan(0);
		});

		it("reports bridge error when setupWorld fails", async () => {
			vi.mocked(bridge.setupWorld).mockImplementation(() => {
				throw new Error("Bridge crashed");
			});
			const manifest = createManifest();

			const result = await orchestrator.loadPackage(manifest);

			expect(result.success).toBe(false);
			expect(result.errors!.some((e) => e.code === "BRIDGE_ERROR")).toBe(true);
		});

		it("includes durationMs in result", async () => {
			const manifest = createManifest();
			const result = await orchestrator.loadPackage(manifest);

			expect(result.durationMs).toBeDefined();
			expect(typeof result.durationMs).toBe("number");
		});

		it("skips texture preload when no asset URLs", async () => {
			resolver.set("assets", { urls: {} });
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);

			expect(bridge.preloadTextures).not.toHaveBeenCalled();
		});
	});

	describe("loadByTag", () => {
		it("fails when no manifest is loaded", async () => {
			const result = await orchestrator.loadByTag("world");

			expect(result.success).toBe(false);
			expect(result.errors![0].code).toBe("MANIFEST_INVALID");
		});

		it("calls only the relevant bridge method for world tag", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.setupWorld).mockClear();
			vi.mocked(bridge.registerPrefabs).mockClear();
			vi.mocked(bridge.loadEntities).mockClear();
			vi.mocked(bridge.clearEntities).mockClear();

			const result = await orchestrator.loadByTag("world");

			expect(result.success).toBe(true);
			expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
			expect(bridge.registerPrefabs).not.toHaveBeenCalled();
			expect(bridge.loadEntities).not.toHaveBeenCalled();
		});

		it("calls registerPrefabs for prefabs tag", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.registerPrefabs).mockClear();

			const result = await orchestrator.loadByTag("prefabs");

			expect(result.success).toBe(true);
			expect(bridge.registerPrefabs).toHaveBeenCalledTimes(1);
		});

		it("calls clearEntities + loadEntities for entities tag", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.clearEntities).mockClear();
			vi.mocked(bridge.loadEntities).mockClear();

			const result = await orchestrator.loadByTag("entities");

			expect(result.success).toBe(true);
			expect(bridge.clearEntities).toHaveBeenCalledTimes(1);
			expect(bridge.loadEntities).toHaveBeenCalledTimes(1);
			const clearOrder = vi.mocked(bridge.clearEntities).mock
				.invocationCallOrder[0];
			const loadOrder = vi.mocked(bridge.loadEntities).mock
				.invocationCallOrder[0];
			expect(clearOrder).toBeLessThan(loadOrder);
		});

		it("does not call bridge for scripts tag (local state only)", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.setupWorld).mockClear();
			vi.mocked(bridge.registerPrefabs).mockClear();
			vi.mocked(bridge.loadEntities).mockClear();

			const result = await orchestrator.loadByTag("scripts");

			expect(result.success).toBe(true);
			expect(bridge.setupWorld).not.toHaveBeenCalled();
			expect(bridge.registerPrefabs).not.toHaveBeenCalled();
			expect(bridge.loadEntities).not.toHaveBeenCalled();
		});

		it("calls preloadTextures for assets tag", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.preloadTextures).mockClear();

			const result = await orchestrator.loadByTag("assets");

			expect(result.success).toBe(true);
			expect(bridge.preloadTextures).toHaveBeenCalledWith([
				"https://cdn.example.com/bg.png",
			]);
		});

		it("reports error when artifact resolution fails", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);

			const failResolver = new InMemoryArtifactResolver({});
			const failOrch = new PackageRuntimeOrchestrator(bridge, failResolver);
			(failOrch as any).state.manifest = manifest;

			const result = await failOrch.loadByTag("world");
			expect(result.success).toBe(false);
			expect(result.errors![0].code).toBe("ARTIFACT_NOT_FOUND");
		});
	});

	describe("reloadChangedTags", () => {
		it("detects changed tags by hash comparison", async () => {
			const manifest1 = createManifest();
			await orchestrator.loadPackage(manifest1);
			vi.mocked(bridge.clearEntities).mockClear();
			vi.mocked(bridge.loadEntities).mockClear();
			vi.mocked(bridge.setupWorld).mockClear();
			vi.mocked(bridge.registerPrefabs).mockClear();

			const manifest2 = createManifest({
				buildId: "build-002",
				artifacts: [
					{ tag: "world", hash: "abc123", sizeBytes: 100 },
					{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
					{ tag: "entities", hash: "CHANGED", sizeBytes: 150 },

					{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
					{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
				],
			});

			const result = await orchestrator.reloadChangedTags(manifest2);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual(["entities"]);
			expect(bridge.clearEntities).toHaveBeenCalledTimes(1);
			expect(bridge.loadEntities).toHaveBeenCalledTimes(1);
			expect(bridge.setupWorld).not.toHaveBeenCalled();
			expect(bridge.registerPrefabs).not.toHaveBeenCalled();
		});

		it("skips reload when no hashes changed", async () => {
			const manifest = createManifest();
			await orchestrator.loadPackage(manifest);
			vi.mocked(bridge.setupWorld).mockClear();
			vi.mocked(bridge.registerPrefabs).mockClear();
			vi.mocked(bridge.loadEntities).mockClear();

			const result = await orchestrator.reloadChangedTags(manifest);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual([]);
			expect(bridge.setupWorld).not.toHaveBeenCalled();
		});

		it("reloads only changed tags without full game reload", async () => {
			const manifest1 = createManifest();
			await orchestrator.loadPackage(manifest1);
			vi.mocked(bridge.setupWorld).mockClear();

			const manifest2 = createManifest({
				buildId: "build-002",
				artifacts: [
					{ tag: "world", hash: "CHANGED_WORLD", sizeBytes: 100 },
					{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
					{ tag: "entities", hash: "ghi789", sizeBytes: 150 },

					{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
					{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
				],
			});

			const result = await orchestrator.reloadChangedTags(manifest2);

			expect(result.success).toBe(true);
			expect(result.loadedTags).toEqual(["world"]);
			expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
			expect(bridge.loadGame).not.toHaveBeenCalled();
			expect(bridge.clearGame).not.toHaveBeenCalled();
		});
	});
});

describe("Adapter ↔ Orchestrator parity", () => {
	function createPair() {
		const adapterBridge = createMockBridge();
		const orchestratorBridge = createMockBridge();
		const adapterResolver = new InMemoryArtifactResolver(testArtifacts);
		const orchestratorResolver = new InMemoryArtifactResolver(testArtifacts);

		const adapter = new PackageRuntimeAdapter(adapterBridge, adapterResolver);
		const orchestrator = new PackageRuntimeOrchestrator(
			orchestratorBridge,
			orchestratorResolver,
		);

		return { adapter, orchestrator, adapterBridge, orchestratorBridge };
	}

	it("loadPackage: both return same success/loadedTags/errors shape", async () => {
		const { adapter, orchestrator } = createPair();
		const manifest = createManifest();

		const adapterResult = await adapter.loadPackage(manifest);
		const orchResult = await orchestrator.loadPackage(manifest);

		expect(adapterResult.success).toBe(orchResult.success);
		expect(adapterResult.loadedTags).toEqual(orchResult.loadedTags);
		expect(adapterResult.errors).toEqual(orchResult.errors);
	});

	it("loadPackage: both update state identically", async () => {
		const { adapter, orchestrator } = createPair();
		const manifest = createManifest();

		await adapter.loadPackage(manifest);
		await orchestrator.loadPackage(manifest);

		const adapterState = adapter.getState();
		const orchState = orchestrator.getState();

		expect(adapterState.manifest).toEqual(orchState.manifest);
		expect([...adapterState.loadedTags]).toEqual([...orchState.loadedTags]);
		expect(adapterState.artifactHashes).toEqual(orchState.artifactHashes);
		expect(adapterState.timeMode).toEqual(orchState.timeMode);
	});

	it("loadByTag: both return same result for entities tag", async () => {
		const { adapter, orchestrator } = createPair();
		const manifest = createManifest();

		await adapter.loadPackage(manifest);
		await orchestrator.loadPackage(manifest);

		const adapterResult = await adapter.loadByTag("entities");
		const orchResult = await orchestrator.loadByTag("entities");

		expect(adapterResult.success).toBe(orchResult.success);
		expect(adapterResult.loadedTags).toEqual(orchResult.loadedTags);
	});

	it("loadByTag: both fail identically when no manifest loaded", async () => {
		const { adapter, orchestrator } = createPair();

		const adapterResult = await adapter.loadByTag("world");
		const orchResult = await orchestrator.loadByTag("world");

		expect(adapterResult.success).toBe(false);
		expect(orchResult.success).toBe(false);
		expect(adapterResult.errors![0].code).toBe(orchResult.errors![0].code);
		expect(adapterResult.errors![0].message).toBe(
			orchResult.errors![0].message,
		);
	});

	it("reloadChangedTags: both detect same changed tags", async () => {
		const { adapter, orchestrator } = createPair();
		const manifest1 = createManifest();

		await adapter.loadPackage(manifest1);
		await orchestrator.loadPackage(manifest1);

		const manifest2 = createManifest({
			buildId: "build-002",
			artifacts: [
				{ tag: "world", hash: "abc123", sizeBytes: 100 },
				{ tag: "prefabs", hash: "CHANGED", sizeBytes: 200 },
				{ tag: "entities", hash: "ghi789", sizeBytes: 150 },

				{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
				{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
			],
		});

		const adapterResult = await adapter.reloadChangedTags(manifest2);
		const orchResult = await orchestrator.reloadChangedTags(manifest2);

		expect(adapterResult.success).toBe(orchResult.success);
		expect(adapterResult.loadedTags).toEqual(orchResult.loadedTags);
	});

	it("reloadChangedTags: both skip when no changes", async () => {
		const { adapter, orchestrator } = createPair();
		const manifest = createManifest();

		await adapter.loadPackage(manifest);
		await orchestrator.loadPackage(manifest);

		const adapterResult = await adapter.reloadChangedTags(manifest);
		const orchResult = await orchestrator.reloadChangedTags(manifest);

		expect(adapterResult.success).toBe(true);
		expect(orchResult.success).toBe(true);
		expect(adapterResult.loadedTags).toEqual([]);
		expect(orchResult.loadedTags).toEqual([]);
	});

	it("adapter with tagNativeLoading flag delegates to orchestrator", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver, {
			tagNativeLoading: true,
		});

		expect(adapter.useNativeLoading()).toBe(true);

		const manifest = createManifest();
		const result = await adapter.loadPackage(manifest);

		expect(result.success).toBe(true);
		expect(bridge.loadGame).not.toHaveBeenCalled();
		expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
		expect(bridge.registerPrefabs).toHaveBeenCalledTimes(1);
		expect(bridge.loadEntities).toHaveBeenCalledTimes(1);
	});

	it("adapter without flag uses loadGame path", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver, {
			tagNativeLoading: false,
		});

		expect(adapter.useNativeLoading()).toBe(false);

		const manifest = createManifest();
		const result = await adapter.loadPackage(manifest);

		expect(result.success).toBe(true);
		expect(bridge.loadGame).toHaveBeenCalledTimes(1);
		expect(bridge.setupWorld).not.toHaveBeenCalled();
	});

	it("adapter setFlags toggles between modes", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver);

		expect(adapter.useNativeLoading()).toBe(false);

		adapter.setFlags({ tagNativeLoading: true });
		expect(adapter.useNativeLoading()).toBe(true);

		const manifest = createManifest();
		const result = await adapter.loadPackage(manifest);

		expect(bridge.loadGame).not.toHaveBeenCalled();
		expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(true);
	});

	it("adapter loadByTag delegates to orchestrator when flag enabled", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver, {
			tagNativeLoading: true,
		});

		const manifest = createManifest();
		await adapter.loadPackage(manifest);
		vi.mocked(bridge.clearEntities).mockClear();
		vi.mocked(bridge.loadEntities).mockClear();

		const result = await adapter.loadByTag("entities");

		expect(result.success).toBe(true);
		expect(bridge.clearEntities).toHaveBeenCalledTimes(1);
		expect(bridge.loadEntities).toHaveBeenCalledTimes(1);
		expect(bridge.clearGame).not.toHaveBeenCalled();
	});

	it("adapter reloadChangedTags delegates to orchestrator when flag enabled", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver, {
			tagNativeLoading: true,
		});

		const manifest1 = createManifest();
		await adapter.loadPackage(manifest1);
		vi.mocked(bridge.setupWorld).mockClear();

		const manifest2 = createManifest({
			buildId: "build-002",
			artifacts: [
				{ tag: "world", hash: "CHANGED", sizeBytes: 100 },
				{ tag: "prefabs", hash: "def456", sizeBytes: 200 },
				{ tag: "entities", hash: "ghi789", sizeBytes: 150 },

				{ tag: "scripts", hash: "mno345", sizeBytes: 300 },
				{ tag: "assets", hash: "pqr678", sizeBytes: 80 },
			],
		});

		const result = await adapter.reloadChangedTags(manifest2);

		expect(result.success).toBe(true);
		expect(result.loadedTags).toEqual(["world"]);
		expect(bridge.setupWorld).toHaveBeenCalledTimes(1);
		expect(bridge.clearGame).not.toHaveBeenCalled();
	});

	it("adapter getState reflects orchestrator state when flag enabled", async () => {
		const bridge = createMockBridge();
		const resolver = new InMemoryArtifactResolver(testArtifacts);
		const adapter = new PackageRuntimeAdapter(bridge, resolver, {
			tagNativeLoading: true,
		});

		const manifest = createManifest();
		await adapter.loadPackage(manifest);

		const state = adapter.getState();
		expect(state.manifest).toBe(manifest);
		expect(state.loadedTags.has("world")).toBe(true);
		expect(state.loadedTags.has("entities")).toBe(true);
		expect(state.artifactHashes.world).toBe("abc123");
	});
});
