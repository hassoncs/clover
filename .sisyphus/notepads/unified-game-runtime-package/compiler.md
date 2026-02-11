# Task 3: Compile Service Implementation

## Status: Complete

## Files Created
- `api/src/services/R2WorkspaceReader.ts` - Reads workspace files from R2 bucket
- `api/src/services/BuildArtifactWriter.ts` - Writes build artifacts to R2 bucket
- `api/src/services/PackageCompiler.ts` - Main compiler service
- `api/src/services/__tests__/PackageCompiler.test.ts` - 22 tests, all passing

## Architecture

### R2WorkspaceReader
- `listFiles(gameId)` - Lists all files under `games/{gameId}/workspace/` with cursor pagination
- `readFile(gameId, path)` - Reads a single file
- `readAllFiles(gameId)` - Reads all workspace files, returns `{files, errors}`

### BuildArtifactWriter
- `writeArtifact(params)` - Writes a single tag group artifact to `games/{gameId}/build/{buildId}/{tag}.json`
- `writeManifest(gameId, buildId, manifest)` - Writes `manifest.json`
- `writeBuild(gameId, buildId, manifest, artifacts)` - Writes all artifacts + manifest in one call

### PackageCompiler
- `compile(gameId): Promise<CompileResult>` - Main entry point
- Internally uses `parseWorkspace()` to parse files into structured data
- Uses `buildTagPayloads()` to create tag-grouped payloads
- Generates buildId, calculates content hashes, writes to R2

### Compile Flow
1. Read all workspace files from R2
2. Parse: slopcade.json, world.json, entities.json, rules.json, prefabs/*.json, scripts/*.js, script.js, assets.json
3. Build TagPayloads for all 6 groups (world, prefabs, entities, rules, scripts, assets)
4. Calculate content hashes (fast JS hash, not crypto)
5. Write artifacts + manifest to `games/{gameId}/build/{buildId}/`
6. Return CompileResult with buildId, manifest, diagnostics, processedFiles

### Key Decisions
- Content hash uses fast JS hash (not crypto) since Workers environment; sufficient for change detection
- Missing manifest is OK (script-first packages) — defaults generated from gameId
- Missing world.json gets default gravity {x:0, y:10} and pixelsPerMeter 50
- Both `script.js` (single entry) and `scripts/*.js` (multi-file) supported
- Scripts concatenated alphabetically with `// --- filename ---` separators
- Duplicate prefab IDs produce warnings, last-write-wins
- All errors/warnings collected as diagnostics, never thrown

## Exports (for downstream tasks)
- `PackageCompiler` class
- `CompileResult`, `CompileDiagnostic` interfaces
- `parseWorkspace`, `buildTagPayloads`, `contentHash`, `generateBuildId` (internal helpers exported for testing)

## Dependencies
- Uses types from `@slopcade/shared`: WorkspaceManifest, TagGroup, BuildManifest, PackageArtifact, TagPayloads, TAG_GROUPS, WORKSPACE_CONVENTIONS
- R2 bucket interface from `@cloudflare/workers-types`

## Next Steps (Task 4)
- Validation service should consume CompileResult and validate artifact contents
- Can use diagnostics array pattern established here
