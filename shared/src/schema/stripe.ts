import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { users } from "./users";

export const stripeSubscriptions = sqliteTable(
	"stripe_subscriptions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		stripeCustomerId: text("stripe_customer_id").notNull(),
		status: text("status").notNull(),
		priceId: text("price_id"),
		currentPeriodEnd: integer("current_period_end"),
		cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
		latestInvoiceId: text("latest_invoice_id"),
		createdAt: integer("created_at"),
		updatedAt: integer("updated_at"),
	},
	(table) => ({
		userIdx: index("idx_stripe_subs_user").on(table.userId),
		customerIdx: index("idx_stripe_subs_customer").on(table.stripeCustomerId),
	}),
);

export const insertStripeSubscriptionSchema =
	createInsertSchema(stripeSubscriptions);
export const selectStripeSubscriptionSchema =
	createSelectSchema(stripeSubscriptions);
export type StripeSubscription = z.infer<typeof selectStripeSubscriptionSchema>;
export type NewStripeSubscription = z.infer<
	typeof insertStripeSubscriptionSchema
>;

export const stripeWebhookEvents = sqliteTable("stripe_webhook_events", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	stripeEventId: text("stripe_event_id").notNull().unique(),
	eventType: text("event_type").notNull(),
	processedAt: integer("processed_at"),
});

export const insertStripeWebhookEventSchema =
	createInsertSchema(stripeWebhookEvents);
export const selectStripeWebhookEventSchema =
	createSelectSchema(stripeWebhookEvents);
export type StripeWebhookEvent = z.infer<typeof selectStripeWebhookEventSchema>;
