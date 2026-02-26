import type { DesignDocument } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitService } from "../../services/git/GitService";
import { createChatTools } from "../chat-tools";

type ExecutableTool<TInput, TOutput> = {
	execute: (input: TInput) => Promise<TOutput>;
};

const GAME_ID = "test-game-id";

function createGitServiceMock() {
	return {
		listFiles: vi.fn<GitService["listFiles"]>(),
		readFile: vi.fn<GitService["readFile"]>(),
		commitFiles: vi.fn<GitService["commitFiles"]>(),
		log: vi.fn<GitService["log"]>(),
	} as unknown as GitService;
}

function encodeJson(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

function makeDocWithElements(): DesignDocument {
	return {
		version: "1.0",
		metadata: {
			title: "Test Design",
			gameId: GAME_ID,
			createdAt: 1000,
			updatedAt: 1000,
		},
		frames: [
			{
				id: "frame-a",
				title: "Home Screen",
				width: 375,
				height: 812,
				position: { x: 0, y: 0 },
				elements: [
					{
						type: "rect",
						id: "btn-primary",
						x: 0,
						y: 0,
						width: 200,
						height: 50,
						zIndex: 1,
						fill: "#aaaaaa",
					},
				],
			},
			{
				id: "frame-b",
				title: "Settings Screen",
				width: 375,
				height: 812,
				position: { x: 400, y: 0 },
				elements: [
					{
						type: "rect",
						id: "btn-secondary",
						x: 10,
						y: 10,
						width: 100,
						height: 40,
						zIndex: 1,
						fill: "#cccccc",
					},
				],
			},
		],
	};
}

describe("getDesignSelectionContext — pre-resolved context", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns selected frame and element from designContext without calling onEditorCommand", async () => {
		const gitService = createGitServiceMock();
		const onEditorCommand = vi.fn();

		const tools = createChatTools({
			gameId: GAME_ID,
			gitService,
			onEditorCommand,
			designContext: {
				selectedFrameId: "frame-a",
				selectedElementId: "btn-primary",
			},
		});

		const tool = tools.getDesignSelectionContext as unknown as ExecutableTool<
			Record<string, never>,
			{ selectedFrameId: string | null; selectedElementId: string | null }
		>;

		const result = await tool.execute({});

		expect(result.selectedFrameId).toBe("frame-a");
		expect(result.selectedElementId).toBe("btn-primary");
		expect(onEditorCommand).not.toHaveBeenCalled();
	});

	it("returns nulls when designContext has no selection", async () => {
		const gitService = createGitServiceMock();

		const tools = createChatTools({
			gameId: GAME_ID,
			gitService,
			designContext: {
				selectedFrameId: null,
				selectedElementId: null,
			},
		});

		const tool = tools.getDesignSelectionContext as unknown as ExecutableTool<
			Record<string, never>,
			{ selectedFrameId: string | null; selectedElementId: string | null }
		>;

		const result = await tool.execute({});

		expect(result.selectedFrameId).toBeNull();
		expect(result.selectedElementId).toBeNull();
	});

	it("falls back to onEditorCommand when no designContext is provided", async () => {
		const gitService = createGitServiceMock();
		const onEditorCommand = vi
			.fn()
			.mockResolvedValue({
				selectedFrameId: "frame-x",
				selectedElementId: "el-x",
			});

		const tools = createChatTools({
			gameId: GAME_ID,
			gitService,
			onEditorCommand,
		});

		const tool = tools.getDesignSelectionContext as unknown as ExecutableTool<
			Record<string, never>,
			{ selectedFrameId: string | null; selectedElementId: string | null }
		>;

		const result = await tool.execute({});

		expect(onEditorCommand).toHaveBeenCalledWith({
			command: "getDesignSelection",
			payload: {},
		});
		expect(result.selectedFrameId).toBe("frame-x");
		expect(result.selectedElementId).toBe("el-x");
	});
});

describe("updateDesignElement — targeted edit with changedFields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns changedFields listing updated properties after successful update", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDocWithElements();
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));
		vi.mocked(gitService.commitFiles).mockResolvedValue("sha-abc");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{
				ok: boolean;
				elementId?: string;
				frameId?: string;
				changedFields?: string[];
				changes?: Record<string, unknown>;
				error?: string;
			}
		>;

		const result = await tool.execute({
			frameId: "frame-a",
			elementId: "btn-primary",
			updates: { fill: "#ff6600", strokeWidth: 2 },
		});

		expect(result.ok).toBe(true);
		expect(result.elementId).toBe("btn-primary");
		expect(result.frameId).toBe("frame-a");
		expect(result.changedFields).toEqual(
			expect.arrayContaining(["fill", "strokeWidth"]),
		);
		expect(result.changedFields).toHaveLength(2);
		expect(result.changes).toEqual({ fill: "#ff6600", strokeWidth: 2 });
	});

	it("only mutates the specified element — does not touch elements in other frames", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDocWithElements();
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));
		vi.mocked(gitService.commitFiles).mockResolvedValue("sha-abc");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; error?: string }
		>;

		await tool.execute({
			frameId: "frame-a",
			elementId: "btn-primary",
			updates: { fill: "#ff0000" },
		});

		const [[, files]] = vi.mocked(gitService.commitFiles).mock.calls;
		const written = JSON.parse(
			(files as Array<{ path: string; content: string }>)[0].content,
		) as DesignDocument;

		const frameA = written.frames.find((f) => f.id === "frame-a")!;
		const frameB = written.frames.find((f) => f.id === "frame-b")!;

		const btnPrimary = frameA.elements.find((e) => e.id === "btn-primary") as {
			fill?: string;
		};
		const btnSecondary = frameB.elements.find(
			(e) => e.id === "btn-secondary",
		) as {
			fill?: string;
		};

		expect(btnPrimary.fill).toBe("#ff0000");
		expect(btnSecondary.fill).toBe("#cccccc");
	});

	it("returns error when attempting to update an element using the wrong frameId", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDocWithElements();
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({
			frameId: "frame-b",
			elementId: "btn-primary",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain("btn-primary");
		expect(gitService.commitFiles).not.toHaveBeenCalled();
	});
});

describe("design iteration — selection context integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("selected element context is queryable before calling updateDesignElement", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDocWithElements();
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));
		vi.mocked(gitService.commitFiles).mockResolvedValue("sha-abc");

		const tools = createChatTools({
			gameId: GAME_ID,
			gitService,
			designContext: {
				selectedFrameId: "frame-a",
				selectedElementId: "btn-primary",
			},
		});

		const selectionTool =
			tools.getDesignSelectionContext as unknown as ExecutableTool<
				Record<string, never>,
				{ selectedFrameId: string | null; selectedElementId: string | null }
			>;
		const updateTool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; changedFields?: string[] }
		>;

		const selection = await selectionTool.execute({});
		expect(selection.selectedFrameId).toBe("frame-a");
		expect(selection.selectedElementId).toBe("btn-primary");

		const update = await updateTool.execute({
			frameId: selection.selectedFrameId!,
			elementId: selection.selectedElementId!,
			updates: { fill: "#00ff00" },
		});

		expect(update.ok).toBe(true);
		expect(update.changedFields).toContain("fill");
	});
});
