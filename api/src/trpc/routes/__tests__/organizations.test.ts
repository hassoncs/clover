/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
	TEST_USER_2,
} from "../../../__fixtures__/test-utils";
import type { Env } from "../../context";
import { appRouter } from "../../router";

const TEST_USER_3 = {
	id: "test-user-3-id",
	email: "test3@example.com",
	displayName: "Test User 3",
};

const TEST_USER_UUID = {
	id: "11111111-1111-1111-1111-111111111111",
	email: "uuid-user@example.com",
	displayName: "UUID User",
};

describe("Organizations Router", () => {
	const testEnv = env as Env;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
		await createTestUser(TEST_USER_2);
		await createTestUser(TEST_USER_3);
		await createTestUser(TEST_USER_UUID);
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM organization_members").run();
		await testEnv.DB.prepare("DELETE FROM organizations").run();
	});

	it("creates an organization and lists it in listMyOrgs", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);

		const created = await caller.organizations.create({
			name: `Grace Community ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const list = await caller.organizations.listMyOrgs();

		expect(list.some((org) => org.id === created.id)).toBe(true);
	});

	it("joins an organization by join code", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_2),
		);

		const created = await adminCaller.organizations.create({
			name: `Join Code Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const joinCode = created.joinCode;
		if (!joinCode) {
			throw new Error("Expected join code to be generated");
		}

		const joinResult = await memberCaller.organizations.join({
			joinCode,
		});

		const list = await memberCaller.organizations.listMyOrgs();

		expect(joinResult.memberRole).toBe("member");
		expect(list.some((org) => org.id === created.id)).toBe(true);
	});

	it("joins an organization by slug", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_3),
		);

		const created = await adminCaller.organizations.create({
			name: `Slug Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const slug = created.slug;
		if (!slug) {
			throw new Error("Expected slug to be generated");
		}

		const joinResult = await memberCaller.organizations.joinBySlug({
			slug,
		});
		const list = await memberCaller.organizations.listMyOrgs();

		expect(joinResult.memberRole).toBe("member");
		expect(list.some((org) => org.id === created.id)).toBe(true);
	});

	it("removes membership when leaving an organization", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_2),
		);

		const created = await adminCaller.organizations.create({
			name: `Leave Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const joinCode = created.joinCode;
		if (!joinCode) {
			throw new Error("Expected join code to be generated");
		}

		await memberCaller.organizations.join({ joinCode });
		await memberCaller.organizations.leave({ orgId: created.id });

		const list = await memberCaller.organizations.listMyOrgs();

		expect(list.some((org) => org.id === created.id)).toBe(false);
	});

	it("updates a member role", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_UUID),
		);

		const created = await adminCaller.organizations.create({
			name: `Role Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const joinCode = created.joinCode;
		if (!joinCode) {
			throw new Error("Expected join code to be generated");
		}

		await memberCaller.organizations.join({ joinCode });

		const updated = await adminCaller.organizations.updateMemberRole({
			orgId: created.id,
			userId: TEST_USER_UUID.id,
			role: "leader",
		});

		expect(updated).toEqual({
			success: true,
			userId: TEST_USER_UUID.id,
			role: "leader",
		});
	});

	it("blocks non-admins from updating organization settings", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_2),
		);

		const created = await adminCaller.organizations.create({
			name: `Update Guard Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const joinCode = created.joinCode;
		if (!joinCode) {
			throw new Error("Expected join code to be generated");
		}

		await memberCaller.organizations.join({ joinCode });

		await expect(
			memberCaller.organizations.update({
				id: created.id,
				name: "Updated Name",
			}),
		).rejects.toThrow(
			"Only organization admins can update organization settings",
		);
	});

	it("blocks non-admins from deleting organizations", async () => {
		const adminCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const memberCaller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER_2),
		);

		const created = await adminCaller.organizations.create({
			name: `Delete Guard Org ${Date.now()}`,
			joinLinkEnabled: true,
		});

		const joinCode = created.joinCode;
		if (!joinCode) {
			throw new Error("Expected join code to be generated");
		}

		await memberCaller.organizations.join({ joinCode });

		await expect(
			memberCaller.organizations.delete({ id: created.id }),
		).rejects.toThrow("Only organization admins can delete organizations");
	});
});
