# Task 4: Content Pipeline - Evidence

## Work Completed (2026-02-15)

### Prompt Generators Implemented

Added missing configs to `packages/content-pipeline/src/generate/prompts.ts`:

| Content Type | Schema | Generator Config | Content on Disk |
|--------------|--------|------------------|-----------------|
| QuipPrompt | ✅ | ✅ (pre-existing) | 84 items |
| TriviaQuestion | ✅ | ✅ (pre-existing) | 0 items |
| DrawingPrompt | ✅ | ✅ (pre-existing) | 0 items |
| WouldYouRather | ✅ | ✅ (pre-existing) | 0 items |
| EstimationQuestion | ✅ | ✅ (pre-existing) | 0 items |
| **FibbageQuestion** | ✅ | ✅ **NOW IMPLEMENTED** | 0 items |
| **CaptionPrompt** | ✅ | ✅ **NOW IMPLEMENTED** | 0 items |
| **WordGamePrompt** | ✅ | ✅ **NOW IMPLEMENTED** | 0 items |

### New Generator Configs

**Fibbage** (lines 66-72):
```typescript
fibbage: {
  schema: z.object({ items: z.array(FibbageItemSchema) }),
  system: "You generate obscure fact-based questions for a bluffing party game. Each question presents an interesting fact with a key detail blanked out (use _____). Players try to guess the real answer while fooling others with fake answers...",
  promptTemplate: (count) => `Generate ${count} obscure fact questions across categories: animals, history, geography, science, food origins, word origins, human body, pop culture trivia...`,
}
```

**Caption** (lines 73-79):
```typescript
caption: {
  schema: z.object({ items: z.array(CaptionItemSchema) }),
  system: "You generate descriptions of absurd, weird, or funny hypothetical images for a caption-writing party game. Each prompt describes a bizarre visual scene that players must write funny captions for. The imageUrl should be a descriptive slug...",
  promptTemplate: (count) => `Generate ${count} absurd image scene descriptions across categories: animals in human situations, impossible objects, surreal landscapes...`,
}
```

**WordGame** (lines 80-86):
```typescript
wordgame: {
  schema: z.object({ items: z.array(WordGameItemSchema) }),
  system: "You generate word game prompts with different challenge types for a party game. Types include: 'rhyme', 'synonym', 'category', 'association'...",
  promptTemplate: (count) => `Generate ${count} word game prompts with varied types (rhyme, synonym, category, association). Mix difficulties: easy, medium, hard...`,
}
```

---

## Bulk Generation Targets (Layer 3, Task 3.2)

| Content Type | Target | Current | Gap | Priority |
|--------------|--------|---------|-----|----------|
| QuipPrompt | 500+ | 84 | ~420 | High (Quiplash ready) |
| TriviaQuestion | 500+ | 0 | 500 | High (OpenTDB + AI) |
| DrawingPrompt | 200+ | 0 | 200 | Medium |
| EstimationQuestion | 200+ | 0 | 200 | Medium |
| WouldYouRather | 200+ | 0 | 200 | Medium |
| FibbageQuestion | 200+ | 0 | 200 | Medium |
| WordGamePrompt | 100+ | 0 | 100 | Low |

### Content Readiness by Game Family

| Game Family | Required Types | Min for Launch | Status |
|-------------|----------------|----------------|--------|
| Quiplash | QuipPrompt | 200+ | ✅ Pipeline ready |
| Trivia Murder Party | TriviaQuestion | 300+ | ✅ Pipeline ready |
| Drawful | DrawingPrompt | 150+ | ✅ Pipeline ready |
| Estimation | EstimationQuestion | 100+ | ✅ Pipeline ready |
| Would You Rather | WouldYouRather | 150+ | ✅ Pipeline ready |
| Fibbage | FibbageQuestion | 150+ | ✅ Pipeline ready |
| Word Games | WordGamePrompt | 100+ | ✅ Pipeline ready |
| Caption This | CaptionPrompt | 100+ | ⚠️ Needs image sources |

---

## Generation Commands

```bash
# Quip prompts (need ~420 more)
hush run -- pnpm content cli -- generate --game-type=quip --count=100 --model=fast
# Run 5 times to reach 500+

# Trivia (OpenTDB ingest + AI generation)
hush run -- pnpm content cli -- ingest --source=opentdb --game-type=trivia --count=50
hush run -- pnpm content cli -- generate --game-type=trivia --count=100 --model=balanced

# Drawing prompts
hush run -- pnpm content cli -- generate --game-type=drawing --count=50 --model=balanced

# Estimation questions
hush run -- pnpm content cli -- generate --game-type=estimation --count=50 --model=reasoning

# Would You Rather
hush run -- pnpm content cli -- generate --game-type=wyr --count=50 --model=balanced

# Fibbage facts (NOW AVAILABLE)
hush run -- pnpm content cli -- generate --game-type=fibbage --count=50 --model=quality

# Word game prompts (NOW AVAILABLE)
hush run -- pnpm content cli -- generate --game-type=wordgame --count=50 --model=balanced
```

### Model Recommendations

| Content Type | Model | Rationale |
|--------------|-------|-----------|
| quip | `fast` | High volume, simple structure |
| trivia | `balanced` | Factual accuracy |
| drawing | `balanced` | Creative but structured |
| estimation | `reasoning` | Numerical accuracy |
| wyr | `balanced` | Creative scenarios |
| fibbage | `quality` | Surprising but true facts |
| wordgame | `balanced` | Structured output |

---

## Verification

- TypeScript: `pnpm tsc --noEmit` ✅
- LSP diagnostics: No errors ✅
- File: `prompts.ts` now 88 lines (was 61)

---

## Files Modified

- `packages/content-pipeline/src/generate/prompts.ts` — Added imports for FibbageQuestionSchema, CaptionPromptSchema, WordGamePromptSchema; added item schemas; added 3 config entries
