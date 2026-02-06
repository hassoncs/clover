# Learnings

## 2026-02-05 Session Start - State Assessment
- SyncWorldOps interface created at shared/src/types/sync-world-ops.ts (76 lines, all sync)
- AsyncWorldOps interface created at shared/src/types/async-world-ops.ts (12 lines, animate + wait only)
- ScriptContext in app/lib/scripting/types.ts now extends SyncWorldOps with worldAsync: AsyncWorldOps
- Both runtime context builders updated: RunScriptActionExecutor and ScriptSandboxRuntimeSystem
- Asteroids game migrated from addScore/addLives to setVariable
- TypeScript compiles clean (pnpm tsc --noEmit passes)
- Pre-existing test failures in shared/src/utils/__tests__/asset-url.test.ts (not related to our work)
- Plan file has 0/33 checked despite significant code work being done
Updated plan file to reflect completed tasks in Wave 1, 2, 3, and partial Wave 5.

## 2026-02-05 Task 8 - Async Boundary Invariants
- Added a dedicated `async boundary invariants` block in `app/lib/scripting/UnsafeScriptSandbox.test.ts` to enforce sync/async separation at script API boundaries.
- Verified `ctx.worldAsync.wait` and `ctx.worldAsync.animate` are callable from sync hooks and return Promises without turning hooks async.
- Verified sync hook execution still succeeds when Promise-returning async world ops are invoked but not awaited.
- Verified `ctx.startSequence` is exposed in sync hooks and returns a usable sequence handle shape (name + cancel).
- Confirmed existing async hook rejection coverage remains in `async safety guard` (`onStart` and `onUpdate` Promise-returning hooks are rejected).

## 2026-02-05 Task 6 - Deterministic Spawn IDs for Sync Script Context
- Updated `RunScriptActionExecutor.createScriptContext` to generate spawn IDs as `spawned_{frameId}_{counter}`.
- Counter is scoped to a single `createScriptContext` invocation and increments per `spawnEntity` call, giving deterministic/replay-stable IDs for the same frame/script execution.
- Added regression test in `app/lib/scripting/UnsafeScriptSandbox.test.ts` that runs a script with two spawns in one call and asserts IDs are distinct and predictable (`spawned_17_0`, `spawned_17_1`).
- `ScriptSandboxRuntimeSystem` remains unchanged by design: it delegates spawning to `EntityManager.spawnEntity()` where ID generation is centrally controlled for that path.

## 2026-02-05 Task 9 - Inspector/MCP Compatibility Validation
- game-inspector-mcp is COMPLETELY DECOUPLED from WorldOps/SyncWorldOps/AsyncWorldOps at compile time
- Zero imports from shared/src/types/, shared/src/scripting/, or app/lib/
- package.json has zero monorepo dependencies
- All interaction is via Playwright page.evaluate() calling window.debugOps (runtime bridge)
- window.debugOps is backed by DebugOps interface (extends WorldOps) — exposed at runtime
- Our SyncWorldOps/AsyncWorldOps type changes have NO impact on inspector/MCP functionality
- No adapter/mapping needed — the inspector already operates through its own runtime bridge
- Consistency guarantee: inspector sees the same state as scripts because both read from EntityManager/Physics2D

## 2026-02-05 Task 10 - Runtime QA with Game Inspector (BallSort)
- BallSort loaded successfully at http://localhost:8085/test-games/ballSort
- Zero "spawnEntity is not a function" errors in 336 log entries
- Zero "setVariable is not a function" errors in 336 log entries
- 8 ball entities spawned (4 color-0, 4 color-1)
- 6 tubes present with correct ball counts
- Game variables all set correctly (currentLevel, heldBallColor, tube counts, etc.)
- Screenshot evidence saved to .sisyphus/evidence/task-10-ballsort-startup.png
- WASM stepping error is a known Godot WASM issue, not related to our changes

## 2026-02-05 Task 11 - Final Verification
- pnpm tsc --noEmit: CLEAN (zero errors)
- UnsafeScriptSandbox.test.ts: 29/29 tests pass
- Pre-existing failures in shared/src/utils/__tests__/asset-url.test.ts are unrelated to sync-world-ops work
