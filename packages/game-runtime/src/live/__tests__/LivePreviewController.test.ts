import type { GodotBridge } from "@slopcade/godot-bridge";
import type { WorkspaceSnapshot } from "@slopcade/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	LivePreviewController,
	type PreviewMode,
} from "../LivePreviewController";

const getWorkspaceSnapshotQueryMock = vi.fn();

const mockQueryClient = {
	chatThreads: {
		getWorkspaceSnapshot: {
			query: getWorkspaceSnapshotQueryMock,
		},
	},
};

function createSnapshot(
	revision: string,
	files: Array<{ filename: string; contentHash: string; content?: string }>,
): WorkspaceSnapshot {
	return {
		gameId: "game-1",
		revision,
		generatedAt: Date.now(),
		files: files.map((file) => ({
			filename: file.filename,
			content: file.content ?? "{}",
			contentHash: file.contentHash,
			size: (file.content ?? "{}").length,
			uploaded: Date.now(),
		})),
	};
}

function createMockBridge(): GodotBridge {
	return {
		setInspectMode: vi.fn(),
		setupWorld: vi.fn(),
		registerPrefabs: vi.fn(),
		loadEntities: vi.fn(),
		clearEntities: vi.fn(),
		hotSwapShader: vi.fn(),
	} as unknown as GodotBridge;
}

function createRuntime() {
	return {
		applyScript: vi.fn().mockResolvedValue(undefined),
	};
}

function getOrchestrator(controller: LivePreviewController) {
	return (
		controller as unknown as {
			orchestrator: {
				reloadTags: (
					tags: string[],
					hashes: Map<string, string>,
				) => Promise<void>;
				fullReset: (tags: string[]) => Promise<void>;
			} | null;
		}
	).orchestrator;
}

async function runNextPollTick(intervalMs = 1000): Promise<void> {
	await vi.advanceTimersByTimeAsync(intervalMs);
	await Promise.resolve();
}

describe("LivePreviewController", () => {
	const queryMock = getWorkspaceSnapshotQueryMock;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		LivePreviewController.destroy();
		LivePreviewController.configure(mockQueryClient);
	});

	afterEach(() => {
		LivePreviewController.destroy();
		vi.useRealTimers();
	});

	describe("singleton", () => {
		it("returns same instance via getInstance", () => {
			const first = LivePreviewController.getInstance();
			const second = LivePreviewController.getInstance();

			expect(first).toBe(second);
		});

		it("clears instance on destroy", () => {
			const first = LivePreviewController.getInstance();

			LivePreviewController.destroy();

			const second = LivePreviewController.getInstance();
			expect(first).not.toBe(second);
		});
	});

	describe("initialize", () => {
		it("sets loading state initially and transitions to loaded", async () => {
			queryMock.mockResolvedValueOnce({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const controller = LivePreviewController.getInstance();
			const bridge = createMockBridge();
			const initPromise = controller.initialize("game-1", bridge);

			expect(controller.getState().loadState).toBe("loading");

			await initPromise;
			expect(controller.getState().loadState).toBe("loaded");
		});

		it("transitions to error on failure", async () => {
			queryMock.mockRejectedValueOnce(new Error("network down"));

			const controller = LivePreviewController.getInstance();
			await expect(
				controller.initialize("game-1", createMockBridge()),
			).rejects.toThrow("network down");

			expect(controller.getState().loadState).toBe("error");
			expect(controller.getState().lastError).toBe("network down");
			expect(controller.getState().isPolling).toBe(false);
		});

		it("starts polling after success", async () => {
			queryMock.mockResolvedValue({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			expect(controller.getState().isPolling).toBe(true);
			expect(queryMock).toHaveBeenCalledTimes(1);

			await runNextPollTick();
			expect(queryMock).toHaveBeenCalledTimes(2);
		});

		it("calls setInspectMode(true) in edit mode", async () => {
			queryMock.mockResolvedValueOnce({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const bridge = createMockBridge();
			await LivePreviewController.getInstance().initialize("game-1", bridge, {
				mode: "author",
			});

			expect(bridge.setInspectMode).toHaveBeenCalledWith(true);
		});
	});

	describe("mode switching", () => {
		async function initializeInMode(mode: PreviewMode): Promise<{
			controller: LivePreviewController;
			bridge: GodotBridge;
		}> {
			queryMock.mockResolvedValueOnce({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const controller = LivePreviewController.getInstance();
			const bridge = createMockBridge();
			await controller.initialize("game-1", bridge, { mode });

			return { controller, bridge };
		}

		it("calls setInspectMode(false) when switching to play", async () => {
			const { controller, bridge } = await initializeInMode("author");

			await controller.setMode("live");

			expect(bridge.setInspectMode).toHaveBeenLastCalledWith(false);
		});

		it("calls setInspectMode(true) when switching to edit", async () => {
			const { controller, bridge } = await initializeInMode("live");

			await controller.setMode("author");

			expect(bridge.setInspectMode).toHaveBeenLastCalledWith(true);
		});

		it("triggers fullReset when switching to play mode", async () => {
			const { controller } = await initializeInMode("author");
			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			const fullResetSpy = vi.spyOn(orchestrator, "fullReset");
			await controller.setMode("live");

			expect(fullResetSpy).toHaveBeenCalledTimes(1);
			expect(controller.getState().mode).toBe("live");
		});
	});

	describe("polling", () => {
		it("fetches with sinceRevision after first poll", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({ changed: false });

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());
			await runNextPollTick();

			expect(queryMock).toHaveBeenNthCalledWith(1, {
				gameId: "game-1",
				sinceRevision: undefined,
			});
			expect(queryMock).toHaveBeenNthCalledWith(2, {
				gameId: "game-1",
				sinceRevision: "rev-1",
			});
		});

		it("skips processing when changed: false", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({ changed: false });

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			const fullResetSpy = vi.spyOn(orchestrator, "fullReset");
			const reloadTagsSpy = vi.spyOn(orchestrator, "reloadTags");

			await runNextPollTick();

			expect(fullResetSpy).toHaveBeenCalledTimes(0);
			expect(reloadTagsSpy).not.toHaveBeenCalled();
		});

		it("computes changed paths between snapshots", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
						{ filename: "scripts/main.js", contentHash: "h-script-1" },
					]),
				})
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-2", [
						{ filename: "world.json", contentHash: "h-world-1" },
						{ filename: "scripts/main.js", contentHash: "h-script-2" },
					]),
				});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			const reloadTagsSpy = vi.spyOn(orchestrator, "reloadTags");
			await runNextPollTick();

			expect(reloadTagsSpy).toHaveBeenCalledTimes(1);
			const [tags] = reloadTagsSpy.mock.calls[0];
			expect(tags).toContain("scripts");
			expect(tags).not.toContain("world");
		});

		it("uses incremental reload in edit mode", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-2", [
						{ filename: "world.json", contentHash: "h-world-2" },
					]),
				});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge(), {
				mode: "author",
			});

			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			const fullResetSpy = vi.spyOn(orchestrator, "fullReset");
			const reloadTagsSpy = vi.spyOn(orchestrator, "reloadTags");

			await runNextPollTick();

			expect(reloadTagsSpy).toHaveBeenCalledTimes(1);
			expect(fullResetSpy).toHaveBeenCalledTimes(0);
		});

		it("uses fullReset in play mode", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-2", [
						{ filename: "world.json", contentHash: "h-world-2" },
					]),
				});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge(), {
				mode: "live",
			});

			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			const fullResetSpy = vi.spyOn(orchestrator, "fullReset");
			const reloadTagsSpy = vi.spyOn(orchestrator, "reloadTags");

			await runNextPollTick();

			expect(fullResetSpy).toHaveBeenCalledTimes(1);
			expect(reloadTagsSpy).not.toHaveBeenCalled();
		});

		it("handles polling errors by setting error state", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockRejectedValueOnce(new Error("poll failed"));

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			await runNextPollTick();

			expect(controller.getState().loadState).toBe("error");
			expect(controller.getState().lastError).toBe("poll failed");
		});
	});

	describe("reset", () => {
		it("clears revision and forces full reload", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-2", [
						{ filename: "world.json", contentHash: "h-world-2" },
					]),
				});

			const controller = LivePreviewController.getInstance();
			const bridge = createMockBridge();
			await controller.initialize("game-1", bridge);

			const orchestrator = getOrchestrator(controller);
			if (!orchestrator) {
				throw new Error("orchestrator not initialized");
			}

			await controller.reset();

			expect(queryMock).toHaveBeenLastCalledWith({
				gameId: "game-1",
				sinceRevision: undefined,
			});
			expect(bridge.setupWorld).toHaveBeenCalledTimes(2);
			expect(controller.getState().revision).toBe("rev-2");
			expect(controller.getState().loadState).toBe("loaded");
		});

		it("recreates orchestrator", async () => {
			queryMock
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-1", [
						{ filename: "world.json", contentHash: "h-world-1" },
					]),
				})
				.mockResolvedValueOnce({
					changed: true,
					snapshot: createSnapshot("rev-2", [
						{ filename: "world.json", contentHash: "h-world-2" },
					]),
				});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge(), {
				runtime: createRuntime(),
			});

			const firstOrchestrator = getOrchestrator(controller);
			await controller.reset();
			const secondOrchestrator = getOrchestrator(controller);

			expect(firstOrchestrator).not.toBeNull();
			expect(secondOrchestrator).not.toBeNull();
			expect(firstOrchestrator).not.toBe(secondOrchestrator);
		});
	});

	describe("dispose", () => {
		it("stops polling and clears timeout", async () => {
			const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
			queryMock.mockResolvedValueOnce({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			controller.dispose();

			expect(clearTimeoutSpy).toHaveBeenCalled();
			expect(controller.getState().isPolling).toBe(false);
		});

		it("clears state", async () => {
			queryMock.mockResolvedValueOnce({
				changed: true,
				snapshot: createSnapshot("rev-1", [
					{ filename: "world.json", contentHash: "h-world-1" },
				]),
			});

			const controller = LivePreviewController.getInstance();
			await controller.initialize("game-1", createMockBridge());

			controller.dispose();

			expect(controller.getState()).toEqual({
				loadState: "idle",
				mode: "author",
				revision: null,
				lastError: null,
				isPolling: false,
			});
		});
	});
});
