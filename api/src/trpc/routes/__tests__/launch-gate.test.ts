import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAuthenticatedCaller,
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	setupWalletBalance,
	TEST_USER,
	TEST_USER_2,
} from "../../../__fixtures__/test-utils";
import { USER_COSTS } from "../../../economy/pricing";

vi.mock("../../../ai/game/generator", () => ({
	generateGame: vi.fn().mockResolvedValue({
		success: true,
		game: {
			metadata: { id: "test-game", title: "Test Game" },
			prefabs: {},
			entities: [],
		},
	}),
	getAIConfigFromEnv: vi.fn().mockReturnValue({
		provider: "openai",
		apiKey: "sk-dummy",
	}),
}));

describe("MVP Launch Gate - Security Smoke Suite", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await initTestDatabase();
		// Provide dummy API key to pass AI config check
		testEnv.OPENAI_API_KEY = "sk-dummy-key";
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM credit_transactions").run();
		await testEnv.DB.prepare("DELETE FROM user_wallets").run();
		await testEnv.DB.prepare("DELETE FROM games").run();
		await testEnv.DB.prepare("DELETE FROM audit_events").run();
		await testEnv.DB.prepare("DELETE FROM email_invites").run();
		await testEnv.DB.prepare("DELETE FROM users").run();

		await createTestUser(TEST_USER);
		await createTestUser(TEST_USER_2);
	});

	describe("1. Moderation Gate", () => {
		it("rejects blocked prompts in games.generate", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			await expect(
				caller.games.generate({
					prompt: "Create a porn game",
				}),
			).rejects.toThrow("safety guidelines");
		});

		it("allows safe prompts in games.generate", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			await setupWalletBalance(
				TEST_USER.id,
				USER_COSTS.GAME_GENERATION_BASE * 2,
			);

			const result = await caller.games.generate({
				prompt: "Create a simple space shooter game",
			});
			expect(result.game).toBeDefined();
		});
	});

	describe("2. Billing Gate", () => {
		it("blocks operations when balance is zero", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			await setupWalletBalance(TEST_USER.id, 0);

			await expect(
				caller.games.generate({
					prompt: "Create a game",
				}),
			).rejects.toThrow("Insufficient balance");
		});

		it("allows operations when balance is sufficient", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);
			await setupWalletBalance(TEST_USER.id, USER_COSTS.GAME_GENERATION_BASE);

			const result = await caller.games.generate({
				prompt: "Create a game",
			});
			expect(result.game).toBeDefined();
		});
	});

	describe("3. Admin Gate", () => {
		it("rejects non-admin users from admin routes", async () => {
			// TEST_USER is not an admin by default (ADMIN_EMAILS not set to include it)
			const caller = createAuthenticatedCaller(TEST_USER);

			// Mock ADMIN_EMAILS to NOT include TEST_USER
			const originalAdminEmails = testEnv.ADMIN_EMAILS;
			testEnv.ADMIN_EMAILS = "admin@slopcade.com";

			await expect(
				caller.admin.backfillContentHash({ batchSize: 1 }),
			).rejects.toThrow("Admin access required");

			testEnv.ADMIN_EMAILS = originalAdminEmails;
		});

		it("allows admin users to access admin routes", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			// Mock ADMIN_EMAILS to include TEST_USER
			const originalAdminEmails = testEnv.ADMIN_EMAILS;
			testEnv.ADMIN_EMAILS = TEST_USER.email;

			const result = await caller.admin.backfillContentHash({ batchSize: 1 });
			expect(result.processed).toBeDefined();

			testEnv.ADMIN_EMAILS = originalAdminEmails;
		});
	});

	describe("4. Invite Gate", () => {
		it("blocks uninvited users when REQUIRE_INVITE is true", async () => {
			const originalRequireInvite = testEnv.REQUIRE_INVITE;
			testEnv.REQUIRE_INVITE = "true";

			const caller = createAuthenticatedCaller(TEST_USER_2);

			await expect(caller.users.syncFromAuth()).rejects.toThrow(
				"not been invited",
			);

			testEnv.REQUIRE_INVITE = originalRequireInvite;
		});

		it("allows invited users when REQUIRE_INVITE is true", async () => {
			const originalRequireInvite = testEnv.REQUIRE_INVITE;
			testEnv.REQUIRE_INVITE = "true";

			// Invite TEST_USER_2
			await testEnv.DB.prepare(
				"INSERT INTO email_invites (id, inviter_user_id, invitee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			)
				.bind(
					"test-invite-id",
					TEST_USER.id,
					TEST_USER_2.email.toLowerCase(),
					"pending",
					Date.now(),
					Date.now(),
				)
				.run();

			const caller = createAuthenticatedCaller(TEST_USER_2);
			const result = await caller.users.syncFromAuth();
			expect(result.synced).toBe(true);

			testEnv.REQUIRE_INVITE = originalRequireInvite;
		});
	});

	describe("5. Audit Gate", () => {
		it("emits audit events for admin actions", async () => {
			const caller = createAuthenticatedCaller(TEST_USER);

			// Mock ADMIN_EMAILS to include TEST_USER
			const originalAdminEmails = testEnv.ADMIN_EMAILS;
			testEnv.ADMIN_EMAILS = TEST_USER.email;

			await caller.admin.backfillContentHash({ batchSize: 1 });

			const allEvents = await testEnv.DB.prepare(
				"SELECT * FROM audit_events",
			).all<any>();
			console.log(
				"All audit events:",
				JSON.stringify(allEvents.results, null, 2),
			);

			const auditEvent = await testEnv.DB.prepare(
				"SELECT * FROM audit_events WHERE actor_id = ? AND action = ?",
			)
				.bind(TEST_USER.id, "admin.backfill_content_hash")
				.first<any>();

			expect(auditEvent).not.toBeNull();
			expect(auditEvent.actor_id).toBe(TEST_USER.id);

			testEnv.ADMIN_EMAILS = originalAdminEmails;
		});
	});
});
