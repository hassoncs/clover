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

function makeDesignDocument(
	overrides?: Partial<DesignDocument>,
): DesignDocument {
	return {
		version: "1.0",
		metadata: {
			title: "Test Design",
			gameId: GAME_ID,
			createdAt: 1000,
			updatedAt: 1000,
		},
		frames: [],
		...overrides,
	};
}

function encodeJson(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

describe("readDesignDocument", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns the parsed document when design.json exists", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDesignDocument({
			frames: [
				{
					id: "frame-1",
					title: "Home Screen",
					width: 375,
					height: 812,
					position: { x: 0, y: 0 },
					elements: [
						{
							type: "rect",
							id: "rect-1",
							x: 0,
							y: 0,
							width: 100,
							height: 50,
							zIndex: 0,
							fill: "#ff0000",
						},
					],
				},
			],
		});
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.readDesignDocument as unknown as ExecutableTool<
			Record<string, never>,
			{ ok: boolean; document?: DesignDocument; error?: string }
		>;

		const result = await tool.execute({});

		expect(gitService.readFile).toHaveBeenCalledWith(GAME_ID, "design.json");
		expect(result.ok).toBe(true);
		expect(result.document).toMatchObject({
			version: "1.0",
			frames: [{ id: "frame-1", title: "Home Screen" }],
		});
	});

	it("returns not found error when design.json does not exist", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(null);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.readDesignDocument as unknown as ExecutableTool<
			Record<string, never>,
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({});

		expect(result.ok).toBe(false);
		expect(result.error).toBe("not found");
	});
});

describe("updateDesignElement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("updates fill property on a rect element successfully", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDesignDocument({
			frames: [
				{
					id: "frame-1",
					title: "Home Screen",
					width: 375,
					height: 812,
					position: { x: 0, y: 0 },
					elements: [
						{
							type: "rect",
							id: "rect-1",
							x: 10,
							y: 20,
							width: 100,
							height: 50,
							zIndex: 0,
							fill: "#aaaaaa",
						},
					],
				},
			],
		});
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));
		vi.mocked(gitService.commitFiles).mockResolvedValue("commit-sha-abc");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{
				ok: boolean;
				diff?: { elementId: string; changes: Record<string, unknown> };
				error?: string;
			}
		>;

		const result = await tool.execute({
			frameId: "frame-1",
			elementId: "rect-1",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(true);
		expect(result.diff).toEqual({
			elementId: "rect-1",
			changes: { fill: "#ff0000" },
		});
		expect(gitService.commitFiles).toHaveBeenCalledWith(
			GAME_ID,
			[
				expect.objectContaining({
					path: "design.json",
					content: expect.stringContaining('"#ff0000"'),
				}),
			],
			"AI: Update design element rect-1",
			{ name: "AI Assistant", email: "ai@slopcade.app" },
		);
	});

	it("returns structured error when elementId is not found", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDesignDocument({
			frames: [
				{
					id: "frame-1",
					title: "Home Screen",
					width: 375,
					height: 812,
					position: { x: 0, y: 0 },
					elements: [],
				},
			],
		});
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({
			frameId: "frame-1",
			elementId: "nonexistent-element",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain("element not found: nonexistent-element");
		expect(gitService.commitFiles).not.toHaveBeenCalled();
	});

	it("returns structured error when frameId is not found", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDesignDocument({ frames: [] });
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({
			frameId: "missing-frame",
			elementId: "rect-1",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain("element not found: rect-1");
		expect(gitService.commitFiles).not.toHaveBeenCalled();
	});

	it("returns not found when design.json does not exist", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(null);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.updateDesignElement as unknown as ExecutableTool<
			{ frameId: string; elementId: string; updates: Record<string, unknown> },
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({
			frameId: "frame-1",
			elementId: "rect-1",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(false);
		expect(result.error).toBe("not found");
	});
});

describe("addDesignFrame", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("adds a new frame with a generated ID", async () => {
		const gitService = createGitServiceMock();
		const doc = makeDesignDocument({ frames: [] });
		vi.mocked(gitService.readFile).mockResolvedValue(encodeJson(doc));
		vi.mocked(gitService.commitFiles).mockResolvedValue("commit-sha-xyz");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.addDesignFrame as unknown as ExecutableTool<
			{ title: string; width: number; height: number },
			{ ok: boolean; frameId?: string; error?: string }
		>;

		const result = await tool.execute({
			title: "Settings Screen",
			width: 375,
			height: 812,
		});

		expect(result.ok).toBe(true);
		expect(typeof result.frameId).toBe("string");
		expect(result.frameId!.length).toBeGreaterThan(0);

		const [, committedFiles] = vi.mocked(gitService.commitFiles).mock.calls[0];
		const written = JSON.parse(
			(committedFiles as Array<{ path: string; content: string }>)[0].content,
		);
		expect(written.frames).toHaveLength(1);
		expect(written.frames[0].title).toBe("Settings Screen");
		expect(written.frames[0].id).toBe(result.frameId);
		expect(written.frames[0].elements).toEqual([]);
	});

	it("returns not found when design.json does not exist", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(null);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const tool = tools.addDesignFrame as unknown as ExecutableTool<
			{ title: string; width: number; height: number },
			{ ok: boolean; error?: string }
		>;

		const result = await tool.execute({
			title: "New Frame",
			width: 375,
			height: 812,
		});

		expect(result.ok).toBe(false);
		expect(result.error).toBe("not found");
	});
});
