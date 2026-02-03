# Credit System Implementation Plan

**Created**: 2026-01-26  
**Status**: Ready for Implementation  
**Priority**: HIGH - Launch Blocker

---

## Executive Summary

Implement a **microdollar-based credit system** for Slopcade that:
1. Tracks user balances in **microdollars** (1M units = $1.00) for precision
2. Displays as user-friendly **"Sparks"** in the UI (1 Spark ≈ $0.001 = 1000 microdollars)
3. Gates AI operations (Scenario.com, OpenRouter) behind balance checks
4. Provides comprehensive audit logging for all transactions
5. Supports RevenueCat IAP for purchasing credits
6. **Requires signup code** for new users (waitlist system)
7. **Supports promo codes** for granting Sparks to existing users

### Key Business Rules (Updated)

| Rule | Value | Notes |
|------|-------|-------|
| **Initial Grant** | 1,000 Sparks ($1.00) | Only with valid signup code |
| **Daily Bonus** | ❌ NONE | Disabled for launch |
| **Signup Required** | ✅ Signup code | Waitlist/invite system |
| **Promo Codes** | ✅ Per-user idempotent | One use per user per code |

### Architecture Decision: Microdollars vs Credits

| Approach | Storage | Conversion | Pros | Cons |
|----------|---------|------------|------|------|
| **Microdollars (CHOSEN)** | `balance_micros BIGINT` | UI converts to display units | Precision, tracks actual costs, no rounding | Requires conversion layer |
| Credits | `sparks INTEGER` | Fixed exchange rate | Simpler, gamified | Loses cost precision, harder to adjust pricing |

**Decision**: Store as **microdollars** internally. This allows:
- Tracking actual API costs (Scenario: ~$0.02/image = 20,000 micros)
- Flexible pricing adjustments without database migrations
- Future cost analysis (what did each game cost us?)

**UI Translation**:
- 1 Spark (⚡) = 1,000 microdollars = $0.001
- 1 Gem (💎) = 10,000 microdollars = $0.01
- 100 Sparks = $0.10 (a typical AI generation)

### Scenario.com Cost Tracking

**Important**: Scenario.com API does NOT return cost/credit information per request. Their `JobResponse` only includes `jobId`, `status`, `progress`, `assetIds`, and `error`.

**Our approach**:
1. **Estimate costs** based on operation type (txt2img, img2img, remove-bg, layered)
2. **Charge users** based on our estimates (with margin)
3. **Log estimated vs actual** (actual = our estimate since Scenario doesn't tell us)
4. **Periodic reconciliation**: Compare our total estimated costs with Scenario.com dashboard usage monthly

---

## Context Gathered

### From Slopcade Codebase
- **Database**: Cloudflare D1 (SQLite) for app data, Supabase for auth
- **Schema Location**: `api/schema.sql` + `shared/src/schema/`
- **tRPC Routes**: `api/src/trpc/routes/` with `protectedProcedure` auth
- **Scenario.com**: Client at `api/src/ai/scenario.ts`, tracks jobs in `generation_jobs`/`generation_tasks`
- **Existing Plan**: `docs/game-maker/plans/ECONOMY_IMPLEMENTATION_PLAN.md` (Sparks/Gems concept)

### From oss-agent Repository (Reference Implementation)
- **Storage Pattern**: Integer `balance_cents` with `CHECK >= 0` constraint
- **Audit Table**: `financial_transactions` with `balance_after_cents` snapshot
- **Service Pattern**: `balance-service.ts` with atomic transactions
- **Cost Tracking**: `CostLedger.ts` with per-model pricing constants

### From Best Practices Research
- **Idempotency Keys**: Prevent duplicate transactions on retries
- **Atomic Updates**: `db.transaction()` for balance + log simultaneously
- **Pre-Authorization**: Check balance BEFORE starting expensive operations
- **Immutable Logs**: Never UPDATE/DELETE transaction records

---

## Database Schema

### New Tables (add to `api/schema.sql`)

```sql
-- =============================================================================
-- ECONOMY SYSTEM TABLES
-- Storage: All monetary values in MICRODOLLARS (1,000,000 = $1.00)
-- =============================================================================

-- User Wallets - One per user, tracks current balance
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance_micros INTEGER NOT NULL DEFAULT 0,     -- Current balance in microdollars
  lifetime_earned_micros INTEGER NOT NULL DEFAULT 0,  -- Total ever credited
  lifetime_spent_micros INTEGER NOT NULL DEFAULT 0,   -- Total ever debited
  last_daily_claim_at INTEGER,                   -- Timestamp of last daily bonus
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance_micros >= 0)  -- CRITICAL: Prevent negative balances at DB level
);

-- Transaction Ledger - Immutable audit trail of all balance changes
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Transaction Details
  type TEXT NOT NULL CHECK (type IN (
    'signup_code_grant',  -- Initial grant when using signup code
    'promo_code_grant',   -- Promo code redemption
    'purchase',           -- IAP purchase (RevenueCat)
    'generation_debit',   -- AI asset generation cost
    'generation_refund',  -- Refund for failed generation
    'admin_adjustment'    -- Manual adjustment by admin
    -- 'daily_bonus' - DISABLED for launch
  )),
  amount_micros INTEGER NOT NULL,  -- Positive = credit, Negative = debit
  
  -- Balance Snapshot (CRITICAL for auditing)
  balance_before_micros INTEGER NOT NULL,
  balance_after_micros INTEGER NOT NULL,
  
  -- Reference to source operation
  reference_type TEXT,  -- 'generation_job', 'generation_task', 'purchase', etc.
  reference_id TEXT,    -- ID of the related entity
  
  -- Idempotency (prevents duplicate processing)
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  description TEXT,
  metadata_json TEXT,   -- JSON: { model_id, prompt, cost_breakdown, etc. }
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- Cost Tracking - Per-operation cost records for analytics
CREATE TABLE IF NOT EXISTS operation_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Operation Details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'scenario_txt2img',
    'scenario_img2img', 
    'scenario_remove_bg',
    'scenario_layered',
    'openrouter_game_gen',
    'openrouter_chat'
  )),
  
  -- Cost Breakdown (all in microdollars)
  estimated_cost_micros INTEGER NOT NULL,  -- What we estimated before
  actual_cost_micros INTEGER,              -- What it actually cost (if known)
  charged_cost_micros INTEGER NOT NULL,    -- What we charged the user
  
  -- Reference
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  
  -- Metadata
  metadata_json TEXT,  -- JSON: { model_id, dimensions, tokens, etc. }
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_costs_user ON operation_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_costs_type ON operation_costs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_costs_created ON operation_costs(created_at);

-- IAP Products - Define purchasable credit packs
CREATE TABLE IF NOT EXISTS iap_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,              -- RevenueCat product ID
  name TEXT NOT NULL,                    -- "Starter Pack"
  description TEXT,
  
  -- Pricing
  price_cents INTEGER NOT NULL,          -- $4.99 = 499
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- What user gets
  credit_amount_micros INTEGER NOT NULL, -- How many microdollars
  bonus_percent INTEGER DEFAULT 0,       -- 10 = 10% bonus
  
  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  platform TEXT,                         -- 'ios', 'android', 'all'
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- IAP Purchases - Record of completed purchases
CREATE TABLE IF NOT EXISTS iap_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES iap_products(id),
  
  -- Platform Info
  platform TEXT NOT NULL,                     -- 'ios', 'android'
  revenuecat_transaction_id TEXT UNIQUE,      -- RevenueCat's ID
  store_transaction_id TEXT,                  -- Apple/Google's ID
  
  -- Amounts
  price_cents INTEGER NOT NULL,
  credits_granted_micros INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  
  -- Timestamps
  purchased_at INTEGER NOT NULL,
  processed_at INTEGER,
  refunded_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_iap_purchases_user ON iap_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_status ON iap_purchases(status);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_revenuecat ON iap_purchases(revenuecat_transaction_id);

-- Rate Limiting - Track usage for abuse prevention
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,          -- 'generation', 'daily_claim', etc.
  window_start INTEGER NOT NULL,      -- Start of current window (epoch)
  count INTEGER NOT NULL DEFAULT 0,   -- Actions in current window
  PRIMARY KEY (user_id, action_type)
);

-- =============================================================================
-- GEMS SYSTEM (Soft Currency - Engagement/Retention)
-- Earned through gameplay, spent on cosmetics/unlocks
-- Design TBD - see .sisyphus/plans/gems-economy-brainstorm.md
-- =============================================================================

-- User Gems - Soft currency balance (separate from Sparks/microdollars)
CREATE TABLE IF NOT EXISTS user_gems (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,           -- Current gem balance
  lifetime_earned INTEGER NOT NULL DEFAULT 0,   -- Total ever earned
  lifetime_spent INTEGER NOT NULL DEFAULT 0,    -- Total ever spent
  lifetime_purchased INTEGER NOT NULL DEFAULT 0, -- Total bought with real money
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance >= 0)
);

-- Gem Transactions - Audit trail for gem changes
CREATE TABLE IF NOT EXISTS gem_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Transaction Details
  type TEXT NOT NULL CHECK (type IN (
    'signup_bonus',       -- Initial grant on signup
    'daily_login',        -- Daily login reward
    'game_played',        -- Earned by playing a game
    'game_created_bonus', -- Bonus for publishing a game
    'creator_reward',     -- Earned when others play your game
    'achievement',        -- Unlocked an achievement
    'level_up',           -- Leveled up
    'purchase',           -- Bought with real money (IAP)
    'sparks_conversion',  -- Converted Sparks to Gems (if enabled)
    'cosmetic_purchase',  -- Spent on cosmetics
    'game_play_cost',     -- Cost to play a premium game (if enabled)
    'tip_sent',           -- Tipped another creator
    'tip_received',       -- Received a tip
    'admin_adjustment'    -- Manual adjustment
  )),
  amount INTEGER NOT NULL,  -- Positive = credit, Negative = debit
  
  -- Balance Snapshot
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Reference
  reference_type TEXT,  -- 'game', 'achievement', 'cosmetic', 'tip', etc.
  reference_id TEXT,
  
  -- Idempotency
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  description TEXT,
  metadata_json TEXT,
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gem_transactions_user ON gem_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_type ON gem_transactions(type);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created ON gem_transactions(created_at);

-- Gem Products - IAP products for purchasing gems
CREATE TABLE IF NOT EXISTS gem_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,              -- RevenueCat product ID
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- What user gets
  gem_amount INTEGER NOT NULL,
  bonus_percent INTEGER DEFAULT 0,
  
  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  platform TEXT,
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- =============================================================================
-- SIGNUP CODE SYSTEM (Waitlist/Invite)
-- Users cannot sign up without a valid code
-- =============================================================================

-- Signup Codes - Required to create an account
CREATE TABLE IF NOT EXISTS signup_codes (
  code TEXT PRIMARY KEY,              -- The actual code (e.g., "LAUNCH2026")
  name TEXT NOT NULL,                 -- Friendly name for admin ("Launch Party Invite")
  
  -- Usage Limits
  max_uses INTEGER,                   -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  
  -- Grants
  grant_amount_micros INTEGER NOT NULL DEFAULT 1000000, -- $1.00 = 1000 Sparks
  
  -- Validity
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER,                 -- NULL = never expires
  
  -- Metadata
  created_by TEXT,                    -- Admin user ID who created it
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Signup Code Redemptions - Track who used which code
CREATE TABLE IF NOT EXISTS signup_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES signup_codes(code),
  user_id TEXT NOT NULL REFERENCES users(id),
  grant_amount_micros INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id)  -- Each user can only redeem ONE signup code (during signup)
);

CREATE INDEX IF NOT EXISTS idx_signup_code_redemptions_code ON signup_code_redemptions(code);

-- =============================================================================
-- PROMO CODE SYSTEM (Grants for existing users)
-- Idempotent: one use per user per code
-- =============================================================================

-- Promo Codes - Grant Sparks to existing users
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,              -- The actual code (e.g., "HAPPYNEWYEAR")
  name TEXT NOT NULL,                 -- Friendly name ("New Year 2026 Promo")
  
  -- Usage Limits
  max_uses INTEGER,                   -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  
  -- Grants
  grant_amount_micros INTEGER NOT NULL, -- How many microdollars to grant
  
  -- Validity
  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at INTEGER,                  -- NULL = immediately active
  expires_at INTEGER,                 -- NULL = never expires
  
  -- Restrictions
  min_account_age_days INTEGER,       -- Minimum days since signup (anti-abuse)
  requires_purchase_history INTEGER DEFAULT 0, -- Must have made a purchase
  
  -- Metadata
  created_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Promo Code Redemptions - Track who redeemed which promo code
-- CRITICAL: UNIQUE(user_id, code) ensures one use per user per code
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES promo_codes(code),
  user_id TEXT NOT NULL REFERENCES users(id),
  grant_amount_micros INTEGER NOT NULL,
  transaction_id TEXT REFERENCES credit_transactions(id),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, code)  -- IDEMPOTENT: One redemption per user per code
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_code ON promo_code_redemptions(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON promo_code_redemptions(user_id);
```

### Drizzle Schema (add to `shared/src/schema/economy.ts`)

```typescript
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const userWallets = sqliteTable('user_wallets', {
  userId: text('user_id').primaryKey().references(() => users.id),
  balanceMicros: integer('balance_micros').notNull().default(0),
  lifetimeEarnedMicros: integer('lifetime_earned_micros').notNull().default(0),
  lifetimeSpentMicros: integer('lifetime_spent_micros').notNull().default(0),
  lastDailyClaimAt: integer('last_daily_claim_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

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

export const rateLimits = sqliteTable('rate_limits', {
  userId: text('user_id').notNull().references(() => users.id),
  actionType: text('action_type').notNull(),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull().default(0),
}, (table) => ({
  pk: uniqueIndex('rate_limits_pk').on(table.userId, table.actionType),
}));

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

export const signupCodeRedemptions = sqliteTable('signup_code_redemptions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().references(() => signupCodes.code),
  userId: text('user_id').notNull().references(() => users.id),
  grantAmountMicros: integer('grant_amount_micros').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userUnique: uniqueIndex('signup_code_redemptions_user_unique').on(table.userId),
}));

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

// =============================================================================
// GEMS SYSTEM (Soft Currency)
// =============================================================================

export const userGems = sqliteTable('user_gems', {
  userId: text('user_id').primaryKey().references(() => users.id),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent: integer('lifetime_spent').notNull().default(0),
  lifetimePurchased: integer('lifetime_purchased').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const gemTransactions = sqliteTable('gem_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  idempotencyKey: text('idempotency_key'),
  description: text('description'),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_gem_transactions_user').on(table.userId),
  typeIdx: index('idx_gem_transactions_type').on(table.type),
  idempotencyIdx: uniqueIndex('idx_gem_transactions_idempotency').on(table.idempotencyKey),
}));

export const gemProducts = sqliteTable('gem_products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  gemAmount: integer('gem_amount').notNull(),
  bonusPercent: integer('bonus_percent').default(0),
  isActive: integer('is_active').notNull().default(1),
  platform: text('platform'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

---

## Cost Constants & Pricing

### File: `api/src/economy/pricing.ts`

```typescript
/**
 * All costs in MICRODOLLARS (1,000,000 = $1.00)
 * 
 * Conversion helpers:
 * - 1 Spark (display) = 1,000 microdollars
 * - 1 Gem (display) = 10,000 microdollars
 * - $0.01 = 10,000 microdollars
 */

// Base costs (what WE pay to providers)
export const PROVIDER_COSTS = {
  // Scenario.com - approximately $0.02 per image
  SCENARIO_TXT2IMG: 20_000,      // $0.02
  SCENARIO_IMG2IMG: 20_000,      // $0.02
  SCENARIO_REMOVE_BG: 5_000,     // $0.005
  SCENARIO_LAYERED: 30_000,      // $0.03
  
  // OpenRouter - varies by model, these are estimates
  OPENROUTER_GPT4O_INPUT_1K: 2_500,   // $0.0025 per 1k input tokens
  OPENROUTER_GPT4O_OUTPUT_1K: 10_000, // $0.01 per 1k output tokens
} as const;

// What we CHARGE users (includes margin)
// Margin factor: 2x (100% markup) - adjust as needed
const MARGIN = 2.0;

export const USER_COSTS = {
  // Asset Generation
  ASSET_ENTITY: Math.ceil(PROVIDER_COSTS.SCENARIO_IMG2IMG * MARGIN),           // 40,000 micros = 40 Sparks
  ASSET_BACKGROUND: Math.ceil(PROVIDER_COSTS.SCENARIO_TXT2IMG * MARGIN),       // 40,000 micros = 40 Sparks
  ASSET_TITLE_HERO: Math.ceil((PROVIDER_COSTS.SCENARIO_TXT2IMG + PROVIDER_COSTS.SCENARIO_REMOVE_BG) * MARGIN), // 50,000 micros
  ASSET_PARALLAX: Math.ceil((PROVIDER_COSTS.SCENARIO_TXT2IMG + PROVIDER_COSTS.SCENARIO_LAYERED) * MARGIN),      // 100,000 micros
  
  // Game Generation (LLM)
  GAME_GENERATION_BASE: 100_000,  // $0.10 base cost
  GAME_GENERATION_PER_ENTITY: 20_000, // $0.02 per entity in game
  
  // Bulk discounts
  FULL_GAME_RESKIN_DISCOUNT: 0.8, // 20% off when regenerating entire game
} as const;

// Display conversion
export const DISPLAY_UNITS = {
  MICROS_PER_SPARK: 1_000,
  MICROS_PER_GEM: 10_000,
  SPARKS_PER_GEM: 10,
} as const;

// Signup code grants (NO daily bonus for launch)
export const GRANTS = {
  SIGNUP_CODE_DEFAULT: 1_000_000,  // $1.00 = 1000 Sparks (enough for ~25 assets)
  // DAILY_LOGIN_BONUS: DISABLED for launch
} as const;

// Rate limits
export const RATE_LIMITS = {
  GENERATIONS_PER_HOUR: 20,
  GENERATIONS_PER_DAY: 100,
  DAILY_CLAIMS_PER_DAY: 1,
} as const;

// IAP Products (seed data)
export const IAP_PRODUCT_CATALOG = [
  {
    id: 'starter_pack',
    sku: 'com.slopcade.sparks.starter',
    name: 'Starter Pack',
    description: '500 Sparks - Perfect for trying out AI generation',
    priceCents: 99,        // $0.99
    creditAmountMicros: 500_000, // 500 Sparks
    bonusPercent: 0,
  },
  {
    id: 'creator_pack',
    sku: 'com.slopcade.sparks.creator',
    name: 'Creator Pack',
    description: '2,500 Sparks + 10% Bonus',
    priceCents: 499,       // $4.99
    creditAmountMicros: 2_750_000, // 2750 Sparks (includes 10% bonus)
    bonusPercent: 10,
  },
  {
    id: 'studio_pack',
    sku: 'com.slopcade.sparks.studio',
    name: 'Studio Pack',
    description: '10,000 Sparks + 20% Bonus',
    priceCents: 1999,      // $19.99
    creditAmountMicros: 12_000_000, // 12000 Sparks (includes 20% bonus)
    bonusPercent: 20,
  },
] as const;

// Helper functions
export function microsToSparks(micros: number): number {
  return Math.floor(micros / DISPLAY_UNITS.MICROS_PER_SPARK);
}

export function sparksToMicros(sparks: number): number {
  return sparks * DISPLAY_UNITS.MICROS_PER_SPARK;
}

export function microsToUSD(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function formatSparks(micros: number): string {
  const sparks = microsToSparks(micros);
  return `${sparks.toLocaleString()} ⚡`;
}
```

---

## Service Layer

### File: `api/src/economy/wallet-service.ts`

```typescript
import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import { userWallets, creditTransactions, rateLimits } from '@slopcade/shared/schema/economy';
import { GRANTS, RATE_LIMITS } from './pricing';

export type TransactionType = 
  | 'signup_code_grant'   // Initial grant when using signup code
  | 'promo_code_grant'    // Promo code redemption
  | 'purchase'            // IAP purchase (RevenueCat)
  | 'generation_debit'    // AI asset generation cost
  | 'generation_refund'   // Refund for failed generation
  | 'admin_adjustment';   // Manual adjustment by admin
  // 'daily_bonus' - DISABLED for launch

export interface TransactionParams {
  userId: string;
  type: TransactionType;
  amountMicros: number;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export class WalletService {
  constructor(private db: D1Database) {}

  /**
   * Get or create wallet for user
   * NOTE: New wallets start with ZERO balance
   * Credits are granted via signup code redemption, NOT automatically
   */
  async getOrCreateWallet(userId: string): Promise<typeof userWallets.$inferSelect> {
    const now = Date.now();
    
    // Try to get existing wallet
    const existing = await this.db
      .prepare('SELECT * FROM user_wallets WHERE user_id = ?')
      .bind(userId)
      .first<typeof userWallets.$inferSelect>();
    
    if (existing) return existing;
    
    // Create new wallet with ZERO balance (credits come from signup code)
    await this.db.prepare(`
      INSERT INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
      VALUES (?, 0, 0, 0, ?, ?)
    `).bind(userId, now, now).run();
    
    return {
      userId,
      balanceMicros: 0,
      lifetimeEarnedMicros: 0,
      lifetimeSpentMicros: 0,
      lastDailyClaimAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get current balance
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balanceMicros;
  }

  /**
   * Check if user has sufficient balance for an operation
   */
  async hasSufficientBalance(userId: string, requiredMicros: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= requiredMicros;
  }

  /**
   * Credit user's wallet (add funds)
   * Returns the new balance
   */
  async credit(params: TransactionParams): Promise<number> {
    if (params.amountMicros <= 0) {
      throw new Error('Credit amount must be positive');
    }
    return this.executeTransaction(params);
  }

  /**
   * Debit user's wallet (subtract funds)
   * Throws if insufficient balance
   * Returns the new balance
   */
  async debit(params: TransactionParams): Promise<number> {
    if (params.amountMicros >= 0) {
      throw new Error('Debit amount must be negative');
    }
    
    // Pre-check balance (defense in depth, actual check is in transaction)
    const hasFunds = await this.hasSufficientBalance(params.userId, Math.abs(params.amountMicros));
    if (!hasFunds) {
      throw new InsufficientBalanceError(
        params.userId,
        Math.abs(params.amountMicros),
        await this.getBalance(params.userId)
      );
    }
    
    return this.executeTransaction(params);
  }

  /**
   * Execute a transaction atomically
   */
  private async executeTransaction(params: TransactionParams): Promise<number> {
    const { userId, type, amountMicros, referenceType, referenceId, idempotencyKey, description, metadata } = params;
    const now = Date.now();
    const txId = nanoid();
    
    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.db
        .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
        .bind(idempotencyKey)
        .first();
      
      if (existing) {
        // Already processed, return current balance
        return this.getBalance(userId);
      }
    }
    
    // Get current wallet state
    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = wallet.balanceMicros;
    const balanceAfter = balanceBefore + amountMicros;
    
    // Validate balance won't go negative
    if (balanceAfter < 0) {
      throw new InsufficientBalanceError(userId, Math.abs(amountMicros), balanceBefore);
    }
    
    // Calculate lifetime updates
    const lifetimeEarnedDelta = amountMicros > 0 ? amountMicros : 0;
    const lifetimeSpentDelta = amountMicros < 0 ? Math.abs(amountMicros) : 0;
    
    // Execute atomic update
    await this.db.batch([
      // Update wallet balance
      this.db.prepare(`
        UPDATE user_wallets 
        SET balance_micros = balance_micros + ?,
            lifetime_earned_micros = lifetime_earned_micros + ?,
            lifetime_spent_micros = lifetime_spent_micros + ?,
            updated_at = ?
        WHERE user_id = ? AND balance_micros + ? >= 0
      `).bind(amountMicros, lifetimeEarnedDelta, lifetimeSpentDelta, now, userId, amountMicros),
      
      // Insert transaction record
      this.db.prepare(`
        INSERT INTO credit_transactions 
        (id, user_id, type, amount_micros, balance_before_micros, balance_after_micros, 
         reference_type, reference_id, idempotency_key, description, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        txId, userId, type, amountMicros, balanceBefore, balanceAfter,
        referenceType ?? null, referenceId ?? null, idempotencyKey ?? null,
        description ?? null, metadata ? JSON.stringify(metadata) : null, now
      ),
    ]);
    
    return balanceAfter;
  }

  // Daily bonus DISABLED for launch
  // async claimDailyBonus() { ... }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<Array<typeof creditTransactions.$inferSelect>> {
    const results = await this.db
      .prepare(`
        SELECT * FROM credit_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all<typeof creditTransactions.$inferSelect>();
    
    return results.results ?? [];
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(userId: string, actionType: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create rate limit record
    const record = await this.db
      .prepare('SELECT * FROM rate_limits WHERE user_id = ? AND action_type = ?')
      .bind(userId, actionType)
      .first<typeof rateLimits.$inferSelect>();
    
    if (!record || record.windowStart < windowStart) {
      // New window, reset count
      await this.db.prepare(`
        INSERT OR REPLACE INTO rate_limits (user_id, action_type, window_start, count)
        VALUES (?, ?, ?, 1)
      `).bind(userId, actionType, now).run();
      return true;
    }
    
    if (record.count >= limit) {
      return false; // Rate limited
    }
    
    // Increment count
    await this.db.prepare(`
      UPDATE rate_limits SET count = count + 1 WHERE user_id = ? AND action_type = ?
    `).bind(userId, actionType).run();
    
    return true;
  }
}

export class InsufficientBalanceError extends Error {
  constructor(
    public userId: string,
    public requiredMicros: number,
    public availableMicros: number
  ) {
    super(`Insufficient balance: required ${requiredMicros}, available ${availableMicros}`);
    this.name = 'InsufficientBalanceError';
  }
}
```

### File: `api/src/economy/signup-code-service.ts`

```typescript
import { nanoid } from 'nanoid';
import { GRANTS } from './pricing';

export interface SignupCode {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  isActive: boolean;
  expiresAt: number | null;
}

export class SignupCodeService {
  constructor(private db: D1Database) {}

  /**
   * Validate a signup code (called during registration)
   * Returns the grant amount if valid, throws if invalid
   */
  async validateCode(code: string): Promise<{ valid: true; grantAmountMicros: number }> {
    const now = Date.now();
    
    const signupCode = await this.db
      .prepare(`
        SELECT * FROM signup_codes 
        WHERE code = ? AND is_active = 1
      `)
      .bind(code.toUpperCase().trim())
      .first<SignupCode>();
    
    if (!signupCode) {
      throw new InvalidSignupCodeError(code, 'Code not found or inactive');
    }
    
    // Check expiration
    if (signupCode.expiresAt && now > signupCode.expiresAt) {
      throw new InvalidSignupCodeError(code, 'Code has expired');
    }
    
    // Check usage limit
    if (signupCode.maxUses !== null && signupCode.currentUses >= signupCode.maxUses) {
      throw new InvalidSignupCodeError(code, 'Code has reached maximum uses');
    }
    
    return {
      valid: true,
      grantAmountMicros: signupCode.grantAmountMicros,
    };
  }

  /**
   * Redeem a signup code for a new user
   * Called AFTER user is created in Supabase Auth
   */
  async redeemCode(
    code: string, 
    userId: string, 
    walletService: WalletService
  ): Promise<{ newBalance: number }> {
    const now = Date.now();
    const redemptionId = nanoid();
    
    // Validate first
    const { grantAmountMicros } = await this.validateCode(code);
    
    // Check user hasn't already redeemed a signup code
    const existingRedemption = await this.db
      .prepare('SELECT id FROM signup_code_redemptions WHERE user_id = ?')
      .bind(userId)
      .first();
    
    if (existingRedemption) {
      throw new InvalidSignupCodeError(code, 'User has already used a signup code');
    }
    
    // Atomically: increment usage count + record redemption + credit wallet
    await this.db.batch([
      // Increment usage count
      this.db.prepare(`
        UPDATE signup_codes 
        SET current_uses = current_uses + 1, updated_at = ?
        WHERE code = ?
      `).bind(now, code.toUpperCase().trim()),
      
      // Record redemption
      this.db.prepare(`
        INSERT INTO signup_code_redemptions (id, code, user_id, grant_amount_micros, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(redemptionId, code.toUpperCase().trim(), userId, grantAmountMicros, now),
    ]);
    
    // Credit the wallet (creates wallet if needed)
    const newBalance = await walletService.credit({
      userId,
      type: 'signup_code_grant',
      amountMicros: grantAmountMicros,
      referenceType: 'signup_code',
      referenceId: code.toUpperCase().trim(),
      idempotencyKey: `signup_${userId}`,
      description: `Welcome bonus with code ${code}`,
    });
    
    return { newBalance };
  }

  /**
   * Create a new signup code (admin only)
   */
  async createCode(params: {
    code: string;
    name: string;
    maxUses?: number;
    grantAmountMicros?: number;
    expiresAt?: number;
    createdBy?: string;
    notes?: string;
  }): Promise<void> {
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO signup_codes 
      (code, name, max_uses, grant_amount_micros, expires_at, created_by, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.code.toUpperCase().trim(),
      params.name,
      params.maxUses ?? null,
      params.grantAmountMicros ?? GRANTS.SIGNUP_CODE_DEFAULT,
      params.expiresAt ?? null,
      params.createdBy ?? null,
      params.notes ?? null,
      now,
      now
    ).run();
  }
}

export class InvalidSignupCodeError extends Error {
  constructor(public code: string, public reason: string) {
    super(`Invalid signup code "${code}": ${reason}`);
    this.name = 'InvalidSignupCodeError';
  }
}
```

### File: `api/src/economy/promo-code-service.ts`

```typescript
import { nanoid } from 'nanoid';

export interface PromoCode {
  code: string;
  name: string;
  maxUses: number | null;
  currentUses: number;
  grantAmountMicros: number;
  isActive: boolean;
  startsAt: number | null;
  expiresAt: number | null;
  minAccountAgeDays: number | null;
  requiresPurchaseHistory: boolean;
}

export class PromoCodeService {
  constructor(private db: D1Database) {}

  /**
   * Redeem a promo code for an existing user
   * Idempotent: returns success if already redeemed (no double-grant)
   */
  async redeemCode(
    code: string, 
    userId: string, 
    walletService: WalletService
  ): Promise<{ 
    success: boolean; 
    newBalance?: number; 
    alreadyRedeemed?: boolean;
    grantedSparks?: number;
  }> {
    const now = Date.now();
    const normalizedCode = code.toUpperCase().trim();
    
    // Check if already redeemed (idempotent)
    const existingRedemption = await this.db
      .prepare('SELECT id FROM promo_code_redemptions WHERE user_id = ? AND code = ?')
      .bind(userId, normalizedCode)
      .first();
    
    if (existingRedemption) {
      return { success: true, alreadyRedeemed: true };
    }
    
    // Get promo code
    const promoCode = await this.db
      .prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1')
      .bind(normalizedCode)
      .first<PromoCode>();
    
    if (!promoCode) {
      throw new InvalidPromoCodeError(code, 'Code not found or inactive');
    }
    
    // Check start time
    if (promoCode.startsAt && now < promoCode.startsAt) {
      throw new InvalidPromoCodeError(code, 'Code is not yet active');
    }
    
    // Check expiration
    if (promoCode.expiresAt && now > promoCode.expiresAt) {
      throw new InvalidPromoCodeError(code, 'Code has expired');
    }
    
    // Check usage limit
    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      throw new InvalidPromoCodeError(code, 'Code has reached maximum uses');
    }
    
    // Check account age requirement
    if (promoCode.minAccountAgeDays) {
      const user = await this.db
        .prepare('SELECT created_at FROM users WHERE id = ?')
        .bind(userId)
        .first<{ created_at: number }>();
      
      if (user) {
        const accountAgeDays = (now - user.created_at) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < promoCode.minAccountAgeDays) {
          throw new InvalidPromoCodeError(
            code, 
            `Account must be at least ${promoCode.minAccountAgeDays} days old`
          );
        }
      }
    }
    
    // Check purchase history requirement
    if (promoCode.requiresPurchaseHistory) {
      const hasPurchase = await this.db
        .prepare('SELECT id FROM iap_purchases WHERE user_id = ? AND status = ? LIMIT 1')
        .bind(userId, 'completed')
        .first();
      
      if (!hasPurchase) {
        throw new InvalidPromoCodeError(code, 'Code requires previous purchase');
      }
    }
    
    // Credit wallet first (so we get the transaction ID)
    const newBalance = await walletService.credit({
      userId,
      type: 'promo_code_grant',
      amountMicros: promoCode.grantAmountMicros,
      referenceType: 'promo_code',
      referenceId: normalizedCode,
      idempotencyKey: `promo_${userId}_${normalizedCode}`,
      description: `Promo code: ${promoCode.name}`,
    });
    
    // Get the transaction ID we just created
    const tx = await this.db
      .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
      .bind(`promo_${userId}_${normalizedCode}`)
      .first<{ id: string }>();
    
    // Record redemption + increment usage
    await this.db.batch([
      this.db.prepare(`
        UPDATE promo_codes 
        SET current_uses = current_uses + 1, updated_at = ?
        WHERE code = ?
      `).bind(now, normalizedCode),
      
      this.db.prepare(`
        INSERT INTO promo_code_redemptions (id, code, user_id, grant_amount_micros, transaction_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(nanoid(), normalizedCode, userId, promoCode.grantAmountMicros, tx?.id ?? null, now),
    ]);
    
    return { 
      success: true, 
      newBalance,
      grantedSparks: promoCode.grantAmountMicros / 1000, // Convert to Sparks for display
    };
  }

  /**
   * Create a new promo code (admin only)
   */
  async createCode(params: {
    code: string;
    name: string;
    grantAmountMicros: number;
    maxUses?: number;
    startsAt?: number;
    expiresAt?: number;
    minAccountAgeDays?: number;
    requiresPurchaseHistory?: boolean;
    createdBy?: string;
    notes?: string;
  }): Promise<void> {
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO promo_codes 
      (code, name, grant_amount_micros, max_uses, starts_at, expires_at, 
       min_account_age_days, requires_purchase_history, created_by, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.code.toUpperCase().trim(),
      params.name,
      params.grantAmountMicros,
      params.maxUses ?? null,
      params.startsAt ?? null,
      params.expiresAt ?? null,
      params.minAccountAgeDays ?? null,
      params.requiresPurchaseHistory ? 1 : 0,
      params.createdBy ?? null,
      params.notes ?? null,
      now,
      now
    ).run();
  }

  /**
   * List all promo codes (admin only)
   */
  async listCodes(): Promise<PromoCode[]> {
    const result = await this.db
      .prepare('SELECT * FROM promo_codes ORDER BY created_at DESC')
      .all<PromoCode>();
    return result.results ?? [];
  }
}

export class InvalidPromoCodeError extends Error {
  constructor(public code: string, public reason: string) {
    super(`Invalid promo code "${code}": ${reason}`);
    this.name = 'InvalidPromoCodeError';
  }
}
```

### File: `api/src/economy/cost-estimator.ts`

```typescript
import { USER_COSTS, microsToSparks, formatSparks } from './pricing';
import type { GameDefinition, EntityTemplate } from '@slopcade/shared/types';

export interface CostEstimate {
  totalMicros: number;
  breakdown: CostBreakdownItem[];
  displayTotal: string;  // "150 ⚡"
}

export interface CostBreakdownItem {
  description: string;
  count: number;
  unitCostMicros: number;
  totalMicros: number;
}

/**
 * Estimate the cost of generating assets for a game
 */
export function estimateGameAssetCost(
  gameDefinition: GameDefinition,
  options: {
    regenerateAll?: boolean;
    specificTemplates?: string[];
  } = {}
): CostEstimate {
  const breakdown: CostBreakdownItem[] = [];
  const templates = gameDefinition.templates ?? [];
  
  // Filter templates if specific ones requested
  const templatesToGenerate = options.specificTemplates
    ? templates.filter(t => options.specificTemplates!.includes(t.id))
    : templates;
  
  // Count by type
  const entityCount = templatesToGenerate.filter(t => 
    !['background', 'parallax', 'title_hero', 'ui'].includes(t.entityType ?? '')
  ).length;
  
  const backgroundCount = templatesToGenerate.filter(t => 
    t.entityType === 'background'
  ).length;
  
  const parallaxCount = templatesToGenerate.filter(t => 
    t.entityType === 'parallax'
  ).length;
  
  const titleHeroCount = templatesToGenerate.filter(t => 
    t.entityType === 'title_hero'
  ).length;
  
  // Build breakdown
  if (entityCount > 0) {
    breakdown.push({
      description: 'Entity sprites',
      count: entityCount,
      unitCostMicros: USER_COSTS.ASSET_ENTITY,
      totalMicros: entityCount * USER_COSTS.ASSET_ENTITY,
    });
  }
  
  if (backgroundCount > 0) {
    breakdown.push({
      description: 'Backgrounds',
      count: backgroundCount,
      unitCostMicros: USER_COSTS.ASSET_BACKGROUND,
      totalMicros: backgroundCount * USER_COSTS.ASSET_BACKGROUND,
    });
  }
  
  if (parallaxCount > 0) {
    breakdown.push({
      description: 'Parallax layers',
      count: parallaxCount,
      unitCostMicros: USER_COSTS.ASSET_PARALLAX,
      totalMicros: parallaxCount * USER_COSTS.ASSET_PARALLAX,
    });
  }
  
  if (titleHeroCount > 0) {
    breakdown.push({
      description: 'Title/Hero images',
      count: titleHeroCount,
      unitCostMicros: USER_COSTS.ASSET_TITLE_HERO,
      totalMicros: titleHeroCount * USER_COSTS.ASSET_TITLE_HERO,
    });
  }
  
  // Calculate total
  let totalMicros = breakdown.reduce((sum, item) => sum + item.totalMicros, 0);
  
  // Apply bulk discount for full regeneration
  if (options.regenerateAll && templatesToGenerate.length >= 5) {
    const discount = totalMicros * (1 - USER_COSTS.FULL_GAME_RESKIN_DISCOUNT);
    breakdown.push({
      description: 'Bulk discount (20%)',
      count: 1,
      unitCostMicros: -discount,
      totalMicros: -discount,
    });
    totalMicros -= discount;
  }
  
  return {
    totalMicros: Math.ceil(totalMicros),
    breakdown,
    displayTotal: formatSparks(totalMicros),
  };
}

/**
 * Estimate cost for a single operation
 */
export function estimateOperationCost(
  operationType: keyof typeof USER_COSTS
): { micros: number; display: string } {
  const micros = USER_COSTS[operationType];
  return {
    micros,
    display: formatSparks(micros),
  };
}
```

---

## tRPC Routes

### File: `api/src/trpc/routes/economy.ts`

```typescript
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { router, protectedProcedure, publicProcedure } from '../index';
import { TRPCError } from '@trpc/server';
import { WalletService, InsufficientBalanceError } from '../../economy/wallet-service';
import { SignupCodeService, InvalidSignupCodeError } from '../../economy/signup-code-service';
import { PromoCodeService, InvalidPromoCodeError } from '../../economy/promo-code-service';
import { estimateGameAssetCost } from '../../economy/cost-estimator';
import { microsToSparks, DISPLAY_UNITS, RATE_LIMITS } from '../../economy/pricing';

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
      // canClaimDaily: DISABLED for launch (daily bonus disabled)
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

  // Daily bonus DISABLED for launch
  // claimDailyBonus: protectedProcedure.mutation(...)

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
          grantSparks: result.grantAmountMicros / 1000,
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
   * Estimate cost for asset generation
   */
  estimateCost: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      regenerateAll: z.boolean().default(false),
      specificTemplates: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch game definition
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
      
      // Check current balance
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
      
      // Check rate limit
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
      
      // Check balance
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
      
      // Return authorization (actual debit happens in generation flow)
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
      
      // Get product
      const product = await ctx.env.DB
        .prepare('SELECT * FROM iap_products WHERE id = ?')
        .bind(input.productId)
        .first<typeof import('@slopcade/shared/schema/economy').iapProducts.$inferSelect>();
      
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      
      // Check for duplicate transaction
      const existing = await ctx.env.DB
        .prepare('SELECT id FROM iap_purchases WHERE revenuecat_transaction_id = ?')
        .bind(input.revenuecatTransactionId)
        .first();
      
      if (existing) {
        return { success: true, alreadyProcessed: true };
      }
      
      // Record purchase and credit wallet
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
      
      // Credit the wallet
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
```

### Update Router (add to `api/src/trpc/router.ts`)

```typescript
import { economyRouter } from './routes/economy';

export const appRouter = router({
  // ... existing routers
  economy: economyRouter,
});
```

---

## Integration with Asset Generation

### File: Update `api/src/trpc/routes/asset-system.ts`

Add these changes to the existing asset generation flow:

```typescript
// At top of file
import { WalletService, InsufficientBalanceError } from '../../economy/wallet-service';
import { estimateGameAssetCost } from '../../economy/cost-estimator';
import { RATE_LIMITS } from '../../economy/pricing';

// Update createGenerationJob mutation
createGenerationJob: protectedProcedure
  .input(z.object({
    gameId: z.string(),
    packId: z.string().optional(),
    promptDefaults: PromptDefaultsSchema.optional(),
    specificTemplates: z.array(z.string()).optional(),
    idempotencyKey: z.string(), // REQUIRED now
  }))
  .mutation(async ({ ctx, input }) => {
    const walletService = new WalletService(ctx.env.DB);
    
    // 1. Rate limit check
    const allowed = await walletService.checkRateLimit(
      ctx.user.id,
      'generation',
      RATE_LIMITS.GENERATIONS_PER_HOUR,
      60 * 60 * 1000
    );
    if (!allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
    }
    
    // 2. Get game and estimate cost
    const game = await ctx.env.DB
      .prepare('SELECT definition FROM games WHERE id = ? AND user_id = ?')
      .bind(input.gameId, ctx.user.id)
      .first<{ definition: string }>();
    
    if (!game) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    
    const definition = JSON.parse(game.definition);
    const estimate = estimateGameAssetCost(definition, {
      regenerateAll: !input.specificTemplates,
      specificTemplates: input.specificTemplates,
    });
    
    // 3. Debit wallet (throws if insufficient)
    try {
      await walletService.debit({
        userId: ctx.user.id,
        type: 'generation_debit',
        amountMicros: -estimate.totalMicros, // Negative for debit
        referenceType: 'generation_job',
        referenceId: input.idempotencyKey, // Will be replaced with actual job ID
        idempotencyKey: `gen_debit_${input.idempotencyKey}`,
        description: `Asset generation for game`,
        metadata: {
          gameId: input.gameId,
          estimatedCost: estimate,
        },
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Insufficient balance',
          cause: {
            required: estimate.totalMicros,
            available: err.availableMicros,
          },
        });
      }
      throw err;
    }
    
    // 4. Continue with existing job creation logic...
    // [existing code here]
    
    // 5. If job creation fails, refund
    // (wrap existing logic in try/catch and refund on error)
  }),
```

---

## UI Components

### File: `app/components/economy/CreditBalance.tsx`

```typescript
import { View, Text, Pressable } from 'react-native';
import { trpc } from '@/lib/trpc';

export function CreditBalance({ onPress }: { onPress?: () => void }) {
  const { data: balance, isLoading } = trpc.economy.getBalance.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s
  });
  
  if (isLoading || !balance) {
    return (
      <View className="flex-row items-center px-3 py-1 bg-gray-100 rounded-full">
        <Text className="text-gray-400">...</Text>
      </View>
    );
  }
  
  return (
    <Pressable 
      onPress={onPress}
      className="flex-row items-center px-3 py-1 bg-amber-100 rounded-full"
    >
      <Text className="text-lg mr-1">⚡</Text>
      <Text className="font-semibold text-amber-700">
        {balance.balanceSparks.toLocaleString()}
      </Text>
      {/* Daily bonus indicator - DISABLED for launch
      {balance.canClaimDaily && (
        <View className="w-2 h-2 bg-green-500 rounded-full ml-2" />
      )}
      */}
    </Pressable>
  );
}
```

### File: `app/components/economy/CostPreview.tsx`

```typescript
import { View, Text } from 'react-native';
import { trpc } from '@/lib/trpc';

interface CostPreviewProps {
  gameId: string;
  regenerateAll?: boolean;
  specificTemplates?: string[];
}

export function CostPreview({ gameId, regenerateAll, specificTemplates }: CostPreviewProps) {
  const { data: estimate, isLoading } = trpc.economy.estimateCost.useQuery({
    gameId,
    regenerateAll,
    specificTemplates,
  });
  
  if (isLoading || !estimate) {
    return <Text className="text-gray-400">Calculating cost...</Text>;
  }
  
  return (
    <View className="p-4 bg-gray-50 rounded-lg">
      <Text className="text-lg font-semibold mb-2">
        Cost: {estimate.totalSparks} ⚡
      </Text>
      
      {estimate.breakdown.map((item, i) => (
        <View key={i} className="flex-row justify-between py-1">
          <Text className="text-gray-600">
            {item.description} (×{item.count})
          </Text>
          <Text className={item.totalMicros < 0 ? 'text-green-600' : 'text-gray-800'}>
            {item.totalMicros < 0 ? '-' : ''}{Math.abs(item.count * item.unitCostMicros / 1000)} ⚡
          </Text>
        </View>
      ))}
      
      <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
        <Text className="font-medium">Your Balance:</Text>
        <Text className={estimate.canAfford ? 'text-green-600' : 'text-red-600'}>
          {estimate.currentBalanceSparks} ⚡
        </Text>
      </View>
      
      {!estimate.canAfford && (
        <Text className="text-red-600 mt-2">
          Need {estimate.shortfallSparks} more Sparks
        </Text>
      )}
    </View>
  );
}
```

---

## Implementation TODOs (Ordered)

### Phase 1: Database & Core (TODAY - ~4 hours)

- [x] **1.1** Add economy tables to `api/schema.sql` (wallets, transactions, costs)
- [x] **1.2** Add signup code tables to `api/schema.sql`
- [x] **1.3** Add promo code tables to `api/schema.sql`
- [x] **1.4** Add Gems tables to `api/schema.sql` (user_gems, gem_transactions, gem_products)
- [x] **1.5** Run `pnpm --filter @slopcade/api db:push` to apply schema
- [x] **1.6** Create `shared/src/schema/economy.ts` with Drizzle definitions (including Gems schemas)
- [x] **1.7** Create `api/src/economy/pricing.ts` with cost constants
- [x] **1.8** Create `api/src/economy/wallet-service.ts`
- [x] **1.9** Create `api/src/economy/signup-code-service.ts`
- [x] **1.10** Create `api/src/economy/promo-code-service.ts`
- [x] **1.11** Create `api/src/economy/cost-estimator.ts`
- [x] **1.12** Create `api/src/economy/gem-service.ts` (basic credit/debit, similar to WalletService)
- [x] **1.13** Write tests for WalletService (credit, debit, insufficient balance)
- [x] **1.14** Write tests for SignupCodeService (validate, redeem, limits)
- [x] **1.15** Write tests for PromoCodeService (validate, redeem, idempotency)
- [x] **1.16** Write tests for GemService (credit, debit, balance check)

### Phase 2: API Routes (TODAY - ~2 hours)

- [x] **2.1** Create `api/src/trpc/routes/economy.ts`
- [x] **2.2** Add signup code validation endpoint (public)
- [x] **2.3** Add promo code redemption endpoint (protected)
- [x] **2.4** Register in `api/src/trpc/router.ts`
- [x] **2.5** Test endpoints via tRPC panel or curl

### Phase 3: Integration (TODAY - ~2 hours)

- [x] **3.1** Update `asset-system.ts` to debit before generation
- [x] **3.2** Add refund logic for failed generations
- [x] **3.3** Track actual costs in `operation_costs` table
- [x] **3.4** Integrate signup code redemption with auth flow (Supabase trigger or manual)

### Phase 4: Seed Data (TODAY - ~30 min)

- [x] **4.1** Create initial signup codes for testing
- [x] **4.2** Create initial promo codes for testing
- [x] **4.3** Create seed script for IAP products

### Phase 5: UI Components (THIS WEEK)

- [x] **5.1** Create `<CreditBalance />` component
- [x] **5.2** Create `<CostPreview />` component  
- [x] **5.3** Create `<PromoCodeInput />` component
- [x] **5.4** Add promo code entry to Settings/Profile screen (added to Maker screen for now)
- [x] **5.5** Add balance to app header/navigation (added to Maker screen header)
- [x] **5.6** Add cost preview to asset generation flow
- [x] **5.7** Create "Insufficient Balance" modal with IAP upsell
- [x] **5.8** Update registration flow to require signup code

### Phase 6: IAP Integration (NEXT WEEK)

- [ ] **6.1** Set up RevenueCat account + products
- [x] **6.2** Install `react-native-purchases`
- [x] **6.3** Create purchase flow UI
- [x] **6.4** Set up webhook for server-side validation
- [ ] **6.5** Test end-to-end purchase on iOS/Android

---

## Testing Strategy

### Unit Tests

```typescript
// api/src/economy/__tests__/wallet-service.test.ts
describe('WalletService', () => {
  it('creates wallet with initial grant for new users');
  it('credits wallet and records transaction');
  it('debits wallet and records transaction');
  it('throws InsufficientBalanceError when balance too low');
  it('prevents negative balance via CHECK constraint');
  it('handles idempotent transactions');
  it('enforces rate limits');
  it('allows daily bonus claim after 24 hours');
});
```

### Integration Tests

```typescript
// api/src/economy/__tests__/economy-integration.test.ts
describe('Economy Integration', () => {
  it('estimates cost correctly for game with 5 entities');
  it('deducts credits on asset generation');
  it('refunds credits on generation failure');
  it('records operation costs for analytics');
});
```

---

## Analytics Queries

```sql
-- Daily revenue (IAP purchases)
SELECT 
  DATE(purchased_at/1000, 'unixepoch') as date,
  SUM(price_cents) / 100.0 as revenue_usd,
  COUNT(*) as purchase_count
FROM iap_purchases 
WHERE status = 'completed'
GROUP BY date
ORDER BY date DESC;

-- Daily AI costs (what we're paying providers)
SELECT 
  DATE(created_at/1000, 'unixepoch') as date,
  operation_type,
  SUM(actual_cost_micros) / 1000000.0 as cost_usd,
  COUNT(*) as operation_count
FROM operation_costs
GROUP BY date, operation_type
ORDER BY date DESC;

-- User LTV (lifetime value)
SELECT 
  u.id,
  u.email,
  w.lifetime_spent_micros / 1000000.0 as lifetime_spend_usd,
  (SELECT SUM(price_cents) FROM iap_purchases WHERE user_id = u.id AND status = 'completed') / 100.0 as lifetime_purchase_usd
FROM users u
JOIN user_wallets w ON u.id = w.user_id
ORDER BY lifetime_purchase_usd DESC;
```

---

## Security Considerations

1. **Server-side validation**: ALL balance checks happen on backend, never trust client
2. **Atomic transactions**: Use `db.batch()` for balance + log updates
3. **CHECK constraint**: Database-level prevention of negative balances
4. **Idempotency keys**: Prevent duplicate charges on retries
5. **Rate limiting**: Prevent abuse via generation spam
6. **IAP validation**: Verify purchases via RevenueCat webhook, not client claim
7. **Audit trail**: Immutable transaction log for dispute resolution

---

## Open Questions for You

1. **Initial grant amount**: Is $0.50 (500 Sparks, ~12 assets) right for new users?
2. **Daily bonus amount**: Is $0.05 (50 Sparks, ~1 asset) too generous or too stingy?
3. **Margin multiplier**: 2x markup feels safe, but should we start higher?
4. **Rate limits**: 20/hour and 100/day - reasonable?
5. **Bulk discount**: 20% off for full game reskin - keep this?

---

## UI Components

### File: `app/components/economy/PromoCodeInput.tsx`

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { trpc } from '@/lib/trpc';

export function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const redeemMutation = trpc.economy.redeemPromoCode.useMutation({
    onSuccess: (data) => {
      if (data.alreadyRedeemed) {
        setMessage({ type: 'success', text: 'Code already redeemed' });
      } else {
        setMessage({ type: 'success', text: data.message ?? 'Code redeemed!' });
      }
      setCode('');
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err.message });
    },
  });
  
  const handleRedeem = () => {
    if (!code.trim()) return;
    setMessage(null);
    redeemMutation.mutate({ code: code.trim() });
  };
  
  return (
    <View className="p-4 bg-gray-50 rounded-lg">
      <Text className="text-lg font-semibold mb-2">Redeem Promo Code</Text>
      
      <View className="flex-row gap-2">
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Enter code"
          autoCapitalize="characters"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <Pressable
          onPress={handleRedeem}
          disabled={!code.trim() || redeemMutation.isPending}
          className={`px-4 py-2 rounded-lg ${
            !code.trim() || redeemMutation.isPending 
              ? 'bg-gray-300' 
              : 'bg-amber-500'
          }`}
        >
          {redeemMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-medium">Redeem</Text>
          )}
        </Pressable>
      </View>
      
      {message && (
        <Text className={`mt-2 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </Text>
      )}
    </View>
  );
}
```

### File: `app/components/auth/SignupCodeGate.tsx`

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { trpc } from '@/lib/trpc';

interface SignupCodeGateProps {
  onValidCode: (code: string, grantSparks: number) => void;
}

export function SignupCodeGate({ onValidCode }: SignupCodeGateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const validateQuery = trpc.economy.validateSignupCode.useQuery(
    { code },
    { 
      enabled: code.length >= 4,
      retry: false,
    }
  );
  
  const handleContinue = () => {
    if (validateQuery.data?.valid) {
      onValidCode(code, validateQuery.data.grantSparks);
    }
  };
  
  return (
    <View className="flex-1 justify-center p-8 bg-white">
      <Text className="text-3xl font-bold text-center mb-2">Welcome to Slopcade</Text>
      <Text className="text-gray-500 text-center mb-8">
        Enter your invite code to get started
      </Text>
      
      <TextInput
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase());
          setError(null);
        }}
        placeholder="INVITE CODE"
        autoCapitalize="characters"
        autoCorrect={false}
        className="px-4 py-4 border-2 border-gray-300 rounded-xl text-center text-2xl tracking-widest mb-4"
      />
      
      {validateQuery.data?.valid && (
        <View className="bg-green-50 p-4 rounded-lg mb-4">
          <Text className="text-green-700 text-center">
            ✓ Valid code! You'll receive {validateQuery.data.grantSparks} ⚡ Sparks
          </Text>
        </View>
      )}
      
      {validateQuery.data && !validateQuery.data.valid && (
        <View className="bg-red-50 p-4 rounded-lg mb-4">
          <Text className="text-red-700 text-center">
            {validateQuery.data.error}
          </Text>
        </View>
      )}
      
      <Pressable
        onPress={handleContinue}
        disabled={!validateQuery.data?.valid}
        className={`py-4 rounded-xl ${
          validateQuery.data?.valid 
            ? 'bg-amber-500' 
            : 'bg-gray-200'
        }`}
      >
        <Text className={`text-center text-lg font-semibold ${
          validateQuery.data?.valid 
            ? 'text-white' 
            : 'text-gray-400'
        }`}>
          Continue
        </Text>
      </Pressable>
      
      <Text className="text-gray-400 text-center mt-8 text-sm">
        Don't have a code? Join the waitlist at slopcade.com
      </Text>
    </View>
  );
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `api/schema.sql` | Add economy + code + gems tables (modify existing) |
| `shared/src/schema/economy.ts` | Drizzle schema definitions (Sparks + Gems) |
| `api/src/economy/pricing.ts` | Cost constants and conversion helpers |
| `api/src/economy/wallet-service.ts` | Core Sparks balance management |
| `api/src/economy/gem-service.ts` | Core Gems balance management |
| `api/src/economy/signup-code-service.ts` | Signup code validation and redemption |
| `api/src/economy/promo-code-service.ts` | Promo code validation and redemption |
| `api/src/economy/cost-estimator.ts` | Game asset cost calculation |
| `api/src/trpc/routes/economy.ts` | tRPC endpoints |
| `app/components/economy/CreditBalance.tsx` | Balance display widget |
| `app/components/economy/CostPreview.tsx` | Cost preview component |
| `app/components/economy/PromoCodeInput.tsx` | Promo code entry |
| `app/components/economy/InsufficientBalanceModal.tsx` | Upsell modal |
| `app/components/auth/SignupCodeGate.tsx` | Signup code gate for registration |
| `.sisyphus/plans/gems-economy-brainstorm.md` | Gems economy design document (for review) |

---

## Seed Data Examples

### Signup Codes (for launch)

```sql
-- Beta tester code (unlimited, $1 grant)
INSERT INTO signup_codes (code, name, grant_amount_micros, created_at, updated_at)
VALUES ('BETA2026', 'Beta Tester Invite', 1000000, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Limited launch party code (100 uses, $2 grant)
INSERT INTO signup_codes (code, name, max_uses, grant_amount_micros, created_at, updated_at)
VALUES ('LAUNCH100', 'Launch Party Invite', 100, 2000000, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Influencer code (50 uses, $5 grant)
INSERT INTO signup_codes (code, name, max_uses, grant_amount_micros, notes, created_at, updated_at)
VALUES ('CREATOR50', 'Influencer Invite', 50, 5000000, 'For content creators', strftime('%s','now')*1000, strftime('%s','now')*1000);
```

### Promo Codes (post-launch)

```sql
-- New Year promo (1000 uses, 500 Sparks)
INSERT INTO promo_codes (code, name, max_uses, grant_amount_micros, expires_at, created_at, updated_at)
VALUES ('NEWYEAR2026', 'New Year 2026 Promo', 1000, 500000, strftime('%s','2026-01-31')*1000, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Loyalty reward (unlimited, requires previous purchase, 200 Sparks)
INSERT INTO promo_codes (code, name, grant_amount_micros, requires_purchase_history, created_at, updated_at)
VALUES ('THANKYOU', 'Loyalty Reward', 200000, 1, strftime('%s','now')*1000, strftime('%s','now')*1000);
```

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Initial grant amount? | $1.00 (1000 Sparks) with valid signup code only |
| Daily bonus? | ❌ DISABLED for launch |
| How to prevent abuse? | Signup codes required, rate limits, idempotent promo codes |
| Does Scenario.com return cost? | ❌ NO - we estimate and log our estimates |
| Margin multiplier? | 2x (can adjust in `pricing.ts`) |
| Rate limits? | 20/hour, 100/day for generations |

---

Ready to begin implementation. Run `/start-work` to execute this plan.
