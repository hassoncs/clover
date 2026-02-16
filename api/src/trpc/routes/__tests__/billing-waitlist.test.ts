import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createPublicContext,
	TEST_USER,
} from "../../../__fixtures__/test-utils";

import { appRouter } from "../../router";

describe("billing waitlist endpoints", () => {
	const testEnv = createAuthenticatedContext(TEST_USER).env;

	beforeAll(async () => {
		await testEnv.DB.prepare(
			"CREATE TABLE IF NOT EXISTS email_waitlist (id TEXT PRIMARY KEY, email TEXT NOT NULL, brand_id TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(email, brand_id))",
		).run();
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM email_waitlist").run();
	});

	it("returns brand-scoped waitlist count publicly", async () => {
		const now = Date.now();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w1", "a@amen.games", "amen", now)
			.run();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w2", "b@amen.games", "amen", now + 1)
			.run();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w3", "c@slopcade.com", "slopcade", now + 2)
			.run();

		const amenCaller = appRouter.createCaller({
			...createPublicContext(),
			brandId: "amen",
		});
		const slopcadeCaller = appRouter.createCaller(createPublicContext());

		await expect(amenCaller.billing.getWaitlistCount()).resolves.toEqual({
			count: 2,
		});
		await expect(slopcadeCaller.billing.getWaitlistCount()).resolves.toEqual({
			count: 1,
		});
	});

	it("blocks non-admin users from waitlist email export", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const originalAdminEmails = testEnv.ADMIN_EMAILS;
		testEnv.ADMIN_EMAILS = "admin@slopcade.com";

		await expect(caller.billing.getWaitlistEmails()).rejects.toThrow(
			"Admin access required",
		);

		testEnv.ADMIN_EMAILS = originalAdminEmails;
	});

	it("returns brand-scoped emails for admins", async () => {
		const now = Date.now();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w1", "first@amen.games", "amen", now)
			.run();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w2", "second@amen.games", "amen", now + 1)
			.run();
		await testEnv.DB.prepare(
			"INSERT INTO email_waitlist (id, email, brand_id, created_at) VALUES (?, ?, ?, ?)",
		)
			.bind("w3", "other@slopcade.com", "slopcade", now + 2)
			.run();

		const originalAdminEmails = testEnv.ADMIN_EMAILS;
		testEnv.ADMIN_EMAILS = TEST_USER.email;

		const amenCaller = appRouter.createCaller({
			...createAuthenticatedContext(TEST_USER),
			brandId: "amen",
		});

		await expect(amenCaller.billing.getWaitlistEmails()).resolves.toEqual({
			emails: ["second@amen.games", "first@amen.games"],
			count: 2,
		});

		testEnv.ADMIN_EMAILS = originalAdminEmails;
	});
});
