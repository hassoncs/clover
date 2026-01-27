# Spark Pricing System

> Complete reference for the Spark currency system, pricing logic, and Scenario.com model configuration.

---

## Currency Conversion

**Simplified Model**: 1 Spark = $0.01

```
100 Sparks = $1.00
1 Spark = 10,000 microdollars
```

**Internal Precision**: All calculations use microdollars (1,000,000 = $1.00) for precision.

---

## Asset Generation Costs

### Provider Costs (What We Pay Scenario.com)

| Operation | Cost | Microdollars |
|-----------|------|--------------|
| Text-to-Image | $0.02 | 20,000 |
| Image-to-Image | $0.02 | 20,000 |
| Remove Background | $0.005 | 5,000 |
| Layered Decomposition | $0.03 | 30,000 |

### User Costs (What Users Pay - 2x Markup)

| Asset Type | Sparks | USD | Microdollars |
|------------|--------|-----|--------------|
| Entity (img2img) | 4 | $0.04 | 40,000 |
| Background (txt2img) | 4 | $0.04 | 40,000 |
| Title/Hero (txt2img + remove bg) | 5 | $0.05 | 50,000 |
| Parallax (txt2img + layered) | 10 | $0.10 | 100,000 |

### Game Generation (LLM)

| Operation | Sparks | USD | Microdollars |
|-----------|--------|-----|--------------|
| Base Cost | 10 | $0.10 | 100,000 |
| Per Entity | 2 | $0.02 | 20,000 |

**Bulk Discount**: 20% off when regenerating 5+ assets at once (`FULL_GAME_RESKIN_DISCOUNT = 0.8`)

---

## User Credits

### Signup Grant

**5,000,000 microdollars = 500 Sparks = $5.00**

Enough for:
- 125 entity sprites
- 125 backgrounds
- 50 parallax layers
- 12-15 complete games

### In-App Purchases

| Pack | Price | Sparks | Bonus | Total Sparks |
|------|-------|--------|-------|--------------|
| Starter | $0.99 | 50 | 0% | 50 |
| Creator | $4.99 | 250 | +10% | 275 |
| Studio | $19.99 | 1,000 | +20% | 1,200 |

---

## Scenario.com Model Configuration

### Default Model

**Primary**: `flux.1-dev`

```typescript
SCENARIO_DEFAULTS = {
  MODEL: 'flux.1-dev',
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 1024,
  DEFAULT_GUIDANCE: 3.5,
  DEFAULT_STEPS: 28,
}
```

### MODEL_MATRIX

Maps `{entityType}:{style}:{animated}` to specific Scenario.com models:

| Entity Type | Style | Animated | Model ID |
|------------|-------|----------|----------|
| character | pixel | static | `model_retrodiffusion-plus` |
| character | pixel | animated | `model_retrodiffusion-animation` |
| character | cartoon | static | `model_c8zak5M1VGboxeMd8kJBr2fn` |
| enemy | pixel | static | `model_retrodiffusion-plus` |
| enemy | cartoon | static | `model_c8zak5M1VGboxeMd8kJBr2fn` |
| item | pixel | static | `model_retrodiffusion-plus` |
| item | 3d | static | `model_7v2vV6NRvm8i8jJm6DWHf6DM` |
| platform | pixel | static | `model_retrodiffusion-tile` |
| background | pixel | static | `model_uM7q4Ms6Y5X2PXie6oA9ygRa` |
| background | cartoon | static | `model_hHuMquQ1QvEGHS1w7tGuYXud` |
| ui | pixel | static | `model_mcYj5uGzXteUw6tKapsaDgBP` |
| ui | flat | static | `model_mcYj5uGzXteUw6tKapsaDgBP` |

**Fallback**: `model_retrodiffusion-plus`

### Special Models

- **Parallax Layers**: `model_qwen-image-layered`
- **Sprite Sheets**: `model_scenario-grid-maker`
- **Frame Extraction**: `model_scenario-image-slicer`

---

## Code Reference

### Key Files

| File | Purpose |
|------|---------|
| `shared/src/economy/currency.ts` | **Shared conversion constants & helpers** |
| `api/src/economy/pricing.ts` | **Core pricing constants** (re-exports shared) |
| `api/src/economy/cost-estimator.ts` | Cost calculation for game assets |
| `api/src/economy/wallet-service.ts` | Balance management (credit/debit) |
| `api/src/trpc/routes/economy.ts` | Balance/transaction API endpoints |
| `api/src/trpc/routes/asset-system.ts` | Asset generation with cost deduction |
| `api/src/economy/promo-code-service.ts` | Promo code redemption (uses shared) |
| `api/src/ai/assets.ts` | MODEL_MATRIX and model selection |
| `api/src/ai/scenario-types.ts` | Scenario.com defaults |
| `app/components/economy/CreditBalance.tsx` | Frontend balance display |
| `app/components/economy/CostPreview.tsx` | Cost estimation UI (uses shared) |

### Cost Estimation Flow

```typescript
import { estimateGameAssetCost } from '@/api/economy/cost-estimator';

const estimate = estimateGameAssetCost(gameDefinition, {
  regenerateAll: false,
  specificTemplates: ['player', 'enemy'],
});

// Returns:
{
  totalMicros: 80000,
  breakdown: [
    { description: 'Entity sprites', count: 2, unitCostMicros: 40000, totalMicros: 80000 }
  ],
  displayTotal: '8 ⚡'
}
```

### Balance Check & Deduction

```typescript
import { WalletService } from '@/api/economy/wallet-service';
import { USER_COSTS } from '@/api/economy/pricing';

const walletService = new WalletService(DB);

const canAfford = await walletService.hasSufficientBalance(
  userId, 
  USER_COSTS.ASSET_ENTITY
);

if (!canAfford) {
  throw new InsufficientBalanceError(...);
}

await walletService.debit({
  userId,
  type: 'generation_debit',
  amountMicros: -USER_COSTS.ASSET_ENTITY,
  referenceType: 'generation_job',
  referenceId: jobId,
  idempotencyKey: `gen_debit_${jobId}`,
});
```

### Frontend Balance Display

```tsx
import { CreditBalance } from '@/components/economy/CreditBalance';

<CreditBalance onPress={() => openPurchaseSheet()} />
```

Displays: `⚡ 100` (refreshes every 30s)

---

## Rate Limits

```typescript
RATE_LIMITS = {
  GENERATIONS_PER_HOUR: 20,
  GENERATIONS_PER_DAY: 100,
  DAILY_CLAIMS_PER_DAY: 1,
}
```

Enforced via `walletService.checkRateLimit()` before generation.

---

## Database Schema

### user_wallets

```sql
CREATE TABLE user_wallets (
  user_id TEXT PRIMARY KEY,
  balance_micros INTEGER NOT NULL DEFAULT 0,
  lifetime_earned_micros INTEGER NOT NULL DEFAULT 0,
  lifetime_spent_micros INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (balance_micros >= 0)
);
```

### credit_transactions

```sql
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_micros INTEGER NOT NULL,
  balance_before_micros INTEGER NOT NULL,
  balance_after_micros INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT UNIQUE,
  description TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);
```

**Transaction Types**:
- `signup_code`
- `promo_code`
- `purchase`
- `generation_debit`
- `generation_refund`

---

## Testing

### Unit Tests

```bash
cd api
pnpm test:run src/economy/__tests__/wallet-service.test.ts
pnpm test:run src/economy/__tests__/cost-estimator.test.ts
```

### Visual Tests (Scenario.com)

```bash
hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts
```

See: `docs/game-maker/guides/testing-asset-generation.md`

---

## Future Considerations

### Pricing Adjustments

To change pricing:

1. Update `PROVIDER_COSTS` in `pricing.ts` if Scenario.com pricing changes
2. Adjust `MARGIN` constant (currently 2x = 100% markup)
3. Update `IAP_PRODUCT_CATALOG` for purchase packs
4. Run migration to update existing IAP products in database

### Model Changes

To add/change models:

1. Add entry to `MODEL_MATRIX` in `api/src/ai/assets.ts`
2. Test with visual test runner
3. Update this documentation

### Cost Tracking

All generation operations are tracked in `operation_costs` table for analytics:

```sql
SELECT 
  operation_type,
  AVG(estimated_cost_micros) as avg_estimated,
  AVG(charged_cost_micros) as avg_charged
FROM operation_costs
GROUP BY operation_type;
```
