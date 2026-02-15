import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createTestUser,
	initTestDatabase,
	setupWalletBalance,
	TEST_USER,
} from "@/__fixtures__/test-utils";
import {
	EntitlementService,
	type ProEntitlement,
} from "@/billing/entitlement-service";
import { PartyHostingGuard } from "@/billing/party-hosting-guard";
import {
	STIPEND_CEILING_MICROS,
	STIPEND_MAX_MICROS,
	StipendService,
} from "@/billing/stipend-service";
import { WalletService } from "@/economy/wallet-service";

describe("Billing services", () => {
	let entitlementService: EntitlementService;
	let walletService: WalletService;
	let stipendService: StipendService;
	let partyHostingGuard: PartyHostingGuard;

	beforeAll(async () => {
		await initTestDatabase();
		await ensureBillingSchema();
	});

	beforeEach(async () => {
		entitlementService = new EntitlementService(env.DB);
		walletService = new WalletService(env.DB);
		stipendService = new StipendService(walletService, env.DB);
		partyHostingGuard = new PartyHostingGuard(env.DB);

		await env.DB.prepare("DELETE FROM stripe_webhook_events").run();
		await env.DB.prepare("DELETE FROM stripe_subscriptions").run();
		await env.DB.prepare("DELETE FROM credit_transactions").run();
		await env.DB.prepare("DELETE FROM user_wallets").run();
		await env.DB.prepare("DELETE FROM party_hosting_sessions").run();
		await env.DB.prepare(
			"UPDATE users SET pro_subscription_until = NULL, pro_source = NULL, stripe_customer_id = NULL",
		).run();
		await createTestUser();
	});

	describe("EntitlementService", () => {
		it("resolves and revokes entitlement lifecycle", async () => {
			const createdUntil = Date.now() + 60_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				createdUntil,
				"stripe",
			);

			const created = await entitlementService.resolveEntitlement(TEST_USER.id);
			expectEntitlement(created, { isPro: true, source: "stripe" });

			const renewedUntil = Date.now() + 120_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				renewedUntil,
				"stripe",
			);
			const renewed = await entitlementService.resolveEntitlement(TEST_USER.id);
			expect(renewed.isPro).toBe(true);
			expect(renewed.proUntil).toBe(renewedUntil);

			const expiredUntil = Date.now() - 60_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				expiredUntil,
				"stripe",
			);
			const expired = await entitlementService.resolveEntitlement(TEST_USER.id);
			expect(expired.isPro).toBe(false);
			expect(expired.proUntil).toBe(expiredUntil);
			expect(expired.source).toBe("stripe");

			await entitlementService.revokeEntitlement(TEST_USER.id);
			const revoked = await entitlementService.resolveEntitlement(TEST_USER.id);
			expect(revoked.isPro).toBe(false);
			expect(revoked.proUntil).toBeNull();

			const resubscribedUntil = Date.now() + 180_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				resubscribedUntil,
				"stripe",
			);
			const resubscribed = await entitlementService.resolveEntitlement(
				TEST_USER.id,
			);
			expect(resubscribed.isPro).toBe(true);
			expect(resubscribed.proUntil).toBe(resubscribedUntil);
			expect(resubscribed.source).toBe("stripe");
		});

		it("supports cross-provider writes to the same entitlement field", async () => {
			const stripeUntil = Date.now() + 60_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				stripeUntil,
				"stripe",
			);
			const stripeEntitlement = await entitlementService.resolveEntitlement(
				TEST_USER.id,
			);
			expectEntitlement(stripeEntitlement, { isPro: true, source: "stripe" });

			const revenuecatUntil = Date.now() + 120_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				revenuecatUntil,
				"revenuecat",
			);
			const revenuecatEntitlement = await entitlementService.resolveEntitlement(
				TEST_USER.id,
			);
			expectEntitlement(revenuecatEntitlement, {
				isPro: true,
				source: "revenuecat",
			});
			expect(revenuecatEntitlement.proUntil).toBe(revenuecatUntil);

			await entitlementService.revokeEntitlement(TEST_USER.id);
			const revoked = await entitlementService.resolveEntitlement(TEST_USER.id);
			expect(revoked.isPro).toBe(false);
			expect(revoked.proUntil).toBeNull();
		});
	});

	describe("Webhook idempotency", () => {
		it("ignores duplicate stripe_event_id inserts", async () => {
			const eventId = "evt_test_123";
			const eventType = "customer.subscription.created";

			const result1 = await env.DB.prepare(`
          INSERT INTO stripe_webhook_events (stripe_event_id, event_type, processed_at)
          VALUES (?, ?, ?)
          ON CONFLICT(stripe_event_id) DO NOTHING
        `)
				.bind(eventId, eventType, Date.now())
				.run();
			expect(result1.meta?.changes).toBe(1);

			const result2 = await env.DB.prepare(`
          INSERT INTO stripe_webhook_events (stripe_event_id, event_type, processed_at)
          VALUES (?, ?, ?)
          ON CONFLICT(stripe_event_id) DO NOTHING
        `)
				.bind(eventId, eventType, Date.now())
				.run();
			expect(result2.meta?.changes).toBe(0);
		});
	});

	describe("Subscription lifecycle table state", () => {
		it("tracks create, renew, cancel, expire transitions", async () => {
			const subId = "sub_test_1";
			const customerId = "cus_test_1";
			const createdPeriodEnd = Date.now() + 86_400_000;

			await env.DB.prepare(
				`INSERT INTO stripe_subscriptions (
            stripe_subscription_id,
            user_id,
            stripe_customer_id,
            status,
            price_id,
            current_period_end,
            cancel_at_period_end,
            latest_invoice_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					subId,
					TEST_USER.id,
					customerId,
					"active",
					"price_pro_monthly",
					createdPeriodEnd,
					0,
					"in_1",
					Date.now(),
					Date.now(),
				)
				.run();

			const created = await getSubscription(subId);
			expect(created?.status).toBe("active");
			expect(created?.current_period_end).toBe(createdPeriodEnd);
			expect(created?.cancel_at_period_end).toBe(0);

			const renewedPeriodEnd = Date.now() + 2 * 86_400_000;
			await env.DB.prepare(
				"UPDATE stripe_subscriptions SET status = ?, current_period_end = ?, latest_invoice_id = ?, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind("active", renewedPeriodEnd, "in_2", Date.now(), subId)
				.run();

			const renewed = await getSubscription(subId);
			expect(renewed?.status).toBe("active");
			expect(renewed?.current_period_end).toBe(renewedPeriodEnd);
			expect(renewed?.latest_invoice_id).toBe("in_2");

			await env.DB.prepare(
				"UPDATE stripe_subscriptions SET status = ?, cancel_at_period_end = ?, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind("canceled", 1, Date.now(), subId)
				.run();

			const canceled = await getSubscription(subId);
			expect(canceled?.status).toBe("canceled");
			expect(canceled?.cancel_at_period_end).toBe(1);

			const expiredPeriodEnd = Date.now() - 1_000;
			await env.DB.prepare(
				"UPDATE stripe_subscriptions SET current_period_end = ?, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind(expiredPeriodEnd, Date.now(), subId)
				.run();

			const expired = await getSubscription(subId);
			expect(expired?.status).toBe("canceled");
			expect(expired?.current_period_end).toBe(expiredPeriodEnd);
		});

		it("updates payment failure to past_due for dunning flow", async () => {
			const subId = "sub_test_past_due";

			await env.DB.prepare(
				`INSERT INTO stripe_subscriptions (
            stripe_subscription_id,
            user_id,
            stripe_customer_id,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					subId,
					TEST_USER.id,
					"cus_test_2",
					"active",
					Date.now(),
					Date.now(),
				)
				.run();

			await env.DB.prepare(
				"UPDATE stripe_subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind("past_due", Date.now(), subId)
				.run();

			const updated = await getSubscription(subId);
			expect(updated?.status).toBe("past_due");
		});
	});

	describe("StipendService", () => {
		it("grants max stipend at zero balance", async () => {
			await setupWalletBalance(TEST_USER.id, 0);

			const result = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				"in_zero",
			);

			expect(result.granted).toBe(true);
			expect(result.grantedMicros).toBe(STIPEND_MAX_MICROS);
			expect(result.newBalanceMicros).toBe(STIPEND_MAX_MICROS);
			expect(await walletService.getBalance(TEST_USER.id)).toBe(
				STIPEND_MAX_MICROS,
			);
		});

		it("caps grant at ceiling when partially funded", async () => {
			await setupWalletBalance(TEST_USER.id, 8_000_000);

			const result = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				"in_partial",
			);

			expect(result.granted).toBe(true);
			expect(result.grantedMicros).toBe(7_000_000);
			expect(result.newBalanceMicros).toBe(STIPEND_CEILING_MICROS);
			expect(await walletService.getBalance(TEST_USER.id)).toBe(
				STIPEND_CEILING_MICROS,
			);
		});

		it("grants zero when wallet is already above ceiling", async () => {
			await setupWalletBalance(TEST_USER.id, STIPEND_CEILING_MICROS + 1);

			const result = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				"in_above_ceiling",
			);

			expect(result.granted).toBe(false);
			expect(result.grantedMicros).toBe(0);
			expect(result.newBalanceMicros).toBe(STIPEND_CEILING_MICROS + 1);
			expect(await walletService.getBalance(TEST_USER.id)).toBe(
				STIPEND_CEILING_MICROS + 1,
			);
		});

		it("grants only remaining amount near ceiling", async () => {
			await setupWalletBalance(TEST_USER.id, 14_000_000);

			const result = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				"in_near_ceiling",
			);

			expect(result.granted).toBe(true);
			expect(result.grantedMicros).toBe(1_000_000);
			expect(result.newBalanceMicros).toBe(STIPEND_CEILING_MICROS);
			expect(await walletService.getBalance(TEST_USER.id)).toBe(
				STIPEND_CEILING_MICROS,
			);
		});

		it("is idempotent for duplicate invoice ids", async () => {
			await setupWalletBalance(TEST_USER.id, 0);
			const invoiceId = "in_duplicate";

			const first = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				invoiceId,
			);
			const second = await stipendService.creditMonthlyStipend(
				TEST_USER.id,
				invoiceId,
			);

			expect(first.newBalanceMicros).toBe(STIPEND_MAX_MICROS);
			expect(second.newBalanceMicros).toBe(STIPEND_MAX_MICROS);
			expect(await walletService.getBalance(TEST_USER.id)).toBe(
				STIPEND_MAX_MICROS,
			);

			const idempotencyKey = `stipend_${TEST_USER.id}_${invoiceId}`;
			const txCount = await env.DB.prepare(
				"SELECT COUNT(*) as count FROM credit_transactions WHERE idempotency_key = ?",
			)
				.bind(idempotencyKey)
				.first<{ count: number }>();
			expect(txCount?.count).toBe(1);
		});
	});

	describe("PartyHostingGuard", () => {
		it("allows free users under limit and blocks at limit", async () => {
			const allowed = await partyHostingGuard.checkHostingAllowed(TEST_USER.id);
			expect(allowed.allowed).toBe(true);
			expect(allowed.limit).toBe(3);
			expect(allowed.sessionsThisMonth).toBe(0);

			await insertHostingSessions(TEST_USER.id, 3);
			const blocked = await partyHostingGuard.checkHostingAllowed(TEST_USER.id);
			expect(blocked.allowed).toBe(false);
			expect(blocked.limit).toBe(3);
			expect(blocked.sessionsThisMonth).toBe(3);
			expect(blocked.reason).toContain("Free plan limited to 3 party sessions");
		});

		it("allows pro users unlimited sessions", async () => {
			const proUntil = Date.now() + 86_400_000;
			await entitlementService.updateEntitlement(
				TEST_USER.id,
				proUntil,
				"stripe",
			);
			await insertHostingSessions(TEST_USER.id, 100);

			const result = await partyHostingGuard.checkHostingAllowed(TEST_USER.id);
			expect(result.allowed).toBe(true);
			expect(result.limit).toBeNull();
			expect(result.sessionsThisMonth).toBe(100);
		});
	});
});

async function ensureBillingSchema(): Promise<void> {
	await ensureCreditTransactionsSupportsStipend();
	await ensureUserColumn("pro_subscription_until", "INTEGER");
	await ensureUserColumn("pro_source", "TEXT");
	await ensureUserColumn("stripe_customer_id", "TEXT");

	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS stripe_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_subscription_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id),
      stripe_customer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      price_id TEXT,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER DEFAULT 0,
      latest_invoice_id TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      updated_at INTEGER DEFAULT (unixepoch() * 1000)
    )`,
	).run();

	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_stripe_subs_user ON stripe_subscriptions(user_id)",
	).run();

	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      processed_at INTEGER DEFAULT (unixepoch() * 1000)
    )`,
	).run();

	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS party_hosting_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      room_code TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000)
    )`,
	).run();

	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_party_hosting_user_month ON party_hosting_sessions(user_id, created_at)",
	).run();
}

async function ensureCreditTransactionsSupportsStipend(): Promise<void> {
	const table = await env.DB.prepare(
		"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'credit_transactions'",
	).first<{ sql: string | null }>();

	if (table?.sql?.includes("'subscription_stipend'")) {
		return;
	}

	await env.DB.prepare(
		"ALTER TABLE credit_transactions RENAME TO credit_transactions_old",
	).run();

	await env.DB.prepare(
		`CREATE TABLE credit_transactions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id),
			type TEXT NOT NULL CHECK (type IN (
				'signup_code_grant',
				'promo_code_grant',
				'purchase',
				'generation_debit',
				'generation_refund',
				'admin_adjustment',
				'agent_reservation_hold',
				'agent_step_settlement',
				'agent_message_settlement',
				'agent_reservation_release',
				'subscription_stipend'
			)),
			amount_micros INTEGER NOT NULL,
			balance_before_micros INTEGER NOT NULL,
			balance_after_micros INTEGER NOT NULL,
			reference_type TEXT,
			reference_id TEXT,
			idempotency_key TEXT UNIQUE,
			description TEXT,
			metadata_json TEXT,
			created_at INTEGER NOT NULL
		)`,
	).run();

	await env.DB.prepare(
		`INSERT INTO credit_transactions (
			id,
			user_id,
			type,
			amount_micros,
			balance_before_micros,
			balance_after_micros,
			reference_type,
			reference_id,
			idempotency_key,
			description,
			metadata_json,
			created_at
		)
		SELECT
			id,
			user_id,
			type,
			amount_micros,
			balance_before_micros,
			balance_after_micros,
			reference_type,
			reference_id,
			idempotency_key,
			description,
			metadata_json,
			created_at
		FROM credit_transactions_old`,
	).run();

	await env.DB.prepare("DROP TABLE credit_transactions_old").run();
	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id)",
	).run();
	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type)",
	).run();
	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at)",
	).run();
	await env.DB.prepare(
		"CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id)",
	).run();
}

async function ensureUserColumn(
	columnName: string,
	columnType: "INTEGER" | "TEXT",
): Promise<void> {
	const columns = await env.DB.prepare("PRAGMA table_info(users)").all<{
		name: string;
	}>();
	const hasColumn = (columns.results ?? []).some(
		(column) => column.name === columnName,
	);
	if (!hasColumn) {
		await env.DB.prepare(
			`ALTER TABLE users ADD COLUMN ${columnName} ${columnType}`,
		).run();
	}
}

async function getSubscription(stripeSubscriptionId: string) {
	return env.DB.prepare(
		"SELECT * FROM stripe_subscriptions WHERE stripe_subscription_id = ?",
	)
		.bind(stripeSubscriptionId)
		.first<{
			status: string;
			current_period_end: number | null;
			cancel_at_period_end: number;
			latest_invoice_id: string | null;
		}>();
}

async function insertHostingSessions(
	userId: string,
	count: number,
): Promise<void> {
	for (let index = 0; index < count; index++) {
		await env.DB.prepare(
			"INSERT INTO party_hosting_sessions (user_id, room_code, created_at) VALUES (?, ?, ?)",
		)
			.bind(userId, `ROOM-${index}`, Date.now())
			.run();
	}
}

function expectEntitlement(
	actual: ProEntitlement,
	expected: { isPro: boolean; source: ProEntitlement["source"] },
) {
	expect(actual.isPro).toBe(expected.isPro);
	expect(actual.source).toBe(expected.source);
	expect(actual.proUntil).not.toBeUndefined();
}
