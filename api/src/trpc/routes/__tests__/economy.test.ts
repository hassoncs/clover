/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "../../../__fixtures__/test-utils";
import type { Env } from "../../context";
import { appRouter } from "../../router";

async function ensureIapColumn(
	testEnv: Env,
	column: string,
	type: string,
): Promise<void> {
	const info = await testEnv.DB.prepare("PRAGMA table_info(iap_products)").all<{
		name: string;
	}>();
	const existing = new Set(info.results.map((row) => row.name));
	if (!existing.has(column)) {
		await testEnv.DB.prepare(
			`ALTER TABLE iap_products ADD COLUMN ${column} ${type}`,
		).run();
	}
}

describe("Economy Router", () => {
	const testEnv = env as Env;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
		await ensureIapColumn(testEnv, "creditAmountMicros", "INTEGER");
	});

	beforeEach(async () => {
		await testEnv.DB.prepare("DELETE FROM credit_transactions").run();
		await testEnv.DB.prepare("DELETE FROM user_wallets").run();
		await testEnv.DB.prepare("DELETE FROM iap_products").run();
	});

	it("returns zero balance for a new user", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);

		const result = await caller.economy.getBalance();

		expect(result.balanceMicros).toBe(0);
		expect(result.balanceSparks).toBe(0);
	});

	it("returns empty transactions for a new user", async () => {
		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);

		const result = await caller.economy.getTransactions({
			limit: 10,
			offset: 0,
		});

		expect(result).toHaveLength(0);
	});

	it("returns available products", async () => {
		const now = Date.now();
		await testEnv.DB.prepare(
			`INSERT INTO iap_products (
				id,
				sku,
				name,
				description,
				price_cents,
				currency,
				credit_amount_micros,
				creditAmountMicros,
				bonus_percent,
				is_active,
				platform,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				"prod-1",
				"starter_pack",
				"Starter Pack",
				"Starter credits",
				499,
				"USD",
				1000000,
				1000000,
				0,
				1,
				"all",
				now,
				now,
			)
			.run();

		const caller = appRouter.createCaller(
			createAuthenticatedContext(TEST_USER),
		);
		const result = await caller.economy.getProducts();

		expect(result).toHaveLength(1);
		expect(result[0]?.creditAmountSparks).toBeGreaterThan(0);
	});
});
