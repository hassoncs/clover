

## 2026-02-05: Removed games server dependency for embedded games

### Changes Made
1. **app/lib/offline/local-asset-server.ts**: `getServerUrl()` now returns `'/slopcade/games'` for web (was `'http://localhost:8789/local-assets'`)
2. **api/src/index.ts**: Removed `/local-games`, `/local-games/:gameId`, and `/local-packs/:packName` proxy routes
3. **app/hooks/useBrowseGames.ts**: Now uses `EMBEDDED_MANIFEST` and `EMBEDDED_GAME_JSONS` instead of fetching from API proxy
4. **app/app/test-games/[id].tsx**: Now uses `EMBEDDED_GAME_JSONS` and `EMBEDDED_ASSET_MANIFESTS` instead of API proxy
5. **app/lib/game-engine/hooks/useAssetResolution.ts**: Now uses `EMBEDDED_ASSET_MANIFESTS` synchronously instead of `useQuery` with API fetch
6. **app/scripts/create-dev-symlinks.ts**: New script to create symlinks for web static asset serving

### Key Patterns
- `EMBEDDED_GAME_JSONS[id]` returns `{ id, title, description, definition }` where `definition` is already a parsed object (not a string)
- `EMBEDDED_ASSET_MANIFESTS[gameId]` returns `Record<templateId, { file, r2Key }>`
- For web, assets are served at `/slopcade/games/{gameId}/...` via symlinks in `app/public/`
- For native, assets use `file://` URLs via `getLocalAssetPath()`

### Files Not Changed (per requirements)
- `games/scripts/build.ts` and `games/scripts/serve.ts` - still exist, just not used by app
- `app/scripts/embed-games.ts` - already works correctly
- `app/lib/offline/embedded-games-registry.ts` - auto-generated
- `app/lib/offline/embedded-games.ts` - native offline pipeline unchanged
- `shared/src/utils/asset-url.ts` - no changes needed

### Verification
- `pnpm tsc --noEmit` passes
- No remaining `http://localhost:8789/local-*` or `http://localhost:3847` references in app code


## 2026-02-04: Fixed WASM re-entrancy crash in RunScriptActionExecutor

### Problem
When the BallSort generateLevel script fired on game_loaded, it called ctx.spawnEntity() which tried to call into Godot WASM synchronously during rules evaluation. This caused RuntimeError: memory access out of bounds.

The call chain was:
1. stepGame() processes lifecycle events → rules evaluate → generate_level fires
2. RunScriptActionExecutor.execute() calls sandbox.callFunction()
3. Inside the script, ctx.spawnEntity() calls context.bridge.spawnEntity()
4. bridge.spawnEntity() calls getGodotBridge()?.spawnEntity() → Godot WASM
5. CRASH: RuntimeError: memory access out of bounds

### Solution
Implemented deferred spawn queue in RunScriptActionExecutor:

1. Before script execution: Create a spawn queue (array)
2. During script execution: Instead of calling context.bridge.spawnEntity() directly:
   - Generate entity ID upfront (same format as before)
   - Create JS entity immediately so script can tag it
   - Push spawn request to queue for later
   - Return ID to script immediately
3. After script execution completes: Flush the queue by calling bridge.spawnEntity() for each queued spawn

### Key Implementation Details

The spawnEntity wrapper in createRuntimeContext now:
- Generates entity ID upfront
- If bridge exists, queues the spawn for later
- Always creates JS entity immediately so script can tag it
- Returns the ID synchronously

After sandbox.callFunction() returns, flush deferred spawns.

### Files Changed
- app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts

### Verification
- pnpm tsc --noEmit passes
- All game-engine tests pass (214 tests)
- game-loaded integration tests pass (10 tests)

### Why SpawnActionExecutor Does Not Need This Fix
SpawnActionExecutor also calls bridge.spawnEntity() but it is used for spawn actions in rules, not scripts. The crash only occurs when spawning from within a script because:
1. Scripts run synchronously during rule evaluation
2. The script sandbox (UnsafeScriptSandbox) uses new Function() which runs in the main JS context
3. Calling into Godot WASM from within the script execution causes re-entrancy issues

Spawn actions do not have this problem because they run outside of script execution context.
