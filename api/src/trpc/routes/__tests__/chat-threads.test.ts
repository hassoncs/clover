import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAuthenticatedCaller,
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	setupWalletBalance,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import { USER_COSTS } from "../../../economy/pricing";

vi.mock("../../../services/git/GitService", () => {
	class GitService {
		constructor(_doNamespace: unknown) {}
		listFiles = vi.fn().mockResolvedValue([]);
		commitFiles = vi.fn().mockResolvedValue("commit-sha");
	}

	return { GitService };
});

describe("Chat Threads Router", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await initTestDatabase();
		testEnv.GAME_REPO = {} as typeof testEnv.GAME_REPO;
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM messages").run();
		await testEnv.DB.prepare("DELETE FROM threads").run();
		await testEnv.DB.prepare("DELETE FROM credit_transactions").run();
		await testEnv.DB.prepare("DELETE FROM user_wallets").run();
		await testEnv.DB.prepare("DELETE FROM games").run();
		await testEnv.DB.prepare("DELETE FROM users").run();

		await createTestUser(TEST_USER);
	});

	it("creates a thread for owned game", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const now = Date.now();
		const gameId = crypto.randomUUID();

		await testEnv.DB.prepare(
			"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(gameId, TEST_USER.id, "Test Game", `games/${gameId}`, now, now)
			.run();

		const result = await caller.chatThreads.createThread({
			gameId,
			title: "Test Thread",
		});

		expect(result.threadId).toBeDefined();

		const row = await testEnv.DB.prepare("SELECT * FROM threads WHERE id = ?")
			.bind(result.threadId)
			.first<{
				user_id: string;
				game_id: string;
				title: string | null;
				generation_stage: string;
			}>();

		expect(row?.user_id).toBe(TEST_USER.id);
		expect(row?.game_id).toBe(gameId);
		expect(row?.title).toBe("Test Thread");
		expect(row?.generation_stage).toBe("idle");
	});

	it("sends user messages and reads messages", async () => {
		const caller = createAuthenticatedCaller(TEST_USER);
		const now = Date.now();
		const gameId = crypto.randomUUID();

		await testEnv.DB.prepare(
			"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(gameId, TEST_USER.id, "Test Game", `games/${gameId}`, now, now)
			.run();

		await setupWalletBalance(TEST_USER.id, USER_COSTS.GAME_GENERATION_BASE);

		const { threadId } = await caller.chatThreads.createThread({ gameId });

		const sendResult = await caller.chatThreads.sendMessage({
			threadId,
			gameId,
			text: "Hello there",
		});

		expect(sendResult.threadId).toBe(threadId);

		const messagesResult = await caller.chatThreads.getMessages({
			threadId,
			afterSeq: 0,
		});

		expect(messagesResult.messages.length).toBeGreaterThan(0);
		expect(messagesResult.messages[0].seq).toBe(1);
		expect(messagesResult.messages[0].role).toBe("user");
	});

	describe("billing guards", () => {
		it("blocks sendMessage when user has insufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			const now = Date.now();
			const gameId = crypto.randomUUID();

			await testEnv.DB.prepare(
				"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			)
				.bind(gameId, TEST_USER.id, "Test Game", `games/${gameId}`, now, now)
				.run();

			await setupWalletBalance(TEST_USER.id, 0);

			await expect(
				caller.chatThreads.sendMessage({
					gameId,
					text: "Hello there",
				}),
			).rejects.toThrow("Insufficient balance");
		});

		it("allows sendMessage when user has sufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			const now = Date.now();
			const gameId = crypto.randomUUID();

			await testEnv.DB.prepare(
				"INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			)
				.bind(gameId, TEST_USER.id, "Test Game", `games/${gameId}`, now, now)
				.run();

			await setupWalletBalance(TEST_USER.id, USER_COSTS.GAME_GENERATION_BASE);

			const result = await caller.chatThreads.sendMessage({
				gameId,
				text: "Hello there",
			});

			expect(result.threadId).toBeDefined();
		});
	});
});
