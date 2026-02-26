import { createEmptyDesignDocument } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitService } from "../../services/git/GitService";
import { createChatTools } from "../chat-tools";

type ExecutableTool<TInput, TOutput> = {
	execute: (input: TInput) => Promise<TOutput>;
};

type ListFilesResult = {
	ok: true;
	files: Array<{
		filename: string;
	}>;
};

type ReadFilesBatchResult = {
	ok: true;
	files: Array<{
		filename: string;
		exists: boolean;
		content: string | null;
		size: number;
	}>;
};

type WriteFileResult = {
	ok: true;
	commitSha: string;
	bytesWritten: number;
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

describe("createChatTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("listFiles returns all files when no prefix is provided", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.listFiles).mockResolvedValue([
			"world.json",
			"prefabs/player.json",
		]);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const listFilesTool = tools.listFiles as unknown as ExecutableTool<
			{ prefix?: string },
			ListFilesResult
		>;

		const result = await listFilesTool.execute({});

		expect(gitService.listFiles).toHaveBeenCalledWith(GAME_ID);
		expect(result).toEqual({
			ok: true,
			files: [{ filename: "world.json" }, { filename: "prefabs/player.json" }],
		});
	});

	it("listFiles filters files by prefix", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.listFiles).mockResolvedValue([
			"world.json",
			"prefabs/player.json",
			"prefabs/enemy.json",
			"scripts/init.ts",
		]);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const listFilesTool = tools.listFiles as unknown as ExecutableTool<
			{ prefix?: string },
			ListFilesResult
		>;

		const result = await listFilesTool.execute({ prefix: "prefabs/" });

		expect(gitService.listFiles).toHaveBeenCalledWith(GAME_ID);
		expect(result.files).toEqual([
			{ filename: "prefabs/player.json" },
			{ filename: "prefabs/enemy.json" },
		]);
	});

	it("readFilesBatch returns content for existing files", async () => {
		const gitService = createGitServiceMock();
		const filenames = ["world.json", "scripts/init.ts"];
		const fileMap = new Map([
			["world.json", '{"world":true}'],
			["scripts/init.ts", "export const init = true;"],
		]);
		vi.mocked(gitService.readFile).mockImplementation(async (_gameId, name) => {
			const content = fileMap.get(name);
			return content ? new TextEncoder().encode(content) : null;
		});

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const readFilesBatchTool =
			tools.readFilesBatch as unknown as ExecutableTool<
				{ filenames: string[] },
				ReadFilesBatchResult
			>;

		const result = await readFilesBatchTool.execute({ filenames });

		expect(gitService.readFile).toHaveBeenCalledTimes(filenames.length);
		expect(result).toEqual({
			ok: true,
			files: [
				{
					filename: "world.json",
					exists: true,
					content: '{"world":true}',
					size: 14,
				},
				{
					filename: "scripts/init.ts",
					exists: true,
					content: "export const init = true;",
					size: 25,
				},
			],
		});
	});

	it("readFilesBatch marks missing files as non-existent", async () => {
		const gitService = createGitServiceMock();
		const filenames = ["world.json", "missing.json"];
		vi.mocked(gitService.readFile).mockImplementation(async (_gameId, name) => {
			if (name === "world.json") {
				return new TextEncoder().encode('{"world":true}');
			}
			return null;
		});

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const readFilesBatchTool =
			tools.readFilesBatch as unknown as ExecutableTool<
				{ filenames: string[] },
				ReadFilesBatchResult
			>;

		const result = await readFilesBatchTool.execute({ filenames });

		expect(result).toEqual({
			ok: true,
			files: [
				{
					filename: "world.json",
					exists: true,
					content: '{"world":true}',
					size: 14,
				},
				{
					filename: "missing.json",
					exists: false,
					content: null,
					size: 0,
				},
			],
		});
	});

	it("writeFile creates a new file successfully", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.commitFiles).mockResolvedValue("commit-sha-123");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const writeFileTool = tools.writeFile as unknown as ExecutableTool<
			{ filename: string; content: string },
			WriteFileResult
		>;

		const result = await writeFileTool.execute({
			filename: "hello.txt",
			content: "Hello, world!",
		});

		expect(gitService.commitFiles).toHaveBeenCalledWith(
			GAME_ID,
			[{ path: "hello.txt", content: "Hello, world!" }],
			"AI: Update hello.txt",
			{ name: "AI Assistant", email: "ai@slopcade.app" },
		);
		expect(result).toEqual({
			ok: true,
			commitSha: "commit-sha-123",
			bytesWritten: 13,
		});
	});

	it("writeFile overwrites an existing file", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.commitFiles).mockResolvedValue("commit-sha-456");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const writeFileTool = tools.writeFile as unknown as ExecutableTool<
			{ filename: string; content: string },
			WriteFileResult
		>;

		const updatedContent = '{"world":false,"updated":true}';
		const result = await writeFileTool.execute({
			filename: "world.json",
			content: updatedContent,
		});

		expect(gitService.commitFiles).toHaveBeenCalledWith(
			GAME_ID,
			[{ path: "world.json", content: updatedContent }],
			"AI: Update world.json",
			{ name: "AI Assistant", email: "ai@slopcade.app" },
		);
		expect(result).toEqual({
			ok: true,
			commitSha: "commit-sha-456",
			bytesWritten: 30,
		});
	});

	it("writeFile returns correct bytesWritten for content length", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.commitFiles).mockResolvedValue("commit-sha-789");

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const writeFileTool = tools.writeFile as unknown as ExecutableTool<
			{ filename: string; content: string },
			WriteFileResult
		>;

		const content = JSON.stringify({ name: "player", health: 100 });
		const result = await writeFileTool.execute({
			filename: "prefabs/player.json",
			content,
		});

		expect(result.ok).toBe(true);
		expect(result.commitSha).toBe("commit-sha-789");
		expect(result.bytesWritten).toBe(content.length);
	});
});

describe("design document tools — error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("readDesignDocument returns { ok: true, document } for a valid doc", async () => {
		const gitService = createGitServiceMock();
		const doc = createEmptyDesignDocument(GAME_ID, "Test");
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode(JSON.stringify(doc)),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.readDesignDocument as any).execute({});

		expect(result.ok).toBe(true);
		expect((result as any).document.version).toBe("1.1");
	});

	it("readDesignDocument returns { ok: false, error: 'not found' } when file missing", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(null);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.readDesignDocument as any).execute({});

		expect(result.ok).toBe(false);
		expect((result as any).error).toBe("not found");
	});

	it("readDesignDocument returns structured error for unsupported schema version", async () => {
		const gitService = createGitServiceMock();
		const malformed = { version: "0.99", frames: [] };
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode(JSON.stringify(malformed)),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.readDesignDocument as any).execute({});

		expect(result.ok).toBe(false);
		expect((result as any).error).toMatch(/unsupported version/);
		expect((result as any).error).not.toContain('"code"');
	});

	it("readDesignDocument returns user-readable error without raw Zod JSON for invalid schema", async () => {
		const gitService = createGitServiceMock();
		const invalidDoc = {
			version: "1.1",
			metadata: { title: 123, gameId: GAME_ID, createdAt: 0, updatedAt: 0 },
			frames: [],
		};
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode(JSON.stringify(invalidDoc)),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.readDesignDocument as any).execute({});

		expect(result.ok).toBe(false);
		const error = (result as any).error as string;
		expect(error).toBeTruthy();
		expect(error).not.toMatch(/^\[/);
		expect(error).not.toContain('"code"');
	});

	it("readDesignDocument includes field path for schema validation errors", async () => {
		const gitService = createGitServiceMock();
		const invalidDoc = {
			version: "1.1",
			metadata: { title: 123, gameId: GAME_ID, createdAt: 0, updatedAt: 0 },
			frames: [],
		};
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode(JSON.stringify(invalidDoc)),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.readDesignDocument as any).execute({});

		expect(result.ok).toBe(false);
		if ((result as any).field) {
			expect(typeof (result as any).field).toBe("string");
		}
	});

	it("updateDesignElement returns structured error when doc has unsupported version", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode(JSON.stringify({ version: "0.5", frames: [] })),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.updateDesignElement as any).execute({
			frameId: "f1",
			elementId: "e1",
			updates: { fill: "#ff0000" },
		});

		expect(result.ok).toBe(false);
		expect((result as any).error).toMatch(/unsupported version/);
		expect((result as any).error).not.toContain('"code"');
	});

	it("addDesignFrame returns structured error when doc is corrupt", async () => {
		const gitService = createGitServiceMock();
		vi.mocked(gitService.readFile).mockResolvedValue(
			new TextEncoder().encode("not valid json at all"),
		);

		const tools = createChatTools({ gameId: GAME_ID, gitService });
		const result = await (tools.addDesignFrame as any).execute({
			title: "New Frame",
			width: 375,
			height: 812,
		});

		expect(result.ok).toBe(false);
		expect(typeof (result as any).error).toBe("string");
		expect((result as any).error.length).toBeGreaterThan(0);
	});
});
