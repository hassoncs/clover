# Spark Pricing Simplification - 2026-01-26

## Changes Made

### 1. Simplified Conversion Rate

**Before**: 1 Spark = $0.001 (1,000 microdollars)
**After**: 1 Spark = $0.01 (10,000 microdollars)

**Result**: **100 Sparks = $1.00** (much simpler mental math)

### 2. Updated Constants

**File**: `api/src/economy/pricing.ts`

```typescript
DISPLAY_UNITS = {
  MICROS_PER_SPARK: 10_000,    // was 1,000
  MICROS_PER_GEM: 100_000,      // was 10_000
  SPARKS_PER_GEM: 10,           // unchanged
}
```

### 3. Updated Signup Grant

**Before**: 1,000 Sparks ($1.00) = ~25 assets
**After**: 500 Sparks ($5.00) = 125 entity sprites

More generous for launch - users get $5 worth of credits.

### 4. Updated IAP Products

| Pack | Price | Before | After |
|------|-------|--------|-------|
| Starter | $0.99 | 500 Sparks | 50 Sparks |
| Creator | $4.99 | 2,750 Sparks | 275 Sparks |
| Studio | $19.99 | 12,000 Sparks | 1,200 Sparks |

### 5. Unified Cost Deduction Logic & Shared Constants

**Fixed**: Multiple hardcoded conversion constants across codebase.

**Changes**:
1. Created `shared/src/economy/currency.ts` with all conversion helpers
2. `api/src/economy/pricing.ts` re-exports from shared
3. Fixed `asset-system.ts` hardcoded `40000` → `USER_COSTS.ASSET_ENTITY`
4. Fixed `promo-code-service.ts` hardcoded `/1000` → `microsToSparks()`
5. Fixed `economy.ts` router hardcoded `/1000` → `microsToSparks()`
6. Fixed `CostPreview.tsx` hardcoded `/10000` → `microsToSparks()`

**Files Changed**:
- `shared/src/economy/currency.ts` (NEW - source of truth)
- `shared/src/index.ts` (export currency helpers)
- `api/src/economy/pricing.ts` (re-exports from shared)
- `api/src/trpc/routes/asset-system.ts` (use USER_COSTS constant)
- `api/src/economy/promo-code-service.ts` (use microsToSparks)
- `api/src/trpc/routes/economy.ts` (use microsToSparks)
- `app/components/economy/CostPreview.tsx` (use microsToSparks from shared)

## Asset Costs (User-Facing)

| Asset Type | Sparks | USD |
|------------|--------|-----|
| Entity | 4 | $0.04 |
| Background | 4 | $0.04 |
| Title/Hero | 5 | $0.05 |
| Parallax | 10 | $0.10 |

## Migration Impact

### Database

**No migration needed** - all stored values use microdollars internally.

### Frontend

**Auto-adjusts** - `microsToSparks()` helper function handles conversion.

Balance displays will show 10x fewer Sparks for same dollar amount.

### Existing Users

If users already have balances:
- 1,000 old Sparks = 100 new Sparks
- Purchasing power unchanged
- Display value adjusted automatically

## Scenario.com Model Reference

### Default Model

**`flux.1-dev`** - Used for most generations

### Specialized Models

- **Pixel Art**: `model_retrodiffusion-plus`
- **Cartoon**: `model_c8zak5M1VGboxeMd8kJBr2fn`
- **3D Items**: `model_7v2vV6NRvm8i8jJm6DWHf6DM`
- **Parallax Layers**: `model_qwen-image-layered`

See: `api/src/ai/assets.ts` lines 97-111 for full MODEL_MATRIX

## Documentation Created

**`docs/economy/SPARK_PRICING.md`** - Comprehensive reference with:
- Currency conversion rules
- All pricing constants
- Scenario.com model configuration
- Code examples
- Database schema
- Testing instructions

## Verification

```bash
# Type check passes
cd api && pnpm tsc --noEmit

# No errors found
```

## Next Steps (If Needed)

1. Update IAP products in database:
   ```sql
   UPDATE iap_products 
   SET 
     description = CASE id
       WHEN 'starter_pack' THEN '50 Sparks - Perfect for trying out AI generation'
       WHEN 'creator_pack' THEN '250 Sparks + 10% Bonus'
       WHEN 'studio_pack' THEN '1,000 Sparks + 20% Bonus'
     END
   WHERE id IN ('starter_pack', 'creator_pack', 'studio_pack');
   ```

2. Update any marketing materials showing old Spark amounts

3. Consider user announcement if already in production
