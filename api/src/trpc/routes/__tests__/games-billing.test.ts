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

vi.mock("../../../ai", async () => {
	const actual =
		await vi.importActual<typeof import("../../../ai")>("../../../ai");
	const game = {
		metadata: { id: "test-game", title: "Test Game", version: "1.0.0" },
		prefabs: {},
		entities: [],
	};
	return {
		...actual,
		generateGame: vi.fn().mockResolvedValue({
			success: true,
			game,
			retryCount: 0,
		}),
		refineGame: vi.fn().mockResolvedValue({
			success: true,
			game,
			retryCount: 0,
		}),
		getAIConfigFromEnv: vi
			.fn()
			.mockReturnValue({ provider: "openrouter", apiKey: "test-key" }),
	};
});

describe("Games Router - Billing Guards", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await initTestDatabase();
		testEnv.OPENROUTER_API_KEY = "test-key";
		testEnv.AI_PROVIDER = "openrouter";
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM credit_transactions").run();
		await testEnv.DB.prepare("DELETE FROM games").run();
		await testEnv.DB.prepare("DELETE FROM user_wallets").run();
		await testEnv.DB.prepare("DELETE FROM users").run();

		await createTestUser(TEST_USER);
	});

	describe("generate endpoint", () => {
		it("blocks generation when user has insufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(TEST_USER.id, 0);

			await expect(
				caller.games.generate({
					prompt: "Create a simple platformer game",
				}),
			).rejects.toThrow(/Insufficient balance/);
		});

		it("allows generation when user has sufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			const balanceBefore = await testEnv.DB.prepare(
				"SELECT balance_micros FROM user_wallets WHERE user_id = ?",
			)
				.bind(TEST_USER.id)
				.first<{ balance_micros: number }>();

			const result = await caller.games.generate({
				prompt: "Create a simple platformer game",
			});

			expect(result.game).toBeDefined();

			const balanceAfter = await testEnv.DB.prepare(
				"SELECT balance_micros FROM user_wallets WHERE user_id = ?",
			)
				.bind(TEST_USER.id)
				.first<{ balance_micros: number }>();

			expect(balanceAfter?.balance_micros).toBeLessThan(
				balanceBefore?.balance_micros ?? 0,
			);

			const transaction = await testEnv.DB.prepare(
				"SELECT * FROM credit_transactions WHERE user_id = ? AND type = ?",
			)
				.bind(TEST_USER.id, "generation_debit")
				.first();

			expect(transaction).toBeDefined();
		});

		it("creates ledger entry with correct amount on successful generation", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			await caller.games.generate({
				prompt: "Create a simple platformer game",
			});

			const transaction = await testEnv.DB.prepare(
				"SELECT * FROM credit_transactions WHERE user_id = ? AND type = ? ORDER BY created_at DESC",
			)
				.bind(TEST_USER.id, "generation_debit")
				.first<{ amount_micros: number; reference_type: string }>();

			expect(transaction?.amount_micros).toBe(-USER_COSTS.GAME_GENERATION_BASE);
			expect(transaction?.reference_type).toBe("game_generation");
		});
	});

	describe("refine endpoint", () => {
		it("blocks refinement when user has insufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(TEST_USER.id, 0);

			const gameDefinition = JSON.stringify({
				metadata: { id: "test", title: "Test" },
				prefabs: {},
				entities: [],
			});

			await expect(
				caller.games.refine({
					gameDefinition,
					request: "Add a jumping mechanic",
				}),
			).rejects.toThrow(/Insufficient balance/);
		});

		it("allows refinement when user has sufficient balance", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			const gameDefinition = JSON.stringify({
				metadata: { id: "test", title: "Test" },
				prefabs: {},
				entities: [],
			});

			const balanceBefore = await testEnv.DB.prepare(
				"SELECT balance_micros FROM user_wallets WHERE user_id = ?",
			)
				.bind(TEST_USER.id)
				.first<{ balance_micros: number }>();

			const result = await caller.games.refine({
				gameDefinition,
				request: "Add a jumping mechanic",
			});

			expect(result.game).toBeDefined();

			const balanceAfter = await testEnv.DB.prepare(
				"SELECT balance_micros FROM user_wallets WHERE user_id = ?",
			)
				.bind(TEST_USER.id)
				.first<{ balance_micros: number }>();

			expect(balanceAfter?.balance_micros).toBeLessThan(
				balanceBefore?.balance_micros ?? 0,
			);
		});

		it("creates ledger entry with correct amount on successful refinement", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			const gameDefinition = JSON.stringify({
				metadata: { id: "test", title: "Test" },
				prefabs: {},
				entities: [],
			});

			await caller.games.refine({
				gameDefinition,
				request: "Add a jumping mechanic",
			});

			const transaction = await testEnv.DB.prepare(
				"SELECT * FROM credit_transactions WHERE user_id = ? AND type = ? ORDER BY created_at DESC",
			)
				.bind(TEST_USER.id, "generation_debit")
				.first<{ amount_micros: number; reference_type: string }>();

			expect(transaction?.amount_micros).toBe(-USER_COSTS.GAME_GENERATION_BASE);
			expect(transaction?.reference_type).toBe("game_refinement");
		});
	});
});
