import { z } from 'zod';
import { nanoid } from 'nanoid';
import { router, protectedProcedure, publicProcedure } from '../index';
import { TRPCError } from '@trpc/server';
import { WalletService, InsufficientBalanceError } from '../../economy/wallet-service';
import { SignupCodeService, InvalidSignupCodeError } from '../../economy/signup-code-service';
import { PromoCodeService, InvalidPromoCodeError } from '../../economy/promo-code-service';
import { estimateGameAssetCost } from '../../economy/cost-estimator';
import { microsToSparks, RATE_LIMITS } from '../../economy/pricing';

export const economyRouter = router({
  /**
   * Get current wallet balance
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const walletService = new WalletService(ctx.env.DB);
    const wallet = await walletService.getOrCreateWallet(ctx.user.id);
    
    return {
      balanceMicros: wallet.balanceMicros,
      balanceSparks: microsToSparks(wallet.balanceMicros),
      lifetimeEarnedSparks: microsToSparks(wallet.lifetimeEarnedMicros),
      lifetimeSpentSparks: microsToSparks(wallet.lifetimeSpentMicros),
    };
  }),

  /**
   * Get transaction history
   */
  getTransactions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);
      const transactions = await walletService.getTransactionHistory(
        ctx.user.id,
        input.limit,
        input.offset
      );
      
      return transactions.map(tx => ({
        ...tx,
        amountSparks: microsToSparks(tx.amountMicros),
        balanceAfterSparks: microsToSparks(tx.balanceAfterMicros),
      }));
    }),

  /**
   * Redeem a promo code
   */
  redeemPromoCode: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);
      const promoCodeService = new PromoCodeService(ctx.env.DB);
      
      try {
        const result = await promoCodeService.redeemCode(
          input.code,
          ctx.user.id,
          walletService
        );
        
        if (result.alreadyRedeemed) {
          return {
            success: true,
            alreadyRedeemed: true,
            message: 'You have already redeemed this code',
          };
        }
        
        return {
          success: true,
          newBalanceSparks: microsToSparks(result.newBalance!),
          grantedSparks: result.grantedSparks,
          message: `You received ${result.grantedSparks} Sparks!`,
        };
      } catch (err) {
        if (err instanceof InvalidPromoCodeError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err.reason,
          });
        }
        throw err;
      }
    }),

  /**
   * Validate a signup code (for registration flow)
   * This is a PUBLIC procedure - called before user exists
   */
  validateSignupCode: publicProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const signupCodeService = new SignupCodeService(ctx.env.DB);
      
      try {
        const result = await signupCodeService.validateCode(input.code);
        return {
          valid: true,
          grantSparks: microsToSparks(result.grantAmountMicros),
        };
      } catch (err) {
        if (err instanceof InvalidSignupCodeError) {
          return {
            valid: false,
            error: err.reason,
          };
        }
        throw err;
      }
    }),

  /**
   * Check if user has redeemed a signup code
   */
  hasRedeemedSignupCode: protectedProcedure.query(async ({ ctx }) => {
    const existing = await ctx.env.DB
      .prepare('SELECT id FROM signup_code_redemptions WHERE user_id = ?')
      .bind(ctx.user.id)
      .first();
    
    return {
      hasRedeemed: !!existing
    };
  }),

  /**
   * Redeem a signup code for an existing user
   */
  redeemSignupCode: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);
      const signupCodeService = new SignupCodeService(ctx.env.DB);
      
      try {
        const result = await signupCodeService.redeemCode(
          input.code,
          ctx.user.id,
          walletService
        );
        
        return {
          success: true,
          newBalanceSparks: microsToSparks(result.newBalance),
        };
      } catch (err) {
        if (err instanceof InvalidSignupCodeError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err.reason,
          });
        }
        throw err;
      }
    }),

  /**
   * Estimate cost for asset generation
   */
  estimateCost: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      regenerateAll: z.boolean().default(false),
      specificTemplates: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT definition FROM games WHERE id = ? AND (user_id = ? OR is_public = 1)')
        .bind(input.gameId, ctx.user.id)
        .first<{ definition: string }>();
      
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }
      
      const definition = JSON.parse(game.definition);
      const estimate = estimateGameAssetCost(definition, {
        regenerateAll: input.regenerateAll,
        specificTemplates: input.specificTemplates,
      });
      
      const walletService = new WalletService(ctx.env.DB);
      const balance = await walletService.getBalance(ctx.user.id);
      
      return {
        ...estimate,
        totalSparks: microsToSparks(estimate.totalMicros),
        currentBalanceSparks: microsToSparks(balance),
        canAfford: balance >= estimate.totalMicros,
        shortfallSparks: balance < estimate.totalMicros 
          ? microsToSparks(estimate.totalMicros - balance) 
          : 0,
      };
    }),

  /**
   * Pre-authorize a generation (reserve funds)
   * Returns authorization token to pass to generation endpoint
   */
  authorizeGeneration: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      estimatedCostMicros: z.number(),
      idempotencyKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);
      
      const allowed = await walletService.checkRateLimit(
        ctx.user.id,
        'generation',
        RATE_LIMITS.GENERATIONS_PER_HOUR,
        60 * 60 * 1000 // 1 hour
      );
      
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
        });
      }
      
      const hasFunds = await walletService.hasSufficientBalance(ctx.user.id, input.estimatedCostMicros);
      if (!hasFunds) {
        const balance = await walletService.getBalance(ctx.user.id);
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Insufficient balance',
          cause: {
            required: microsToSparks(input.estimatedCostMicros),
            available: microsToSparks(balance),
          },
        });
      }
      
      return {
        authorized: true,
        idempotencyKey: input.idempotencyKey,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute expiry
      };
    }),

  /**
   * Get available IAP products
   */
  getProducts: protectedProcedure.query(async ({ ctx }) => {
    const products = await ctx.env.DB
      .prepare('SELECT * FROM iap_products WHERE is_active = 1')
      .all<typeof import('@slopcade/shared/schema/economy').iapProducts.$inferSelect>();
    
    return (products.results ?? []).map(p => ({
      ...p,
      creditAmountSparks: microsToSparks(p.creditAmountMicros),
    }));
  }),

  /**
   * Process IAP purchase (called by RevenueCat webhook or client)
   */
  processPurchase: protectedProcedure
    .input(z.object({
      productId: z.string(),
      revenuecatTransactionId: z.string(),
      platform: z.enum(['ios', 'android']),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);
      const now = Date.now();
      
      const product = await ctx.env.DB
        .prepare('SELECT * FROM iap_products WHERE id = ?')
        .bind(input.productId)
        .first<typeof import('@slopcade/shared/schema/economy').iapProducts.$inferSelect>();
      
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      
      const existing = await ctx.env.DB
        .prepare('SELECT id FROM iap_purchases WHERE revenuecat_transaction_id = ?')
        .bind(input.revenuecatTransactionId)
        .first();
      
      if (existing) {
        return { success: true, alreadyProcessed: true };
      }
      
      const purchaseId = nanoid();
      
      await ctx.env.DB.batch([
        ctx.env.DB.prepare(`
          INSERT INTO iap_purchases 
          (id, user_id, product_id, platform, revenuecat_transaction_id, 
           price_cents, credits_granted_micros, status, purchased_at, processed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
        `).bind(
          purchaseId, ctx.user.id, product.id, input.platform,
          input.revenuecatTransactionId, product.priceCents,
          product.creditAmountMicros, now, now
        ),
      ]);
      
      const newBalance = await walletService.credit({
        userId: ctx.user.id,
        type: 'purchase',
        amountMicros: product.creditAmountMicros,
        referenceType: 'iap_purchase',
        referenceId: purchaseId,
        idempotencyKey: `purchase_${input.revenuecatTransactionId}`,
        description: `Purchased ${product.name}`,
        metadata: { productId: product.id, sku: product.sku },
      });
      
      return {
        success: true,
        newBalanceSparks: microsToSparks(newBalance),
        creditsGrantedSparks: microsToSparks(product.creditAmountMicros),
      };
    }),
});
