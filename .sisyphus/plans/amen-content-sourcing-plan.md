# Amen Content Sourcing Plan

> **Goal**: Source verified, non-hallucinated content for all 8 launch games to reach playable pool sizes.
> **Generated**: Feb 16, 2026
> **API.Bible Key**: Set in hush as `API_BIBLE_API_KEY` ✅

---

## API.Bible Configuration

### Bible Versions Available

| Version | Bible ID | Abbreviation | Role |
|---------|----------|-------------|------|
| **NIV 2011** | `78a9f6124f344018-01` | NIV11 | Primary — most recognized modern translation |
| **NLT** | `d6e14a625393b4da-01` | NLT | Accessible — clearest language for games |
| **NKJV** | `63097d2a0a2f7db3-01` | NKJV | Traditional — gravitas when needed |
| **KJV** | `de4e12af7f28f599-01` | engKJV | Reference — public domain, classic |

### Base URL & Endpoints

```
Base: https://rest.api.bible/v1
Header: api-key: $API_BIBLE_API_KEY

GET /bibles/{bibleId}/verses/{verseId}?content-type=text&include-verse-numbers=false
GET /bibles/{bibleId}/search?query={query}&limit=10
GET /bibles/{bibleId}/books
GET /bibles/{bibleId}/chapters/{chapterId}
```

### Rate Limits
- 5,000 queries/day (non-commercial)
- 500 consecutive verses per request
- **Strategy**: Batch-fetch during content generation, cache results, bake into content packs. Zero runtime API calls.

---

## Content Pool Size Targets

### Jackbox Benchmarks (from data mining)

| Game Type | Jackbox Pool Size | Notes |
|-----------|------------------|-------|
| Trivia (TMP1) | ~1,156 questions | Includes picture questions |
| Trivia (TMP2) | ~1,001 questions | + "Worst Answer" prompts |
| Quiplash XL | ~998 prompts | 844 normal + 154 adult |
| Fibbage XL | ~300-400 facts | Original ~250 |
| Fibbage 4 | ~1,000+ facts | "Biggest entry yet" |
| Drawful 2 | ~1,000 prompts | 2x Drawful 1 |

### Repeat Avoidance Math

| Game Type | Items Per Session | 20 Sessions = | Safe Minimum | Our Target |
|-----------|-------------------|---------------|-------------|------------|
| Trivia | 10-12 questions | 240 | 400 | **500** |
| Quip (fill-blank) | 16-20 prompts | 400 | 600 | **500** |
| Fibbage (facts) | 8-10 facts | 200 | 300 | **300** |
| History (years) | 8-10 events | 200 | 300 | **200** |
| Drawing | 8-10 prompts | 200 | 300 | **200** |
| Ranking | 5-8 topics | 160 | 200 | **150** |
| Dilemma | 8-10 scenarios | 200 | 300 | **150** |
| Heads Up | 50+ words/deck | — | 5 decks × 50 | **250** (5 decks) |

### Current State vs Target

| Game | Content Type | Current | Target | Gap | Source Strategy |
|------|-------------|---------|--------|-----|----------------|
| Great Hall of Wisdom | trivia | 20 | 500 | **480** | BibleQuizzle (205) + Alpaca (1,290) + OpenTriviaQA (638) + API.Bible validation |
| Fellowship Table | quip | 20 | 500 | **480** | API.Bible verse text → AI-generate prompts with real verse anchors |
| Scrolls of Truth | fibbage | 15 | 300 | **285** | Theographic facts + API.Bible verse verification. NO hallucination. |
| Book of Ages | history | 15 | 200 | **185** | Theographic events (450 with dates) → direct extraction |
| The Council | ranking | 10 | 150 | **140** | Semi-AI: generate ranking topics, manually verify categories |
| The Crossroads | dilemma | 10 | 150 | **140** | AI-generate with ethical framework, human review |
| Illustrated Scripture | drawing | 15 | 200 | **185** | API.Bible narrative passages → extract visual scenes |
| Who Am I? | headsup | 15 | 250 | **235** | Theographic people (3,067) → filter to well-known → group into decks |
| **TOTAL** | | **120** | **2,250** | **2,130** | |

---

## Per-Game Content Sourcing Strategy

### Game 1: Great Hall of Wisdom (Trivia) — Target: 500

**Sources (all verified, no hallucination):**

| Source | Items | Format | Action |
|--------|-------|--------|--------|
| BibleQuizzle | 205 | JSON (question/answer/reference) | Ingest via existing adapter. Convert to MCQ format. |
| Bible Trivia Alpaca | 1,290 | JSON (instruction/response pairs) | Download from HuggingFace. Write adapter. Parse into MCQ. |
| OpenTriviaQA religion-faith | 638 | Custom text format | Download from GitHub. Write parser. |
| OpenTDB Religion category | ~100-200 | JSON API | Call API. Filter Bible-specific. |

**API.Bible role**: After ingesting from above sources, validate every `scriptureRef` by fetching the verse. Attach the actual verse text as `verseText` field for display during reveal phase.

**Pipeline**:
```
1. Ingest BibleQuizzle → 205 items
2. Ingest Alpaca → ~1,290 items (filter to MCQ-convertible)
3. Ingest OpenTriviaQA → ~638 items
4. Deduplicate (semantic similarity)
5. Validate scriptureRefs via API.Bible
6. Enrich with verseText from NIV
7. Auto-moderate → human spot-check 10%
8. Target: 500 curated, verified items
```

**Note**: We'll have ~2,000+ raw items from sources. After dedup + quality filter, 500 high-quality items is very achievable.

---

### Game 2: Fellowship Table (Quiplash) — Target: 500

**Sources:**

This is the one game type where AI generation makes sense, BUT we ground it in real verse text to prevent hallucination.

**Pipeline**:
```
1. Fetch 200 interesting/funny/surprising verses from API.Bible
   - Search for: animals, food, body parts, emotions, family drama
   - Example queries: "donkey", "honey", "hair", "wept", "angry"
   - Pull the actual verse text
2. Feed each verse to LLM: "Create a fill-in-the-blank prompt inspired by this verse"
   - Example: Proverbs 27:14 → "According to Proverbs, the worst way to greet your neighbor is: ____"
   - Example: Judges 3:22 → "The most awkward thing about Ehud's sword: ____"
3. Each prompt stores: { text, scriptureContext, scriptureRef }
4. Human review ALL prompts (these are creative, need tone check)
```

**API.Bible role**: CRITICAL. The verse text IS the seed data. Every prompt is anchored to a real verse.

**Why not pure AI?** Fill-in-the-blank prompts don't need factual accuracy (they're comedy prompts), but grounding in real verses makes them educational AND funnier. "Moses' excuse for being late to the burning bush" is funny but generic. "According to Exodus 4:10, Moses' excuse was: ____" is grounded AND educational.

---

### Game 3: Scrolls of Truth (Fibbage) — Target: 300

**Sources (ZERO hallucination tolerance):**

| Source | Items | How |
|--------|-------|-----|
| Theographic people | 3,067 | Extract surprising attributes: "This person lived to be _____ years old" |
| Theographic events | 450 | Extract surprising details: "The number of people at this event was _____" |
| Theographic places | 1,274 | Extract geographic facts: "The city of _____ is mentioned 62 times" |
| API.Bible verse search | unlimited | Search for numbers, measurements, counts in Bible text |

**Pipeline**:
```
1. Parse Theographic people.json:
   - Find people with interesting attributes (age, verse count, occupation)
   - Template: "Methuselah lived to be _____ years old" → answer: 969
   - Template: "_____ is mentioned in 331 verses" → answer: Aaron
2. Parse Theographic events.json:
   - Find events with surprising dates or durations
   - Template: "The great flood lasted _____ days" → answer: 40
3. API.Bible search for numerical facts:
   - Search "cubits", "years old", "pieces of silver", "days", "tribes"
   - Extract the fact + reference
4. Every fact verified against source data (Theographic) or verse text (API.Bible)
5. NO AI generation for the facts themselves — only for formatting into game prompts
```

**API.Bible role**: Source of truth for verse-based facts. Search API finds obscure numerical facts.

---

### Game 4: Book of Ages (Year Jinx) — Target: 200

**Sources:**

| Source | Items | How |
|--------|-------|-----|
| Theographic events.json | 450 | Direct extraction — events already have `startDate` field |
| Church history events | ~50 | Hand-curate: Council of Nicaea (325), Luther's 95 Theses (1517), etc. |

**Pipeline**:
```
1. Parse Theographic events.json
   - Filter to events with valid startDate
   - Extract: { title, year, description }
   - Example: "Creation of all things" → -4003
   - Example: "The Exodus from Egypt" → -1446
2. Add well-known church history events (post-biblical)
   - These are historical facts, not scripture — safe to curate manually
3. Format as estimation questions with verifiable answers
```

**API.Bible role**: Low. Events come from Theographic. Could optionally fetch the relevant passage text for display during reveal.

---

### Game 5: The Council (Consensus Mine) — Target: 150

**Sources:**

Ranking topics are opinion-based, so hallucination risk is low. But categories should reference real Bible content.

**Pipeline**:
```
1. Hand-curate 30 ranking templates:
   - "Rank these disciples by how brave they were"
   - "Rank these miracles by how impressive they are"
   - "Which of these Bible foods would you most want to eat?"
   - "Rank these Bible villains by scariness"
2. AI-generate 120 more from Theographic categories (people, places, events)
   - Use real names/places from Theographic data
   - Template: "Rank these [category] by [criterion]"
3. Human review all — these need to be fun group discussion starters
```

**API.Bible role**: Minimal. Used to verify that referenced characters/places are real.

---

### Game 6: The Crossroads (Half and Half) — Target: 150

**Sources:**

Moral dilemmas are creative content. AI generation is appropriate but needs tone review.

**Pipeline**:
```
1. Hand-curate 30 "seed" dilemmas:
   - "Would you rather have Moses' staff or David's sling?"
   - "Would you rather spend a night in the lion's den or the whale's belly?"
2. AI-generate 120 more, grounded in Bible scenarios:
   - Feed real Bible scenarios from Theographic events
   - "Create a 'would you rather' using these two events"
3. Human review ALL — tone must be warm, never trivializing
```

**API.Bible role**: Minimal. Optional verse text for context during reveal.

---

### Game 7: Illustrated Scripture (Drawful) — Target: 200

**Sources:**

| Source | Items | How |
|--------|-------|-----|
| API.Bible narrative passages | ~200 | Search for visual/action scenes |
| Theographic events | 450 | Filter to events with clear visual imagery |

**Pipeline**:
```
1. API.Bible search for action/visual scenes:
   - Search: "walked", "built", "parted", "fell", "burning", "angel appeared"
   - Extract vivid narrative passages
2. Template: "Draw: [Scene description from passage]"
   - "Draw: Moses and the burning bush (Exodus 3:2)"
   - "Draw: David fighting Goliath (1 Samuel 17:49)"
   - "Draw: Jonah being swallowed by a great fish (Jonah 1:17)"
   - "Draw: The walls of Jericho falling (Joshua 6:20)"
3. Store scriptureRef + verseText for reveal
4. Filter for drawable scenes (avoid abstract theology)
```

**API.Bible role**: Primary source for discovering narrative scenes.

---

### Game 8: Who Am I? (Heads Up) — Target: 250 (5 decks × 50)

**Sources:**

| Source | Items | How |
|--------|-------|-----|
| Theographic people.json | 3,067 | Filter + group into thematic decks |

**Pipeline**:
```
1. Parse Theographic people.json → extract all named people
2. Filter to "well-known enough to guess" (~300-500 people)
   - Heuristic: verseCount > 5 OR has dictionaryText
3. Group into 5 themed decks:
   - "Old Testament Heroes" (50): Moses, David, Abraham, Ruth, Esther...
   - "New Testament Figures" (50): Peter, Paul, Mary, Martha, Barnabas...
   - "Kings & Queens" (50): Saul, David, Solomon, Jezebel, Herod...
   - "Prophets & Priests" (50): Elijah, Isaiah, Jeremiah, Aaron...
   - "Everyone Else" (50): Methuselah, Balaam, Rahab, Nicodemus...
4. Each entry: { name, deck, hintCategory }
5. Optionally add brief description from dictionaryText for post-guess reveal
```

**API.Bible role**: Low. Character data comes from Theographic. Could fetch key verses about each character.

---

## External Data Sources Summary

### Already Cloned

| Source | Location | Items | Status |
|--------|----------|-------|--------|
| Theographic | `data/external/theographic-bible-metadata/` | 3,067 people, 1,274 places, 450 events | ✅ Cloned |
| BibleQuizzle | `data/external/BibleQuizzle/` | 205 Q&A | ✅ Cloned |

### Need to Download

| Source | URL | Items | Action |
|--------|-----|-------|--------|
| Bible Trivia Alpaca | https://huggingface.co/datasets/liaaron1/bibile_trivia_alpaca | 1,290 | Download dataset JSON |
| OpenTriviaQA | https://github.com/uberspot/OpenTriviaQA | 638 (religion-faith) | Clone repo, parse text format |
| BradyStephenson BibleData | https://www.kaggle.com/datasets/bradystephenson/bibledata | 18 CSVs | Download, focus on Person.csv + Event.csv |
| Fibbage Questions (reference) | https://github.com/joebandenburg/fibbage-questions | ~250 | Reference only — format inspiration |

### API (Live)

| Source | Endpoint | Items | Status |
|--------|----------|-------|--------|
| API.Bible | `rest.api.bible/v1/` | 66 books, full text | ✅ Key working |
| OpenTDB | `opentdb.com/api.php?category=20` | ~100-200 religion | Free, no key |

---

## Adapters Needed

### Existing (Ready to Use)
- `packages/content-pipeline/src/ingest/adapters/amen/theographic.ts` ✅
- `packages/content-pipeline/src/ingest/adapters/amen/biblequizzle.ts` ✅
- `packages/content-pipeline/src/ingest/adapters/amen/scripture-validator.ts` ✅

### Need to Build

| Adapter | Input | Output | Priority |
|---------|-------|--------|----------|
| `api-bible.ts` | API.Bible REST API | Verse text lookup + search + validation | P0 |
| `alpaca-trivia.ts` | Bible Trivia Alpaca JSON | TriviaQuestion[] | P0 |
| `opentriviaqa.ts` | OpenTriviaQA text format | TriviaQuestion[] | P1 |
| `theographic-fibbage.ts` | Theographic people/events/places | FibbageQuestion[] | P0 |
| `theographic-headsup.ts` | Theographic people | HeadsUpDeck[] | P1 |
| `theographic-history.ts` | Theographic events | EstimationQuestion[] | P1 |

### Generation Configs Needed

Currently only `amen-trivia`, `amen-quip`, `amen-fibbage` have generation configs in `packages/content-pipeline/src/generate/amen/prompts.ts`.

Need to add:
- `amen-drawing` — Bible scene drawing prompts
- `amen-history` — Historical event year estimation (may not need AI — direct from Theographic)
- `amen-ranking` — Group ranking topics
- `amen-dilemma` — Would-you-rather moral scenarios
- `amen-headsup` — Character deck generation (may not need AI — direct from Theographic)

---

## Execution Order

### Phase 1: Data Acquisition (do first)
1. Download Bible Trivia Alpaca from HuggingFace
2. Clone OpenTriviaQA repo
3. Build `api-bible.ts` adapter (verse lookup + search + validation)

### Phase 2: Ingest Verified Content (no AI needed)
4. Ingest BibleQuizzle → 205 trivia items
5. Ingest Alpaca → ~1,290 trivia items
6. Parse Theographic events → ~200 history items
7. Parse Theographic people → 5 HeadsUp decks (250 items)
8. Parse Theographic people/events/places → ~200 fibbage facts

### Phase 3: API.Bible-Powered Generation
9. Fetch 200 narrative verses → generate drawing prompts
10. Fetch 200 interesting verses → generate quip prompts (grounded)
11. Validate all scriptureRefs across all content
12. Enrich trivia + fibbage items with verseText from NIV

### Phase 4: AI-Assisted (Human Review Required)
13. AI-generate ranking topics (using real Theographic categories)
14. AI-generate dilemma scenarios (using real Bible scenarios)
15. Human review ALL generated content
16. Moderate + deduplicate full corpus

### Phase 5: Build Packs
17. Build final JSON packs for all 8 game types
18. Update prompt-loader.ts imports
19. End-to-end test each game with real content
