import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import validProjectileGame from "../../../__fixtures__/games/valid-projectile-game.json";
import {
	createAuthenticatedCaller,
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import { GitService } from "../../../services/git/GitService";
import { WorkspaceScaffoldService } from "../../../services/WorkspaceScaffoldService";

type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

vi.mock("../../../services/git/GitService", () => {
	class GitServiceMock {
		static repoStore = new Map<string, Map<string, string>>();
		static reset() {
			GitServiceMock.repoStore.clear();
		}

		constructor(_namespace: unknown) {}

		async initRepo(gameId: string): Promise<void> {
			if (!GitServiceMock.repoStore.has(gameId)) {
				GitServiceMock.repoStore.set(gameId, new Map());
			}
		}

		async commitFiles(
			gameId: string,
			files: Array<{ path: string; content: string }>,
		): Promise<string> {
			const repo = GitServiceMock.repoStore.get(gameId) ?? new Map();
			for (const file of files) {
				repo.set(file.path, file.content);
			}
			GitServiceMock.repoStore.set(gameId, repo);
			return this.computeRevision(repo);
		}

		async listFiles(gameId: string): Promise<string[]> {
			const repo = GitServiceMock.repoStore.get(gameId);
			if (!repo) return [];
			return Array.from(repo.keys()).sort();
		}

		async readFile(gameId: string, path: string): Promise<Uint8Array | null> {
			const repo = GitServiceMock.repoStore.get(gameId);
			if (!repo) return null;
			const content = repo.get(path);
			if (content == null) return null;
			return new TextEncoder().encode(content);
		}

		async getSnapshot(
			gameId: string,
			sinceRevision?: string,
		): Promise<{
			changed: boolean;
			revision: string;
			files?: Array<{
				filename: string;
				content: string;
				contentHash: string;
				size: number;
			}>;
		}> {
			const repo = GitServiceMock.repoStore.get(gameId) ?? new Map();
			const revision = this.computeRevision(repo);
			if (sinceRevision && sinceRevision === revision) {
				return { changed: false, revision };
			}
			const files = Array.from(repo.entries()).map(([filename, content]) => ({
				filename,
				content,
				contentHash: this.computeContentHash(content),
				size: content.length,
			}));
			return { changed: true, revision, files };
		}

		private computeRevision(repo: Map<string, string>): string {
			let hash = 0x811c9dc5;
			for (const [name, content] of Array.from(repo.entries()).sort((a, b) =>
				a[0].localeCompare(b[0]),
			)) {
				const str = `${name}|${content.length}`;
				for (let i = 0; i < str.length; i++) {
					hash ^= str.charCodeAt(i);
					hash = Math.imul(hash, 0x01000193);
				}
			}
			return (hash >>> 0).toString(16).padStart(8, "0");
		}

		private computeContentHash(content: string): string {
			let hash = 0x811c9dc5;
			for (let i = 0; i < content.length; i++) {
				hash ^= content.charCodeAt(i);
				hash = Math.imul(hash, 0x01000193);
			}
			return (hash >>> 0).toString(16).padStart(8, "0");
		}
	}

	return { GitService: GitServiceMock };
});

const SCAFFOLD_FILES = [
	"slopcade.json",
	"world.json",
	"entities.json",
	"prefabs/default.json",
	"scripts/main.js",
	"effects/screen.json",
] as const;

type TestEnv = ReturnType<typeof createAuthenticatedContext>["env"];

async function createTestGame(
	env: TestEnv,
	gameId: string,
	title = "Test Game",
	gitService?: GitService,
) {
	const now = Date.now();
	await env.DB.prepare(
		"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
	)
		.bind(gameId, TEST_USER.id, title, `games/${gameId}`, now, now)
		.run();

	if (gitService) {
		await gitService.initRepo(gameId);
	}
}

describe("Workspace Snapshot", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await initTestDatabase();
		testEnv.GAME_REPO = {} as DurableObjectNamespace;
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM messages").run();
		await testEnv.DB.prepare("DELETE FROM threads").run();
		await testEnv.DB.prepare("DELETE FROM games").run();

		await createTestUser(TEST_USER);
		(GitService as unknown as { reset: () => void }).reset();
		vi.clearAllMocks();
	});

	it("scaffold seeds files for new game", async () => {
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		const result = await service.seedIfMissing({
			gameId,
			gameTitle: "Scaffold Game",
		});

		expect(result.created).toEqual(SCAFFOLD_FILES);
		expect(result.skipped).toEqual([]);
	});

	it("scaffold is idempotent", async () => {
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		await service.seedIfMissing({ gameId });
		const secondRun = await service.seedIfMissing({ gameId });

		expect(secondRun.created).toEqual([]);
		expect(secondRun.skipped).toEqual(SCAFFOLD_FILES);
	});

	it("snapshot returns all workspace files", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		await service.seedIfMissing({ gameId });

		const result = await caller.chatThreads.getWorkspaceSnapshot({ gameId });

		expect(result.changed).toBe(true);
		if (!result.changed) {
			throw new Error("Expected snapshot to be returned");
		}

		expect(result.snapshot.files).toHaveLength(6);
		expect(result.snapshot.revision).toMatch(/^[0-9a-f]+$/i);
	});

	it("snapshot sinceRevision short-circuit", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		await service.seedIfMissing({ gameId });

		const first = await caller.chatThreads.getWorkspaceSnapshot({ gameId });
		expect(first.changed).toBe(true);
		if (!first.changed) {
			throw new Error("Expected initial snapshot to be returned");
		}

		const second = await caller.chatThreads.getWorkspaceSnapshot({
			gameId,
			sinceRevision: first.snapshot.revision,
		});

		expect(second).toEqual({ changed: false });
	});

	it("revision is deterministic", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		await service.seedIfMissing({ gameId });

		const first = await caller.chatThreads.getWorkspaceSnapshot({ gameId });
		const second = await caller.chatThreads.getWorkspaceSnapshot({ gameId });

		expect(first.changed).toBe(true);
		expect(second.changed).toBe(true);
		if (!first.changed || !second.changed) {
			throw new Error("Expected snapshots to be returned");
		}

		expect(first.snapshot.revision).toBe(second.snapshot.revision);
	});

	it("revision changes when file content changes", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const gameId = crypto.randomUUID();
		const gitService = new GitService(testEnv.GAME_REPO);
		await createTestGame(testEnv, gameId, "Test Game", gitService);

		const service = new WorkspaceScaffoldService(gitService);
		await service.seedIfMissing({ gameId });

		const first = await caller.chatThreads.getWorkspaceSnapshot({ gameId });
		expect(first.changed).toBe(true);
		if (!first.changed) {
			throw new Error("Expected initial snapshot to be returned");
		}

		await gitService.commitFiles(
			gameId,
			[
				{
					path: "scripts/new-script.js",
					content: "exports.onUpdate = function() { return 1; };",
				},
			],
			"Add new script",
			{ name: "Test", email: "test@example.com" },
		);

		const second = await caller.chatThreads.getWorkspaceSnapshot({ gameId });
		expect(second.changed).toBe(true);
		if (!second.changed) {
			throw new Error("Expected updated snapshot to be returned");
		}

		expect(second.snapshot.revision).not.toBe(first.snapshot.revision);
	});

	it("game create triggers workspace scaffold", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);

		const game = await caller.games.create({
			title: "Created Game",
			definition: JSON.stringify(validProjectileGame),
			isPublic: false,
		});
		const gitService = new GitService(testEnv.GAME_REPO);
		const filenames = (await gitService.listFiles(game.id)).sort();

		expect(filenames).toEqual([...SCAFFOLD_FILES].sort());
	});
});
