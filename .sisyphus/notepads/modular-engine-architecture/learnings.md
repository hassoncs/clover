# Modular Engine Architecture - Learnings

## Task 3 Attempt - Failed

**Date:** 2026-02-10

**Issue:** Subagent attempt to implement `compileSectioned` function caused widespread type errors.

**Root Cause:** The Zod schemas in `shared/src/types/schemas.ts` are complex and have strict typing that conflicts with existing game definition types. When the subagent tried to:
1. Add `compileSectioned` function to compiler.ts
2. Create sectioned bundle types
3. Run tests

The result was:
- Test failures due to schema validation being stricter than old validator
- Type errors across the codebase (EditorProvider, AssetGallery, GameRuntime)
- Missing module errors for validation modules

**Key Problems:**
1. The new Zod schemas are stricter than the old imperative validator
2. Test data doesn't satisfy new schema requirements
3. Type derivation from Zod (`z.infer<>`) creates incompatible types with existing code
4. The `semantic.ts` module was created but not properly integrated

**Lessons:**
1. Schema consolidation is more complex than anticipated
2. Need to maintain backward compatibility with existing game definitions
3. Tests need to be updated to match new schema requirements
4. Type derivation needs careful handling to avoid breaking existing code

**Next Steps:**
1. Revert to simpler approach: keep existing types, add Zod schemas as separate validation layer
2. Don't derive types from Zod - keep manual types and use Zod for runtime validation only
3. Focus on `compileSectioned` without changing validation infrastructure
4. Update tests to work with stricter schemas gradually

**Decision:** Pause Task 3, reconsider approach to validation consolidation.
