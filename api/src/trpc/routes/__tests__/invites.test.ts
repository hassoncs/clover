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

describe("Invites Router", () => {
	const testEnv = env as Env;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM email_invites").run();
	});

	it("creates an invite and marks email as invited", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const publicCaller = appRouter.createCaller(createPublicContext());

		await caller.invites.create({ email: "invitee@example.com" });
		const result = await publicCaller.invites.isEmailInvited({
			email: "invitee@example.com",
		});

		expect(result.invited).toBe(true);
		expect(result.status).toBe("pending");
	});

	it("returns false for non-invited emails", async () => {
		const publicCaller = appRouter.createCaller(createPublicContext());

		const result = await publicCaller.invites.isEmailInvited({
			email: "missing@example.com",
		});

		expect(result).toEqual({ invited: false });
	});
});
