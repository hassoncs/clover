# Party Game Content Pipeline Side Project

## TL;DR

> **Quick Summary**: Build a fully standalone `packages/content-pipeline` package that ingests legally safe sources, generates original party-game content via AI, validates safety/licensing, and outputs static JSON files drop-in compatible with existing party template prompts. Zero coupling to api/shared/app — deletable with `rm -rf packages/content-pipeline`.
>
> **Deliverables**:
> - New package: `packages/content-pipeline` (self-contained types, schemas, CLI, generation, moderation)
> - CLI workflows: `generate`, `ingest`, `moderate`, `build-pack`
> - Safety pipeline (blocklist + AI moderation classifier)
> - Provenance tracking per content item
> - Static JSON output files compatible with existing `quiplash-prompts.json` shape
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 5 -> Task 6

---

## Context

### Original Request
Plan a practical, legally safe, separate side-project architecture for party-game content ingestion/generation and serving, then fit it into this repo without tightly coupling the first version.

### Interview Summary
**Key Discussions**:
- SA scraping is intentionally out-of-scope due to access/copyright/commercial risk.
- Desired output is idea generation and content pipelines, not copying source text.
- System should support multiple party game modes (trivia, quip/fibbage, drawing, WYR, estimation, caption, word games).
- Must align with current Slopcade architecture (Workers + D1 + R2 + monorepo) while staying modular.

**Research Findings**:
- Monorepo package patterns exist in `packages/game-bundler`, `packages/economy-engine`, and CLI package `packages/reggie`.
- Existing generation/R2 patterns exist in `api/scripts/generate-assets.ts` and `api/src/ai/pipeline/*`.
- Existing D1/R2 route patterns exist in `api/src/trpc/routes/games.ts` and schema patterns in `api/schema.sql`.
- Party content precedent exists in `api/src/party/content/quiplash-prompts.json` but without robust provenance fields.
- Open/free data options include OpenTDB, Wikidata, public-domain gov/statistical sources, and explicit-license datasets.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Lock down scope to avoid CMS/analytics/personalization creep.
- Make license compatibility and attribution mandatory at ingestion time.
- Define explicit moderation thresholds + human review queue.
- Add de-duplication, deprecation, and versioning handling.
- Ensure no runtime dependency on external APIs during gameplay.

### Architecture Fit Contract (Fully Standalone Experiment)
**Isolation principle**: This is an experiment. It must be deletable with `rm -rf packages/content-pipeline` and zero breakage elsewhere.

**Hard constraints**:
- `packages/content-pipeline` owns ALL its own types, schemas, and storage. No types in `@slopcade/shared`.
- No new D1 tables in `api/schema.sql`. Pipeline uses its own local SQLite (via `better-sqlite3`) or flat JSON files for its internal state.
- No new routes in the existing `api` Worker.
- No dependency on `@slopcade/shared` or `@slopcade/api`.
- Existing party games are NOT modified. Pipeline outputs JSON files in the same shape as `api/src/party/content/quiplash-prompts.json` — drop-in replacement files.

**Integration surface (intentionally tiny)**:
- Pipeline outputs static JSON files to `api/src/party/content/generated/`.
- Party templates can optionally import these files instead of hardcoded ones (one-line import change, done manually when ready).
- That's it. No API routes, no D1 migrations, no shared type contracts until the experiment proves value.

**Future graduation path** (not in this plan):
- If experiment works → add D1/R2 storage, API routes, shared types, engagement tracking.
- If experiment fails → `rm -rf packages/content-pipeline`, delete the generated JSON files, done.

---

## Work Objectives

### Core Objective
Build a self-contained experimental content pipeline that generates and curates party-game content, outputting static JSON files compatible with existing party template prompt formats.

### Concrete Deliverables
- `packages/content-pipeline` package with its own types, CLI, generation, ingestion, and moderation.
- CLI commands: `generate` (AI batch), `ingest` (external sources), `moderate` (safety filter), `build-pack` (output JSON).
- Output JSON files placed in `api/src/party/content/generated/` matching existing prompt shapes.
- Internal provenance/license tracking within the package's own data store.

### Definition of Done
- [x] `packages/content-pipeline` builds and type-checks from repo root.
- [x] At least one ingestion source and one AI generation path produce validated content with provenance.
- [x] License validation rejects unsupported/ambiguous licenses at ingestion time.
- [x] Safety pipeline classifies content and rejects unsafe items.
- [x] Output JSON files match the shape of `api/src/party/content/quiplash-prompts.json`.
- [x] `rm -rf packages/content-pipeline` causes zero test/build failures elsewhere.

### Must Have
- Fully standalone package boundary — zero imports from `@slopcade/shared` or `@slopcade/api`.
- License/provenance metadata tracked internally per content item.
- Safety classification with blocklist + AI-assisted moderation.
- Output format compatible with existing party template JSON consumption.
- CLI commands with dry-run support.

### Must NOT Have (Guardrails)
- No SA scraping or ingestion of forum/community copyrighted text.
- No CMS/editor UI of any kind.
- No D1 migrations or schema changes in `api/schema.sql`.
- No new API routes in the existing Worker.
- No types added to `@slopcade/shared`.
- No modifications to existing party templates or game code.
- No ML-heavy personalization or ranking model.
- No vague licensing (items missing license/provenance cannot ship).
- No human-only verification requirements in acceptance criteria.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every task below includes agent-executed verification only. No manual tester steps.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (default applied)
- **Framework**: Vitest + tsc (self-contained within the package)

### Agent-Executed QA Scenarios (MANDATORY - all tasks)
Each task includes:
- Happy-path verification scenario
- Negative/error scenario
- Evidence outputs under `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundations):
├── Task 1: Package scaffold + types + CLI skeleton
└── Task 2: Source registry + license policy

Wave 2 (Pipelines):
├── Task 3: Ingestion adapters (OpenTDB + structured sources)
├── Task 4: AI generation + moderation pipeline
└── Task 5: Dedup + provenance persistence

Wave 3 (Output):
├── Task 6: Pack builder — emit drop-in JSON files
└── Task 7: End-to-end smoke test + cleanup
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4,5,6 | 2 |
| 2 | None | 3,4 | 1 |
| 3 | 1,2 | 6 | 4,5 |
| 4 | 1,2 | 6 | 3,5 |
| 5 | 1 | 6 | 3,4 |
| 6 | 3,4,5 | 7 | None |
| 7 | 6 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1,2 | `quick` + `workspace-system` |
| 2 | 3,4,5 | `unspecified-high` + `ai-game-generation`, `testing-patterns` |
| 3 | 6,7 | `quick` + `testing-patterns` |

---

## TODOs

- [x] 1. Scaffold `@slopcade/content-pipeline` package

  **What to do**:
  - Create `packages/content-pipeline/` with `src/`, `package.json`, `tsconfig.json`.
  - Define all content types INSIDE the package: `ContentItem`, `ContentPack`, `ModerationStatus`, `Provenance`, game-type-specific schemas (trivia, quip, drawing, wyr, fibbage, estimation, caption, wordgame).
  - Add CLI skeleton with `yargs` (commands: `generate`, `ingest`, `moderate`, `build-pack`).
  - Add root script: `"content": "pnpm --filter @slopcade/content-pipeline"` in root `package.json`.
  - Add internal SQLite store (via `better-sqlite3`) for pipeline state — content items, moderation status, provenance. This is the pipeline's own DB, NOT the api D1.

  **Must NOT do**:
  - Do not add any dependency on `@slopcade/shared` or `@slopcade/api`.
  - Do not modify any file outside `packages/content-pipeline/` except one line in root `package.json`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`workspace-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,4,5,6
  - **Blocked By**: None

  **References**:
  - `packages/reggie/package.json` - CLI package shape (`bin`, ESM exports).
  - `packages/reggie/tsconfig.json` - NodeNext TypeScript defaults.
  - `packages/economy-engine/package.json` - Internal workspace pattern (zod, vitest).
  - `api/src/party/content/quiplash-prompts.json` - Target output shape to match.

  **Acceptance Criteria**:
  - [x] `packages/content-pipeline/package.json` exists, zero `@slopcade/*` dependencies.
  - [x] `pnpm --filter @slopcade/content-pipeline type-check` passes.
  - [x] CLI entrypoint runs: `pnpm content -- --help` shows commands.
  - [x] Internal SQLite DB initializes on first run.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Package compiles and CLI responds
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @slopcade/content-pipeline type-check
      2. Assert: exit code 0
      3. Run: pnpm content -- --help
      4. Assert: output includes "generate", "ingest", "moderate", "build-pack"
    Expected Result: Package is standalone and functional
    Evidence: .sisyphus/evidence/task-1-cli-help.txt

  Scenario: Removing package causes zero breakage
    Tool: Bash
    Steps:
      1. Run: pnpm tsc --noEmit (baseline)
      2. Temporarily rename packages/content-pipeline to packages/_content-pipeline
      3. Run: pnpm tsc --noEmit
      4. Assert: still passes (no other package depends on it)
      5. Rename back
    Expected Result: Package is truly standalone
    Evidence: .sisyphus/evidence/task-1-isolation.txt
  ```

  **Commit**: YES
  - Message: `feat(content-pipeline): scaffold standalone package with CLI and internal DB`
  - Files: `packages/content-pipeline/`, root `package.json`

- [x] 2. Define source registry + license compatibility policy

  **What to do**:
  - Create `src/sources/registry.ts` with approved source catalog: OpenTDB (CC BY-SA 4.0), Wikidata (CC0), Wikipedia unusual articles (CC BY-SA 4.0), World Bank/Gapminder (CC BY 4.0), CIA World Factbook (public domain), US gov datasets (public domain), AI-generated (owned).
  - Create `src/sources/license-validator.ts` with allowlist of SPDX identifiers compatible with commercial use.
  - Create `src/sources/attribution.ts` for attribution text generation per license type.
  - Add tests for license acceptance/rejection.

  **Must NOT do**:
  - Do not add CC-BY-NC or other non-commercial licenses to the allowlist.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 3,4
  - **Blocked By**: None

  **References**:
  - `shared/src/effects/package.ts` - Existing `SourceType`/provenance enums for inspiration (but DO NOT import from shared).
  - OpenTDB terms: https://opentdb.com/api_config.php
  - CC license compatibility chart: https://creativecommons.org/faq/#can-i-combine-material-under-different-creative-commons-licenses-in-my-work

  **Acceptance Criteria**:
  - [x] Source registry lists all approved sources with SPDX license ID.
  - [x] License validator accepts CC0, CC-BY-4.0, CC-BY-SA-4.0, Public Domain. Rejects CC-BY-NC-*.
  - [x] Attribution generator produces correct text per license.
  - [x] Tests pass for both positive and negative cases.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: License validator accepts and rejects correctly
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @slopcade/content-pipeline test -- license
      2. Assert: all tests pass
    Expected Result: License boundary is programmatic
    Evidence: .sisyphus/evidence/task-2-license-tests.txt

  Scenario: CC-BY-NC rejected
    Tool: Bash
    Steps:
      1. Run test fixture with CC-BY-NC-4.0 license
      2. Assert: validation throws with COMMERCIAL_USE_PROHIBITED reason
    Expected Result: Non-commercial licenses blocked
    Evidence: .sisyphus/evidence/task-2-license-negative.txt
  ```

  **Commit**: YES (groups with 1)
  - Message: `feat(content-pipeline): add source registry and license validation`
  - Files: `packages/content-pipeline/src/sources/`

- [x] 3. Build ingestion adapters for external sources

  **What to do**:
  - Implement OpenTDB adapter: fetch trivia, normalize to internal `ContentItem` schema, attach provenance.
  - Implement Wikipedia adapter: parse "List of unusual..." articles via MediaWiki API, extract structured facts for fibbage/estimation seeds.
  - Implement rate limiting, caching, and checkpoint/resume for large ingests.
  - All ingested content stored in pipeline's internal SQLite DB with provenance records.

  **Must NOT do**:
  - Do not store raw API responses as final content. Always normalize.
  - Do not call external APIs at runtime during games — this is batch-only.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`ai-game-generation`, `testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4,5)
  - **Blocks**: 6
  - **Blocked By**: 1,2

  **References**:
  - `api/scripts/generate-assets.ts` - Script orchestration and batch processing patterns.
  - OpenTDB API: `https://opentdb.com/api.php?amount=50&type=multiple`
  - MediaWiki API: `https://en.wikipedia.org/w/api.php?action=parse&page=List_of_unusual_deaths&format=json`

  **Acceptance Criteria**:
  - [x] `pnpm content -- ingest --source=opentdb --count=50 --dry-run` outputs 50 normalized items with provenance.
  - [x] Each item has: id, text, category, source, license, attribution, ingestedAt.
  - [x] Resume works: second run skips already-ingested items.
  - [x] Invalid source name errors gracefully.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: OpenTDB dry-run ingestion
    Tool: Bash
    Steps:
      1. Run: pnpm content -- ingest --source=opentdb --count=10 --dry-run
      2. Assert: output shows 10 items with license=CC-BY-SA-4.0
      3. Assert: each item has provenance.sourceUrl
    Expected Result: External data normalized with provenance
    Evidence: .sisyphus/evidence/task-3-opentdb-dryrun.txt

  Scenario: Unknown source rejected
    Tool: Bash
    Steps:
      1. Run: pnpm content -- ingest --source=somethingfake
      2. Assert: exit code 1, error message includes "unknown source"
    Expected Result: Invalid sources fail fast
    Evidence: .sisyphus/evidence/task-3-unknown-source.txt
  ```

  **Commit**: YES
  - Message: `feat(content-pipeline): add OpenTDB and Wikipedia ingestion adapters`
  - Files: `packages/content-pipeline/src/ingest/`

- [x] 4. Build AI generation + moderation pipeline

  **What to do**:
  - Add `generate` command that calls Claude API to batch-generate content per game type (quip prompts, trivia, drawing prompts, WYR, estimation).
  - Include few-shot examples and constraints (age 8-14, no violence/romance/politics) in generation prompts.
  - Add `moderate` command with: (1) keyword blocklist, (2) Claude Haiku safety classifier.
  - Moderation sets status: `approved` (score < 0.2), `pending_review` (0.2-0.8), `rejected` (> 0.8).
  - Store results in internal SQLite with moderation status and reasoning.

  **Must NOT do**:
  - Do not auto-publish anything scored above 0.2 without review.
  - Do not include generation prompts that reference copyrighted IP.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`ai-game-generation`, `testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3,5)
  - **Blocks**: 6
  - **Blocked By**: 1,2

  **References**:
  - `api/src/ai/pipeline/stages/index.ts` - Existing stage-based pipeline pattern (for reference, not import).
  - `api/scripts/generate-assets.ts` - CLI generation script structure.
  - The user's original document includes detailed generation prompts for each game type.

  **Acceptance Criteria**:
  - [x] `pnpm content -- generate --type=quip --count=20` produces 20 schema-valid items.
  - [x] `pnpm content -- moderate` classifies all unmoderated items.
  - [x] Blocked keyword triggers immediate rejection.
  - [x] AI classifier routes ambiguous items to pending_review.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Generate quip prompts
    Tool: Bash
    Steps:
      1. Run: hush run -- pnpm content -- generate --type=quip --count=5
      2. Assert: 5 items in SQLite with game_type=quip
      3. Assert: each has text, category fields populated
    Expected Result: AI generation produces valid content
    Evidence: .sisyphus/evidence/task-4-generate-quip.json

  Scenario: Moderation blocks toxic fixture
    Tool: Bash
    Steps:
      1. Insert test fixture with known blocked keyword into SQLite
      2. Run: pnpm content -- moderate
      3. Assert: fixture status is "rejected" with reason "blocklist_match"
    Expected Result: Safety gate catches known-bad content
    Evidence: .sisyphus/evidence/task-4-moderate-negative.txt
  ```

  **Commit**: YES
  - Message: `feat(content-pipeline): add AI generation and moderation pipeline`
  - Files: `packages/content-pipeline/src/generate/`, `packages/content-pipeline/src/moderate/`

- [x] 5. Add deduplication and provenance persistence

  **What to do**:
  - Implement exact-hash dedup on content text (normalized lowercase, stripped whitespace).
  - Add provenance export: for each content item, generate a sidecar JSON record with source, license, attribution, transform history.
  - Add `--stats` flag to CLI that reports: total items, by status, by source, duplicate count.

  **Must NOT do**:
  - Do not hard-delete duplicates — mark them, keep originals for audit.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3,4)
  - **Blocks**: 6
  - **Blocked By**: 1

  **References**:
  - `api/src/services/BlobStore.ts` - content-hash dedup pattern (for reference).

  **Acceptance Criteria**:
  - [x] Duplicate ingestion of same content produces single active record.
  - [x] `pnpm content -- stats` reports item counts by status and source.
  - [x] Provenance export produces JSON sidecar files.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Duplicate detected
    Tool: Bash
    Steps:
      1. Insert item A
      2. Insert item A again with different source
      3. Assert: only one active item, second marked as duplicate
    Expected Result: Dedup prevents content inflation
    Evidence: .sisyphus/evidence/task-5-dedup.txt

  Scenario: Stats command reports accurately
    Tool: Bash
    Steps:
      1. Run: pnpm content -- stats
      2. Assert: output includes counts by status and source
    Expected Result: Pipeline state is observable
    Evidence: .sisyphus/evidence/task-5-stats.txt
  ```

  **Commit**: YES (groups with 3,4)
  - Message: `feat(content-pipeline): add dedup, provenance export, and stats`
  - Files: `packages/content-pipeline/src/dedup/`, `packages/content-pipeline/src/provenance/`

- [x] 6. Build pack builder — emit drop-in JSON files

  **What to do**:
  - Add `build-pack` command that queries internal SQLite for approved content and outputs JSON files.
  - Output format MUST match the shape of `api/src/party/content/quiplash-prompts.json` for quip-type content.
  - For each game type, output a separate JSON file to `api/src/party/content/generated/{game_type}-prompts.json`.
  - Include provenance summary in a sidecar `CREDITS.md` for attribution.
  - Add `--output-dir` flag (defaults to `api/src/party/content/generated/`).

  **Must NOT do**:
  - Do not modify any existing files in `api/src/party/content/`.
  - Do not require the api Worker to be running.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 7
  - **Blocked By**: 3,4,5

  **References**:
  - `api/src/party/content/quiplash-prompts.json` - THE target output shape. Must match this exactly.
  - `api/scripts/build-games.ts` - file output + manifest pattern.

  **Acceptance Criteria**:
  - [x] `pnpm content -- build-pack --type=quip` outputs JSON to `api/src/party/content/generated/quip-prompts.json`.
  - [x] Output JSON is valid and structurally identical to existing `quiplash-prompts.json`.
  - [x] Only approved items included in output.
  - [x] `CREDITS.md` generated alongside with attribution per source.
  - [x] Existing `quiplash-prompts.json` is untouched.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Pack output matches existing format
    Tool: Bash
    Steps:
      1. Run: pnpm content -- build-pack --type=quip
      2. Compare structure of generated/quip-prompts.json to quiplash-prompts.json
      3. Assert: same top-level shape (array of objects with "text" field)
      4. Assert: CREDITS.md exists alongside
    Expected Result: Drop-in compatible output
    Evidence: .sisyphus/evidence/task-6-pack-output.json

  Scenario: Rejected items excluded from output
    Tool: Bash
    Steps:
      1. Ensure at least one rejected item exists in SQLite
      2. Run build-pack
      3. Assert: rejected item's text not present in output JSON
    Expected Result: Moderation boundary enforced at output
    Evidence: .sisyphus/evidence/task-6-pack-filtered.txt
  ```

  **Commit**: YES
  - Message: `feat(content-pipeline): add pack builder with drop-in JSON output`
  - Files: `packages/content-pipeline/src/pack/`

- [x] 7. End-to-end smoke test

  **What to do**:
  - Run the full pipeline: ingest small batch → generate small batch → moderate → build-pack.
  - Verify output files are valid and match target format.
  - Verify `rm -rf packages/content-pipeline` + `pnpm tsc --noEmit` still passes.
  - Add vitest test suite covering core flows.

  **Must NOT do**:
  - Do not claim completion without evidence artifacts.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: None
  - **Blocked By**: 6

  **References**:
  - All previous task outputs.

  **Acceptance Criteria**:
  - [x] Full pipeline runs without errors.
  - [x] Output JSON files exist and are structurally valid.
  - [x] `pnpm --filter @slopcade/content-pipeline test` passes.
  - [x] Package removal causes zero breakage in rest of monorepo.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Full pipeline smoke test
    Tool: Bash
    Steps:
      1. Run: hush run -- pnpm content -- ingest --source=opentdb --count=10
      2. Run: hush run -- pnpm content -- generate --type=quip --count=10
      3. Run: pnpm content -- moderate
      4. Run: pnpm content -- build-pack --type=quip --type=trivia
      5. Assert: output files exist in api/src/party/content/generated/
      6. Run: pnpm --filter @slopcade/content-pipeline test
      7. Assert: all tests pass
    Expected Result: Pipeline works end-to-end
    Evidence: .sisyphus/evidence/task-7-smoke.txt

  Scenario: Package is fully standalone
    Tool: Bash
    Steps:
      1. mv packages/content-pipeline packages/_content-pipeline
      2. Run: pnpm tsc --noEmit
      3. Assert: exit code 0
      4. mv packages/_content-pipeline packages/content-pipeline
    Expected Result: Zero coupling to rest of repo
    Evidence: .sisyphus/evidence/task-7-isolation.txt
  ```

  **Commit**: YES
  - Message: `test(content-pipeline): add e2e smoke tests and verify isolation`
  - Files: `packages/content-pipeline/src/__tests__/`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `feat(content-pipeline): scaffold standalone package with sources and licensing` | `packages/content-pipeline/`, root `package.json` | type-check + CLI help |
| 3-5 | `feat(content-pipeline): add ingestion, generation, and moderation` | `packages/content-pipeline/src/ingest/`, `generate/`, `moderate/`, `dedup/` | vitest + tsc |
| 6 | `feat(content-pipeline): add pack builder with drop-in JSON output` | `packages/content-pipeline/src/pack/` | output validation |
| 7 | `test(content-pipeline): e2e smoke tests and isolation verification` | `packages/content-pipeline/src/__tests__/` | full test suite |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @slopcade/content-pipeline type-check   # Package compiles
pnpm --filter @slopcade/content-pipeline test          # Tests pass
pnpm tsc --noEmit                                      # No breakage to rest of repo
```

### Final Checklist
- [x] All Must Have requirements are implemented.
- [x] All Must NOT Have guardrails are preserved.
- [x] Package has zero `@slopcade/*` dependencies.
- [x] `rm -rf packages/content-pipeline` causes zero test/build failures elsewhere.
- [x] Output JSON files match existing prompt format shapes.
- [x] All shipped content has provenance + license metadata internally.
- [x] Moderation gates prevent unsafe content from appearing in output files.
