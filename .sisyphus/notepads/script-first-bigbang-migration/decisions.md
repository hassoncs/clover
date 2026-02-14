# Decisions: Script-First Big-Bang Migration

## Task 4: Publish Artifact Format

### Manifest Format Decision
- `GamePackageManifest` with `version: "1.0"`, `contentHash`, `entrypoint?`, `chunks[]`, `gameDefinition`
- Content hash computed as SHA-256 of the full manifest JSON with `contentHash` set to empty string, then written back
- This makes the manifest self-verifiable: hash the JSON with contentHash="" and compare

### Chunk Naming Convention
- `chunk-{first12charsOfSHA256}.js` — 12 hex chars gives 48 bits of collision resistance, sufficient for game-scale module counts
- Full SHA-256 stored in `PublishChunk.hash` for integrity verification
- Chunk filenames are deterministic: same source → same filename

### Entrypoint Resolution
- If a module named "main" exists, it's the entrypoint
- Otherwise, first module alphabetically is the entrypoint
- If no scripts exist, `entrypoint` is `undefined`

### Module Map vs Monolithic Script
- `ScriptModuleMap = Record<string, string>` — keys are script basenames (without .js), values are source
- Keys sorted alphabetically for deterministic JSON serialization
- Used in both `BundleSections.modules` (authoring/sectioned) and `GamePackageManifest.chunks` (publish)
- The old `BundleSections.script?: string` field replaced with `modules?: ScriptModuleMap`

### What Was Removed
- `gameDefinition.script = scriptParts.join(...)` — the monolithic concatenation
- `scriptParts` array — no longer needed since we don't concatenate
- `BundleSections.script` field — replaced with `modules`

### Determinism Guarantees
1. Script files sorted alphabetically by basename before processing
2. Module map keys sorted alphabetically
3. Chunks ordered by module name (inherits from sorted module map iteration)
4. SHA-256 hashing is deterministic
5. JSON.stringify produces deterministic output for sorted-key objects
6. Manifest contentHash computed from canonical JSON representation

### Files Modified
- `packages/game-bundler/src/types.ts` — Added `ScriptModuleMap`, `PublishChunk`, `GamePackageManifest`, `PublishCompileResult`; changed `BundleSections.script` → `modules`
- `packages/game-bundler/src/compiler.ts` — Added `compilePublishArtifact()`, `hashContent()`, `buildSortedModuleMap()`, `createChunksFromModules()`, `computeManifestHash()`; removed monolithic script assignment; updated `compileSectioned()` to use modules
