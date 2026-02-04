# Issues - Asset System V3 Migration

## Problems & Gotchas

## 2026-02-03T22:06:45Z - Pre-existing Issues
- Note: Some pre-existing LSP errors in codebase (ScriptSandbox, RunScriptActionExecutor) unrelated to asset system

## 2026-02-03 - TypeScript Cross-Package Import Fix
- Fixed `@/lib/registry/types` imports in test game files - changed to relative imports `../../../registry/types`
- Removed non-existent `ballSortScripted` from templateLoader.ts (empty directory)
- API and shared packages now compile cleanly
- App package has expected errors (Wave 2-3 migration tasks will fix these)

## Tooling Issues
- Some Godot (`.gd`) files (e.g., `ThemedCheckbox.gd`, `TextureLoader.gd`) could not be read by the `read` or `bash` tools, returning `[{},{}]`.
- However, the `Edit` tool was still able to perform replacements in these files.
- `xxd` was able to read the hex content, confirming the files were not empty and contained ASCII text.
- This might be due to extended attributes or some character encoding issue that the tool's output parser doesn't like.

## 2026-02-03 - Pre-existing Issues (Not Related to Asset System V3)

### App TypeScript Errors (23 total)
These errors existed before the migration and are unrelated to the asset system:

1. **ScriptSandbox/RunScriptActionExecutor** (15 errors)
   - `templateId` should be `template`
   - `spawnEntity` doesn't exist on EntityManager
   - `velocity` doesn't exist on RuntimeEntity
   - `setVelocity` doesn't exist on Physics2D

2. **testGames.ts Registry** (7 errors)
   - `status` type mismatch: `string` vs `GameStatus`
   - Generated file needs regeneration with proper typing

3. **ScriptSandbox.test.ts** (1 error)
   - Mock missing `getEntityData`, `queryEntitiesWithData`, `getEntityTemplate`

### API Test Failures (7 total)
Pre-existing failures in game validation tests:
- `generator.test.ts` - AI game generation validation
- `validator.test.ts` - Game definition validation
- `games.test.ts` - Games router validation

### Shared Test Failures (31 total)
Pre-existing failures in expression evaluator tests:
- `expressions.test.ts` - Unknown identifier errors for `score`, `lives`
