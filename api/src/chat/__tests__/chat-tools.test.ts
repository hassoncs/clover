import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArtifactService } from "../../agent/artifact-service";
import { createChatTools } from "../chat-tools";

type ExecutableTool<TInput, TOutput> = {
	execute: (input: TInput) => Promise<TOutput>;
};

type ListFilesResult = {
	ok: true;
	files: Array<{
		filename: string;
		size: number;
		uploaded: number;
		contentHash: null;
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

const GAME_ID = "test-game-id";

function createArtifactServiceMock() {
	return {
		listWorkspaceFileMeta: vi.fn<ArtifactService["listWorkspaceFileMeta"]>(),
		readWorkspaceFiles: vi.fn<ArtifactService["readWorkspaceFiles"]>(),
	} as unknown as ArtifactService;
}

describe("createChatTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("listFiles returns all files when no prefix is provided", async () => {
		const artifactService = createArtifactServiceMock();
		vi.mocked(artifactService.listWorkspaceFileMeta).mockResolvedValue([
			{ filename: "world.json", size: 128, uploaded: 1000 },
			{ filename: "prefabs/player.json", size: 256, uploaded: 2000 },
		]);

		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const listFilesTool = tools.listFiles as unknown as ExecutableTool<
			{ prefix?: string },
			ListFilesResult
		>;

		const result = await listFilesTool.execute({});

		expect(artifactService.listWorkspaceFileMeta).toHaveBeenCalledWith(GAME_ID);
		expect(result).toEqual({
			ok: true,
			files: [
				{
					filename: "world.json",
					size: 128,
					uploaded: 1000,
					contentHash: null,
				},
				{
					filename: "prefabs/player.json",
					size: 256,
					uploaded: 2000,
					contentHash: null,
				},
			],
		});
	});

	it("listFiles filters files by prefix", async () => {
		const artifactService = createArtifactServiceMock();
		vi.mocked(artifactService.listWorkspaceFileMeta).mockResolvedValue([
			{ filename: "world.json", size: 128, uploaded: 1000 },
			{ filename: "prefabs/player.json", size: 256, uploaded: 2000 },
			{ filename: "prefabs/enemy.json", size: 512, uploaded: 3000 },
			{ filename: "scripts/init.ts", size: 64, uploaded: 4000 },
		]);

		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const listFilesTool = tools.listFiles as unknown as ExecutableTool<
			{ prefix?: string },
			ListFilesResult
		>;

		const result = await listFilesTool.execute({ prefix: "prefabs/" });

		expect(artifactService.listWorkspaceFileMeta).toHaveBeenCalledWith(GAME_ID);
		expect(result.files).toEqual([
			{
				filename: "prefabs/player.json",
				size: 256,
				uploaded: 2000,
				contentHash: null,
			},
			{
				filename: "prefabs/enemy.json",
				size: 512,
				uploaded: 3000,
				contentHash: null,
			},
		]);
	});

	it("readFilesBatch returns content for existing files", async () => {
		const artifactService = createArtifactServiceMock();
		const filenames = ["world.json", "scripts/init.ts"];
		vi.mocked(artifactService.readWorkspaceFiles).mockResolvedValue(
			new Map([
				["world.json", '{"world":true}'],
				["scripts/init.ts", "export const init = true;"],
			]),
		);

		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readFilesBatchTool =
			tools.readFilesBatch as unknown as ExecutableTool<
				{ filenames: string[] },
				ReadFilesBatchResult
			>;

		const result = await readFilesBatchTool.execute({ filenames });

		expect(artifactService.readWorkspaceFiles).toHaveBeenCalledWith(
			GAME_ID,
			filenames,
		);
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
		const artifactService = createArtifactServiceMock();
		const filenames = ["world.json", "missing.json"];
		vi.mocked(artifactService.readWorkspaceFiles).mockResolvedValue(
			new Map([["world.json", '{"world":true}']]),
		);

		const tools = createChatTools({ gameId: GAME_ID, artifactService });
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
});
