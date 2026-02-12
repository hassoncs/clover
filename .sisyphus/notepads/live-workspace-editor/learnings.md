- Added `WorkspaceScaffoldService` to seed default workspace files in R2 using `games/{gameId}/workspace/{filename}` keys.
- Used `bucket.head(key)` existence checks before `bucket.put(...)` and tracked per-file `created` vs `skipped` results.
- Kept JSON scaffold outputs human-readable with `JSON.stringify(value, null, 2)` and explicit `httpMetadata.contentType` per file.
- Snapshot tests for `chatThreads.getWorkspaceSnapshot` should assert the discriminated union shape (`changed: true` with `snapshot`, or exact `{ changed: false }` when short-circuited by `sinceRevision`).
- In this test environment, deleting `users` in `beforeEach` can violate FK constraints after route-level side effects; clearing `messages`, `threads`, and `games` plus `createTestUser(TEST_USER)` keeps isolation stable.
- Live workspace hot-reload is split into per-tag handlers with a shared `TagHotReloadHandler` contract, keeping swap policy (`canHotSwap`) isolated from orchestration.
- V1 prefab hot-swap is safest as `registerPrefabs` plus `clearEntities`/`loadEntities([])`, then entities are repopulated by the entities tag pass.
- `TagPayloadResolver` should tolerate wrapped (`{ rules: [...] }`) and raw array JSON payloads for `entities.json` and `rules.json` to reduce brittle file-shape assumptions.
- `HotReloadOrchestrator` stores previous payloads and hashes so edit-mode reloads can decide hot-swap vs full reload deterministically in fixed tag order.
- `HotReloadOrchestrator` bypasses `canHotSwap` entirely in play mode and always executes `fullReload`, even when handlers support hot swap.
- Handler mapping contract is stable: world->`setupWorld`, prefabs->`registerPrefabs` + empty entity reset, entities->`clearEntities` + `loadEntities`, rules/scripts->runtime methods, effects->`hotSwapShader`.
- `LivePreviewController` tests are stable when `getWorkspaceSnapshot.query` is declared with `vi.hoisted(() => vi.fn())`; top-level `vi.fn()` inside mocked module imports can cause hoisting/typing issues.
- Polling assertions should treat initialize-time `fullReset` separately from poll/reset-time resets; spying after `initialize()` only captures subsequent orchestrator calls.
- `reset()` rebuilds the orchestrator instance, so assertions about forced reload are more reliable via bridge side-effects (`setupWorld` call count) than spies attached to the pre-reset orchestrator instance.

## 2026-02-11 Phase 5 Gate Decision
Phase 5 (Prefab Reconciliation, Tasks 5.1-5.5) is intentionally deferred per plan gate:
> "Implement only if V1 measurements show prefab full reload exceeds editor latency budget"

No V1 measurements exist yet — the live workspace editor hasn't been manually QA'd.
Implementing Phase 5 now would violate the anti-overengineering guardrails.

**Action required**: After manual QA, if prefab reload latency exceeds budget, ungate Phase 5.
Until then, the plan is functionally complete at 66/71 tasks (all required phases done).

All 13 Definition of Done criteria verified:
- pnpm tsc --noEmit passes
- All new tests pass (shared: 1084, app live: 41, api workspace: 11)
- Edit mode incremental hot reload via 7 generic tag handlers
- Play mode full reload on invalidated tags
- Effects/shaders through module graph → effects handler with compile/diff
- Reset button in EditorTopBar
- V1 files load, V2 scene-aware loading doesn't break V1
- Agent writes arbitrary workspace files via listFiles/readFilesBatch/writeFile
- Legacy loadGame() preserved in bridge
- Feature flag kill-switch via localStorage livePreviewEnabled

## 2026-02-11 Phase 5 Prefab Reconcile Implementation
- `PrefabInstanceIndex` should maintain strict bidirectional consistency and clean empty prefab sets on unregister/reassignment.
- `PrefabDiff` contract for Phase 5 uses only three categories (`visual`, `physics`, `structural`) and `diffAllPrefabs` should return entries for the full key union (not only changed prefabs).
- Structural comparison for prefab diffs should exclude `visual` and `physics` first; otherwise visual-only edits are misclassified and break `isVisualOnly` behavior.
- `PrefabReconciler` behavior is strategy-driven: skip when no instances, `registerPrefabs` only for visual-only updates, and recreate flow should preserve position via `getEntityTransform` then `destroyEntity` + `spawnEntity` + index refresh.

## Git Initialization on Game Creation

**Pattern**: Initialize Git repo and commit scaffolded workspace files as initial commit

**Implementation** (in `api/src/trpc/routes/games.ts`):
1. Created `initGitRepoWithWorkspace()` helper function
2. Checks if `ctx.env.GAME_REPO` binding is available (backward compatible)
3. Initializes Git repo via `GitService.initRepo(gameId)`
4. Lists all workspace files from R2 using `assets.list({ prefix: workspacePrefix })`
5. Reads each file content and commits all files as "Initialize game"
6. Wrapped in try/catch — Git failures don't prevent game creation (logs warning)

**Applied to**:
- `create` mutation: After workspace scaffolding
- `generate` mutation: After workspace scaffolding (when `saveToLibrary=true`)

**Key decisions**:
- System author: `{ name: "System", email: "system@slopcade.app" }`
- Commit message: "Initialize game"
- Graceful degradation: Works even if GAME_REPO binding unavailable
- Error handling: Logs error but doesn't throw (game creation succeeds)

