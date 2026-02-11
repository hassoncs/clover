# Task 4: Validation Readiness Service

## Status: Complete

## Files Created
- `api/src/services/PackageValidator.ts` - Validates compiled build artifacts
- `api/src/services/ReadinessService.ts` - Tracks readiness state per game/build in D1
- `api/src/trpc/routes/package-readiness.ts` - tRPC router with `check` mutation and `get` query
- `api/migrations/20260211_package_readiness.sql` - D1 migration
- `api/schema.sql` - Updated with `package_readiness` table
- `api/src/services/__tests__/PackageValidator.test.ts` - 14 unit tests
- `api/src/trpc/routes/__tests__/package-readiness.test.ts` - 7 integration tests

## Files Modified
- `api/src/trpc/router.ts` - Registered `packageReadinessRouter`

## Architecture Decisions
- `PackageValidator` is a pure function class (no I/O) — validates `BuildManifest` + `TagPayloads`
- `ReadinessService` wraps validator + D1 persistence, uses upsert for idempotent writes
- Validation operates on compiled artifacts only (not workspace source), per plan
- Errors block preview (ready=false), warnings don't
- tRPC accepts manifest/artifacts as JSON strings to avoid Zod schema duplication of complex shared types

## Validation Checks
- Manifest structure (buildId, packageManifest.id, artifacts array)
- Artifact hash presence and tag group validity
- Prefab: no duplicate IDs, valid bodyType, required id field
- Entity: no duplicate IDs, template references resolve to known prefabs
- Rule: trigger required, spawn actions reference known prefabs (warning), entity refs resolve (error)

## API Surface
- `packageReadiness.check` (mutation): validates build, persists result, returns readiness state
- `packageReadiness.get` (query): returns cached readiness by gameId+buildId or latest for gameId

## Test Results
- PackageValidator: 14/14 passing
- tRPC routes: 7/7 passing
- Existing PackageCompiler tests: 22/22 still passing

## Dependencies for Next Tasks
- Task 5 (editor preview gate) can query `packageReadiness.get` to enable/disable preview button
- Task 6 (runtime adapter) can use `PackageValidator` to pre-validate before loading
