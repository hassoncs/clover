---
name: economy-iap
description: "Virtual currency (Sparks/Gems), wallet transactions, RevenueCat IAP, pricing tiers. Use when working on in-app purchases, currency, wallet, billing, credits, debits, promo codes, or RevenueCat integration."
---

# Economy & IAP

> **Skill for AI Agents**: Virtual currency (Sparks/Gems), wallet transactions, RevenueCat IAP, pricing

## When to Use This Skill

Load when working on: economy, currency, Sparks, Gems, wallet, credits, billing, IAP, in-app purchase, RevenueCat, pricing, debit, credit, refund, promo codes

## Key Concepts

- **Dual Currency**: Sparks (⚡ utility, AI generation) and Gems (💎 premium, social)
- **Microdollar Ledger**: All Spark amounts stored as microdollars (1,000,000 = $1.00, 1 Spark = 10,000 micros)
- **Immutable Transactions**: Every balance change creates a ledger record with before/after snapshots
- **Atomic Operations**: `db.batch()` ensures wallet update + transaction insert are atomic
- **Idempotency**: All transactions require unique keys to prevent duplicates

## Currency System

| Currency | Unit | Storage | Value |
|----------|------|---------|-------|
| Sparks ⚡ | Microdollars | `user_wallets.balance_micros` | 1 Spark = $0.01 (10,000 micros) |
| Gems 💎 | Whole integers | `user_gems.balance` | 1 Gem ≈ $1.00 (100,000 micros) |

## Common Patterns

### Debit (Spending Sparks)
```typescript
await walletService.debit({
  userId,
  amountMicros: 400000, // 40 Sparks
  type: 'generation_debit',
  description: 'Entity sprite generation',
  idempotencyKey: `gen_debit_${jobId}`,
});
```

### Credit (Adding Sparks)
```typescript
await walletService.credit({
  userId,
  amountMicros: 5000000, // 500 Sparks (signup bonus)
  type: 'signup_bonus',
  idempotencyKey: `signup_${userId}`,
});
```

### Refund (Failed Generation)
```typescript
await walletService.credit({
  userId,
  amountMicros: originalCost,
  type: 'generation_refund',
  idempotencyKey: `gen_refund_${jobId}`,
});
```

## Pricing (from `pricing.ts`)

| Operation | Cost (Sparks) | Margin |
|-----------|---------------|--------|
| Entity sprite | 40 | 2x provider cost |
| Background | 40 | 2x |
| Parallax | 100 | 2x |
| Game generation | 10 base + 2/entity | 2x |

Formula: `USER_COST = PROVIDER_COST * MARGIN` (MARGIN = 2.0)

## IAP (RevenueCat)

1. Client purchases via App Store / Play Store
2. RevenueCat sends webhook to `/api/routes/webhooks/revenuecat.ts`
3. Server verifies HMAC-SHA256 signature with `REVENUECAT_WEBHOOK_SECRET`
4. Extracts `app_user_id`, looks up product in `iap_products`
5. Logs purchase in `iap_purchases`
6. Credits user via `WalletService.credit` with type `purchase`

## Gotchas

- ALWAYS provide `idempotencyKey` for debit/credit operations — duplicates silently return current balance
- SQL constraint `CHECK (balance_micros >= 0)` prevents overdraft at DB level
- Microdollar precision: 40 Sparks = 400,000 micros (NOT 40)
- Signup bonus: 500 Sparks via `SignupCodeService`, promo codes via `PromoCodeService`
- Transaction ledger records `balance_before_micros` and `balance_after_micros` for audit

## File References

| File | Purpose |
|------|---------|
| `api/src/economy/wallet-service.ts` | Spark credit/debit operations |
| `api/src/economy/gem-service.ts` | Gem currency management |
| `api/src/economy/pricing.ts` | Cost calculations, margin constants |
| `shared/src/schema/economy.ts` | Drizzle schema for wallets/transactions |
| `api/src/routes/webhooks/revenuecat.ts` | IAP webhook handler |
| `api/schema.sql` | Table definitions with balance constraints |

## Related Skills

- [storage-ops](storage-ops.md) — D1 batch operations used by wallet
- [agent-orchestration](agent-orchestration.md) — Agent billing uses WalletService
