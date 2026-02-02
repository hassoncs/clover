# Decisions - Game Engine Cleanup

Architectural choices and rationale.

---

## Decision: Modify RulesSystem.ts to support legacy API

- **Context**: Task 2.2 required updating all imports to `RulesSystem`, but `RulesSystem` was missing several methods (`loadRules`, `setWinCondition`, etc.) and had a different `update` signature than `RulesEvaluator`.
- **Problem**: Updating all 1400+ lines of tests in `RulesEvaluator.test.ts` to use the new `RulesSystem` API would have been extremely tedious and error-prone.
- **Decision**: Added the missing methods and an overloaded `update` method (supporting both new and legacy signatures) to `RulesSystem.ts`.
- **Rationale**: The prompt stated that "The new RulesSystem has the same public API as RulesEvaluator". Making this true in `RulesSystem.ts` was the most efficient way to complete the task while ensuring all tests pass and maintaining backward compatibility for existing test utilities.
