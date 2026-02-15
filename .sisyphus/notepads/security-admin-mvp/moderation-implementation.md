# Moderation Implementation Notes

## Implementation Summary

**Date**: 2026-02-15
**Task**: MVP prompt moderation pre-filter at ingress points

### Files Created/Modified

1. **Created**: `api/src/services/moderation-service.ts`
   - Keyword/regex filter with 5 blocked categories
   - Normalization (lowercase, strip special chars)
   - SHA-256 hash for logging (truncated to 16 chars)
   - `checkMultiple()` for batch validation

2. **Modified**: `api/src/trpc/routes/games.ts`
   - Added moderation to `generate`, `refine`, `analyze`
   - Logs rejections via AuditService for protected routes
   - Public route (`analyze`) rejects without logging (no user ID)

3. **Modified**: `api/src/trpc/routes/chat-threads.ts`
   - Added moderation to `sendMessage`, `submitToolAnswer`
   - Logs rejections via AuditService

4. **Modified**: `api/src/trpc/routes/asset-system/generation-jobs.ts`
   - Added moderation to `createGenerationJob`
   - Checks `themePrompt`, `styleOverride`, and `prefabOverrides`
   - Uses `checkMultiple()` for batch validation

5. **Created**: `api/src/services/__tests__/moderation-service.test.ts`
   - 32 tests covering all categories
   - Tests for normalization, case insensitivity, leetspeak
   - Tests for hash consistency and privacy

### Blocked Categories

| Category | Keywords | Regex Patterns |
|----------|----------|----------------|
| NSFW | porn, nude, sex, hentai, erotic, fetish, xxx, adult, explicit, obscene | `\b(s[e3]x|p[o0]rn|n[u0]de|n[a4]k[e3]d)\b` |
| VIOLENCE | gore, blood, murder, kill, suicide, torture, decapitate, mutilate, massacre, slaughter, assassinate | `\b(k[i1]ll|m[u0]rd[e3]r|bl[o0][o0]d|g[o0]r[e3])\b` |
| HATE_SPEECH | nigger, faggot, kike, chink, spic, retard, racist | `\b(n[i1]gg[e3]r|f[a4]gg[o0]t|k[i1]k[e3]|ch[i1]nk|sp[i1]c)\b` |
| ILLEGAL | drugs, cocaine, heroin, meth, bomb, explosive, terrorist, hack, illegal, crime, weapon, assault | `\b(dr[u0]gs|b[o0]mb|h[a4]ck|t[e3]rr[o0]r[i1]st)\b` |
| PII | address, phone number, social security, credit card, password, email, ssn, passport, license | `\b(ssn|credit\s*card|passw[o0]rd)\b` |

### Integration Pattern

```typescript
const moderationService = new ModerationService();
const moderationResult = moderationService.check(userInput);
if (!moderationResult.allowed) {
  const auditService = new AuditService(ctx.env.DB);
  const rejectionLog = await moderationService.createRejectionLog(userInput, moderationResult);
  await auditService.logEvent({
    actorId: ctx.user.id,
    action: "moderation.reject",
    targetType: "prompt",
    metadata: rejectionLog,
  });
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: MODERATION_ERROR_MESSAGE,
  });
}
```

### Key Decisions

1. **No plaintext in logs**: Only SHA-256 hash (truncated) is stored
2. **Vague error message**: "Your prompt contains content that violates our safety guidelines." - doesn't reveal which category triggered
3. **Public routes**: No audit logging (no user ID available)
4. **Batch validation**: `checkMultiple()` for routes with multiple prompt fields

### Test Results

```
 ✓ src/services/__tests__/moderation-service.test.ts (32 tests) 151ms
 Test Files  1 passed (1)
      Tests  32 passed (32)
```

### Future Improvements (Out of Scope)

- Add more keywords based on real-world usage patterns
- Consider adding ML-based moderation for edge cases
- Add rate limiting for repeated violations
- Consider temporary bans for egregious violations

# Moderation Implementation Notes

## Task 2: MVP Prompt Moderation Pre-Filter

### Implementation Summary

**Date**: 2026-02-15

### Files Created/Modified

1. **`api/src/security/blocked-keywords.ts`** (NEW)
   - Defines blocked categories: Violence, Sexual, Hate Speech, Illegal
   - Exports `BLOCKED_CATEGORIES`, `ALL_BLOCKED_KEYWORDS`, `KEYWORD_TO_CATEGORY`
   - Note: This file was created but the existing `ModerationService` uses its own inline patterns

2. **`api/src/services/moderation-service.ts`** (EXISTING)
   - Already implemented with `check()`, `checkMultiple()`, `createRejectionLog()`
   - Uses `BLOCKED_PATTERNS` with keywords and regex patterns
   - Includes leetspeak evasion detection (e.g., `s3x`, `p0rn`)
   - Normalizes input: lowercase, remove special chars, collapse spaces

3. **`api/src/trpc/routes/games.ts`** (ALREADY INTEGRATED)
   - `generate` endpoint: moderation check on `input.prompt`
   - `refine` endpoint: moderation check on `input.request`

4. **`api/src/trpc/routes/chat-threads.ts`** (ALREADY INTEGRATED)
   - `sendMessage` endpoint: moderation check on `input.text`

5. **`api/src/trpc/routes/asset-system/generation-jobs.ts`** (MODIFIED)
   - Added imports for `AuditService`, `ModerationService`, `MODERATION_ERROR_MESSAGE`
   - Added moderation check on `input.promptDefaults.themePrompt` before rate limit check

6. **`api/src/services/__tests__/moderation-service.test.ts`** (NEW)
   - 32 tests covering:
     - Allowed prompts (normal, partial matches, safe words)
     - Blocked prompts by category (Violence, NSFW, Hate Speech, Illegal, PII)
     - Case insensitivity
     - Evasion attempts (leetspeak)
     - `checkMultiple()` behavior
     - `createRejectionLog()` (hashing, no plaintext)
     - Error message vagueness

### Integration Pattern

```typescript
const moderationService = new ModerationService();
const moderationResult = moderationService.check(input.prompt);
if (!moderationResult.allowed) {
  const auditService = new AuditService(ctx.env.DB);
  const rejectionLog = await moderationService.createRejectionLog(
    input.prompt,
    moderationResult,
  );
  await auditService.logEvent({
    actorId: ctx.user.id,
    action: "moderation.reject",
    targetType: "prompt",
    metadata: rejectionLog,
  });
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: MODERATION_ERROR_MESSAGE,
  });
}
```

### Key Design Decisions

1. **Hash, don't store**: Rejection logs contain SHA-256 hash (truncated to 16 chars), never plaintext
2. **Vague error message**: "Your prompt contains content that violates our safety guidelines." - doesn't reveal what was blocked
3. **Pre-rate-limit check**: Moderation runs before rate limit checks to avoid wasting quota
4. **Audit integration**: All rejections logged via `AuditService` with action `moderation.reject`

### Blocked Categories

| Category | Examples |
|----------|----------|
| NSFW | porn, sex, nude, hentai, erotic |
| VIOLENCE | kill, murder, blood, gore, torture |
| HATE_SPEECH | slurs, nazi, racist, sexist |
| ILLEGAL | drugs, cocaine, bomb, terrorist |
| PII | credit card, SSN, password, email |

### Known Limitations

1. **Special character evasion**: `k.i.l.l.` is not blocked (normalization splits into separate letters)
2. **Unicode homoglyphs**: Not handled (e.g., Cyrillic lookalikes)
3. **Context awareness**: No semantic understanding - "kill the process" would be blocked

### Test Results

```
✓ 32 tests passed
✓ Type check passed
✓ LSP diagnostics clean
```
