# AI Credit Economy System

**Status**: Active | **Priority**: High  
**Started**: 2026-01-26  
**Blocks**: Production asset regeneration feature

---

## Description

Implement a dual-currency economy (Sparks ⚡ + Gems 💎) to monetize AI asset generation while allowing free play. Users earn/purchase credits to regenerate game graphics, with backend rate limiting and cost estimation.

---

## Progress

### Phase 1: Database & Schema (Started 2026-01-26)
- [ ] Create `user_credits` table migration
- [ ] Create `credit_transactions` table migration
- [ ] Run migrations on dev environment
- [ ] Seed test users with initial balances

### Phase 2: Cost Estimation
- [ ] Implement `estimateAssetGenerationCost()` function
- [ ] Define cost constants (base per-asset, full-game, conversion rates)
- [ ] Add cost preview to "Regenerate Assets" modal UI
- [ ] Backend validation: check balance before generation

### Phase 3: Transaction System
- [ ] Create `api/src/economy/transactions.ts` module
- [ ] tRPC route: `economy.getBalance`
- [ ] tRPC route: `economy.getTransactionHistory`
- [ ] tRPC mutation: `economy.deductCredits`
- [ ] tRPC mutation: `economy.refundCredits` (for failures)

### Phase 4: UI Integration
- [ ] Create `<CreditBalance />` component
- [ ] Display balance on main tab navigation
- [ ] Display balance on game detail screen
- [ ] Wire cost preview into ThemeEditor modal
- [ ] Disable "Regenerate" button if insufficient balance

### Phase 5: Generation Pipeline Integration
- [ ] Update `games.generateAssets` mutation to check/deduct credits
- [ ] Auto-refund on generation failure
- [ ] Add rate limiting (max N generations per hour)
- [ ] Error handling: "Insufficient credits" → prompt user

---

## Human Tasks

None yet. Design decisions documented below.

---

## Design Decisions

### Currency System
- **Sparks (⚡)**: Soft currency, earned through gameplay/dailies
- **Gems (💎)**: Hard currency, purchased via IAP (RevenueCat)
- **Conversion**: 1 gem = 10 sparks (subject to tuning)

### Cost Structure
- **Full Game Reskin**: 100 sparks or 10 gems
- **Single Asset Swap**: 10 sparks or 1 gem
- **Cost Basis**: Scenario.com ~$0.02 per image × 10 assets = $0.20 per game
- **Target Margin**: 3% gem conversion should cover 100% AI costs

### Rate Limiting
- Max 5 full game generations per user per hour
- Max 20 single asset swaps per user per hour
- Prevents abuse while allowing reasonable iteration

---

## Database Schema

### `user_credits`
```sql
CREATE TABLE user_credits (
  user_id TEXT PRIMARY KEY,
  sparks INTEGER DEFAULT 100,    -- Starting balance
  gems INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### `credit_transactions`
```sql
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,        -- Negative = spend, positive = earn
  currency TEXT NOT NULL,         -- 'sparks' | 'gems'
  reason TEXT NOT NULL,           -- 'generation' | 'purchase' | 'daily_reward' | 'refund'
  metadata TEXT,                  -- JSON: { asset_pack_id, game_id, failure_reason, ... }
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Key Files

### New Files
- `api/src/migrations/XXXX_create_user_credits.sql`
- `api/src/migrations/XXXX_create_credit_transactions.sql`
- `api/src/economy/cost-estimator.ts`
- `api/src/economy/transactions.ts`
- `api/src/trpc/routes/economy.ts`
- `app/components/economy/CreditBalance.tsx`

### Modified Files
- `api/src/trpc/routes/asset-system.ts` (add credit checks)
- `app/components/game/ThemeEditor.tsx` (cost preview UI)
- `app/app/_layout.tsx` (add CreditBalance to header)

---

## Dependencies

- **Blocks**: Stream 3 (Asset Regeneration Flow) from `docs/TODAY_PLAN.md`
- **Depends On**: Asset generation pipeline must be stable
- **Future**: RevenueCat IAP integration (Phase 3 of LAUNCH_ROADMAP)

---

## Testing Checklist

- [ ] User with 0 sparks cannot generate assets
- [ ] User with 50 sparks can generate single asset (10 sparks) but not full game (100 sparks)
- [ ] Failed generation auto-refunds credits
- [ ] Transaction history shows all debits/credits with metadata
- [ ] Rate limiting blocks excessive generation attempts
- [ ] Cost preview matches actual deduction amount
- [ ] Balance updates in real-time across all UI locations

---

## Open Questions

1. **Earning Mechanics** (deferred to post-launch):
   - How many sparks for daily login?
   - Sparks for completing games?
   - Sparks for sharing/social actions?

2. **Pricing Strategy**:
   - Is 100 sparks (~$1 in gems) appropriate for full reskin?
   - Should first reskin be free/discounted?

3. **Fraud Prevention**:
   - Need webhook from RevenueCat to validate gem purchases?
   - Server-side validation of transaction receipts?

---

## Success Metrics

- **Cost Recovery**: 3% of users convert to gems, covering 100% of Scenario.com costs
- **Engagement**: Users with >0 sparks have 2x higher retention than $0 balance users
- **Iteration**: Average user regenerates assets 1.5 times per game before settling
- **Support**: <1% of transactions require manual refunds due to bugs

---

## References

- `docs/LAUNCH_ROADMAP.md` - Section 3: Monetization & Credits
- `docs/TODAY_2026-01-26.md` - Tasks 6-9 (Credit System Implementation)
- `docs/asset-generation/CONTINUATION.md` - Asset generation pipeline details
