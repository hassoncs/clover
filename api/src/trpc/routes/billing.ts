import { getBrandManifest } from "@slopcade/brands";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";
import { EntitlementService } from "@/billing/entitlement-service";
import { FreeTierGuard } from "@/billing/free-tier-guard";
import {
	ORG_SUBSCRIPTION_TIERS,
	type OrgSubscriptionTierId,
} from "@/billing/org-subscription-tiers";
import { OrgWebhookHandler } from "@/billing/org-webhook-handler";
import { StripeService } from "@/billing/stripe-service";
import { protectedProcedure, publicProcedure, router } from "../index";

type D1Database = import("@cloudflare/workers-types").D1Database;

type OrgMembershipRow = {
	role: "admin" | "leader" | "member";
};

type OrgSubscriptionStatusRow = {
	plan_id: string;
	status: "active" | "past_due" | "cancelled" | "trialing";
	current_period_start: number;
	current_period_end: number;
	cancel_at_period_end: number;
	stripe_customer_id: string | null;
};

async function requireOrgMembership(
	db: D1Database,
	orgId: string,
	brandId: string,
	userId: string,
): Promise<OrgMembershipRow> {
	const membership = await db
		.prepare(
			`SELECT om.role
			 FROM organization_members om
			 INNER JOIN organizations o ON o.id = om.org_id
			 WHERE om.org_id = ?
			 AND om.user_id = ?
			 AND o.brand_id = ?`,
		)
		.bind(orgId, userId, brandId)
		.first<OrgMembershipRow>();

	if (!membership) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a member of this organization",
		});
	}

	return membership;
}

async function requireOrgAdmin(
	db: D1Database,
	orgId: string,
	brandId: string,
	userId: string,
): Promise<void> {
	const membership = await requireOrgMembership(db, orgId, brandId, userId);
	if (membership.role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only organization admins can manage billing",
		});
	}
}

async function getOrgSubscription(
	db: D1Database,
	orgId: string,
	brandId: string,
): Promise<OrgSubscriptionStatusRow | null> {
	return db
		.prepare(
			`SELECT
				os.plan_id,
				os.status,
				os.current_period_start,
				os.current_period_end,
				os.cancel_at_period_end,
				os.stripe_customer_id
			 FROM org_subscriptions os
			 INNER JOIN organizations o ON o.id = os.org_id
			 WHERE os.org_id = ?
			 AND o.brand_id = ?
			 LIMIT 1`,
		)
		.bind(orgId, brandId)
		.first<OrgSubscriptionStatusRow>();
}

const orgCheckoutInputSchema = z.object({
	orgId: z.string().uuid(),
	planId: z.string().refine((value): value is OrgSubscriptionTierId => {
		return value in ORG_SUBSCRIPTION_TIERS;
	}, "Invalid organization plan"),
	successUrl: z.string().url(),
	cancelUrl: z.string().url(),
});

export const billingRouter = router({
	getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
		const entitlementService = new EntitlementService(ctx.env.DB, ctx.brandId);
		const entitlement = await entitlementService.resolveEntitlement(
			ctx.user.id,
		);
		const stripeCustomerId = await entitlementService.getStripeCustomerId(
			ctx.user.id,
		);

		return {
			isPro: entitlement.isPro,
			proUntil: entitlement.proUntil,
			source: entitlement.source,
			hasStripeCustomer: !!stripeCustomerId,
		};
	}),

	getFreeSessionsRemaining: protectedProcedure.query(async ({ ctx }) => {
		const freeTierGuard = new FreeTierGuard(
			ctx.env.DB,
			ctx.brandId,
			ctx.user.id,
		);
		const result = await freeTierGuard.check();

		return {
			sessionsUsed: result.sessionsUsed,
			sessionsLimit: result.sessionsLimit,
			resetsAt: result.resetsAt,
		};
	}),

	createSubscriptionIntent: protectedProcedure
		.input(z.object({ priceId: z.string().optional() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.env.STRIPE_SECRET_KEY) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Stripe is not configured",
				});
			}

			const priceId = input.priceId ?? ctx.env.STRIPE_PRICE_ID_PRO_MONTHLY;
			if (!priceId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Stripe price id is not configured",
				});
			}

			const stripeService = new StripeService(ctx.env.STRIPE_SECRET_KEY);
			const entitlementService = new EntitlementService(ctx.env.DB);

			const stripeCustomerId = await stripeService.getOrCreateCustomer(
				ctx.user.id,
				ctx.user.email,
			);

			await entitlementService.linkStripeCustomer(
				ctx.user.id,
				stripeCustomerId,
			);

			const subscription = await stripeService.createSubscription(
				stripeCustomerId,
				priceId,
			);

			return {
				subscriptionId: subscription.subscriptionId,
				clientSecret: subscription.clientSecret,
			};
		}),

	createPortalSession: protectedProcedure
		.input(z.object({ returnUrl: z.string().url() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.env.STRIPE_SECRET_KEY) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Stripe is not configured",
				});
			}

			const entitlementService = new EntitlementService(ctx.env.DB);
			const stripeCustomerId = await entitlementService.getStripeCustomerId(
				ctx.user.id,
			);

			if (!stripeCustomerId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Stripe customer not found for user",
				});
			}

			const stripeService = new StripeService(ctx.env.STRIPE_SECRET_KEY);
			const url = await stripeService.createPortalSession(
				stripeCustomerId,
				input.returnUrl,
			);

			return { url };
		}),

	createOrgCheckoutSession: protectedProcedure
		.input(orgCheckoutInputSchema)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.env.STRIPE_SECRET_KEY) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Stripe is not configured",
				});
			}

			await requireOrgAdmin(ctx.env.DB, input.orgId, ctx.brandId, ctx.user.id);

			const plan = ORG_SUBSCRIPTION_TIERS[input.planId];
			const stripe = new Stripe(ctx.env.STRIPE_SECRET_KEY);

			const checkoutSession = await stripe.checkout.sessions.create({
				mode: "subscription",
				success_url: input.successUrl,
				cancel_url: input.cancelUrl,
				line_items: [
					{
						price_data: {
							currency: "usd",
							unit_amount: plan.priceMonthly,
							recurring: {
								interval: "month",
							},
							product_data: {
								name: `${plan.name} Subscription`,
							},
						},
						quantity: 1,
					},
				],
				metadata: {
					orgId: input.orgId,
					brandId: ctx.brandId,
					planId: input.planId,
				},
			});

			if (!checkoutSession.url) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create org checkout session",
				});
			}

			return {
				checkoutUrl: checkoutSession.url,
			};
		}),

	getOrgSubscriptionStatus: protectedProcedure
		.input(z.object({ orgId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			const subscription = await getOrgSubscription(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
			);

			return {
				hasSubscription: !!subscription,
				planId: subscription?.plan_id ?? null,
				status: subscription?.status ?? null,
				currentPeriodStart: subscription?.current_period_start ?? null,
				currentPeriodEnd: subscription?.current_period_end ?? null,
				cancelAtPeriodEnd: subscription
					? subscription.cancel_at_period_end === 1
					: null,
			};
		}),

	createOrgPortalSession: protectedProcedure
		.input(
			z.object({
				orgId: z.string().uuid(),
				returnUrl: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.env.STRIPE_SECRET_KEY) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Stripe is not configured",
				});
			}

			await requireOrgAdmin(ctx.env.DB, input.orgId, ctx.brandId, ctx.user.id);

			const subscription = await getOrgSubscription(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
			);

			if (!subscription?.stripe_customer_id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Stripe customer not found for organization",
				});
			}

			const stripeService = new StripeService(ctx.env.STRIPE_SECRET_KEY);
			const url = await stripeService.createPortalSession(
				subscription.stripe_customer_id,
				input.returnUrl,
			);

			return { url };
		}),

	stripeOrgWebhook: publicProcedure.mutation(async ({ ctx }) => {
		if (!ctx.env.STRIPE_SECRET_KEY || !ctx.env.STRIPE_WEBHOOK_SECRET) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Stripe is not configured",
			});
		}

		const signature = ctx.req?.headers.get("stripe-signature") || "";
		if (!signature) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Missing stripe-signature header",
			});
		}

		if (!ctx.rawBody) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Missing webhook payload",
			});
		}

		const stripeService = new StripeService(ctx.env.STRIPE_SECRET_KEY);
		let event: Stripe.Event;

		try {
			event = stripeService.constructWebhookEvent(
				ctx.rawBody,
				signature,
				ctx.env.STRIPE_WEBHOOK_SECRET,
			);
		} catch {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid webhook signature",
			});
		}

		const orgWebhookHandler = new OrgWebhookHandler();
		await orgWebhookHandler.handleEvent(event, ctx.env.DB);

		return { received: true };
	}),

	getCatalog: publicProcedure.query(({ ctx }) => {
		const brand = getBrandManifest(ctx.brandId);
		return {
			plans: [
				{
					id: "pro_monthly",
					name: `${brand.displayName} Pro`,
					priceDisplay: "$9.99/mo",
					features: [
						"1,000 Sparks/month",
						"Unlimited party hosting",
						"Priority asset generation",
						"Cloud sync",
						"Private assets",
						"85/15 asset store split",
					],
				},
			],
		};
	}),

	joinWaitlist: publicProcedure
		.input(z.object({ email: z.string().email() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.env.DB.prepare(
				`INSERT OR IGNORE INTO email_waitlist (id, email, brand_id, created_at)
				 VALUES (?, ?, ?, ?)`,
			)
				.bind(crypto.randomUUID(), input.email, ctx.brandId, Date.now())
				.run();

			return { success: true };
		}),
});
