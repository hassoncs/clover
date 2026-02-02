# Game Engine Architecture Cleanup

## TL;DR

> **Quick Summary**: Comprehensive cleanup to remove architectural debt - merge rules systems, genericize score/lives variables, clean up GameRuntime, standardize on events. End state: clean, tested, no legacy code paths.
> 
> **Deliverables**:
> - Unified `RulesSystem` class (merging RulesEvaluator + RulesRuntimeSystem)
> - Generic variable system (no special score/lives treatment)
> - Clean, split GameRuntime components
> - Event-based Match3 (no callbacks)
> - All test games migrated or archived
> 
> **Estimated Effort**: Large (6 phases, ~20-25 hours total)
> **Parallel Execution**: YES - Phase 3 can parallelize game migrations
> **Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

---

## Context

### Original Request
Complete architectural cleanup of the game engine based on the comprehensive audit in:
- `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md`
- `docs/game-maker/architecture/RULES-ARCHITECTURE-SIMPLIFICATION.md`
- `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md`

### Interview Summary
**Key Decisions**:
- Delete slot machine code entirely (was just an experiment)
- Merge RulesEvaluator + RulesRuntimeSystem → unified RulesSystem
- Remove ALL special treatment for score/lives (breaking change OK)
- Update Match3 to events (remove callbacks)
- Clean up and split GameRuntime (finalize architecture FIRST)
- Test everything important (TDD approach)
- Delete games that don't migrate easily (don't waste time)

**Research Findings**:
- Test infrastructure: Vitest, excellent RulesEvaluator tests (1,423 lines)
- GameRuntime: ZERO tests, 30+ TypeScript errors, 62KB file
- Current state: Broken due to incomplete prior refactoring

### Metis Review
**Identified Gaps** (addressed in plan):
- GameRuntime split boundaries need explicit definition → Phase 5 defines extraction steps
- Time boxes per task → All phases have time estimates
- Test strategy → TDD approach, tests before refactoring
- Order of operations → Six sequential phases with dependencies

---

## Work Objectives

### Core Objective
Transform the game engine from current broken state with architectural debt into a clean, well-tested system with unified patterns and no legacy code paths.

### Concrete Deliverables
- `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` - New unified rules system
- Updated `GameDefinition` interface - No special score/lives fields
- Updated `UIConfig` - Using `variableDisplays` only
- Split GameRuntime components - Clean separation of concerns
- All test games migrated or archived

### Definition of Done
- [ ] `pnpm tsc --noEmit` - Zero TypeScript errors
- [ ] `pnpm test` - All existing tests pass
- [ ] `ast_grep_search "game.rulesEvaluator"` - Zero results
- [ ] `ast_grep_search "getRulesEvaluator"` - Zero results (outside RulesSystem)
- [ ] `ast_grep_search "scoreChanged|livesChanged"` - Zero results
- [ ] `ast_grep_search "initialScore|initialLives"` - Zero results
- [ ] At least 3 different game types run successfully (ballSort, breakout, candyCrush)

### Must Have
- Single `RulesSystem` class (no RulesEvaluator + RulesRuntimeSystem split)
- Generic variables only (no special score/lives treatment)
- Event-based communication (no callbacks)
- Clean GameRuntime (< 1000 lines, no dead code)
- All games work or are archived

### Must NOT Have (Guardrails)
- ❌ Don't change rule evaluation LOGIC - only structural changes
- ❌ Don't add new features - this is cleanup only
- ❌ Don't exceed time boxes - archive games rather than perfect migration
- ❌ Don't use `any` type suppressions
- ❌ Don't break existing tests at any step
- ❌ Don't remove `gameState` or `elapsed` reserved variables (system internals)
- ❌ Don't rewrite GameRuntime from scratch - incremental refactor only

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: TDD where possible
- **Framework**: Vitest (already configured)

### Testing Approach
1. **Before any refactoring**: Ensure existing tests pass
2. **During refactoring**: Run tests after each task
3. **After completion**: Full test suite + manual verification

### Test Commands
```bash
# Unit tests
pnpm test -- app/lib/game-engine/__tests__/RulesEvaluator.test.ts
pnpm test -- app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts

# Full suite
pnpm test

# TypeScript validation
pnpm tsc --noEmit
```

### Manual Verification (Per Game)
- [ ] Game loads without errors
- [ ] Win condition triggers correctly
- [ ] Score/lives/variables display correctly
- [ ] No console errors

---

## Execution Strategy

### Parallel Execution Waves

```
Phase 1 (Start Immediately): PREPARATION
├── Task 1.1: Delete slot machine code
├── Task 1.2: Fix TypeScript errors in GameRuntime
└── Task 1.3: Baseline test verification

Phase 2 (After Phase 1): RULES SYSTEM MERGE
├── Task 2.1: Create unified RulesSystem
├── Task 2.2: Update all imports/usages
└── Task 2.3: Delete old files

Phase 3 (After Phase 2): SCORE/LIVES GENERICIZATION
├── Task 3.1: Remove special event types
├── Task 3.2: Remove special UI config
├── Task 3.3: Remove special actions/triggers
├── Task 3.4: Migrate games (parallel)
└── Task 3.5: Clean up type definitions

Phase 4 (After Phase 3): EVENT ARCHITECTURE
├── Task 4.1: Migrate Match3 to events
└── Task 4.2: Extract event subscription helper

Phase 5 (After Phase 4): GAMERUNTIME CLEANUP
├── Task 5.1: Remove dead code
├── Task 5.2: Extract GameLoopController
├── Task 5.3: Extract GameEventSubscriber
└── Task 5.4: Clean up remaining GameRuntime

Phase 6 (After Phase 5): VALIDATION
├── Task 6.1: Run all verification commands
├── Task 6.2: Manual game testing
└── Task 6.3: Final documentation update
```

### Dependency Matrix

| Task | Depends On | Blocks | Time Estimate |
|------|------------|--------|---------------|
| 1.1 | None | 1.2, 1.3 | 1 hour |
| 1.2 | 1.1 | 2.1 | 2 hours |
| 1.3 | 1.2 | 2.1 | 30 min |
| 2.1 | 1.3 | 2.2 | 3 hours |
| 2.2 | 2.1 | 2.3 | 1 hour |
| 2.3 | 2.2 | 3.1 | 30 min |
| 3.1-3.5 | 2.3 | 4.1 | 6 hours |
| 4.1 | 3.5 | 4.2 | 2 hours |
| 4.2 | 4.1 | 5.1 | 1 hour |
| 5.1-5.4 | 4.2 | 6.1 | 4 hours |
| 6.1-6.3 | 5.4 | None | 2 hours |

---

## TODOs

---

### PHASE 1: PREPARATION (~3.5 hours)

---

- [x] 1.1. Delete Slot Machine Code

  **What to do**:
  - Search for all slot machine related code using `ast_grep_search`
  - Delete slot machine type definitions from `shared/src/types/`
  - Delete slot machine system files from `app/lib/game-engine/systems/`
  - Remove slot machine imports from GameRuntime.godot.tsx
  - Remove slot machine logic from GameRuntime.godot.tsx (lines 497-583 area)

  **Must NOT do**:
  - Don't touch unrelated game systems
  - Don't change any other game logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion and removal of specific code blocks
  - **Skills**: [`git-master`]
    - `git-master`: Clean commits for deletion work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with nothing - first task)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 1.2, 1.3
  - **Blocked By**: None

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:74` - Import to remove: `'./systems/slotMachine'`
  - `app/lib/game-engine/GameRuntime.godot.tsx:106` - SlotMachineRuntimeSystem import
  - `app/lib/game-engine/GameRuntime.godot.tsx:497-583` - Slot machine logic to delete
  - Search pattern: `ast_grep_search "slotMachine" --lang typescript`

  **Acceptance Criteria**:
  - [ ] `rg "slotMachine" --type ts` → Zero results
  - [ ] `rg "SlotMachine" --type ts` → Zero results (except test archives if any)
  - [ ] `pnpm tsc --noEmit` → Fewer errors than before (slot machine errors gone)

  **Commit**: YES
  - Message: `chore(game-engine): delete experimental slot machine code`
  - Files: All files with slot machine references

---

- [x] 1.2. Fix TypeScript Errors in GameRuntime

  **What to do**:
  - Fix all remaining TypeScript errors in `GameRuntime.godot.tsx`
  - Remove/fix `game.rulesEvaluator` references (these are broken)
  - Fix implicit `any` types
  - Fix missing property errors on WinCondition

  **Must NOT do**:
  - Don't add `@ts-ignore` or `as any`
  - Don't change rule evaluation logic
  - Don't refactor architecture yet - just fix types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type fixing is mechanical work
  - **Skills**: []
    - No special skills needed - standard TypeScript work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 1.1
  - **Blocks**: Task 1.3
  - **Blocked By**: Task 1.1

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Main file with errors
  - `app/lib/game-engine/GameLoader.ts:11-19` - LoadedGame interface
  - `shared/src/types/rules.ts` - WinCondition type definition
  - LSP diagnostics showed: 30+ errors including Property 'rulesEvaluator' does not exist on type 'LoadedGame'

  **Acceptance Criteria**:
  - [ ] `pnpm tsc --noEmit` → Zero errors in GameRuntime.godot.tsx
  - [ ] No `@ts-ignore` or `as any` added
  - [ ] All `game.rulesEvaluator` references removed or properly typed

  **Commit**: YES
  - Message: `fix(game-engine): resolve TypeScript errors in GameRuntime`
  - Files: `app/lib/game-engine/GameRuntime.godot.tsx`

---

- [x] 1.3. Baseline Test Verification

  **What to do**:
  - Run full test suite to establish baseline
  - Document any pre-existing test failures
  - Ensure RulesEvaluator tests pass (these are critical for Phase 2)
  - Ensure ballSort tests pass (integration test baseline)

  **Must NOT do**:
  - Don't fix unrelated test failures - just document them
  - Don't skip or disable tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running tests and documenting results
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: Ensure proper baseline documentation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 1.2
  - **Blocks**: Task 2.1
  - **Blocked By**: Task 1.2

  **References**:
  - `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` - Critical tests (1,423 lines)
  - `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts` - Integration tests
  - `app/vitest.config.mjs` - Test configuration

  **Acceptance Criteria**:
  - [ ] `pnpm test -- app/lib/game-engine/__tests__/RulesEvaluator.test.ts` → PASS
  - [ ] `pnpm test -- app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts` → PASS
  - [ ] Document any failures in `.sisyphus/notes/baseline-test-failures.md`

  **Commit**: NO (documentation only)

---

### PHASE 2: RULES SYSTEM MERGE (~4.5 hours)

---

- [x] 2.1. Create Unified RulesSystem Class

  **What to do**:
  - Create new `RulesSystem.ts` by merging RulesRuntimeSystem + RulesEvaluator
  - Implement `RuntimeSystem` interface
  - Implement `IGameStateMutator` interface
  - Move all rule evaluation logic from RulesEvaluator into RulesSystem
  - Move all lifecycle management from RulesRuntimeSystem into RulesSystem
  - Follow the code structure from RULES-ARCHITECTURE-SIMPLIFICATION.md

  **Must NOT do**:
  - Don't change rule evaluation logic - only structure
  - Don't add new features
  - Don't change the public API surface (methods should work the same)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Significant code merge requiring careful attention to detail
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Ensure tests continue passing during merge

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 1.3
  - **Blocks**: Task 2.2
  - **Blocked By**: Task 1.3

  **References**:
  - `docs/game-maker/architecture/RULES-ARCHITECTURE-SIMPLIFICATION.md` - Full merge guide with code examples
  - `app/lib/game-engine/RulesEvaluator.ts` - Source of rules logic (581 lines)
  - `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts` - Source of lifecycle (226 lines)
  - `app/lib/game-engine/rules/types.ts:IGameStateMutator` - Interface to implement
  - `app/lib/game-engine/systems/runner/types.ts:RuntimeSystem` - Interface to implement

  **Acceptance Criteria**:
  - [ ] New file exists: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
  - [ ] File implements both `RuntimeSystem` and `IGameStateMutator` interfaces
  - [ ] All methods from RulesEvaluator are available on RulesSystem
  - [ ] No `getRulesEvaluator()` method (direct access now)
  - [ ] `pnpm tsc --noEmit` → Zero errors

  **Commit**: YES
  - Message: `feat(game-engine): create unified RulesSystem merging evaluator and runtime`
  - Files: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`

---

- [x] 2.2. Update All Imports and Usages

  **What to do**:
  - Find all imports of `RulesRuntimeSystem` → change to `RulesSystem`
  - Find all imports of `RulesEvaluator` → change to `RulesSystem` (or remove if internal)
  - Update `GameRuntime.godot.tsx` to use `RulesSystem`
  - Update tests to use `RulesSystem` instead of `RulesEvaluator`
  - Remove all `getRulesEvaluator()` calls - use RulesSystem directly

  **Must NOT do**:
  - Don't change test assertions - only imports
  - Don't skip any usages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical find/replace with LSP verification
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commits for import updates

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 2.1
  - **Blocks**: Task 2.3
  - **Blocked By**: Task 2.1

  **References**:
  - `lsp_find_references` on `RulesRuntimeSystem` - Find all usages
  - `lsp_find_references` on `RulesEvaluator` - Find all usages
  - `app/lib/game-engine/GameRuntime.godot.tsx:805` - Main usage point
  - `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` - Tests to update
  - `app/lib/scripting/GameScriptAPI.ts` - Scripting API usage

  **Acceptance Criteria**:
  - [ ] `rg "RulesRuntimeSystem" --type ts` → Zero results (except old files pending deletion)
  - [ ] `rg "from.*RulesEvaluator" --type ts` → Zero results (except old files)
  - [ ] `rg "getRulesEvaluator" --type ts` → Zero results
  - [ ] `pnpm test -- app/lib/game-engine/__tests__/RulesEvaluator.test.ts` → PASS (renamed test file)

  **Commit**: YES
  - Message: `refactor(game-engine): update all imports to use unified RulesSystem`
  - Files: All files that imported RulesRuntimeSystem or RulesEvaluator

---

- [x] 2.3. Delete Old Rules Files

  **What to do**:
  - Delete `app/lib/game-engine/RulesEvaluator.ts`
  - Delete `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts`
  - Update any barrel exports (index.ts files)
  - Verify no broken imports

  **Must NOT do**:
  - Don't delete test files - rename them for RulesSystem

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file deletion
  - **Skills**: [`git-master`]
    - `git-master`: Clean deletion commits

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 2.2
  - **Blocks**: Task 3.1
  - **Blocked By**: Task 2.2

  **References**:
  - `app/lib/game-engine/RulesEvaluator.ts` - Delete this
  - `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts` - Delete this
  - `app/lib/game-engine/systems/runner/wrappers/index.ts` - Update exports

  **Acceptance Criteria**:
  - [ ] Files deleted: `RulesEvaluator.ts`, `RulesRuntimeSystem.ts`
  - [ ] `pnpm tsc --noEmit` → Zero errors
  - [ ] `pnpm test` → All tests pass

  **Commit**: YES
  - Message: `chore(game-engine): delete old RulesEvaluator and RulesRuntimeSystem`
  - Files: Deleted files

---

### PHASE 3: SCORE/LIVES GENERICIZATION (~6 hours)

---

- [x] 3.1. Remove Special Event Types

  **What to do**:
  - Remove `scoreChanged` and `livesChanged` from `GameEventType` union
  - Remove special event emission in `GameStateHelpers.setVar()`
  - Update `GameRuntime.godot.tsx` event subscriptions to only use `varChanged`
  - Keep `gameStateChanged` (this is a system event, not user variable)

  **Must NOT do**:
  - Don't remove `gameStateChanged` event
  - Don't break existing event subscriptions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type definition changes and event handler updates
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 2.3
  - **Blocks**: Tasks 3.2, 3.3
  - **Blocked By**: Task 2.3

  **References**:
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:129-174` - Event migration guide
  - `app/lib/game-engine/runtime/types.ts:63-68` - GameEventType definition
  - `app/lib/game-engine/runtime/GameStateHelpers.ts:91-107` - setVar with special events
  - `app/lib/game-engine/GameRuntime.godot.tsx:596-623` - Event subscriptions

  **Acceptance Criteria**:
  - [ ] `rg "scoreChanged|livesChanged" --type ts` → Zero results
  - [ ] `varChanged` events still work for score and lives changes
  - [ ] `pnpm test` → All tests pass

  **Commit**: YES
  - Message: `refactor(game-engine): remove special scoreChanged/livesChanged events`
  - Files: `runtime/types.ts`, `GameStateHelpers.ts`, `GameRuntime.godot.tsx`

---

- [x] 3.2. Remove Special UI Config

  **What to do**:
  - Remove `showScore`, `showLives`, `livesLabel`, `scorePosition` from UIConfig
  - Remove hardcoded score/lives display in GameRuntime.godot.tsx
  - Update all game definitions to use `variableDisplays` instead
  - Keep `showTimer` (derived from system `elapsed` variable)

  **Must NOT do**:
  - Don't remove `showTimer` (system variable)
  - Don't break games before migrating their definitions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Multiple file updates across types and game definitions
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 3.3)
  - **Parallel Group**: Wave after 3.1
  - **Blocks**: Task 3.4
  - **Blocked By**: Task 3.1

  **References**:
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:36-88` - UIConfig migration
  - `shared/src/types/GameDefinition.ts:103-112` - UIConfig interface
  - `app/lib/game-engine/GameRuntime.godot.tsx:1818-1830` - Hardcoded score/lives display
  - `app/lib/game-engine/GameRuntime.godot.tsx:1847-1867` - variableDisplays pattern (correct)

  **Acceptance Criteria**:
  - [ ] `rg "showScore|showLives|livesLabel|scorePosition" --type ts` → Zero results in source
  - [ ] All games use `variableDisplays` for score/lives display
  - [ ] Score and lives still display correctly in migrated games

  **Commit**: YES
  - Message: `refactor(game-engine): remove special UI config for score/lives`
  - Files: `GameDefinition.ts`, `GameRuntime.godot.tsx`, game definition files

---

- [x] 3.3. Remove Special Actions, Triggers, and Conditions

  **What to do**:
  - Remove `ScoreAction` and `LivesAction` types
  - Remove `ScoreTrigger` type
  - Remove `ScoreCondition` type
  - Remove `score_below` and `lives_zero` from `LoseConditionType`
  - Delete `ScoreActionExecutor.ts`
  - Remove score/lives cases from evaluators
  - Update games to use `set_variable` action and `expression` conditions

  **Must NOT do**:
  - Don't change working expression-based conditions
  - Don't break games before migrating their rules

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple type deletions and evaluator updates
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 3.2)
  - **Parallel Group**: Wave after 3.1
  - **Blocks**: Task 3.4
  - **Blocked By**: Task 3.1

  **References**:
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:263-437` - Actions/triggers migration
  - `shared/src/types/rules.ts:55-59` - ScoreTrigger definition
  - `shared/src/types/rules.ts:129-133` - ScoreCondition definition
  - `shared/src/types/rules.ts:343-359` - ScoreAction and LivesAction
  - `app/lib/game-engine/rules/actions/ScoreActionExecutor.ts` - Delete this file
  - `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts` - Remove score case
  - `app/lib/game-engine/rules/conditions/LogicConditionEvaluator.ts` - Remove score case

  **Acceptance Criteria**:
  - [ ] `rg "type: 'score'|type: 'lives'" --type ts` → Zero results in rules
  - [ ] `rg "score_below|lives_zero" --type ts` → Zero results
  - [ ] `ScoreActionExecutor.ts` deleted
  - [ ] All games use `set_variable` and `expression` patterns
  - [ ] `pnpm test` → All tests pass

  **Commit**: YES
  - Message: `refactor(game-engine): remove special score/lives actions, triggers, conditions`
  - Files: `shared/src/types/rules.ts`, evaluator files, executor files

---

- [x] 3.4. Migrate Game Definitions

  **What to do**:
  - Audit all games in `app/lib/test-games/games/`
  - Migrate `initialScore` → `variables: { score: N }`
  - Migrate `initialLives` → `variables: { lives: N }`
  - Migrate `showScore`/`showLives` → `variableDisplays`
  - Migrate score/lives actions → `set_variable` actions
  - Migrate score/lives lose conditions → expression conditions
  - Archive (move to `archive/` folder) any games that take >30 min

  **Must NOT do**:
  - Don't spend >30 min per game
  - Don't delete games - archive them instead
  - Don't change game logic/behavior - only syntax

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Repetitive migration work, can be parallelized
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (individual game migrations)
  - **Parallel Group**: After 3.2 and 3.3
  - **Blocks**: Task 3.5
  - **Blocked By**: Tasks 3.2, 3.3

  **References**:
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:736-820` - Example migration (Pinball)
  - `app/lib/test-games/games/` - All game definition files
  - `app/lib/test-games/games/ballSort/game.ts` - Has tests, migrate carefully
  - `app/lib/test-games/games/breakout/game.ts` - Common pattern
  - `app/lib/test-games/games/candyCrush/game.ts` - Match3 pattern

  **Acceptance Criteria**:
  - [ ] `rg "initialScore|initialLives" --type ts` → Zero results (except archive)
  - [ ] All migrated games load and run without errors
  - [ ] Games that couldn't migrate are in `app/lib/test-games/archive/`
  - [ ] At least ballSort, one breakout, one match3 are migrated

  **Commit**: YES
  - Message: `refactor(test-games): migrate game definitions to generic variables`
  - Files: All game definition files in `test-games/games/`

---

- [x] 3.5. Clean Up Type Definitions

  **What to do**:
  - Remove `SCORE` and `LIVES` from `RESERVED_VARS`
  - Delete `getScore`, `setScore`, `addScore`, `getLives`, `setLives`, `addLives` from GameStateHelpers
  - Remove `score` and `lives` fields from `EvalContext`
  - Remove `score` and `lives` fields from `RuleContext`
  - Remove score/lives methods from `IGameStateMutator`
  - Update RulesSystem to not pass score/lives separately to evalContext

  **Must NOT do**:
  - Don't remove `gameState` or `elapsed` from RESERVED_VARS
  - Don't break expression evaluation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Type definition cleanup across multiple files
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 3.4
  - **Blocks**: Task 4.1
  - **Blocked By**: Task 3.4

  **References**:
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:654-732` - Cleanup checklist
  - `app/lib/game-engine/runtime/types.ts` - RESERVED_VARS
  - `app/lib/game-engine/runtime/GameStateHelpers.ts` - Helper functions to delete
  - `shared/src/expressions/types.ts` - EvalContext definition
  - `app/lib/game-engine/rules/types.ts` - RuleContext and IGameStateMutator

  **Acceptance Criteria**:
  - [ ] `rg "RESERVED_VARS\.(SCORE|LIVES)" --type ts` → Zero results
  - [ ] `rg "getScore|setScore|getLives|setLives|addScore|addLives" --type ts` → Zero results
  - [ ] Variables accessed via `evalContext.variables['score']` pattern
  - [ ] `pnpm test` → All tests pass

  **Commit**: YES
  - Message: `refactor(game-engine): remove score/lives from reserved vars and type definitions`
  - Files: Type definition files, GameStateHelpers.ts, RulesSystem.ts

---

### PHASE 4: EVENT ARCHITECTURE (~3 hours)

---

- [x] 4.1. Migrate Match3 to Event-Based Communication

  **What to do**:
  - Remove callback infrastructure from `Match3GameSystem`
  - Add `GameEventBus` dependency to Match3GameSystem
  - Replace callback calls with event emissions
  - Update Match3GameSystem instantiation in GameRuntime

  **Must NOT do**:
  - Don't change Match3 game logic
  - Don't break existing Match3 games

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Contained refactoring of one system
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 3.5
  - **Blocks**: Task 4.2
  - **Blocked By**: Task 3.5

  **References**:
  - `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md:520-542` - Match3 migration
  - `app/lib/game-engine/match3/Match3GameSystem.ts:91-93` - Current callbacks
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Match3 instantiation
  - `app/lib/test-games/games/candyCrush/game.ts` - Test game for verification

  **Acceptance Criteria**:
  - [ ] `rg "Match3Callbacks" --type ts` → Zero results
  - [ ] `rg "onScoreAdd" --type ts` → Zero results (in Match3 context)
  - [ ] candyCrush/gemCrush games work correctly
  - [ ] Score updates happen via event bus

  **Commit**: YES
  - Message: `refactor(game-engine): migrate Match3GameSystem to event-based communication`
  - Files: `Match3GameSystem.ts`, `GameRuntime.godot.tsx`

---

- [x] 4.2. Extract Event Subscription Helper

  **What to do**:
  - Create `app/lib/game-engine/runtime/GameEventSubscriber.ts`
  - Extract event subscription logic from GameRuntime (lines 596-623)
  - Create `subscribeToGameEvents()` helper function
  - Replace duplicated subscription code (lines 596-623 and 1498-1520)
  - Update GameRuntime to use the helper

  **Must NOT do**:
  - Don't change event handling behavior
  - Don't break existing event subscriptions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple extraction refactoring
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 4.1
  - **Blocks**: Task 5.1
  - **Blocked By**: Task 4.1

  **References**:
  - `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md:546-589` - Helper design
  - `app/lib/game-engine/GameRuntime.godot.tsx:596-623` - First subscription
  - `app/lib/game-engine/GameRuntime.godot.tsx:1498-1520` - Duplicate subscription (restart)

  **Acceptance Criteria**:
  - [ ] New file: `app/lib/game-engine/runtime/GameEventSubscriber.ts`
  - [ ] `subscribeToGameEvents()` function exported
  - [ ] No duplicated event subscription code in GameRuntime
  - [ ] All event handling works as before

  **Commit**: YES
  - Message: `refactor(game-engine): extract event subscription helper (DRY)`
  - Files: `GameEventSubscriber.ts`, `GameRuntime.godot.tsx`

---

### PHASE 5: GAMERUNTIME CLEANUP (~4 hours)

---

- [x] 5.1. Remove Dead Code from GameRuntime

  **What to do**:
  - Remove any remaining slot machine references
  - Remove any broken/unused code paths
  - Remove commented-out code
  - Remove unused imports
  - Fix any remaining TypeScript errors

  **Must NOT do**:
  - Don't remove working features
  - Don't change game behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Code cleanup and removal
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 4.2
  - **Blocks**: Tasks 5.2, 5.3
  - **Blocked By**: Task 4.2

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Target file
  - Current file is ~1,950 lines, target is <1,000 lines after all cleanup

  **Acceptance Criteria**:
  - [ ] No commented-out code blocks
  - [ ] No unused imports
  - [ ] `pnpm tsc --noEmit` → Zero errors
  - [ ] File size reduced from dead code removal

  **Commit**: YES
  - Message: `chore(game-engine): remove dead code from GameRuntime`
  - Files: `GameRuntime.godot.tsx`

---

- [x] 5.2. Extract GameLoopController

  **What to do**:
  - Create `app/lib/game-engine/GameLoopController.ts`
  - Extract game loop management (start, pause, resume, stop)
  - Extract frame timing and update orchestration
  - Keep GameRuntime as the React integration layer
  - Define clean interface between components

  **Must NOT do**:
  - Don't move React-specific code to GameLoopController
  - Don't change the game loop behavior
  - Don't add new features

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Significant extraction requiring careful interface design
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 5.3)
  - **Parallel Group**: After 5.1
  - **Blocks**: Task 5.4
  - **Blocked By**: Task 5.1

  **References**:
  - `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md:617-658` - Final architecture
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Source of extraction
  - `app/lib/game-engine/systems/runner/GameSystemRunner.ts` - Related orchestration

  **Acceptance Criteria**:
  - [ ] New file: `app/lib/game-engine/GameLoopController.ts`
  - [ ] Game loop logic extracted from GameRuntime
  - [ ] GameRuntime delegates to GameLoopController
  - [ ] All games still work correctly

  **Commit**: YES
  - Message: `refactor(game-engine): extract GameLoopController from GameRuntime`
  - Files: `GameLoopController.ts`, `GameRuntime.godot.tsx`

---

- [x] 5.3. Extract GameEventSubscriber Integration

  **What to do**:
  - Move event subscription setup into a dedicated hook or component
  - Create `useGameEvents()` hook if appropriate
  - Clean up event subscription/unsubscription lifecycle
  - Ensure proper cleanup on unmount

  **Must NOT do**:
  - Don't break event handling
  - Don't create memory leaks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook extraction is straightforward
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Proper React hook patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 5.2)
  - **Parallel Group**: After 5.1
  - **Blocks**: Task 5.4
  - **Blocked By**: Task 5.1

  **References**:
  - `app/lib/game-engine/runtime/GameEventSubscriber.ts` - Created in 4.2
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Event subscription usage
  - React hooks best practices for subscription patterns

  **Acceptance Criteria**:
  - [ ] Event subscription logic cleanly organized
  - [ ] Proper cleanup on component unmount
  - [ ] No memory leaks from event subscriptions
  - [ ] All event handling works correctly

  **Commit**: YES
  - Message: `refactor(game-engine): clean up event subscription lifecycle in GameRuntime`
  - Files: `GameRuntime.godot.tsx`, potentially new hook file

---

- [x] 5.4. Final GameRuntime Cleanup

  **What to do**:
  - Review remaining GameRuntime code
  - Ensure clear separation of concerns
  - Add JSDoc comments for public interfaces
  - Verify file size is <1,000 lines
  - Run final TypeScript validation

  **Must NOT do**:
  - Don't add unnecessary abstraction
  - Don't change working code without reason

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Final polish and verification
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 5.2 and 5.3
  - **Blocks**: Task 6.1
  - **Blocked By**: Tasks 5.2, 5.3

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Final target
  - Clean code principles

  **Acceptance Criteria**:
  - [ ] GameRuntime.godot.tsx < 1,000 lines
  - [ ] Clear separation: React rendering vs game loop vs events
  - [ ] `pnpm tsc --noEmit` → Zero errors
  - [ ] All games work correctly

  **Commit**: YES
  - Message: `refactor(game-engine): finalize GameRuntime cleanup`
  - Files: `GameRuntime.godot.tsx`

---

### PHASE 6: VALIDATION (~2 hours)

---

- [x] 6.1. Run All Verification Commands

  **What to do**:
  - Run full TypeScript compilation
  - Run full test suite
  - Run AST grep validations for deprecated patterns
  - Document any remaining issues

  **Must NOT do**:
  - Don't skip any validation
  - Don't ignore failures

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: Comprehensive verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 5.4
  - **Blocks**: Task 6.2
  - **Blocked By**: Task 5.4

  **References**:
  - `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md:756-789` - Validation commands
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md:849-868` - Genericization validation

  **Acceptance Criteria**:
  - [ ] `pnpm tsc --noEmit` → Zero errors
  - [ ] `pnpm test` → All tests pass
  - [ ] `rg "game\.rulesEvaluator" --type ts` → Zero results
  - [ ] `rg "getRulesEvaluator" --type ts` → Zero results
  - [ ] `rg "scoreChanged|livesChanged" --type ts` → Zero results
  - [ ] `rg "initialScore|initialLives" --type ts` → Zero results (outside archive)
  - [ ] `rg "setCallbacks" --type ts` → Zero results

  **Commit**: NO (verification only)

---

- [x] 6.2. Manual Game Testing

  **What to do**:
  - Test at least 3 different game types manually
  - Verify win conditions work
  - Verify score/lives display correctly
  - Verify game restart works
  - Document any issues found

  **Must NOT do**:
  - Don't skip games
  - Don't ignore visual issues

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Manual testing and verification
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for game testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 6.1
  - **Blocks**: Task 6.3
  - **Blocked By**: Task 6.1

  **References**:
  - `app/lib/test-games/games/ballSort/` - Test game 1 (puzzle)
  - `app/lib/test-games/games/breakout/` - Test game 2 (action)
  - `app/lib/test-games/games/candyCrush/` - Test game 3 (match3)

  **Acceptance Criteria**:
  - [ ] ballSort: Game loads, win condition triggers, score displays
  - [ ] breakout: Game loads, ball physics work, score updates
  - [ ] candyCrush: Game loads, matches work, score updates
  - [ ] No console errors in any game
  - [ ] Games restart correctly

  **Commit**: NO (testing only)

---

- [x] 6.3. Update Documentation

  **What to do**:
  - Update CLEANUP-AUDIT-RESULTS.md to mark as COMPLETED
  - Archive or update RULES-ARCHITECTURE-SIMPLIFICATION.md
  - Archive or update APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md
  - Add any learnings to AGENTS.md if relevant

  **Must NOT do**:
  - Don't create excessive documentation
  - Don't delete the audit documents (valuable history)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation updates
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after 6.2 (final task)
  - **Blocks**: None (final)
  - **Blocked By**: Task 6.2

  **References**:
  - `docs/game-maker/architecture/CLEANUP-AUDIT-RESULTS.md` - Mark complete
  - `docs/game-maker/architecture/RULES-ARCHITECTURE-SIMPLIFICATION.md` - Archive
  - `docs/game-maker/architecture/APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md` - Archive

  **Acceptance Criteria**:
  - [ ] CLEANUP-AUDIT-RESULTS.md has "Status: ✅ COMPLETED" header
  - [ ] Documentation reflects new architecture
  - [ ] No stale documentation pointing to old patterns

  **Commit**: YES
  - Message: `docs(game-engine): update architecture docs to reflect completed cleanup`
  - Files: Documentation files

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1.1 | `chore(game-engine): delete experimental slot machine code` | Multiple | `rg slotMachine` |
| 1.2 | `fix(game-engine): resolve TypeScript errors in GameRuntime` | GameRuntime.godot.tsx | `pnpm tsc` |
| 2.1 | `feat(game-engine): create unified RulesSystem` | RulesSystem.ts | `pnpm tsc` |
| 2.2 | `refactor(game-engine): update imports to RulesSystem` | Multiple | `pnpm test` |
| 2.3 | `chore(game-engine): delete old rules files` | Deleted files | `pnpm test` |
| 3.1 | `refactor(game-engine): remove special score/lives events` | Type files | `pnpm test` |
| 3.2 | `refactor(game-engine): remove special UI config` | GameDefinition.ts | `pnpm test` |
| 3.3 | `refactor(game-engine): remove special score/lives rules` | rules.ts | `pnpm test` |
| 3.4 | `refactor(test-games): migrate to generic variables` | Game files | Manual test |
| 3.5 | `refactor(game-engine): cleanup score/lives types` | Type files | `pnpm test` |
| 4.1 | `refactor(game-engine): migrate Match3 to events` | Match3GameSystem.ts | Manual test |
| 4.2 | `refactor(game-engine): extract event subscription helper` | GameEventSubscriber.ts | `pnpm test` |
| 5.1-5.4 | `refactor(game-engine): cleanup GameRuntime` | GameRuntime.godot.tsx | `pnpm test` |
| 6.3 | `docs(game-engine): update architecture docs` | Docs | N/A |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript - MUST pass
pnpm tsc --noEmit

# Tests - MUST pass
pnpm test

# Deprecated patterns - MUST be zero results
rg "game\.rulesEvaluator" --type ts
rg "getRulesEvaluator" --type ts
rg "RulesRuntimeSystem" --type ts
rg "scoreChanged|livesChanged" --type ts
rg "initialScore|initialLives" --type ts
rg "showScore|showLives" --type ts
rg "setCallbacks" --type ts
rg "RESERVED_VARS\.(SCORE|LIVES)" --type ts
rg "slotMachine|SlotMachine" --type ts
```

### Final Checklist
- [ ] Single `RulesSystem` class (no split)
- [ ] Generic variables only (no special score/lives)
- [ ] Event-based communication (no callbacks)
- [ ] GameRuntime < 1,000 lines
- [ ] All tests pass
- [ ] At least 3 game types work manually
- [ ] No TypeScript errors
- [ ] No deprecated patterns found

---

## Risk Mitigation

### If Tests Fail During Merge (Phase 2)
- Review test expectations vs new RulesSystem behavior
- Update tests to match new structure (imports, access patterns)
- Do NOT change rule evaluation logic to make tests pass

### If Games Don't Migrate Easily (Phase 3)
- Time box: 30 minutes per game maximum
- If >30 min needed, move to `app/lib/test-games/archive/`
- Document why migration was difficult for future reference

### If GameRuntime Split Causes Issues (Phase 5)
- Keep extractions minimal - don't over-engineer
- If complexity increases, merge back and just clean up instead
- Goal is simpler code, not more abstractions

---

**Document Version**: 1.0  
**Generated**: 2026-02-02  
**Status**: Ready for Execution
