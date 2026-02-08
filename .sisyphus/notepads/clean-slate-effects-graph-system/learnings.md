# Learnings

## Initial Context
- Existing v1 types in `shared/src/types/effect-pipeline.ts`: `ShaderSource`, `UniformDeclaration`, `UniformType`, `EffectPassSpec`, `PersistenceMode`, `QualityTier`, `StopMode`, `PipelineLifecycle`, `EffectPipelineSpec`
- Existing v1 types in `shared/src/types/multi-pass-effect.ts`: `MultiPassEffectSpec`, `BufferSpec`, `PassSpec`
- Existing v1 types in `shared/src/types/effect-snapshot.ts`: `PassSnapshot`, `PipelineSnapshot`, `SnapshotRequest`, `SnapshotValidationResult`
- Existing v1 types in `shared/src/types/effects.ts`: 28 `EffectType` variants, `EffectBase`, `EffectBlendMode`, `EffectMetadata`, `EffectParamMeta`, `EFFECT_METADATA`
- Existing v1 types in `shared/src/types/effect-budget.ts`: `PlatformTier`, `BudgetTierPolicy`, `BudgetPolicy`, `BUDGET_TIER_PRESETS`, `DegradationAction`, `BudgetResolution`
- Existing preset library in `shared/src/effects/preset-library.ts`: `EffectPreset` with tiers, tags, pass factory helpers
- V2 types go in NEW directory `shared/src/effects-v2/` — do NOT modify v1 files
- V2 can import from v1 types (e.g., `ShaderSource`, `QualityTier`, `PersistenceMode`, `PlatformTier`) but must NOT couple to v1 pipeline shapes

## T1: Effects-V2 Core Types
- Created `shared/src/effects-v2/types.ts` with full graph contract: `EffectNode`, `Connection`, `FeedbackEdge`, `FeedbackPolicy`, `EffectGraphSpec`, `ResourceRef`, `CompiledPass`, `CompiledPlan`
- Barrel export at `shared/src/effects-v2/index.ts` re-exports all types plus convenience re-exports of v1 types (`ShaderSource`, `UniformDeclaration`, `QualityTier`, `PersistenceMode`, `PlatformTier`)
- `@ts-expect-error` in object literals must be placed on the *property line* with the bad value, not the variable declaration — TS assigns the error to the specific property
- `shared/tsconfig.json` excludes `**/__tests__/**` from compilation, so test files don't affect `tsc --noEmit`
- vitest + `expectTypeOf` works well for type-level assertion tests
- Tests: 11 passing (3 positive construction tests, 2 requires/provides contract tests, 3 FeedbackPolicy validation tests, 3 negative @ts-expect-error tests)

## T2: Registry & Search Index
- `ManifestRegistry` uses `Map<string, NodeTypeRegistration>` internally; `getAll()` sorts by `type` string for deterministic iteration
- Alias map is maintained on register/unregister for O(1) lookup via `resolveAlias()`
- Search returns results sorted by relevance descending, then type ascending for stable tie-breaking
- Free-text search scores: exact alias match (10), partial alias (5), displayName (4), description (2), tag (1)
- `validateConstraints()` checks `requires` (missing deps) and `conflicts` (incompatible pairs) across a node type set
- T1 (core types) created `index.ts` barrel first; T2 appended its exports — coordination worked via "append if exists" pattern
- `QualityTier` imported from v1 `../types/effect-pipeline` as instructed — no dependency on `./types.ts`
- 23 tests cover: registration CRUD, deterministic ordering, search by tag/family/tier/text, alias resolution, AI context formatting, constraint validation

## T3: Validator & Error Taxonomy
- Error taxonomy in `errors.ts`: 14 machine-readable codes (`GraphValidationErrorCode` union)
- `GraphValidationError` has `code`, `message`, optional `nodeIds[]` and `path`
- Validator runs checks in specified order: empty → duplicates → self-loops → missing refs → dup connections → generator inputs → cycles → feedback limit → feedback invalid → format mismatch → disconnected → budget
- Cycle detection uses Kahn's algorithm (topological sort), excluding feedback edges from adjacency
- Feedback limit: max 1 feedback edge per graph in v1
- Format mismatch: compares outputTarget.format between connected source and target nodes
- Budget check: uses `BUDGET_TIER_PRESETS` from v1 types; only enforced when `platformTier` option provided
- Disconnected node check exempts generators (they can be standalone)
- 20 tests: 3 happy paths, 14 error-specific, 1 multiple-errors, 2 budget edge cases
