import { Hono } from "hono";
import type Stripe from "stripe";
import { EntitlementService } from "@/billing/entitlement-service";
import { StipendService } from "@/billing/stipend-service";
import { StripeService } from "@/billing/stripe-service";
import { WalletService } from "@/economy/wallet-service";
import type { Env } from "@/trpc/context";

const router = new Hono<{ Bindings: Env }>();

function getStripeCustomerId(
	customer: string | Stripe.Customer | Stripe.DeletedCustomer,
): string {
	return typeof customer === "string" ? customer : customer.id;
}

function getLatestInvoiceId(
	latestInvoice: string | Stripe.Invoice | null,
): string | null {
	if (!latestInvoice) {
		return null;
	}
	return typeof latestInvoice === "string" ? latestInvoice : latestInvoice.id;
}

function getCurrentPeriodEndMs(
	subscription: Stripe.Subscription,
): number | null {
	const firstItem = subscription.items.data[0];
	if (!firstItem) {
		return null;
	}

	return firstItem.current_period_end * 1000;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
	const subscription = invoice.parent?.subscription_details?.subscription;
	if (!subscription) {
		return null;
	}

	return typeof subscription === "string" ? subscription : subscription.id;
}

async function getUserIdFromCustomerId(
	db: D1Database,
	stripeCustomerId: string,
): Promise<string | null> {
	const row = await db
		.prepare("SELECT id FROM users WHERE stripe_customer_id = ?")
		.bind(stripeCustomerId)
		.first<{ id: string }>();

	return row?.id ?? null;
}

async function getUserIdFromSubscriptionId(
	db: D1Database,
	stripeSubscriptionId: string,
): Promise<string | null> {
	const row = await db
		.prepare(
			"SELECT user_id FROM stripe_subscriptions WHERE stripe_subscription_id = ?",
		)
		.bind(stripeSubscriptionId)
		.first<{ user_id: string }>();

	return row?.user_id ?? null;
}

type D1Database = import("@cloudflare/workers-types").D1Database;

router.post("/", async (c) => {
	try {
		const rawBody = await c.req.text();
		const signature = c.req.header("stripe-signature") || "";
		const stripeSecretKey = c.env.STRIPE_SECRET_KEY || "";
		const stripeWebhookSecret = c.env.STRIPE_WEBHOOK_SECRET || "";

		if (!signature) {
			console.error("[Stripe Webhook] Missing stripe-signature header");
			return c.json({ error: "Missing stripe-signature header" }, 400);
		}

		if (!stripeSecretKey || !stripeWebhookSecret) {
			console.error("[Stripe Webhook] Stripe env vars not configured");
			return c.json({ error: "Stripe not configured" }, 500);
		}

		const stripeService = new StripeService(stripeSecretKey);

		let event: Stripe.Event;
		try {
			event = stripeService.constructWebhookEvent(
				rawBody,
				signature,
				stripeWebhookSecret,
			);
		} catch (error) {
			console.error("[Stripe Webhook] Invalid signature", error);
			return c.json({ error: "Invalid signature" }, 401);
		}

		const idempotencyResult = await c.env.DB.prepare(`
        INSERT INTO stripe_webhook_events (stripe_event_id, event_type, processed_at)
        VALUES (?, ?, ?)
        ON CONFLICT(stripe_event_id) DO NOTHING
      `)
			.bind(event.id, event.type, Date.now())
			.run();

		if ((idempotencyResult.meta?.changes ?? 0) === 0) {
			return c.json({ success: true, duplicate: true });
		}

		const entitlementService = new EntitlementService(c.env.DB);
		const stipendService = new StipendService(
			new WalletService(c.env.DB),
			c.env.DB,
		);

		if (event.type === "customer.subscription.created") {
			const subscription = event.data.object as Stripe.Subscription;
			const stripeCustomerId = getStripeCustomerId(subscription.customer);
			const userIdFromCustomer = await getUserIdFromCustomerId(
				c.env.DB,
				stripeCustomerId,
			);
			const metadataUserId = subscription.metadata.userId || null;
			const userId = userIdFromCustomer ?? metadataUserId;

			if (!userId) {
				console.warn(
					`[Stripe Webhook] Missing user mapping for subscription ${subscription.id} (customer ${stripeCustomerId})`,
				);
				return c.json({ success: true });
			}

			await c.env.DB.prepare(`
          INSERT INTO stripe_subscriptions (
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
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(stripe_subscription_id) DO UPDATE SET
            user_id = excluded.user_id,
            stripe_customer_id = excluded.stripe_customer_id,
            status = excluded.status,
            price_id = excluded.price_id,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            latest_invoice_id = excluded.latest_invoice_id,
            updated_at = excluded.updated_at
        `)
				.bind(
					subscription.id,
					userId,
					stripeCustomerId,
					subscription.status,
					subscription.items.data[0]?.price.id ?? null,
					getCurrentPeriodEndMs(subscription),
					subscription.cancel_at_period_end ? 1 : 0,
					getLatestInvoiceId(subscription.latest_invoice),
					Date.now(),
					Date.now(),
				)
				.run();

			await entitlementService.linkStripeCustomer(userId, stripeCustomerId);
			return c.json({ success: true });
		}

		if (event.type === "customer.subscription.updated") {
			const subscription = event.data.object as Stripe.Subscription;
			const stripeCustomerId = getStripeCustomerId(subscription.customer);
			const existingUserId = await getUserIdFromSubscriptionId(
				c.env.DB,
				subscription.id,
			);
			const userIdFromCustomer = await getUserIdFromCustomerId(
				c.env.DB,
				stripeCustomerId,
			);
			const metadataUserId = subscription.metadata.userId || null;
			const userId = existingUserId ?? userIdFromCustomer ?? metadataUserId;

			if (userId) {
				await c.env.DB.prepare(`
            INSERT INTO stripe_subscriptions (
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
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(stripe_subscription_id) DO UPDATE SET
              user_id = excluded.user_id,
              stripe_customer_id = excluded.stripe_customer_id,
              status = excluded.status,
              price_id = excluded.price_id,
              current_period_end = excluded.current_period_end,
              cancel_at_period_end = excluded.cancel_at_period_end,
              latest_invoice_id = excluded.latest_invoice_id,
              updated_at = excluded.updated_at
          `)
					.bind(
						subscription.id,
						userId,
						stripeCustomerId,
						subscription.status,
						subscription.items.data[0]?.price.id ?? null,
						getCurrentPeriodEndMs(subscription),
						subscription.cancel_at_period_end ? 1 : 0,
						getLatestInvoiceId(subscription.latest_invoice),
						Date.now(),
						Date.now(),
					)
					.run();

				await entitlementService.linkStripeCustomer(userId, stripeCustomerId);

				const proUntil = getCurrentPeriodEndMs(subscription);
				if (proUntil !== null) {
					await entitlementService.updateEntitlement(
						userId,
						proUntil,
						"stripe",
					);
				} else {
					await entitlementService.revokeEntitlement(userId);
				}
			} else {
				await c.env.DB.prepare(
					"UPDATE stripe_subscriptions SET status = ?, current_period_end = ?, cancel_at_period_end = ?, latest_invoice_id = ?, updated_at = ? WHERE stripe_subscription_id = ?",
				)
					.bind(
						subscription.status,
						getCurrentPeriodEndMs(subscription),
						subscription.cancel_at_period_end ? 1 : 0,
						getLatestInvoiceId(subscription.latest_invoice),
						Date.now(),
						subscription.id,
					)
					.run();
			}

			return c.json({ success: true });
		}

		if (event.type === "customer.subscription.deleted") {
			const subscription = event.data.object as Stripe.Subscription;

			await c.env.DB.prepare(
				"UPDATE stripe_subscriptions SET status = ?, cancel_at_period_end = 1, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind("canceled", Date.now(), subscription.id)
				.run();

			const userId =
				(await getUserIdFromSubscriptionId(c.env.DB, subscription.id)) ??
				(await getUserIdFromCustomerId(
					c.env.DB,
					getStripeCustomerId(subscription.customer),
				));

			if (userId) {
				await entitlementService.revokeEntitlement(userId);
			}

			return c.json({ success: true });
		}

		if (event.type === "invoice.paid") {
			const invoice = event.data.object as Stripe.Invoice;
			const stripeInvoiceId = invoice.id;
			const subscriptionId = getInvoiceSubscriptionId(invoice);

			if (!subscriptionId) {
				return c.json({ success: true });
			}

			const subscription = await c.env.DB.prepare(
				"SELECT user_id, current_period_end FROM stripe_subscriptions WHERE stripe_subscription_id = ?",
			)
				.bind(subscriptionId)
				.first<{ user_id: string; current_period_end: number | null }>();

			if (!subscription) {
				return c.json({ success: true });
			}

			if (subscription.current_period_end !== null) {
				await entitlementService.updateEntitlement(
					subscription.user_id,
					subscription.current_period_end,
					"stripe",
				);
			}

			await stipendService.creditMonthlyStipend(
				subscription.user_id,
				stripeInvoiceId,
			);
			return c.json({ success: true });
		}

		if (event.type === "invoice.payment_failed") {
			const invoice = event.data.object as Stripe.Invoice;
			const subscriptionId = getInvoiceSubscriptionId(invoice);

			if (!subscriptionId) {
				return c.json({ success: true });
			}

			await c.env.DB.prepare(
				"UPDATE stripe_subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?",
			)
				.bind("past_due", Date.now(), subscriptionId)
				.run();

			return c.json({ success: true });
		}

		return c.json({ success: true });
	} catch (error) {
		console.error("[Stripe Webhook] Error handling event", error);
		return c.json({ success: false, error: String(error) }, 200);
	}
});

export default router;
