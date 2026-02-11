import type { WorkspaceSnapshot, WorkspaceTag } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GodotBridge } from "@/lib/godot/types";
import { HotReloadOrchestrator } from "../HotReloadOrchestrator";
import { TagPayloadResolver } from "../TagPayloadResolver";
import type { TagHotReloadHandler } from "../tag-handlers/types";
import { WorkspaceFileStore } from "../WorkspaceFileStore";

function createTestSnapshot(
	files: Array<{ filename: string; content: string }>,
): WorkspaceSnapshot {
	return {
		gameId: "test-game",
		revision: "test-rev",
		generatedAt: Date.now(),
		files: files.map((file) => ({
			filename: file.filename,
			content: file.content,
			contentHash: `hash-${file.filename}`,
			size: file.content.length,
			uploaded: Date.now(),
		})),
	};
}

function createMockBridge() {
	return {
		setupWorld: vi.fn(),
		registerPrefabs: vi.fn(),
		loadEntities: vi.fn(),
		clearEntities: vi.fn(),
		hotSwapShader: vi.fn(),
	} as unknown as GodotBridge;
}

function createMockRuntime() {
	return {
		applyRules: vi.fn(),
		applyScript: vi.fn().mockResolvedValue(undefined),
	};
}

function createStore(
	files: Array<{ filename: string; content: string }>,
): WorkspaceFileStore {
	const store = new WorkspaceFileStore();
	store.update(createTestSnapshot(files));
	return store;
}

describe("WorkspaceFileStore", () => {
	it("update stores snapshot and files are accessible", () => {
		const store = new WorkspaceFileStore();
		const snapshot = createTestSnapshot([
			{ filename: "world.json", content: '{"gravity":{"x":0,"y":10}}' },
			{ filename: "scripts/main.js", content: "function onStart() {}" },
		]);

		store.update(snapshot);

		expect(store.getFile("world.json")).toEqual(snapshot.files[0]);
		expect(store.getFileContent("scripts/main.js")).toBe(
			"function onStart() {}",
		);
	});

	it("getRevision returns snapshot revision", () => {
		const store = createStore([{ filename: "world.json", content: "{}" }]);

		expect(store.getRevision()).toBe("test-rev");
	});

	it("getAllFiles returns all files", () => {
		const snapshot = createTestSnapshot([
			{ filename: "world.json", content: "{}" },
			{ filename: "entities.json", content: "[]" },
		]);
		const store = new WorkspaceFileStore();

		store.update(snapshot);

		expect(store.getAllFiles()).toEqual(snapshot.files);
	});
});

describe("TagPayloadResolver", () => {
	it("resolves world tag from world.json content", () => {
		const store = createStore([
			{
				filename: "world.json",
				content: JSON.stringify({
					world: { gravity: { x: 0, y: 9.8 }, pixelsPerMeter: 50 },
					background: { type: "static", color: "#001122" },
				}),
			},
		]);
		const resolver = new TagPayloadResolver(store);

		expect(resolver.resolve("world")).toEqual({
			world: { gravity: { x: 0, y: 9.8 }, pixelsPerMeter: 50 },
			background: { type: "static", color: "#001122" },
		});
	});

	it("resolves prefabs from prefabs/*.json files", () => {
		const store = createStore([
			{
				filename: "prefabs/player.json",
				content: JSON.stringify({
					visual: { type: "rect", width: 1, height: 1, color: "#fff" },
				}),
			},
			{
				filename: "prefabs/enemy.json",
				content: JSON.stringify({
					id: "enemy-1",
					visual: { type: "circle", radius: 1, color: "#f00" },
				}),
			},
		]);
		const resolver = new TagPayloadResolver(store);

		expect(resolver.resolve("prefabs")).toEqual({
			prefabs: {
				player: {
					id: "player",
					visual: { type: "rect", width: 1, height: 1, color: "#fff" },
				},
				"enemy-1": {
					id: "enemy-1",
					visual: { type: "circle", radius: 1, color: "#f00" },
				},
			},
		});
	});

	it("resolves entities from entities.json array format", () => {
		const entities = [{ id: "player", name: "Player", prefab: "player" }];
		const store = createStore([
			{ filename: "entities.json", content: JSON.stringify(entities) },
		]);
		const resolver = new TagPayloadResolver(store);

		expect(resolver.resolve("entities")).toEqual({ entities });
	});

	it("resolves entities from entities.json wrapped format", () => {
		const entities = [{ id: "enemy", name: "Enemy", prefab: "enemy" }];
		const store = createStore([
			{
				filename: "entities.json",
				content: JSON.stringify({ entities }),
			},
		]);
		const resolver = new TagPayloadResolver(store);

		expect(resolver.resolve("entities")).toEqual({ entities });
	});

	it("resolves scripts by concatenating scripts/*.js alphabetically", () => {
		const store = createStore([
			{ filename: "scripts/z-last.js", content: "const z = 3;" },
			{ filename: "scripts/a-first.js", content: "const a = 1;" },
			{ filename: "scripts/m-middle.js", content: "const m = 2;" },
		]);
		const resolver = new TagPayloadResolver(store);

		expect(resolver.resolve("scripts")).toEqual({
			script: ["const a = 1;", "const m = 2;", "const z = 3;"].join("\n\n"),
		});
	});

	it("returns null for missing files", () => {
		const resolver = new TagPayloadResolver(createStore([]));

		expect(resolver.resolve("world")).toBeNull();
		expect(resolver.resolve("entities")).toBeNull();
		expect(resolver.resolve("rules")).toBeNull();
	});
});

describe("HotReloadOrchestrator", () => {
	let bridge: GodotBridge;
	let runtime: ReturnType<typeof createMockRuntime>;
	let store: WorkspaceFileStore;
	let resolver: TagPayloadResolver;

	beforeEach(() => {
		bridge = createMockBridge();
		runtime = createMockRuntime();
		store = createStore([
			{
				filename: "world.json",
				content: JSON.stringify({
					world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				}),
			},
			{
				filename: "prefabs/box.json",
				content: JSON.stringify({
					visual: { type: "rect", width: 1, height: 1, color: "#00f" },
				}),
			},
			{
				filename: "entities.json",
				content: JSON.stringify([{ id: "box-1", name: "Box", prefab: "box" }]),
			},
			{
				filename: "rules.json",
				content: JSON.stringify([]),
			},
			{ filename: "scripts/main.js", content: "function onStart() {}" },
			{
				filename: "shaders/wave.gdshader",
				content: "shader_type canvas_item;",
			},
		]);
		resolver = new TagPayloadResolver(store);
	});

	function getHandler(
		orchestrator: HotReloadOrchestrator,
		tag: WorkspaceTag,
	): TagHotReloadHandler {
		const handlers = (
			orchestrator as unknown as {
				handlers: Map<WorkspaceTag, TagHotReloadHandler>;
			}
		).handlers;
		const handler = handlers.get(tag);
		if (!handler) {
			throw new Error(`Missing handler for ${tag}`);
		}
		return handler;
	}

	it("in edit mode calls hotSwap when canHotSwap returns true", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "edit",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);
		const worldHandler = getHandler(orchestrator, "world");
		const canHotSwapSpy = vi
			.spyOn(worldHandler, "canHotSwap")
			.mockReturnValue(true);
		const hotSwapSpy = vi.spyOn(worldHandler, "hotSwap");
		const fullReloadSpy = vi.spyOn(worldHandler, "fullReload");

		await orchestrator.reloadTags(["world"], new Map([["world", "hash-1"]]));

		expect(canHotSwapSpy).toHaveBeenCalledTimes(1);
		expect(hotSwapSpy).toHaveBeenCalledTimes(1);
		expect(fullReloadSpy).not.toHaveBeenCalled();
	});

	it("in play mode always calls fullReload", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "play",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);
		const worldHandler = getHandler(orchestrator, "world");
		const canHotSwapSpy = vi
			.spyOn(worldHandler, "canHotSwap")
			.mockReturnValue(true);
		const hotSwapSpy = vi.spyOn(worldHandler, "hotSwap");
		const fullReloadSpy = vi.spyOn(worldHandler, "fullReload");

		await orchestrator.reloadTags(["world"], new Map([["world", "hash-1"]]));

		expect(canHotSwapSpy).not.toHaveBeenCalled();
		expect(hotSwapSpy).not.toHaveBeenCalled();
		expect(fullReloadSpy).toHaveBeenCalledTimes(1);
	});

	it("falls back to fullReload when hotSwap throws", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "edit",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);
		const worldHandler = getHandler(orchestrator, "world");
		vi.spyOn(worldHandler, "canHotSwap").mockReturnValue(true);
		vi.spyOn(worldHandler, "hotSwap").mockRejectedValue(
			new Error("hot swap failed"),
		);
		const fullReloadSpy = vi.spyOn(worldHandler, "fullReload");

		await orchestrator.reloadTags(["world"], new Map([["world", "hash-1"]]));

		expect(fullReloadSpy).toHaveBeenCalledTimes(1);
	});

	it("processes tags in order with world first", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "play",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);
		const worldHandler = getHandler(orchestrator, "world");
		const prefabsHandler = getHandler(orchestrator, "prefabs");
		const entitiesHandler = getHandler(orchestrator, "entities");
		const worldReloadSpy = vi.spyOn(worldHandler, "fullReload");
		const prefabsReloadSpy = vi.spyOn(prefabsHandler, "fullReload");
		const entitiesReloadSpy = vi.spyOn(entitiesHandler, "fullReload");

		await orchestrator.reloadTags(
			["entities", "world", "prefabs"],
			new Map([
				["world", "hash-world"],
				["prefabs", "hash-prefabs"],
				["entities", "hash-entities"],
			]),
		);

		const worldOrder = worldReloadSpy.mock.invocationCallOrder[0];
		const prefabsOrder = prefabsReloadSpy.mock.invocationCallOrder[0];
		const entitiesOrder = entitiesReloadSpy.mock.invocationCallOrder[0];
		expect(worldOrder).toBeLessThan(prefabsOrder);
		expect(prefabsOrder).toBeLessThan(entitiesOrder);
	});

	it("uses resolver lazily and loads latest store payload", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "play",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);

		await orchestrator.reloadTags(["world"], new Map([["world", "hash-1"]]));
		store.update(
			createTestSnapshot([
				{
					filename: "world.json",
					content: JSON.stringify({
						world: { gravity: { x: 0, y: 20 }, pixelsPerMeter: 80 },
					}),
				},
			]),
		);
		await orchestrator.reloadTags(["world"], new Map([["world", "hash-2"]]));

		expect(bridge.setupWorld).toHaveBeenNthCalledWith(
			2,
			{ gravity: { x: 0, y: 20 }, pixelsPerMeter: 80 },
			undefined,
		);
	});

	it("maps handler payloads to bridge and runtime methods", async () => {
		const orchestrator = new HotReloadOrchestrator(
			{
				mode: "play",
				activeScene: null,
				bridge,
				runtime,
			},
			resolver,
		);

		await orchestrator.fullReset([
			"world",
			"prefabs",
			"entities",
			"rules",
			"scripts",
			"effects",
			"assets",
		]);

		expect(bridge.setupWorld).toHaveBeenCalledWith(
			{ gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
			undefined,
		);
		expect(bridge.registerPrefabs).toHaveBeenCalledWith({
			box: {
				id: "box",
				visual: { type: "rect", width: 1, height: 1, color: "#00f" },
			},
		});
		expect(bridge.clearEntities).toHaveBeenCalled();
		expect(bridge.loadEntities).toHaveBeenNthCalledWith(1, []);
		expect(bridge.loadEntities).toHaveBeenNthCalledWith(2, [
			{ id: "box-1", name: "Box", prefab: "box" },
		]);
		expect(runtime.applyRules).toHaveBeenCalledWith([]);
		expect(runtime.applyScript).toHaveBeenCalledWith("function onStart() {}");
		expect(bridge.hotSwapShader).toHaveBeenCalledWith(
			"wave",
			"shader_type canvas_item;",
		);
	});
});
