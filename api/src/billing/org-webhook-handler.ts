import type Stripe from "stripe";

type D1Database = import("@cloudflare/workers-types").D1Database;

type OrgSubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";

export class OrgWebhookHandler {
	async handleEvent(event: Stripe.Event, db: D1Database): Promise<void> {
		switch (event.type) {
			case "checkout.session.completed": {
				await this.handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session,
					db,
					event.created,
				);
				return;
			}
			case "customer.subscription.updated": {
				await this.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
					db,
				);
				return;
			}
			case "customer.subscription.deleted": {
				await this.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
					db,
				);
				return;
			}
			case "invoice.payment_failed": {
				await this.handlePaymentFailed(event.data.object as Stripe.Invoice, db);
				return;
			}
			default:
				return;
		}
	}

	private async handleCheckoutCompleted(
		session: Stripe.Checkout.Session,
		db: D1Database,
		eventCreatedSeconds: number,
	): Promise<void> {
		const orgId = session.metadata?.orgId;
		const brandId = session.metadata?.brandId;
		const planId = session.metadata?.planId;
		const subscriptionId = getStringId(session.subscription);
		const customerId = getStringId(session.customer);

		if (!orgId || !planId || !subscriptionId) {
			return;
		}

		const now = Date.now();
		const periodStart = eventCreatedSeconds * 1000;

		await db
			.prepare(
				`INSERT INTO org_subscriptions (
					id,
					org_id,
					stripe_subscription_id,
					stripe_customer_id,
					plan_id,
					status,
					current_period_start,
					current_period_end,
					cancel_at_period_end,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(stripe_subscription_id) DO UPDATE SET
					org_id = excluded.org_id,
					stripe_customer_id = excluded.stripe_customer_id,
					plan_id = excluded.plan_id,
					status = excluded.status,
					current_period_start = excluded.current_period_start,
					current_period_end = excluded.current_period_end,
					cancel_at_period_end = excluded.cancel_at_period_end,
					updated_at = excluded.updated_at`,
			)
			.bind(
				crypto.randomUUID(),
				orgId,
				subscriptionId,
				customerId,
				planId,
				"active",
				periodStart,
				periodStart,
				0,
				now,
				now,
			)
			.run();

		if (brandId) {
			await db
				.prepare(
					"UPDATE organizations SET status = ?, updated_at = ? WHERE id = ? AND brand_id = ? AND status = ?",
				)
				.bind("active", now, orgId, brandId, "trial")
				.run();
			return;
		}

		await db
			.prepare(
				"UPDATE organizations SET status = ?, updated_at = ? WHERE id = ? AND status = ?",
			)
			.bind("active", now, orgId, "trial")
			.run();
	}

	private async handleSubscriptionUpdated(
		subscription: Stripe.Subscription,
		db: D1Database,
	): Promise<void> {
		const now = Date.now();
		const currentPeriodStart = getSubscriptionPeriodStartMs(subscription);
		const currentPeriodEnd = getSubscriptionPeriodEndMs(subscription);

		if (currentPeriodStart === null || currentPeriodEnd === null) {
			return;
		}

		await db
			.prepare(
				`UPDATE org_subscriptions
				 SET status = ?,
					 current_period_start = ?,
					 current_period_end = ?,
					 cancel_at_period_end = ?,
					 updated_at = ?
				 WHERE stripe_subscription_id = ?`,
			)
			.bind(
				normalizeSubscriptionStatus(subscription.status),
				currentPeriodStart,
				currentPeriodEnd,
				subscription.cancel_at_period_end ? 1 : 0,
				now,
				subscription.id,
			)
			.run();
	}

	private async handleSubscriptionDeleted(
		subscription: Stripe.Subscription,
		db: D1Database,
	): Promise<void> {
		await db
			.prepare(
				"UPDATE org_subscriptions SET status = ?, cancel_at_period_end = 1, updated_at = ? WHERE stripe_subscription_id = ?",
			)
			.bind("cancelled", Date.now(), subscription.id)
			.run();
	}

	private async handlePaymentFailed(
		invoice: Stripe.Invoice,
		db: D1Database,
	): Promise<void> {
		const customerId = getStringId(invoice.customer);
		if (!customerId) {
			return;
		}

		await db
			.prepare(
				"UPDATE org_subscriptions SET status = ?, updated_at = ? WHERE stripe_customer_id = ?",
			)
			.bind("past_due", Date.now(), customerId)
			.run();
	}
}

function normalizeSubscriptionStatus(
	status: Stripe.Subscription.Status,
): OrgSubscriptionStatus {
	if (status === "trialing") {
		return "trialing";
	}

	if (status === "past_due" || status === "unpaid") {
		return "past_due";
	}

	if (status === "canceled" || status === "incomplete_expired") {
		return "cancelled";
	}

	return "active";
}

function getStringId(value: string | { id: string } | null): string | null {
	if (!value) {
		return null;
	}

	return typeof value === "string" ? value : value.id;
}

function getSubscriptionPeriodStartMs(
	subscription: Stripe.Subscription,
): number | null {
	const withPeriod = subscription as Stripe.Subscription & {
		current_period_start?: number;
	};

	if (typeof withPeriod.current_period_start === "number") {
		return withPeriod.current_period_start * 1000;
	}

	const firstItem = subscription.items.data[0];
	if (!firstItem) {
		return null;
	}

	return firstItem.current_period_start * 1000;
}

function getSubscriptionPeriodEndMs(
	subscription: Stripe.Subscription,
): number | null {
	const withPeriod = subscription as Stripe.Subscription & {
		current_period_end?: number;
	};

	if (typeof withPeriod.current_period_end === "number") {
		return withPeriod.current_period_end * 1000;
	}

	const firstItem = subscription.items.data[0];
	if (!firstItem) {
		return null;
	}

	return firstItem.current_period_end * 1000;
}
