/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createPublicContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import type { Env } from "../../context";
import { appRouter } from "../../router";

async function ensureUserColumn(
	testEnv: Env,
	column: string,
	type: string,
): Promise<void> {
	const info = await testEnv.DB.prepare("PRAGMA table_info(users)").all<{
		name: string;
	}>();
	const existing = new Set(info.results.map((row) => row.name));
	if (!existing.has(column)) {
		await testEnv.DB.prepare(
			`ALTER TABLE users ADD COLUMN ${column} ${type}`,
		).run();
	}
}

describe("Billing Router", () => {
	const testEnv = env as Env;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
		await ensureUserColumn(testEnv, "pro_subscription_until", "INTEGER");
		await ensureUserColumn(testEnv, "pro_source", "TEXT");
		await ensureUserColumn(testEnv, "stripe_customer_id", "TEXT");
		await testEnv.DB.prepare(
			`CREATE TABLE IF NOT EXISTS party_hosting_sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				room_code TEXT,
				created_at INTEGER NOT NULL
			)`,
		).run();
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM email_waitlist").run();
		await testEnv.DB.prepare("DELETE FROM party_hosting_sessions").run();
	});

	it("returns subscription status for authenticated users", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);

		const result = await caller.billing.getSubscriptionStatus();

		expect(result).toEqual({
			isPro: false,
			proUntil: null,
			source: null,
			hasStripeCustomer: false,
		});
	});

	it("returns remaining free sessions count", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);

		const result = await caller.billing.getFreeSessionsRemaining();

		expect(result.sessionsUsed).toBeGreaterThanOrEqual(0);
		expect(result.sessionsLimit).toBeGreaterThanOrEqual(0);
		expect(typeof result.resetsAt).toBe("number");
	});

	it("returns catalog plans", async () => {
		const caller = appRouter.createCaller(createPublicContext());

		const result = await caller.billing.getCatalog();

		expect(result.plans.length).toBeGreaterThan(0);
		expect(result.plans[0]?.id).toBeTruthy();
	});

	it("joins the waitlist and counts entries", async () => {
		const caller = appRouter.createCaller(createPublicContext());

		await caller.billing.joinWaitlist({ email: "waitlist@example.com" });
		const result = await caller.billing.getWaitlistCount();

		expect(result.count).toBe(1);
	});
});
