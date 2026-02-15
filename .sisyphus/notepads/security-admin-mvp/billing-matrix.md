# Billing Enforcement Matrix

Audit of all user-facing AI-cost endpoints for billing enforcement.

**Legend:**
- ✅ = Implemented correctly
- ⚠️ = Partial/needs improvement
- ❌ = Missing/critical gap

---

## Summary

| Endpoint | Auth | Balance Check | Debit Timing | Refund | Risk |
|----------|------|---------------|--------------|--------|------|
| `games.generate` | ✅ Protected | ❌ None | ❌ None | N/A | **HIGH** |
| `games.refine` | ✅ Protected | ❌ None | ❌ None | N/A | **HIGH** |
| `games.analyze` | ✅ Public | N/A | N/A | N/A | Low (local) |
| `chatThreads.sendMessage` | ✅ Protected | ❌ None | ⚠️ Post-gen | ❌ None | **HIGH** |
| `chatThreads.submitToolAnswer` | ✅ Protected | ❌ None | ⚠️ Post-gen | ❌ None | **HIGH** |
| `generationJobs.createGenerationJob` | ✅ Protected | ✅ Pre-flight | ✅ Pre-work | ✅ On fail | Low |
| `POST /text-grid/stylize` | ❌ Public | ❌ None | ❌ None | N/A | **CRITICAL** |
| `games.generateTitle` | ✅ Protected | ❌ None | ❌ None | N/A | Medium |

---

## Detailed Analysis

### 1. `games.generate` — Game Generation

**File:** `api/src/trpc/routes/games.ts:743`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Protected | `protectedProcedure` |
| Balance Check | ❌ Missing | No `hasSufficientBalance` call |
| Debit Timing | ❌ Missing | No debit at all |
| Refund | N/A | No debit to refund |

**Cost:** `USER_COSTS.GAME_GENERATION_BASE` + `USER_COSTS.GAME_GENERATION_PER_ENTITY` per entity

**Risk:** HIGH — Users can generate unlimited games without paying

**Fix Required:**
1. Add pre-flight balance check
2. Debit estimated cost before `generateGame()`
3. Refund on failure

---

### 2. `games.refine` — Game Refinement

**File:** `api/src/trpc/routes/games.ts:865`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Protected | `protectedProcedure` |
| Balance Check | ❌ Missing | No balance verification |
| Debit Timing | ❌ Missing | No debit at all |
| Refund | N/A | No debit to refund |

**Cost:** Similar to generation (LLM call)

**Risk:** HIGH — Users can refine games unlimited times

**Fix Required:**
1. Add pre-flight balance check
2. Debit before `refineGame()`
3. Refund on failure

---

### 3. `games.analyze` — Intent Classification

**File:** `api/src/trpc/routes/games.ts:931`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Public | `publicProcedure` (intentional) |
| Balance Check | N/A | No external AI cost |
| Debit Timing | N/A | Local classification only |
| Refund | N/A | No cost |

**Cost:** None — Uses local `classifyPrompt()` function

**Risk:** Low — No external API calls

**No fix needed.**

---

### 4. `chatThreads.sendMessage` — Chat Message

**File:** `api/src/trpc/routes/chat-threads.ts:202`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Protected | `protectedProcedure` |
| Balance Check | ❌ Missing | No pre-flight balance check |
| Debit Timing | ⚠️ Post-generation | Billed after stream completes |
| Refund | ❌ Missing | No refund on error |

**Flow:**
1. `sendMessage` creates thread, inserts user message
2. Returns SSE stream URL
3. `/api/chat/stream` handles generation
4. `billForUsage()` called AFTER generation completes

**Cost:** Token-based (`costPer1kTokensMicros`)

**Risk:** HIGH — Users can start generation with zero balance, consume AI resources, then fail to pay

**Fix Required:**
1. Add pre-flight balance check in `sendMessage`
2. Consider reservation pattern (hold funds, settle after)
3. Add refund logic for partial failures

---

### 5. `chatThreads.submitToolAnswer` — Tool Answer Submission

**File:** `api/src/trpc/routes/chat-threads.ts:273`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Protected | `protectedProcedure` |
| Balance Check | ❌ Missing | No pre-flight balance check |
| Debit Timing | ⚠️ Post-generation | Same as sendMessage |
| Refund | ❌ Missing | No refund on error |

**Risk:** HIGH — Same issue as sendMessage

**Fix Required:** Same as sendMessage

---

### 6. `generationJobs.createGenerationJob` — Asset Generation

**File:** `api/src/trpc/routes/asset-system/generation-jobs.ts:65`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ✅ Protected | `protectedProcedure` |
| Balance Check | ✅ Pre-flight | `hasSufficientBalance` + `debit` before work |
| Debit Timing | ✅ Pre-work | Debit happens before job creation |
| Refund | ✅ On failure | Refunds on JSON parse error and job creation error |

**Cost:** `USER_COSTS.ASSET_ENTITY` per prefab

**Risk:** Low — Properly implemented

**This is the reference implementation.**

---

### 7. `POST /text-grid/stylize` — Image Stylization

**File:** `api/src/routes/text-grid.ts:211`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ❌ Public | No authentication required |
| Balance Check | ❌ Missing | No balance check |
| Debit Timing | ❌ Missing | No billing at all |
| Refund | N/A | No debit to refund |

**Cost:** Scenario.com img2img call (~$0.02)

**Risk:** CRITICAL — Anyone can use without auth or payment

**Fix Required:**
1. Add authentication (convert to protectedProcedure or add auth middleware)
2. Add pre-flight balance check
3. Debit before img2img call
4. Refund on failure

---

### 8. `games.generateTitle` — Title Generation

**File:** `api/src/ai/generate-title.ts`

| Check | Status | Details |
|-------|--------|---------|
| Auth | ⚠️ Protected caller | Called from protected context |
| Balance Check | ❌ Missing | No balance check |
| Debit Timing | ❌ Missing | No billing |
| Refund | N/A | No debit to refund |

**Cost:** Small LLM call (~$0.001)

**Risk:** Medium — Low cost but untracked

**Note:** This is called internally, not a direct tRPC route. Need to trace callers.

---

## Critical Gaps Summary

### 1. Chat Streaming (HIGH PRIORITY)
- **Issue:** Billing happens AFTER generation completes
- **Impact:** Users with zero balance can consume AI resources
- **Fix:** Add pre-flight balance check + reservation pattern

### 2. Text-Grid Stylize (CRITICAL)
- **Issue:** No auth, no billing
- **Impact:** Anyone can use for free
- **Fix:** Add auth + billing

### 3. Game Generation/Refinement (HIGH PRIORITY)
- **Issue:** No billing at all
- **Impact:** Unlimited free game generation
- **Fix:** Add billing similar to asset generation

---

## Recommended Billing Pattern

Based on `generationJobs.createGenerationJob` (the reference implementation):

```typescript
// 1. Rate limit check
const allowed = await walletService.checkRateLimit(userId, 'generation', limit, window);
if (!allowed) throw TOO_MANY_REQUESTS;

// 2. Pre-flight balance check + debit
const estimatedCost = calculateCost(params);
try {
  await walletService.debit({
    userId,
    type: 'generation_debit',
    amountMicros: -estimatedCost,
    idempotencyKey: `gen_${jobId}`,
    // ...
  });
} catch (err) {
  if (err instanceof InsufficientBalanceError) {
    throw PRECONDITION_FAILED;
  }
  throw err;
}

// 3. Do the work
try {
  const result = await doExpensiveWork();
  return result;
} catch (workError) {
  // 4. Refund on failure
  await walletService.credit({
    userId,
    type: 'generation_refund',
    amountMicros: estimatedCost,
    idempotencyKey: `refund_${jobId}`,
    // ...
  });
  throw workError;
}
```

---

## Next Steps

1. [ ] Patch `games.generate` with billing
2. [ ] Patch `games.refine` with billing
3. [ ] Patch `chatThreads.sendMessage` with pre-flight balance check
4. [ ] Patch `chatThreads.submitToolAnswer` with pre-flight balance check
5. [ ] Patch `POST /text-grid/stylize` with auth + billing
6. [ ] Add tests for each billing guard

---

*Last Updated: 2026-02-15*
