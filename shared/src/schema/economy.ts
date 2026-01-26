import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

// User Wallets
export const userWallets = sqliteTable('user_wallets', {
  userId: text('user_id').primaryKey().references(() => users.id),
  balanceMicros: integer('balance_micros').notNull().default(0),
  lifetimeEarnedMicros: integer('lifetime_earned_micros').notNull().default(0),
  lifetimeSpentMicros: integer('lifetime_spent_micros').notNull().default(0),
  lastDailyClaimAt: integer('last_daily_claim_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const insertUserWalletSchema = createInsertSchema(userWallets);
export const selectUserWalletSchema = createSelectSchema(userWallets);
export type UserWallet = z.infer<typeof selectUserWalletSchema>;
export type NewUserWallet = z.infer<typeof insertUserWalletSchema>;

// Credit Transactions
export const creditTransactions = sqliteTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  amountMicros: integer('amount_micros').notNull(),
  balanceBeforeMicros: integer('balance_before_micros').notNull(),
  balanceAfterMicros: integer('balance_after_micros').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  idempotencyKey: text('idempotency_key'),
  description: text('description'),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_credit_transactions_user').on(table.userId),
  typeIdx: index('idx_credit_transactions_type').on(table.type),
  idempotencyIdx: uniqueIndex('idx_credit_transactions_idempotency').on(table.idempotencyKey),
}));

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions);
export const selectCreditTransactionSchema = createSelectSchema(creditTransactions);
export type CreditTransaction = z.infer<typeof selectCreditTransactionSchema>;
export type NewCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Operation Costs
export const operationCosts = sqliteTable('operation_costs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  operationType: text('operation_type').notNull(),
  estimatedCostMicros: integer('estimated_cost_micros').notNull(),
  actualCostMicros: integer('actual_cost_micros'),
  chargedCostMicros: integer('charged_cost_micros').notNull(),
  referenceType: text('reference_type').notNull(),
  referenceId: text('reference_id').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at').notNull(),
});

export const insertOperationCostSchema = createInsertSchema(operationCosts);
export const selectOperationCostSchema = createSelectSchema(operationCosts);
export type OperationCost = z.infer<typeof selectOperationCostSchema>;
export type NewOperationCost = z.infer<typeof insertOperationCostSchema>;

// IAP Products
export const iapProducts = sqliteTable('iap_products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  creditAmountMicros: integer('credit_amount_micros').notNull(),
  bonusPercent: integer('bonus_percent').default(0),
  isActive: integer('is_active').notNull().default(1),
  platform: text('platform'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const insertIapProductSchema = createInsertSchema(iapProducts);
export const selectIapProductSchema = createSelectSchema(iapProducts);
export type IapProduct = z.infer<typeof selectIapProductSchema>;
export type NewIapProduct = z.infer<typeof insertIapProductSchema>;

// IAP Purchases
export const iapPurchases = sqliteTable('iap_purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  productId: text('product_id').notNull().references(() => iapProducts.id),
  platform: text('platform').notNull(),
  revenuecatTransactionId: text('revenuecat_transaction_id').unique(),
  storeTransactionId: text('store_transaction_id'),
  priceCents: integer('price_cents').notNull(),
  creditsGrantedMicros: integer('credits_granted_micros').notNull(),
  status: text('status').notNull(),
  purchasedAt: integer('purchased_at').notNull(),
  processedAt: integer('processed_at'),
  refundedAt: integer('refunded_at'),
});

export const insertIapPurchaseSchema = createInsertSchema(iapPurchases);
export const selectIapPurchaseSchema = createSelectSchema(iapPurchases);
export type IapPurchase = z.infer<typeof selectIapPurchaseSchema>;
export type NewIapPurchase = z.infer<typeof insertIapPurchaseSchema>;

// Rate Limits
export const rateLimits = sqliteTable('rate_limits', {
  userId: text('user_id').notNull().references(() => users.id),
  actionType: text('action_type').notNull(),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull().default(0),
}, (table) => ({
  pk: uniqueIndex('rate_limits_pk').on(table.userId, table.actionType),
}));

export const insertRateLimitSchema = createInsertSchema(rateLimits);
export const selectRateLimitSchema = createSelectSchema(rateLimits);
export type RateLimit = z.infer<typeof selectRateLimitSchema>;
export type NewRateLimit = z.infer<typeof insertRateLimitSchema>;

// Signup Codes
export const signupCodes = sqliteTable('signup_codes', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').notNull().default(0),
  grantAmountMicros: integer('grant_amount_micros').notNull().default(1000000),
  isActive: integer('is_active').notNull().default(1),
  expiresAt: integer('expires_at'),
  createdBy: text('created_by'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const insertSignupCodeSchema = createInsertSchema(signupCodes);
export const selectSignupCodeSchema = createSelectSchema(signupCodes);
export type SignupCode = z.infer<typeof selectSignupCodeSchema>;
export type NewSignupCode = z.infer<typeof insertSignupCodeSchema>;

// Signup Code Redemptions
export const signupCodeRedemptions = sqliteTable('signup_code_redemptions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().references(() => signupCodes.code),
  userId: text('user_id').notNull().references(() => users.id),
  grantAmountMicros: integer('grant_amount_micros').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userUnique: uniqueIndex('signup_code_redemptions_user_unique').on(table.userId),
}));

export const insertSignupCodeRedemptionSchema = createInsertSchema(signupCodeRedemptions);
export const selectSignupCodeRedemptionSchema = createSelectSchema(signupCodeRedemptions);
export type SignupCodeRedemption = z.infer<typeof selectSignupCodeRedemptionSchema>;
export type NewSignupCodeRedemption = z.infer<typeof insertSignupCodeRedemptionSchema>;

// Promo Codes
export const promoCodes = sqliteTable('promo_codes', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').notNull().default(0),
  grantAmountMicros: integer('grant_amount_micros').notNull(),
  isActive: integer('is_active').notNull().default(1),
  startsAt: integer('starts_at'),
  expiresAt: integer('expires_at'),
  minAccountAgeDays: integer('min_account_age_days'),
  requiresPurchaseHistory: integer('requires_purchase_history').default(0),
  createdBy: text('created_by'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes);
export const selectPromoCodeSchema = createSelectSchema(promoCodes);
export type PromoCode = z.infer<typeof selectPromoCodeSchema>;
export type NewPromoCode = z.infer<typeof insertPromoCodeSchema>;

// Promo Code Redemptions
export const promoCodeRedemptions = sqliteTable('promo_code_redemptions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().references(() => promoCodes.code),
  userId: text('user_id').notNull().references(() => users.id),
  grantAmountMicros: integer('grant_amount_micros').notNull(),
  transactionId: text('transaction_id').references(() => creditTransactions.id),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userCodeUnique: uniqueIndex('promo_code_redemptions_user_code_unique').on(table.userId, table.code),
}));

export const insertPromoCodeRedemptionSchema = createInsertSchema(promoCodeRedemptions);
export const selectPromoCodeRedemptionSchema = createSelectSchema(promoCodeRedemptions);
export type PromoCodeRedemption = z.infer<typeof selectPromoCodeRedemptionSchema>;
export type NewPromoCodeRedemption = z.infer<typeof insertPromoCodeRedemptionSchema>;
