# AI-Ready Game Bundling Master Plan

## TL;DR

The bundler infrastructure (`packages/game-bundler`) is **well-architected and well-tested** (51 tests). The `games/bundled/` directory format (JSON + JS files) is the correct model for AI authoring. What's missing: only 1 bundled game exists, no validate CLI, no JSON schemas for individual files, no AI contract doc, stale code to clean up.

**Goal**: Make `games/bundled/` the primary surface for AI game creation — validate, lint, scaffold, and document it so an AI agent can author complete games from scratch.

**Estimated Effort**: Medium (15-20 focused hours across 3 phases)
**Parallel Execution**: YES (2 waves)
**Critical Path**: Phase 1 (validate + cleanup) → Phase 2 (AI ergonomics) → Phase 3 (polish)

**Supersedes**: This plan builds on top of:
- `.sisyphus/plans/virtual-bundle-system.md` (COMPLETED — FileReader, compiler, scripts, assets)
- `.sisyphus/plans/game-bundle-systematic-plan.md` (PARTIALLY DONE — infrastructure done, migration not done)

---

## Context

### Current Architecture

Two-tier game system, both compiling to the same `GameDefinition`:

```
games/
├── compiled/           # Human-authored TypeScript games (~15 games)
│   ├── tetris/game.ts
│   ├── snake/game.ts
│   ├── pong/game.ts
│   └── ...
├── bundled/            # AI-authored JSON+JS games (1 game: simplePong)
│   └── simplePong/
│       ├── manifest.json
│       ├── constants.json
│       ├── templates/all.json
│       ├── entities/initial.json
│       └── rules/gameplay.json
├── src/
│   ├── index.ts        # Public API
│   └── registry.ts     # Scans compiled/ and bundled/, provides loadGame()
└── scripts/
    ├── build.ts        # Builds all games → dist/ (single JSON per game)
    └── watch.ts        # Watch mode for development

packages/game-bundler/  # The compiler
├── src/
│   ├── compiler.ts     # compileBundle() — dir of files → GameDefinition
│   ├── FileReader.ts   # NodeFileReader (real FS) + VirtualFileReader (in-memory)
│   ├── unified-loader.ts  # detectGameFormat(), loadGameFromPath()
│   ├── ts-compiler.ts  # compileTypeScriptGame(), gameDefinitionToBundleFiles()
│   ├── loader.ts       # loadBundleSync(), isBundleDirectory()
│   └── types.ts        # BundleCompileResult, CompileError, RawBundleData
└── src/__tests__/      # 51 tests, all passing
```

### Data Flow

```
AI Agent writes files    Human writes TypeScript    
        │                         │                 
        ▼                         ▼                 
games/bundled/myGame/    games/compiled/myGame/game.ts
        │                         │                 
        ▼                         ▼                 
  compileBundle()          import game.ts           
        │                         │                 
        └────────┬────────────────┘                 
                 ▼                                  
          GameDefinition                            
                 │                                  
        ┌────────┴────────┐                         
        ▼                 ▼                         
  games/dist/*.json    Game Engine                  
  (API deployment)     (runtime)                    
```

### What's Working Well

| Component | Status | Notes |
|-----------|--------|-------|
| `compileBundle()` | ✅ Solid | Handles constants, scripts, assets, cross-refs, dupes |
| `VirtualFileReader` | ✅ Solid | AI can use in-memory bundles through same pipeline |
| Error messages | ✅ AI-friendly | Structured codes, "did you mean" suggestions |
| Script scanning | ✅ Working | `scripts/*.js` concatenated alphabetically |
| Asset validation | ✅ Working | localPath + remoteUrl dual-mode |
| Test coverage | ✅ 51 tests | FileReader, compiler, scripts, assets, integration |
| Registry | ✅ Working | Scans both compiled/ and bundled/ directories |
| Build pipeline | ✅ Working | Produces dist/ JSON + static-registry.ts for API |

### What's Missing / Broken

| Gap | Impact on AI Workflow | Priority |
|-----|----------------------|----------|
| Only 1 bundled game exists (`simplePong`) | No confidence the format works for real games | HIGH |
| No `validate-bundle` CLI command | AI can't check its work without loading the engine | HIGH |
| No JSON Schemas for individual bundle files | AI can't self-validate before compilation | MEDIUM |
| No "AI contract" reference doc | AI doesn't know valid triggers, actions, behaviors | HIGH |
| `app/scripts/build-bundles.mjs` is stale | Confusing — references old paths, hardcoded for flappyBird | LOW |
| `unified-loader.ts` partially consumed | Registry reimplements scanning instead of using it | LOW |
| No scaffold command | AI has to know file structure from memory | MEDIUM |
| No bundle smoke test against engine | "Compiles" ≠ "runs" | MEDIUM |
| `gameDefinitionToBundleFiles()` is basic | Can't reliably round-trip TS→bundle | MEDIUM |

### User's Mental Model (Confirmed)

> - "Games as a dir of JSONs and JSs" → This IS `games/bundled/`
> - "TS version is just for complex games for my sampling" → This IS `games/compiled/`
> - "AI gen'd games will read/write/lint these JSON dir files" → `compileBundle()` handles this
> - "Bundled doesn't mean one big JSON" → Correct. Source is many files; `dist/` is one file (deployment artifact)

---

## Work Objectives

### Core Objective
Make `games/bundled/` the fully-supported, well-documented, well-validated surface for AI game authoring.

### Deliverables
- `validate-bundle` CLI script (compile + report errors)
- JSON Schema files for manifest, templates, entities, rules
- 3+ bundled reference games (converted from compiled TS games)  
- AI contract reference doc (complete file format + all valid values)
- Cleanup of stale/duplicate code
- Scaffold script for creating new bundled games

### Definition of Done
- [ ] `pnpm validate games/bundled/simplePong` exits 0
- [ ] `pnpm validate games/bundled/pong` exits 0 (newly converted)
- [ ] AI contract doc covers all rule triggers, actions, behaviors, visual types
- [ ] `app/scripts/build-bundles.mjs` deleted
- [ ] 3+ bundled games compile and produce valid GameDefinitions
- [ ] JSON Schemas validate individual bundle files

### Must NOT Have
- No runtime changes — this is authoring infrastructure only
- No migration of ALL compiled games — just convert 3 as reference examples
- No new scripting runtime (QuickJS etc.) — that's a separate plan
- No UGC distribution (signing, hosting, moderation)

---

## Audit of Existing Code

### `packages/game-bundler/` — The Compiler (KEEP AS-IS)

Well-architected. No changes needed except:
- Export `compileBundle` from top-level for easy CLI use ✅ (already exported)
- Consider adding `validateOnly` option that skips GameDefinition construction

**Key files:**
| File | Lines | Purpose | Quality |
|------|-------|---------|---------|
| `compiler.ts` | 781 | Core bundle compilation | Good — handles all file types, validates cross-refs |
| `FileReader.ts` | 163 | FS abstraction | Good — clean interface, VirtualFileReader works |
| `types.ts` | 135 | Error/warning types, RawBundleData | Good — structured, AI-friendly |
| `unified-loader.ts` | 154 | Format detection + multi-format loading | OK — partially used by registry |
| `ts-compiler.ts` | 135 | TS compilation + bundle decomposition | OK — `gameDefinitionToBundleFiles()` is basic |
| `loader.ts` | 93 | High-level bundle loading with metadata | Good |

### `games/src/registry.ts` — The Registry (MINOR CLEANUP)

Currently reimplements directory scanning that `unified-loader.ts` already provides. Could be simplified but not blocking.

### `games/scripts/build.ts` — The Build Script (KEEP)

Works correctly. Iterates all games, loads them, writes to `dist/`. Used by CI.

### `app/scripts/build-bundles.mjs` — STALE (DELETE)

- References `app/lib/test-games/games` (old path — games moved to `games/`)
- Hardcoded for flappyBird template splitting (pipes, bird, environment)
- Superseded by `packages/game-bundler/` and `games/scripts/build.ts`
- **Action: Delete this file**

### `games/bundled/simplePong/` — The Reference Game (KEEP + ADD MORE)

The only bundled game. Structure is correct and compiles cleanly. Need more examples.

---

## Execution Plan

### Phase 1: Validate & Clean (Can start immediately)

#### Task 1: Create `validate-bundle` CLI script

**What to do:**
- Create `games/scripts/validate.ts` 
- Accepts a game ID or path: `pnpm validate simplePong` or `pnpm validate games/bundled/simplePong`
- Calls `compileBundle()`, prints structured errors/warnings with colors
- Exits with code 0 (success) or 1 (errors)
- Add `"validate": "tsx scripts/validate.ts"` to `games/package.json`

**Why it matters:**
AI needs a single command to check its work. Currently the only way to validate is to load the game into the full engine.

**Acceptance Criteria:**
- `pnpm validate simplePong` exits 0 with "✓ simplePong compiled successfully"
- `pnpm validate nonexistent` exits 1 with clear error
- Prints warnings (unused constants, etc.) without failing

**Agent Profile:** `quick` + `[]`
**Effort:** ~1 hour

---

#### Task 2: Delete stale `app/scripts/build-bundles.mjs`

**What to do:**
- Delete `app/scripts/build-bundles.mjs`
- Remove any references to it in package.json scripts
- Verify nothing imports or depends on it

**Why it matters:**
It's confusing — looks like a build script but references old paths and is flappyBird-specific.

**Acceptance Criteria:**
- File deleted
- No broken package.json references
- `pnpm build` still works

**Agent Profile:** `quick` + `[]`
**Effort:** ~15 minutes

---

#### Task 3: Convert 3 compiled games to bundled format

**What to do:**
- Pick 3 games of varying complexity:
  - `pong` — simple, no scripts, basic collision rules
  - `breakoutBouncer` — medium, more entities, visual variety
  - `flappyBird` — complex, scripts, spawning patterns
- For each: run `compileTypeScriptGame()` → `gameDefinitionToBundleFiles()` → write to `games/bundled/{id}/`
- Then manually improve the output:
  - Extract meaningful constants (dimensions, speeds, colors)
  - Split templates into logical files (not just `all.json`)
  - Add `{ const: "..." }` references where appropriate
  - Verify with `compileBundle()` that the result matches the original
- Scripts: For flappyBird, extract script code into `scripts/game.js`

**Why it matters:**
- Proves the bundled format works for real games (not just simplePong)
- Creates reference examples for AI to learn from
- Validates the round-trip path

**Acceptance Criteria:**
- `games/bundled/pong/` compiles to equivalent GameDefinition as `games/compiled/pong/game.ts`
- `games/bundled/breakoutBouncer/` compiles to equivalent GameDefinition
- `games/bundled/flappyBird/` compiles to equivalent GameDefinition (including scripts)
- All 3 pass validation: `pnpm validate pong && pnpm validate breakoutBouncer && pnpm validate flappyBird`

**Agent Profile:** `unspecified-high` + `[]`
**Effort:** ~4-6 hours

---

### Phase 2: AI Ergonomics (After Phase 1)

#### Task 4: Create JSON Schemas for bundle files

**What to do:**
- Create `packages/game-bundler/schemas/`:
  - `manifest.schema.json` — validates manifest.json structure
  - `template.schema.json` — validates a single template or array of templates
  - `entity.schema.json` — validates entity instances
  - `rule.schema.json` — validates rules (trigger types, action types)
  - `constants.schema.json` — validates constants (flat key-value)
  - `assets.schema.json` — validates asset manifest
- Derive schemas from existing TypeScript types and the `compileBundle()` validation logic
- Schemas should be usable by AI for pre-validation before compilation
- Add `$schema` references to bundled game files for editor support

**Why it matters:**
AI can validate individual files before calling compileBundle(). Faster feedback loop.

**Acceptance Criteria:**
- All bundled game files pass their corresponding JSON Schema
- Schemas cover required/optional fields, types, enum values
- Invalid files fail with useful error messages

**Agent Profile:** `unspecified-high` + `[]`
**Effort:** ~3-4 hours

---

#### Task 5: Write AI contract reference doc

**What to do:**
- Create `docs/game-maker/reference/ai-game-authoring.md`
- Single comprehensive doc covering:
  - Bundle directory structure (required vs optional files)
  - `manifest.json` — all fields, valid values for world/background/camera/ui
  - `constants.json` — naming conventions, how `{ const: "..." }` works
  - `templates/` — full template structure: physics, visual, behaviors, colliders
  - `entities/` — entity instances, transform, template references
  - `rules/` — ALL trigger types, ALL action types, with examples
  - `scripts/` — the `exports.hookName` pattern, available hooks, ScriptContext API
  - `assets.json` — localPath vs remoteUrl, asset types
  - Common patterns — "how to make a paddle game", "how to make a platformer"
  - Error reference — what each CompileErrorCode means and how to fix it
- Pull from existing sources:
  - `games/src/script-types.ts` — ScriptContext interface
  - `packages/game-bundler/src/types.ts` — error codes
  - `docs/game-maker/reference/bundle-system.md` — existing (basic) docs
  - `games/bundled/simplePong/` — working example

**Why it matters:**
This is THE document an AI agent reads to know how to make a game. Without it, AI has to reverse-engineer the format from tests and source code.

**Acceptance Criteria:**
- Doc covers every valid trigger type and action type
- Doc covers every valid behavior type
- Doc covers every valid visual type
- Doc includes at least 2 complete game examples (pong, breakout)
- An AI agent reading only this doc can produce a valid bundled game

**Agent Profile:** `writing` + `[]`
**Effort:** ~4-5 hours

---

#### Task 6: Create scaffold command

**What to do:**
- Create `games/scripts/scaffold.ts`
- Usage: `pnpm scaffold my-game` or `pnpm scaffold my-game --template=breakout`
- Creates `games/bundled/my-game/` with:
  - `manifest.json` — minimal valid manifest with game name
  - `constants.json` — empty `{}`
  - `templates/all.json` — empty `[]`
  - `entities/initial.json` — empty `[]`
  - `rules/gameplay.json` — empty `[]`
- Optional `--template` flag copies from a bundled reference game
- Add `"scaffold": "tsx scripts/scaffold.ts"` to `games/package.json`

**Why it matters:**
AI needs to know the minimal file set. A scaffold command removes guesswork.

**Acceptance Criteria:**
- `pnpm scaffold test-game` creates valid directory
- `pnpm validate test-game` passes on scaffolded game
- `pnpm scaffold test-game --template=simplePong` copies simplePong structure

**Agent Profile:** `quick` + `[]`
**Effort:** ~1 hour

---

### Phase 3: Pipeline Polish (After Phase 2)

#### Task 7: Simplify registry to use unified-loader

**What to do:**
- Refactor `games/src/registry.ts` to use `scanGamesDirectory()` and `loadGameFromPath()` from unified-loader
- Remove duplicate scanning logic in `scanCompiledGames()` and `scanBundledGames()`
- Keep the same public API (getGameIds, loadGame, etc.)

**Why it matters:**
Reduces code duplication. unified-loader is tested but underused.

**Acceptance Criteria:**
- `loadGame()` returns identical results before and after refactor
- Existing tests still pass
- Less code in registry.ts

**Agent Profile:** `quick` + `[]`
**Effort:** ~1-2 hours

---

#### Task 8: Improve `gameDefinitionToBundleFiles()` round-trip

**What to do:**
- Current implementation in `ts-compiler.ts` is basic — doesn't extract constants, puts everything in `all.json`
- Enhance to:
  - Extract repeated numeric values as constants
  - Split templates by tag category (player, enemy, environment)
  - Preserve script content as `scripts/game.js`
  - Handle `variables`, `background`, `camera`, `ui` in manifest
- Add tests for round-trip: `TS → bundle files → compileBundle() → GameDefinition` should match

**Why it matters:**
Enables automated conversion of all compiled games to bundled format. Useful for AI training data.

**Acceptance Criteria:**
- Round-trip produces equivalent GameDefinition (ignoring ordering)
- Constants are extracted for values used 2+ times
- Scripts are properly split out

**Agent Profile:** `unspecified-high` + `[]`
**Effort:** ~3-4 hours

---

#### Task 9: Bundle-level smoke test with game engine

**What to do:**
- Create `games/scripts/smoke-test.ts`
- For each bundled game:
  - Compile with `compileBundle()`
  - Feed to engine validation (schema check, entity resolution)
  - Optionally: load in headless game-inspector and step a few frames
- Add to CI: `pnpm smoke-test`

**Why it matters:**
"Compiles" ≠ "runs". An AI-authored game might compile but crash the engine.

**Acceptance Criteria:**
- All bundled games pass smoke test
- Catches issues like: missing required fields, invalid physics config, etc.
- Runs in CI

**Agent Profile:** `unspecified-high` + `[]`
**Effort:** ~3-4 hours

---

## Dependency Matrix

| Task | Depends On | Blocks | Parallel Group |
|------|------------|--------|----------------|
| 1. validate CLI | None | 3, 6 | Wave 1 |
| 2. Delete stale script | None | None | Wave 1 |
| 3. Convert 3 games | 1 | 4, 5 | Wave 1 (after Task 1) |
| 4. JSON Schemas | 3 | None | Wave 2 |
| 5. AI contract doc | 3 | None | Wave 2 |
| 6. Scaffold command | 1 | None | Wave 2 |
| 7. Simplify registry | None | None | Wave 2 |
| 8. Improve round-trip | 3 | None | Wave 2 |
| 9. Smoke test | 3 | None | Wave 2 |

### Parallel Execution

```
Wave 1 (Start immediately):
├── Task 1: validate-bundle CLI
├── Task 2: Delete stale build-bundles.mjs
└── Task 3: Convert 3 compiled games → bundled (after Task 1 done)

Wave 2 (After Wave 1):
├── Task 4: JSON Schemas
├── Task 5: AI contract doc
├── Task 6: Scaffold command
├── Task 7: Simplify registry
├── Task 8: Improve round-trip
└── Task 9: Smoke test
```

---

## Success Criteria

- [ ] An AI agent can create a new game by:
  1. `pnpm scaffold my-game`
  2. Edit the JSON/JS files
  3. `pnpm validate my-game` → see structured errors
  4. Fix errors based on error messages
  5. Game loads in engine

- [ ] 4+ bundled games exist and compile cleanly (simplePong + 3 converted)
- [ ] AI contract doc is the single source of truth for game authoring
- [ ] Stale code deleted, no duplicate scanning logic
- [ ] All changes are additive — compiled TS games continue working unchanged
