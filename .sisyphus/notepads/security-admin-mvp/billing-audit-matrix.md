# Billing Verification Matrix

**Audit Date**: 2026-02-15
**Auditor**: Sisyphus-Junior
**Status**: CRITICAL ISSUES FOUND

## Executive Summary

**3 of 5 AI-cost endpoints have missing billing enforcement.** Users can incur AI costs without authorization or payment.

| Endpoint | Auth | Balance Check | Debit Timing | Refund | Status |
|----------|:----:|:-------------:|:------------:|:------:|--------|
| `games.generate` | ✅ | ❌ MISSING | ❌ NONE | N/A | **CRITICAL** |
| `games.refine` | ✅ | ❌ MISSING | ❌ NONE | N/A | **CRITICAL** |
| `chat-threads.sendMessage` | ✅ | ❌ MISSING | After (metered) | ❌ NONE | **CRITICAL** |
| `generation-jobs.createGenerationJob` | ✅ | ✅ | Before (prepaid) | ✅ | OK |
| `generation-jobs.processGenerationJob` | ✅ | N/A | N/A | N/A | OK |

---

## Detailed Findings

### 1. `games.generate` — CRITICAL

**File**: `api/src/trpc/routes/games.ts:743-863`

| Check | Status | Details |
|-------|--------|---------|
| Auth check | ✅ PASS | Uses `protectedProcedure` |
| Balance check | ❌ FAIL | No balance verification before AI call |
| Debit timing | ❌ FAIL | No debit call at all |
| Refund behavior | N/A | No debit to refund |

**Impact**: Users can generate games via AI without paying. Each generation costs ~$0.10+ in LLM tokens.

**Code Path**:
```typescript
// Line 760: AI generation starts immediately
const result = await generateGame(input.prompt, aiConfig, {
  maxRetries: 2,
  temperature: 0.7,
});
// No billing before or after
```

**Fix Required**: Add prepaid debit before generation with refund on failure.

---

### 2. `games.refine` — CRITICAL

**File**: `api/src/trpc/routes/games.ts:865-929`

| Check | Status | Details |
|-------|--------|---------|
| Auth check | ✅ PASS | Uses `protectedProcedure` |
| Balance check | ❌ FAIL | No balance verification before AI call |
| Debit timing | ❌ FAIL | No debit call at all |
| Refund behavior | N/A | No debit to refund |

**Impact**: Users can refine games via AI without paying. Each refinement costs LLM tokens.

**Code Path**:
```typescript
// Line 892: AI refinement starts immediately
const result = await refineGame(
  currentGame as Parameters<typeof refineGame>[0],
  input.request,
  aiConfig,
);
// No billing before or after
```

**Fix Required**: Add prepaid debit before refinement with refund on failure.

---

### 3. `chat-threads.sendMessage` — CRITICAL

**File**: `api/src/trpc/routes/chat-threads.ts:202-271`
**Billing**: `api/src/chat/stream-handler.ts:169-192`

| Check | Status | Details |
|-------|--------|---------|
| Auth check | ✅ PASS | Uses `protectedProcedure` |
| Balance check | ❌ FAIL | No pre-check before streaming starts |
| Debit timing | ⚠️ AFTER | Metered billing after generation completes |
| Refund behavior | ❌ FAIL | No refund on generation failure |

**Impact**: 
1. Users with 0 balance can trigger AI generation
2. If billing fails after generation (insufficient funds), the AI work is already done
3. No refund mechanism if generation fails mid-stream

**Code Path**:
```typescript
// chat-threads.ts:259 - No balance check
await insertUserMessage(ctx.env.DB, threadId, input.text);

// stream-handler.ts:368-373 - Billing AFTER generation
const totalUsage = await result.totalUsage;
await billForUsage(ctx, threadId, 
  totalUsage.inputTokens ?? 0,
  totalUsage.outputTokens ?? 0
);
```

**Fix Required**: 
1. Add minimum balance pre-check before starting stream
2. Add refund on failure in stream handler

---

### 4. `generation-jobs.createGenerationJob` — OK

**File**: `api/src/trpc/routes/asset-system/generation-jobs.ts:65-312`

| Check | Status | Details |
|-------|--------|---------|
| Auth check | ✅ PASS | Uses `protectedProcedure` |
| Balance check | ✅ PASS | Via `walletService.debit()` which throws `InsufficientBalanceError` |
| Debit timing | ✅ PASS | BEFORE generation (prepaid model) |
| Refund behavior | ✅ PASS | Refunds on JSON parse failure (L153-166) and job creation failure (L301-310) |

**Code Path**:
```typescript
// Line 117-134: Prepaid debit with error handling
try {
  await walletService.debit({
    userId: ctx.user.id,
    type: "generation_debit",
    amountMicros: -estimatedCostMicros,
    referenceType: "generation_job",
    referenceId: jobId,
    idempotencyKey: `gen_debit_${jobId}`,
    description: `Asset generation for ${input.prefabIds.length} prefabs`,
  });
} catch (err) {
  if (err instanceof InsufficientBalanceError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
    });
  }
  throw err;
}
```

**This is the reference implementation for proper billing.**

---

### 5. `generation-jobs.processGenerationJob` — OK

**File**: `api/src/trpc/routes/asset-system/generation-jobs.ts:314-502`

| Check | Status | Details |
|-------|--------|---------|
| Auth check | ✅ PASS | Uses `protectedProcedure` |
| Balance check | N/A | Prepaid in `createGenerationJob` |
| Debit timing | N/A | Prepaid model |
| Refund behavior | N/A | Handled in create |

**Note**: This is the processing step. Billing was already done in `createGenerationJob`.

---

## Pricing Reference

From `api/src/economy/pricing.ts`:

| Operation | Cost (Sparks) | Cost (Micros) |
|-----------|---------------|---------------|
| Entity sprite | 40 | 400,000 |
| Background | 40 | 400,000 |
| Parallax | 100 | 1,000,000 |
| Game generation (base) | 100 | 1,000,000 |
| Game generation (per entity) | 20 | 200,000 |
| Chat message | Variable | Token-based |

---

## Required Fixes

### Priority 1: `games.generate`

1. Add `WalletService` import and instantiation
2. Calculate estimated cost based on expected entity count
3. Debit BEFORE `generateGame()` call
4. Refund on generation failure
5. Return remaining balance to client

### Priority 2: `games.refine`

1. Add `WalletService` import and instantiation
2. Use fixed cost for refinement (or estimate based on game size)
3. Debit BEFORE `refineGame()` call
4. Refund on refinement failure

### Priority 3: `chat-threads.sendMessage`

1. Add minimum balance pre-check (e.g., 10 Sparks minimum)
2. Return error if balance too low
3. Add refund logic in `stream-handler.ts` for failed generations

---

## Test Requirements

For each fixed endpoint:

1. **Insufficient balance test**: Verify operation is blocked when balance < cost
2. **Successful operation test**: Verify ledger entries are created
3. **Refund test**: Verify refund on failure (where applicable)
4. **Idempotency test**: Verify duplicate requests don't double-charge
