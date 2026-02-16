import { env as cloudflareEnv } from "cloudflare:test";
import TEST_SCHEMA from "../../schema.sql?raw";
import type { AuthenticatedContext, Context, Env, User } from "../trpc/context";
import { appRouter } from "../trpc/router";

const env = cloudflareEnv as Env;

export async function initTestDatabase(): Promise<void> {
	const cleaned = TEST_SCHEMA.split("\n")
		.map((line) => line.replace(/--.*$/, ""))
		.join("\n");

	const statements = cleaned
		.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		await env.DB.prepare(statement).run();
	}
}

export const TEST_USER: User = {
	id: "test-user-id",
	email: "test@example.com",
	displayName: "Test User",
};

export const TEST_USER_2: User = {
	id: "test-user-2-id",
	email: "test2@example.com",
	displayName: "Test User 2",
};

export async function createTestUser(user: User = TEST_USER): Promise<void> {
	const now = Date.now();
	await env.DB.prepare(
		`INSERT OR REPLACE INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
	)
		.bind(user.id, user.email, user.displayName ?? null, now, now)
		.run();
}

export async function setupWalletBalance(
	userId: string,
	balanceMicros: number,
): Promise<void> {
	const now = Date.now();
	await env.DB.prepare(
		`INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`,
	)
		.bind(userId, balanceMicros, balanceMicros, now, now)
		.run();
}

export function createPublicContext(installId?: string): Context {
	return {
		env: env,
		installId: installId ?? null,
		authToken: null,
		brandId: "slopcade",
	} as Context;
}

export function createInstalledContext(
	installId: string = "test-install-id",
): Context {
	return {
		env: env,
		installId,
		authToken: null,
		brandId: "slopcade",
	} as Context;
}

export function createAuthenticatedContext(
	user: User = TEST_USER,
	installId: string = "test-install-id",
): AuthenticatedContext {
	return {
		env: env,
		installId,
		authToken: "test-token",
		user,
		brandId: "slopcade",
	} as AuthenticatedContext;
}

export function createCaller(ctx: Context) {
	return appRouter.createCaller(ctx);
}

export function createAuthenticatedCaller(
	user: User = TEST_USER,
	installId?: string,
) {
	return appRouter.createCaller(createAuthenticatedContext(user, installId));
}

export function createInstalledCaller(installId: string = "test-install-id") {
	return appRouter.createCaller(createInstalledContext(installId));
}

export function createPublicCaller() {
	return appRouter.createCaller(createPublicContext());
}
