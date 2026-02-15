import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { EntitlementService } from "@/billing/entitlement-service";
import { StripeService } from "@/billing/stripe-service";
import { protectedProcedure, publicProcedure, router } from "../index";

export const billingRouter = router({
	getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
		const entitlementService = new EntitlementService(ctx.env.DB);
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

	getCatalog: publicProcedure.query(() => {
		return {
			plans: [
				{
					id: "pro_monthly",
					name: "Slopcade Pro",
					priceDisplay: "$9.99/mo",
					features: [
						"1,000 Sparks/month",
						"Unlimited party hosting",
						"Priority AI generation",
						"Cloud sync",
						"Private assets",
						"85/15 asset store split",
					],
				},
			],
		};
	}),
});
