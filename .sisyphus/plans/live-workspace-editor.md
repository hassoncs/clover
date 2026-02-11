# Live Workspace-Driven Editor

## TL;DR

> **Quick Summary**: Replace eager parsed workspace model with lazy manifest/metadata, add snapshot polling, module graph invalidation, and generic tag hot-reload handlers so the editor live-previews workspace file changes. Agent writes arbitrary files → live preview updates automatically.
>
> **Deliverables**:
> - Lazy workspace manifest + type system with effects as first-class tag
> - Snapshot API + universal scaffold for new games
> - Vite-style module graph for dependency invalidation
> - Generic tag hot-reload handlers (7 tags, uniform interface)
> - Live preview controller with edit/play mode state model
> - Bridge methods for rules, scripts, and effects
> - Agent workspace tools (listFiles, readFilesBatch)
> - Final hardening + cleanup pass
>
> **Estimated Effort**: Large (8 phases)
> **Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6 → Phase 7 → Phase 8
> **Phase 5 (Prefab Reconciliation)**: Optional V1.5, gated by measured need
>
> **Source Plan**: `docs/plans/live-workspace-editor.md` (canonical reference with full code listings)

---

## Context

### Current Architecture
- Engine expects `GameDefinition` JSON via `loadGame()` or sectioned via `loadSectioned()`
- Agent uses `readFile`/`writeFile` tools against R2 workspace (currently loose files, often just `document.md`)
- Thread/message orchestration in D1, chat handler in `api/src/chat/chat-handler.ts`
- Bridge supports: `setupWorld`, `registerPrefabs`, `loadEntities`, `clearEntities`, `hotSwapShader`, `applyGraph`
- `PackageRuntime.ts` defines `TagGroup` (world, prefabs, entities, rules, scripts, assets) — no effects yet

### Target Architecture
- Workspace files are authoring source-of-truth; runtime consumes resolved payloads
- Snapshot polling detects file changes → module graph invalidation → tag handlers → bridge
- Feature-flagged live preview with kill-switch fallback to legacy full reload
- Agent can write arbitrary supported files, preview updates automatically

---

## Work Objectives

### Definition of Done
- [ ] `pnpm tsc --noEmit` passes
- [ ] All tests pass
- [ ] Edit mode: incremental hot reload via generic handlers
- [ ] Play mode: full reload on invalidated tags
- [ ] Prefab path matches selected rollout lane (V1 safe reload, optional V1.5 reconciler)
- [ ] Effects/shaders through module graph → effects handler
- [ ] Reset button works
- [ ] V1 files load, V2 scenes don't break V1
- [ ] Agent writes arbitrary supported workspace files
- [ ] Supported file edits correctly trigger live update/bundle resolution behavior
- [ ] Debug tools work on web, degrade on mobile
- [ ] Legacy games still load via `bridge.loadGame()`
- [ ] Feature flag / kill-switch can force legacy full reload path without data loss

### Must NOT Have (Guardrails)
- No breaking schema rewrite or destructive data migration
- No complex state-preserving reconciliation in V1 (Phase 5 is gated)
- No unrestricted scope expansion into debug HITL tools in V1 (Phase 7 marks as V1.5)
- No type suppressions (`as any`, `@ts-ignore`)

---

## Execution Plan

### Phase 0: Lazy Workspace Manifest + Type System Foundation

**Dependencies:** None
**Source:** `docs/plans/live-workspace-editor.md` Phase 0

- [x] Task 0.1: Create `shared/src/workspace/types.ts` — WorkspaceTag, WorkspaceFileMeta, SceneManifest, LazyWorkspaceManifest, WorkspaceSnapshot types
- [x] Task 0.2: Create `shared/src/workspace/hash.ts` — hashStringFNV1a64, hashJsonStable implementations
- [x] Task 0.3: Create `shared/src/workspace/index.ts` — re-exports
- [x] Task 0.4: Add `"effects"` to TagGroup union in `shared/src/types/PackageRuntime.ts` with TagPayloads entry
- [x] Task 0.5: Update `shared/src/types/PackageManifest.ts` TAG_GROUPS ordering to include effects
- [x] Task 0.6: Update `shared/src/types/GamePackage.ts` WORKSPACE_CONVENTIONS with effectsDir, shadersDir, scenesDir
- [x] Task 0.7: Update `shared/src/types/index.ts` to export workspace module
- [x] Task 0.8: Create `shared/src/workspace/__tests__/hash.test.ts` — stability, mutation detection, deterministic ordering, empty input
- [x] Task 0.9: Verify `pnpm tsc --noEmit` passes after all Phase 0 changes

### Phase 1: Snapshot API + Universal Scaffold

**Dependencies:** Phase 0
**Source:** `docs/plans/live-workspace-editor.md` Phase 1

- [x] Task 1.1: Create `api/src/services/WorkspaceScaffoldService.ts` — seedIfMissing with universal scaffold files
- [x] Task 1.2: Add tRPC query `getWorkspaceSnapshot` to `api/src/trpc/routes/chat-threads.ts` — input: gameId + sinceRevision, returns WorkspaceSnapshot or unchanged signal
- [x] Task 1.3: Implement revision algorithm (FNV1a per-file hash → canonical sort → composite hash)
- [x] Task 1.4: Add `listWorkspaceFileMeta()` and `readWorkspaceFiles()` to `api/src/agent/artifact-service.ts`
- [x] Task 1.5: Wire scaffold into game create flow (`api/src/trpc/routes/games.ts`) and chat sendMessage
- [x] Task 1.6: Write tests — scaffold idempotency, revision determinism, sinceRevision short-circuit, game create triggers scaffold
- [x] Task 1.7: Verify `pnpm tsc --noEmit` and tests pass

### Phase 2: Module Graph + Dependency Invalidation

**Dependencies:** Phases 0–1
**Source:** `docs/plans/live-workspace-editor.md` Phase 2

- [x] Task 2.1: Create `shared/src/workspace/module-graph.ts` — ModuleNode, InvalidationResult, WorkspaceModuleGraph class
- [x] Task 2.2: Create `shared/src/workspace/dependency-extractors.ts` — extract deps for prefab, entity, effects graph, rules
- [x] Task 2.3: Create `shared/src/workspace/tag-inference.ts` — inferTagHints with path-to-tag mapping table (unknown → all tags)
- [x] Task 2.4: Write tests — shader→effects chain, asset→prefab chain, union closure, cycle safety, missing refs
- [x] Task 2.5: Verify `pnpm tsc --noEmit` and tests pass

### Phase 3: Generic Tag Hot-Reload Handlers

**Dependencies:** Phases 0–2
**Source:** `docs/plans/live-workspace-editor.md` Phase 3

- [x] Task 3.1: Create `app/lib/game-engine/live/tag-handlers/types.ts` — HotReloadContext, TagHotReloadHandler interface
- [x] Task 3.2: Create 7 handler files (world, prefabs, entities, rules, scripts, effects, assets) in `app/lib/game-engine/live/tag-handlers/`
- [x] Task 3.3: Create `app/lib/game-engine/live/WorkspaceFileStore.ts` — holds latest snapshot, lazy file access
- [x] Task 3.4: Create `app/lib/game-engine/live/TagPayloadResolver.ts` — on-demand per-tag content parsing
- [x] Task 3.5: Create `app/lib/game-engine/live/HotReloadOrchestrator.ts` — routes canHotSwap/hotSwap/fullReload, failure escalation
- [x] Task 3.6: Write tests — orchestrator routing by mode, lazy resolver, handler→bridge method mapping
- [x] Task 3.7: Verify `pnpm tsc --noEmit` and tests pass

### Phase 4: Live Preview Controller + State Model + Reset

**Dependencies:** Phases 1–3
**Source:** `docs/plans/live-workspace-editor.md` Phase 4

- [x] Task 4.1: Create `app/lib/game-engine/live/LivePreviewController.ts` — initialize, onSnapshot, setMode, reset, dispose
- [x] Task 4.2: Create `app/lib/editor/hooks/useWorkspaceSnapshot.ts` — polls every 1s with sinceRevision
- [x] Task 4.3: Wire controller into `StageContainer.tsx` on bridge ready
- [x] Task 4.4: Update `app/app/editor/[id].tsx` — wire previewLoadState, previewMode, resetPreview through component tree
- [x] Task 4.5: Add RESET button to `EditorTopBar.tsx` and Edit/Play toggle wiring
- [x] Task 4.6: Implement `setInspectMode` bridge calls in LivePreviewController
- [x] Task 4.7: Write tests — load state transitions, mode switch triggers reset, snapshot coalescing, reset button (19 tests)
- [x] Task 4.8: Verify `pnpm tsc --noEmit` and tests pass (34 total tests passing)

### Phase 5: Prefab Reconciliation (OPTIONAL — V1.5, gated)

**Dependencies:** Phases 2–4
**Gate:** Implement only if V1 measurements show prefab full reload exceeds editor latency budget
**Source:** `docs/plans/live-workspace-editor.md` Phase 5

- [ ] Task 5.1: Create `app/lib/game-engine/reconcile/PrefabInstanceIndex.ts`
- [ ] Task 5.2: Create `app/lib/game-engine/reconcile/PrefabDiff.ts`
- [ ] Task 5.3: Create `app/lib/game-engine/reconcile/PrefabReconciler.ts`
- [ ] Task 5.4: Write tests — visual-only preserves velocity, physics recreate preserves position, child reconciliation, nested propagation
- [ ] Task 5.5: Verify `pnpm tsc --noEmit` and tests pass

### Phase 6: Effects Pipeline + Scene-Ready Loading

**Dependencies:** Phases 2–4 (Phase 5 optional)
**Source:** `docs/plans/live-workspace-editor.md` Phase 6

- [x] Task 6.1: Implement effects handler — compile graphs, diff plans, shader-only vs structural dispatch
- [x] Task 6.2: Add scene-aware loading to TagPayloadResolver (V1: top-level only, V2-ready structure)
- [x] Task 6.3: Write tests — effects compilation + shader linking, generic handler path, scene-local doesn't break V1
- [x] Task 6.4: Verify `pnpm tsc --noEmit` and tests pass

### Phase 7: Bridge Methods + Agent Tools

**Dependencies:** Phases 0–6
**Source:** `docs/plans/live-workspace-editor.md` Phase 7

- [x] Task 7.1: Add bridge methods — `loadRules`, `loadScript`, `applyEffectPlan` (web + native)
- [x] Task 7.2: Update agent system prompt to workspace-first (remove document.md assumption, add conventions)
- [x] Task 7.3: Add chat tools — `listFiles({ prefix? })`, `readFilesBatch({ filenames[] })`
- [x] Task 7.4: Write tests — bridge methods web/native, workspace tool validation
- [x] Task 7.5: Verify `pnpm tsc --noEmit` and tests pass

### Phase 8: Final Hardening, Cleanup, and Release Gate

**Dependencies:** Phases 0–7
**Source:** `docs/plans/live-workspace-editor.md` Phase 8

- [ ] Task 8.1: Remove legacy/deprecated editor code paths superseded by workspace snapshot + live preview
- [ ] Task 8.2: Remove temporary compatibility shims no longer needed after parity
- [ ] Task 8.3: Consolidate duplicated parsing/loader logic — one authoritative workspace-to-runtime path
- [ ] Task 8.4: Verify agent can write all 7 supported file types through chat tools and preview updates correctly
- [ ] Task 8.5: Verify legacy fallback path works behind kill-switch with documented removal criteria
- [ ] Task 8.6: Update docs — canonical authoring/runtime contract, migration status
- [ ] Task 8.7: Final `pnpm tsc --noEmit` + full test suite green
- [ ] Task 8.8: Sign off readiness checklist for manual editor workflow QA
