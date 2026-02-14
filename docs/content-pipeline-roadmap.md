# Content Pipeline Integration Roadmap

## Current State (Feb 2026)

### What's Built
- ✅ `@slopcade/content-pipeline` package (standalone)
- ✅ CLI commands: `ingest`, `generate`, `moderate`, `build-pack`, `stats`
- ✅ OpenTDB adapter for trivia ingestion
- ✅ AI generation via Claude API
- ✅ Keyword-based moderation
- ✅ SQLite storage with provenance tracking
- ✅ Output format matches existing `quiplash-prompts.json`

### What's NOT Built
- 🔴 No integration with existing party games
- 🔴 No Wikipedia adapter
- 🔴 No AI-assisted moderation (Claude Haiku)
- 🔴 Trivia/Fibbage/Drawing game templates don't exist

### Data Currently in Pipeline
- 5 items in DB (4 approved, 1 rejected)
- All from OpenTDB or test data
- No AI-generated content yet

---

## Integration Phases

### Phase 1: Quiplash Integration ⏳ READY NOW

**Goal**: Replace/augment hardcoded quiplash prompts with pipeline-generated content.

**Tasks**:
1. Generate 100+ quip prompts via AI
   ```bash
   hush run -- pnpm content cli -- generate --game-type=quip --count=100
   ```
2. Moderate and approve
   ```bash
   pnpm content cli -- moderate
   ```
3. Output to correct location
   ```bash
   pnpm content cli -- build-pack --name="AI Quiplash" --game-type=quip --output=api/src/party/content/generated/quip-prompts.json
   ```
4. Modify `api/src/party/templates/quiplash.ts`:
   ```typescript
   // Option A: Replace
   import promptsData from "../content/generated/quip-prompts.json";
   
   // Option B: Merge
   import basePrompts from "../content/quiplash-prompts.json";
   import generatedPrompts from "../content/generated/quip-prompts.json";
   const promptsData = [...basePrompts, ...generatedPrompts];
   ```
5. Test with real players

**Blockers**: None - can do today

---

### Phase 2: Trivia Game 🔴 BLOCKED

**Goal**: Build Trivia Murder Party-style game using OpenTDB content.

**Tasks**:
1. Build `api/src/party/templates/trivia.ts` game template
2. Ingest 500+ questions from OpenTDB
   ```bash
   pnpm content cli -- ingest --source=opentdb --game-type=trivia --count=500
   ```
3. Create `trivia-prompts.json` output
4. Wire TriviaQuestion type to game logic
5. Register in template registry

**Blockers**: Game template doesn't exist

---

### Phase 3: Fibbage 🔴 BLOCKED

**Goal**: Build Fibbage-style bluffing game.

**Tasks**:
1. Build `api/src/party/templates/fibbage.ts` game template
2. Generate fact-based questions (numerical answers, obscure facts)
3. Wire FibbageQuestion type
4. Test bluffing mechanics

**Blockers**: Game template doesn't exist

---

### Phase 4: Full Pipeline 🔴 FUTURE

**Goal**: Complete content ecosystem.

**Tasks**:
1. Wikipedia adapter for unusual facts
2. AI-assisted moderation (Claude Haiku classifier)
3. Content versioning and delta updates
4. Admin UI for human content review
5. DrawingPrompt → Drawful game
6. WouldYouRather → WYR game
7. EstimationQuestion → Estimation game

---

## Type → Game Mapping

| Content Type | Output Format | Target Game | Game Status |
|--------------|---------------|-------------|-------------|
| QuipPrompt | `{ id, text, category }` | Quiplash | ✅ Built |
| TriviaQuestion | `{ id, question, correctAnswer, incorrectAnswers[], category }` | Trivia Murder Party | 🔴 Not built |
| FibbageQuestion | `{ id, question, answer, category }` | Fibbage | 🔴 Not built |
| DrawingPrompt | `{ id, prompt, category }` | Drawful | 🔴 Not built |
| WouldYouRather | `{ id, optionA, optionB, category }` | WYR | 🔴 Not built |

---

## Technical Notes

### Output Format Compatibility

The `build-pack` command outputs JSON that exactly matches existing prompt files:

```json
[
  { "id": "q001", "text": "The worst name for a pet: _____", "category": "animals" }
]
```

This is a **drop-in replacement** for `api/src/party/content/quiplash-prompts.json`.

### Provenance Tracking

Every content item includes:
- Source (opentdb, ai, wikipedia, etc.)
- License (CC-BY-SA-4.0, CC0, Public Domain, etc.)
- Attribution text for CREDITS.md

### Moderation Flow

```
Ingest/Generate → pending → moderate → approved/rejected → build-pack → JSON output
```

Only `approved` items appear in output files.

---

## Decision Points

1. **Merge or Replace?** Should generated content merge with existing prompts or replace them entirely?
   - Recommendation: Merge initially, measure quality, then decide

2. **Content Freshness?** How often should we regenerate?
   - Recommendation: Monthly regeneration with deduplication

3. **Human Review?** Should all AI content be human-reviewed before shipping?
   - Recommendation: Sample review (10%) + keyword moderation for MVP

---

## Files to Modify for Integration

| File | Change |
|------|--------|
| `api/src/party/templates/quiplash.ts` | Import from generated file |
| `api/src/party/content/generated/` | Create directory, add .gitignore |
| `api/src/party/templates/registry.ts` | Add new game templates (Phase 2+) |