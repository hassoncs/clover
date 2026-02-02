# Learnings - Game Engine Cleanup

Conventions, patterns, and things that worked.

---

## Task 1.3: Baseline Test Verification
- All 345 tests pass (18 test files)
- RulesEvaluator: 104 tests pass
- ballSort: 9 tests pass
- No pre-existing test failures
- TypeScript: Zero errors after fixing WinConditionType in api/classifier.ts

---

## Task 1.2: Fix TypeScript Errors in GameRuntime
- GameRuntime.godot.tsx had ZERO TypeScript errors (plan was written against older codebase)
- Only error was in api/src/ai/classifier.ts - WinConditionType not exported from shared
- Fixed by defining WinConditionType locally in classifier (it's classifier-specific)

---

## Task 1.1: Delete Slot Machine Code
- Successfully removed `SlotMachineConfig`, `PayoutConfig`, `FreeSpinsConfig`, and `PickBonusConfig` from `shared/src/types/GameDefinition.ts`.
- Cleaned up `shared/src/bundle/compiler.ts` and fixed an incorrect import for `ContainerConfig`.
- Removed broken `slotMachine` imports and config entries from `api/scripts/game-configs/index.ts`.
- Deleted auto-generated documentation files in `packages/docs/` and cleaned up references in `README.md` and `GameDefinition.md`.
- Cleaned up historical references in `docs/` and `scripts/convert-entity-components.mjs`.
- Verified removal with `rg "slotMachine|SlotMachine"` which now returns zero results.

## Task 2.1: Create Unified RulesSystem Class
- Successfully merged RulesRuntimeSystem (226 lines) and RulesEvaluator (581 lines) into single RulesSystem (~700 lines)
- RulesSystem implements both RuntimeSystem and IGameStateMutator interfaces
- All rule evaluation logic now directly in RulesSystem (no delegation)
- ContainerSystem and ContainerActionExecutor created during initialize() when entityManager is available
- ActionRegistry recreated in initialize() with real ContainerActionExecutor (placeholder pattern in constructor)
- Import paths: 3 levels up from systems/runner/wrappers/ to game-engine/ (`../../../`)
- ContainerSystem import path: `../../../systems/ContainerSystem` (not `../../ContainerSystem`)
- All IGameStateMutator methods use requireState() pattern for safety
- Dependency setters (setRuntimeState, setEventBus, etc.) preserved for compatibility
- TypeScript compiles with zero errors after merge
