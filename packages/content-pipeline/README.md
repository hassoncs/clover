# @slopcade/content-pipeline

Standalone CLI tool for generating and managing party game content. Fully isolated from the rest of the monorepo - can be deleted with `rm -rf packages/content-pipeline` without breaking anything.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│  Sources                    Commands                    Output  │
│  ───────                    ────────                    ──────  │
│  • OpenTDB API ────────►   ingest    ───────►   SQLite DB      │
│  • AI Generation ──────►   generate  ───────►   (moderation)   │
│  • (Wikipedia TBD)         moderate  ───────►   approved items │
│                            build-pack ─────►   JSON files      │
│                            stats                      CREDITS.md│
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Build the package
pnpm --filter @slopcade/content-pipeline build

# Run CLI
pnpm content cli -- <command>
```

## Commands

### `ingest` - Import from external sources

```bash
# Fetch trivia from OpenTDB
pnpm content cli -- ingest --source=opentdb --game-type=trivia --count=50

# Dry-run (preview without saving)
pnpm content cli -- ingest --source=opentdb --game-type=trivia --count=10 --dry-run
```

### `generate` - AI content generation

```bash
# Generate quip prompts via Claude
hush run -- pnpm content cli -- generate --game-type=quip --count=50

# Dry-run
hush run -- pnpm content cli -- generate --game-type=quip --count=10 --dry-run
```

**Requires**: `ANTHROPIC_API_KEY` environment variable (use `hush run --`)

### `moderate` - Content safety filtering

```bash
# Auto-moderate all pending items
pnpm content cli -- moderate

# Manually set status
pnpm content cli -- moderate --id=<uuid> --status=approved
```

**Moderation rules**:
- Keyword blocklist (violence, adult content, politics, drugs)
- Items with blocked keywords → `rejected`
- Clean items → `approved`

### `build-pack` - Output JSON files

```bash
# Build pack for a game type
pnpm content cli -- build-pack \
  --name="Quiplash Pack" \
  --game-type=quip \
  --output=api/src/party/content/generated/quip-prompts.json
```

**Output format** matches existing prompt files:
```json
[
  { "id": "q001", "text": "The worst name for a pet: _____", "category": "animals" }
]
```

### `stats` - Pipeline state

```bash
pnpm content cli -- stats
```

## Content Types

| Type | Schema | Game | Pipeline | Game Template |
|------|--------|------|----------|---------------|
| **QuipPrompt** | `{ id, text, category }` | Quiplash | ✅ Ready | ✅ Built |
| **TriviaQuestion** | `{ id, question, correctAnswer, incorrectAnswers[], category, difficulty? }` | Trivia Murder Party | ✅ Ready (OpenTDB) | 🔴 Not built |
| **DrawingPrompt** | `{ id, prompt, category, difficulty? }` | Drawful | ✅ Ready (AI) | 🔴 Not built |
| **WouldYouRather** | `{ id, optionA, optionB, category }` | WYR | ✅ Ready (AI) | 🔴 Not built |
| **EstimationQuestion** | `{ id, question, answer (number), unit?, category, acceptableRange? }` | Estimation | ✅ Ready (AI) | 🔴 Not built |
| **FibbageQuestion** | `{ id, question, answer, category, alternateSpellings? }` | Fibbage | 🔴 Needs fact sources | 🔴 Not built |
| **CaptionPrompt** | `{ id, imageUrl, category, context? }` | Caption game | 🔴 Needs image sources | 🔴 Not built |
| **WordGamePrompt** | `{ id, type, prompt, category, difficulty? }` | Word games | 🔴 Not implemented | 🔴 Not built |

### Pipeline Status Legend
- ✅ **Ready**: Can generate/ingest content now
- 🔴 **Needs sources**: Requires external API integration (Wikipedia, etc.)
- 🔴 **Not implemented**: Schema defined but no generation logic

## Data Storage

- **Location**: `~/.slopcade/content-pipeline.db`
- **Type**: SQLite via `better-sqlite3`
- **Tables**:
  - `content_items` - All content with provenance and moderation status
  - `content_packs` - Pack metadata
  - `pack_items` - Pack ↔ item relationships

## Provenance & Licensing

Every content item tracks:
- `provenanceSource` - Where it came from (opentdb, ai, human, etc.)
- License information via source registry
- Attribution text for CREDITS.md generation

**Approved sources**:
| Source | License | Notes |
|--------|---------|-------|
| OpenTDB | CC-BY-SA-4.0 | Trivia questions |
| Wikidata | CC0 | Structured data |
| Wikipedia | CC-BY-SA-4.0 | Article content |
| World Bank | CC-BY-4.0 | Statistics |
| CIA Factbook | Public Domain | Country data |
| US Gov Data | Public Domain | Federal datasets |
| AI Generated | Proprietary | Owned by Slopcade |

## Integration Roadmap

### Phase 1: Quiplash Integration (Ready Now)
- [ ] Generate 100+ quip prompts via AI
- [ ] Moderate and approve
- [ ] Output to `api/src/party/content/generated/quip-prompts.json`
- [ ] Modify `quiplash.ts` to import from generated file
- [ ] Test with real players

### Phase 2: Trivia Game
- [ ] Build Trivia Murder Party template
- [ ] Ingest 500+ questions from OpenTDB
- [ ] Wire TriviaQuestion type to game

### Phase 3: Fibbage
- [ ] Build Fibbage template
- [ ] Generate fact-based questions
- [ ] Wire FibbageQuestion type

### Phase 4: Full Pipeline
- [ ] Wikipedia adapter for unusual facts
- [ ] AI-assisted moderation (Claude Haiku)
- [ ] Content versioning and updates
- [ ] Admin UI for content review

## Architecture

```
packages/content-pipeline/
├── src/
│   ├── cli.ts              # Yargs CLI entrypoint
│   ├── commands/           # CLI command handlers
│   │   ├── generate.ts
│   │   ├── ingest.ts
│   │   ├── moderate.ts
│   │   ├── build-pack.ts
│   │   └── stats.ts
│   ├── types/              # Zod schemas for all content types
│   ├── db/                 # SQLite database layer
│   ├── sources/            # Source registry, license validation
│   ├── ingest/             # External source adapters
│   ├── generate/           # AI generation client, prompts
│   ├── moderate/           # Moderation logic
│   ├── dedup/              # Content hashing, duplicate detection
│   └── provenance/         # Provenance export
├── package.json
└── tsconfig.json
```

## Dependencies

- `@anthropic-ai/sdk` - AI generation
- `better-sqlite3` - Local database
- `yargs` - CLI framework
- `zod` - Schema validation

**Zero dependencies on `@slopcade/*` packages** - fully standalone.