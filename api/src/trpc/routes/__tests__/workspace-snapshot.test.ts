import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import validProjectileGame from "../../../__fixtures__/games/valid-projectile-game.json";
import {
	createAuthenticatedCaller,
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import { WorkspaceScaffoldService } from "../../../services/WorkspaceScaffoldService";

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
) {
	const now = Date.now();
	await env.DB.prepare(
		"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
	)
		.bind(gameId, TEST_USER.id, title, `games/${gameId}`, now, now)
		.run();
}

describe("Workspace Snapshot", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await initTestDatabase();
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM messages").run();
		await testEnv.DB.prepare("DELETE FROM threads").run();
		await testEnv.DB.prepare("DELETE FROM games").run();

		await createTestUser(TEST_USER);
	});

	it("scaffold seeds files for new game", async () => {
		const gameId = crypto.randomUUID();
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
		const result = await service.seedIfMissing({
			gameId,
			gameTitle: "Scaffold Game",
		});

		expect(result.created).toEqual(SCAFFOLD_FILES);
		expect(result.skipped).toEqual([]);
	});

	it("scaffold is idempotent", async () => {
		const gameId = crypto.randomUUID();
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
		await service.seedIfMissing({ gameId });
		const secondRun = await service.seedIfMissing({ gameId });

		expect(secondRun.created).toEqual([]);
		expect(secondRun.skipped).toEqual(SCAFFOLD_FILES);
	});

	it("snapshot returns all workspace files", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const gameId = crypto.randomUUID();
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
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
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
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
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
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
		await createTestGame(testEnv, gameId);

		const service = new WorkspaceScaffoldService(testEnv.ASSETS);
		await service.seedIfMissing({ gameId });

		const first = await caller.chatThreads.getWorkspaceSnapshot({ gameId });
		expect(first.changed).toBe(true);
		if (!first.changed) {
			throw new Error("Expected initial snapshot to be returned");
		}

		await testEnv.ASSETS.put(
			`games/${gameId}/workspace/scripts/new-script.js`,
			"exports.onUpdate = function() { return 1; };",
			{
				httpMetadata: { contentType: "text/javascript" },
			},
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

		const listed = await testEnv.ASSETS.list({
			prefix: `games/${game.id}/workspace/`,
		});
		const filenames = listed.objects
			.map((obj) => obj.key.replace(`games/${game.id}/workspace/`, ""))
			.sort();

		expect(filenames).toEqual([...SCAFFOLD_FILES].sort());
	});
});
