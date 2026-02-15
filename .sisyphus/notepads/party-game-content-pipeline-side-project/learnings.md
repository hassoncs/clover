
## Source Registry & License Validation (Task 2)

### Implementation
- Created `src/types/sources.ts` with SPDX license constants and Source type
- Created `src/sources/registry.ts` with 8 approved sources:
  - OpenTDB (CC BY-SA 4.0)
  - Wikidata (CC0 1.0)
  - Wikipedia unusual articles (CC BY-SA 4.0)
  - World Bank (CC BY 4.0)
  - Gapminder (CC BY 4.0)
  - CIA World Factbook (Public Domain)
  - US Gov Data (Public Domain)
  - AI Generated (Proprietary-AI)
- Created `src/sources/license-validator.ts` with:
  - Approved license allowlist (CC0, CC-BY-4.0, CC-BY-SA-4.0, Public Domain, Proprietary-AI)
  - Rejection patterns for NC (NonCommercial) and ND (NoDerivatives)
  - Validation functions returning structured results
- Created `src/sources/attribution.ts` with:
  - Text and HTML attribution generation
  - License-specific formatting
  - Bulk attribution helpers

### Test Coverage
- 37 tests passing across 3 test files
- License validator tests cover positive (approved) and negative (rejected) cases
- Registry tests verify all 8 sources have required fields
- Attribution tests cover text/HTML formats and bulk generation

### Key Decisions
- Used Zod for schema validation (already in package.json)
- SPDX identifiers as constants for type safety
- Separate attribution templates per license type
- HTML attribution includes clickable license links

### Patterns
- All types defined locally (no imports from @slopcade/shared)
- Used Set<string> for license allowlist (fast lookup)
- Regex patterns for license rejection (catches variations like "NonCommercial")

## Package Scaffold Complete

### Structure Created
- `packages/content-pipeline/` - Standalone package with zero `@slopcade/*` dependencies
- `src/types/index.ts` - All content type definitions (ContentItem, ContentPack, game-specific schemas)
- `src/db/index.ts` - SQLite store via better-sqlite3 (stores in `~/.slopcade/content-pipeline.db`)
- `src/commands/` - CLI command handlers (generate, ingest, moderate, build-pack)
- `src/cli.ts` - Yargs CLI entrypoint
- `src/index.ts` - Main package exports

### Dependencies
- `better-sqlite3` - Internal SQLite database
- `yargs` - CLI framework
- `zod` - Schema validation
- `vitest` - Testing (devDep)
- `typescript` - Build tooling (devDep)

### Root Integration
- Added `"content": "pnpm --filter @slopcade/content-pipeline"` to root package.json
- CLI accessible via: `pnpm content cli -- <command>`
- Direct usage: `node packages/content-pipeline/dist/cli.js <command>`

### Verification
- ✅ Type-check passes: `pnpm --filter @slopcade/content-pipeline type-check`
- ✅ CLI runs: `pnpm content cli -- --help` shows all commands
- ✅ DB initializes: Creates `~/.slopcade/content-pipeline.db` on first use
- ✅ Zero @slopcade dependencies (fully standalone)

### Pattern Followed
- Matched `packages/reggie/` for CLI structure (bin, ESM exports)
- Matched `packages/economy-engine/` for internal workspace pattern (zod, vitest)
- Used NodeNext module resolution for ESM compatibility

### Notes
- Found pre-existing `src/sources/` directory with attribution/license code - left intact
- Package is deletable with `rm -rf packages/content-pipeline` and zero breakage elsewhere
- DB schema includes content_items, content_packs, pack_items tables with proper indexes

## Deduplication and Provenance (Task 3)

### Implementation
- Added contentHash field to DB schema and ContentItemRow
- Created src/dedup/hash.ts:
  - normalizeContent(): lowercase, trim, collapse whitespace
  - computeContentHash(): SHA-256 hash of normalized text
- Created src/dedup/check.ts:
  - checkDuplicate(): queries DB by contentHash
  - Returns existing item ID if duplicate found
- Updated ingest command to check duplicates before insert
- Created src/provenance/export.ts:
  - buildProvenanceRecord(): converts ContentItemRow to ProvenanceRecord
  - exportProvenance(): writes sidecar JSON files per item
- Added stats command to CLI:
  - Reports total items, unique items, duplicate count
  - Breaks down by status and source

### Test Coverage
- 47 tests passing (10 new tests for dedup/provenance)
- Hash normalization tests verify lowercase, trim, whitespace collapse
- Provenance tests verify record building and null handling

### Verification
- Duplicate ingestion produces single active record
- pnpm content cli -- stats reports counts by status/source
- Provenance export produces JSON sidecar files
- Type-check passes
- Build passes

### Key Decisions
- Used SHA-256 for content hashing (same as BlobStore pattern)
- Normalization prevents case/whitespace variations from creating duplicates
- Duplicates are rejected at ingest time (not stored)
- Provenance records include transformHistory array (empty for now, extensible)

### Patterns
- Followed BlobStore dedup pattern (hash-based lookup before insert)
- Provenance export writes one JSON file per item (itemId.provenance.json)
- Stats command uses Map for aggregation (by status, by source)

## Moderate Command Implementation

**Pattern**: Extracted control flow branches into named functions (`manuallySetStatus`, `autoModerateAllPending`) instead of inline comments. Makes code self-documenting.

**Database**: `PipelineDB` must be closed in `finally` block to ensure cleanup even on errors.

**Blocklist Integration**: `containsBlockedKeyword` returns `{ blocked: boolean, keyword?: string }` - use the keyword in moderation notes for transparency.

**CLI Flags**:
- No flags: Auto-moderate all pending items
- `--id <id> --status <status>`: Manual override for specific item
- `--interactive`: Placeholder for future interactive mode


## Generate Command Implementation

**Date:** 2026-02-14

**What was done:**
- Wired together AI client, prompts, and database in `generate.ts`
- Added JSON parsing with regex extraction from AI response
- Implemented deduplication using content hash
- Added dry-run mode for testing without saving
- Proper error handling for unknown game types

**Key patterns:**
- Extract JSON from AI response using regex: `/\[[\s\S]*\]/`
- Check for duplicates before inserting using `getContentItemByHash()`
- Store full item metadata in both `provenanceMetadata` and `metadata` fields
- Use `text || question` fallback to handle different item structures
- Close DB connection in finally block (not needed here since no try/catch, but good pattern)

**CLI testing:**
- Use `node dist/cli.js` directly instead of `pnpm cli --` for cleaner output
- The `--` in pnpm scripts can cause output issues

**Verification:**
- Type-check passes: `pnpm tsc --noEmit`
- Command help works: `node dist/cli.js generate --help`
- Command executes and reaches AI client (verified by API error)

## Text Extraction for Different Game Types

**Problem**: The generate command was using a naive fallback `item.text || item.question` which didn't handle all game type schemas correctly.

**Solution**: Added `extractText()` helper function in `packages/content-pipeline/src/commands/generate.ts` that switches on game type:
- `wyr`: Combines `optionA` and `optionB` into "Would you rather: X OR Y"
- `estimation`: Uses `question` field
- `drawing`: Uses `text` or `prompt` field
- Default: Falls back to `text || question` for quip/trivia

**Pattern**: When dealing with polymorphic content schemas, use a type-aware extraction function rather than generic fallbacks.

**Files Modified**:
- `packages/content-pipeline/src/commands/generate.ts` - Added extractText() helper, updated line 95

**Verification**: Type-check passes, all 47 tests pass.
