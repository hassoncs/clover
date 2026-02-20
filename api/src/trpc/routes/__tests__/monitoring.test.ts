/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import type { Env } from "../../context";
import { appRouter } from "../../router";

describe("Monitoring Router", () => {
	const testEnv = env as Env;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
	});

	const withAdmin = async (fn: () => Promise<void>) => {
		const originalAdminEmails = testEnv.ADMIN_EMAILS;
		testEnv.ADMIN_EMAILS = TEST_USER.email;
		try {
			await fn();
		} finally {
			testEnv.ADMIN_EMAILS = originalAdminEmails;
		}
	};

	it("returns health check data", async () => {
		await withAdmin(async () => {
			const caller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const result = await caller.monitoring.getHealthCheck();

			expect(result.status).toBe("ok");
			expect(result.database.connected).toBe(true);
		});
	});

	it("returns signup velocity stats", async () => {
		await withAdmin(async () => {
			const caller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const result = await caller.monitoring.getSignupVelocity();

			expect(Array.isArray(result.perDay)).toBe(true);
			expect(Array.isArray(result.perHour)).toBe(true);
		});
	});
});
