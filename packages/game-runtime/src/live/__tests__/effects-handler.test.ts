import type { WorkspaceSnapshot } from "@slopcade/shared";
import type { CompiledPlan, EffectGraphSpec } from "@slopcade/shared/effects";
import * as effectsModule from "@slopcade/shared/effects";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GodotBridge } from "@slopcade/godot-bridge";
import { TagPayloadResolver } from "../TagPayloadResolver";
import { effectsHandler } from "../tag-handlers/effects-handler";
import type { HotReloadContext } from "../tag-handlers/types";
import { WorkspaceFileStore } from "../WorkspaceFileStore";

function createCompiledPlan(id: string, passCount = 1): CompiledPlan {
	const passes = Array.from({ length: passCount }, (_, index) => ({
		id: `pass-${index + 1}`,
		shaderSource: { glsl: `shader-${index + 1}` },
		requires: [],
		provides: [
			{
				id: `buf-${index + 1}`,
				type: "texture" as const,
				format: "rgba8" as const,
				resolution: "full" as const,
			},
		],
		params: {},
		paramsSchema: [],
		persistence: "none" as const,
		qualityTier: "medium" as const,
		constraints: {},
	}));

	const resourceMap = Object.fromEntries(
		passes.map((_, index) => [
			`buf-${index + 1}`,
			{
				id: `buf-${index + 1}`,
				type: "texture" as const,
				format: "rgba8" as const,
				resolution: "full" as const,
			},
		]),
	);

	return {
		id: `compiled-${id}`,
		graphId: id,
		graphVersion: "1",
		engineApiVersion: "1",
		scope: "screen",
		passes,
		resourceMap,
		feedbackPolicies: {},
		hash: `hash-${id}-${passCount}`,
		compiledAt: "2026-01-01T00:00:00.000Z",
	};
}

function createGraph(id: string): EffectGraphSpec {
	return {
		id,
		version: "1",
		engineApiVersion: "1",
		scope: "screen",
		nodes: [],
		connections: [],
		feedbackEdges: [],
		lifecycle: {
			autoStart: true,
			stopMode: "clear",
		},
	};
}

function createSnapshot(
	files: Array<{ filename: string; content: string }>,
): WorkspaceSnapshot {
	return {
		gameId: "test-game",
		revision: "test-revision",
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

describe("effectsHandler", () => {
	const mockBridge = {
		hotSwapShader: vi.fn(),
		applyGraph: vi.fn().mockResolvedValue(undefined),
	};

	const mockContext: HotReloadContext = {
		mode: "author",
		activeScene: null,
		bridge: mockBridge as unknown as GodotBridge,
		runtime: {
			applyScript: vi.fn().mockResolvedValue(undefined),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe("hotSwap", () => {
		it("uses hotSwapShader for shader-only changes", async () => {
			const stablePlan = createCompiledPlan("graph-main", 1);
			vi.spyOn(effectsModule, "compileGraph")
				.mockReturnValueOnce({ success: true, plan: stablePlan, errors: [] })
				.mockReturnValueOnce({ success: true, plan: stablePlan, errors: [] });

			await effectsHandler.hotSwap(
				{
					graphs: { main: createGraph("graph-main") },
					shaders: { wave: "old-shader" },
				},
				{
					graphs: { main: createGraph("graph-main") },
					shaders: { wave: "new-shader" },
				},
				mockContext,
			);

			expect(mockBridge.applyGraph).not.toHaveBeenCalled();
			expect(mockBridge.hotSwapShader).toHaveBeenCalledTimes(1);
			expect(mockBridge.hotSwapShader).toHaveBeenCalledWith(
				"wave",
				"new-shader",
			);
		});

		it("uses applyGraph for structural changes", async () => {
			const oldPlan = createCompiledPlan("graph-main", 1);
			const newPlan = createCompiledPlan("graph-main", 2);
			vi.spyOn(effectsModule, "compileGraph")
				.mockReturnValueOnce({ success: true, plan: oldPlan, errors: [] })
				.mockReturnValueOnce({ success: true, plan: newPlan, errors: [] });

			await effectsHandler.hotSwap(
				{
					graphs: { main: createGraph("graph-main") },
					shaders: { wave: "old-shader" },
				},
				{
					graphs: { main: createGraph("graph-main") },
					shaders: { wave: "new-shader" },
				},
				mockContext,
			);

			expect(mockBridge.applyGraph).toHaveBeenCalledTimes(1);
			expect(mockBridge.applyGraph).toHaveBeenCalledWith(newPlan);
			expect(mockBridge.hotSwapShader).not.toHaveBeenCalled();
		});

		it("handles compilation errors gracefully", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(effectsModule, "compileGraph").mockReturnValue({
				success: false,
				errors: [{ code: "INVALID_GRAPH", message: "Invalid graph" }],
			});

			await expect(
				effectsHandler.hotSwap(
					{
						graphs: { main: createGraph("graph-main") },
						shaders: { wave: "old-shader" },
					},
					{
						graphs: { main: createGraph("graph-main") },
						shaders: { wave: "new-shader" },
					},
					mockContext,
				),
			).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalled();
			expect(mockBridge.applyGraph).not.toHaveBeenCalled();
			expect(mockBridge.hotSwapShader).not.toHaveBeenCalled();
		});
	});

	describe("fullReload", () => {
		it("applies compiled graph", async () => {
			const plan = createCompiledPlan("graph-main", 1);

			await effectsHandler.fullReload(
				{
					plans: { main: plan },
					shaders: { wave: "shader-source" },
				},
				mockContext,
			);

			expect(mockBridge.applyGraph).toHaveBeenCalledTimes(1);
			expect(mockBridge.applyGraph).toHaveBeenCalledWith(plan);
			expect(mockBridge.hotSwapShader).not.toHaveBeenCalled();
		});

		it("falls back to hotSwapShader when no graph", async () => {
			await effectsHandler.fullReload(
				{
					plans: {},
					shaders: {
						wave: "wave-source",
						bloom: "bloom-source",
					},
				},
				mockContext,
			);

			expect(mockBridge.applyGraph).not.toHaveBeenCalled();
			expect(mockBridge.hotSwapShader).toHaveBeenCalledTimes(2);
			expect(mockBridge.hotSwapShader).toHaveBeenCalledWith(
				"wave",
				"wave-source",
			);
			expect(mockBridge.hotSwapShader).toHaveBeenCalledWith(
				"bloom",
				"bloom-source",
			);
		});
	});

	describe("scene-aware loading", () => {
		it("loads from scene path when activeScene set", async () => {
			const rootPlan = createCompiledPlan("root-plan", 1);
			const scenePlan = createCompiledPlan("scene-plan", 1);
			const store = new WorkspaceFileStore();
			store.update(
				createSnapshot([
					{
						filename: "effects.json",
						content: JSON.stringify({ plans: { root: rootPlan }, shaders: {} }),
					},
					{
						filename: "scenes/level1/effects.json",
						content: JSON.stringify({
							plans: { scene: scenePlan },
							shaders: {},
						}),
					},
				]),
			);

			const resolver = new TagPayloadResolver(store);
			const payload = resolver.resolve<{
				plans: Record<string, CompiledPlan>;
				shaders: Record<string, string>;
			}>("effects", "level1");

			expect(payload).not.toBeNull();
			if (!payload) {
				throw new Error("Expected scene-aware effects payload");
			}

			await effectsHandler.fullReload(payload, mockContext);

			expect(mockBridge.applyGraph).toHaveBeenCalledTimes(1);
			expect(mockBridge.applyGraph).toHaveBeenCalledWith(scenePlan);
		});

		it("falls back to top-level when scene file missing", async () => {
			const rootPlan = createCompiledPlan("root-plan", 1);
			const store = new WorkspaceFileStore();
			store.update(
				createSnapshot([
					{
						filename: "effects.json",
						content: JSON.stringify({ plans: { root: rootPlan }, shaders: {} }),
					},
				]),
			);

			const resolver = new TagPayloadResolver(store);
			const payload = resolver.resolve<{
				plans: Record<string, CompiledPlan>;
				shaders: Record<string, string>;
			}>("effects", "level1");

			expect(payload).not.toBeNull();
			if (!payload) {
				throw new Error("Expected fallback effects payload");
			}

			await effectsHandler.fullReload(payload, mockContext);

			expect(mockBridge.applyGraph).toHaveBeenCalledTimes(1);
			expect(mockBridge.applyGraph).toHaveBeenCalledWith(rootPlan);
		});
	});
});
