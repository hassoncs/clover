# Live Workspace-Driven Editor — Implementation Plan v2

## Architecture Decisions (locked)

| Decision | Choice |
|----------|--------|
| Preview source of truth | Workspace files (loose). Content resolved lazily per-tag. |
| Workspace manifest | Metadata only: `{ path, contentHash, size }[]`. Never holds parsed payloads. |
| Old `loadGame(fullJSON)` path | Kept for backward compat, untouched |
| How preview loads | `LivePreviewController` → module graph invalidation → tag handlers → bridge |
| Hot-reload model | Generic `TagHotReloadHandler` per tag. No shader special-casing. |
| Dependency tracking | Vite-style `WorkspaceModuleGraph`. File changes propagate up importers. |
| Prefab model | React-like reconciliation. Prefab change → diff → minimal entity updates, state preserved. |
| Editor Mode | `setInspectMode(true)`, `Engine.time_scale = 0.0`, hot-swap via tag handlers |
| Play Mode | Full simulation; any invalidated tag → clear + full reload |
| State model | Two orthogonal dimensions: `loadState: idle\|loading\|ready\|error` × `mode: edit\|play` |
| Scaffolding | One universal scaffold. No modes. Agent decides content. |
| Effects/Shaders | `effects/*.json` = EffectGraphSpec files. `shaders/*.gdshader` = source. Graph references shaders via `custom:` prefix. |
| Scenes | V1: single scene (top-level files). V2-ready: `scenes/{name}/` directories. |
| Reset | Hard reset button: `clearGame()` → full reload from latest snapshot |
| Agent debug access | Frontend-mediated HITL client tools (generalized `askUser` pattern) |
| New bridge methods | `loadRules`, `loadScript`, `applyEffectPlan` (3 total) |

---

## Phase 0 — Lazy Workspace Manifest + Type System Foundation

**Dependencies:** None

### Goal
Replace eager parsed workspace model with lazy manifest/metadata and scene-ready type structure.

### Files to Create

**`shared/src/workspace/types.ts`**
```ts
export type WorkspaceTag =
  | "world" | "prefabs" | "entities" | "rules"
  | "scripts" | "effects" | "assets";

export interface WorkspaceFileMeta {
  path: string;
  contentHash: string;
  size: number;
  uploaded?: number;
  tagHints: WorkspaceTag[];
  scene?: string | null;  // null = top-level (V1 default)
}

export interface SceneManifest {
  name: string;
  root: string;           // e.g. "scenes/main"
  entitiesPath?: string;  // "scenes/main/entities.json"
  rulesPath?: string;
  worldPath?: string;     // optional per-scene world override
}

export interface LazyWorkspaceManifest {
  schemaVersion: 2;
  gameId: string;
  revision: string;
  files: WorkspaceFileMeta[];
  activeScene: string | null;  // V1: always null
  scenes: SceneManifest[];     // V1: always empty
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSnapshotFile {
  filename: string;
  content: string;
  contentHash: string;
  size: number;
  uploaded: number;
}

export interface WorkspaceSnapshot {
  gameId: string;
  revision: string;
  generatedAt: number;
  files: WorkspaceSnapshotFile[];
}
```

**`shared/src/workspace/hash.ts`**
```ts
export function hashStringFNV1a64(input: string): string;
export function hashJsonStable(input: unknown): string;
```

**`shared/src/workspace/index.ts`** — Re-exports all.

### Files to Modify

- **`shared/src/types/PackageRuntime.ts`** — Add `"effects"` to `TagGroup` union and `TagPayloads`:
  ```ts
  effects: {
    plans: Record<string, CompiledPlan>;  // key = effects/*.json path
    shaders: Record<string, string>;       // key = shaders/*.gdshader, value = source
  }
  ```
- **`shared/src/types/PackageManifest.ts`** — `TAG_GROUPS`: `world → prefabs → entities → rules → scripts → effects → assets`
- **`shared/src/types/GamePackage.ts`** — Add to WORKSPACE_CONVENTIONS: `effectsDir`, `shadersDir`, `scenesDir`
- **`shared/src/types/index.ts`** — Export workspace module

### Tests — `shared/src/workspace/__tests__/hash.test.ts`
1. Hash stability across calls
2. Hash differs on content mutation
3. Deterministic ordering for stable JSON hash
4. Never throws; returns valid hex for empty input

### Success Criteria
- Shared types compile with `effects` as first-class tag
- All existing code compiles after type updates
- No eager parsed payload type as source-of-truth

---

## Phase 1 — Snapshot API + Universal Scaffold

**Dependencies:** Phase 0

### Goal
Snapshot endpoint returning file metadata+content. One universal scaffold for every new game.

### Files to Create

**`api/src/services/WorkspaceScaffoldService.ts`**
```ts
export class WorkspaceScaffoldService {
  constructor(private readonly bucket: R2Bucket) {}
  seedIfMissing(options: { gameId: string; gameTitle?: string }): Promise<{ created: string[]; skipped: string[] }>;
}
```

### Universal Scaffold Contents (no modes — agent decides content)

| File | Content |
|------|---------|
| `slopcade.json` | `{ "id": "<gameId>", "name": "<title>", "version": "0.1.0", "activeScene": null }` |
| `world.json` | `{ "gravity": { "x": 0, "y": 10 }, "pixelsPerMeter": 50, "bounds": { "width": 20, "height": 12 }, "background": { "type": "static", "color": "#0f172a" } }` |
| `entities.json` | `[]` |
| `rules.json` | `[]` |
| `prefabs/default.json` | `{ "id": "default", "visual": { "type": "rect", "width": 1, "height": 1, "color": "#fff" }, "physics": { "bodyType": "static" }, "tags": ["default"] }` |
| `scripts/main.js` | `exports.onStart = function(ctx) {}; exports.onUpdate = function(ctx, dt) {};` |
| `effects/screen.json` | Empty EffectGraphSpec with `"nodes": [], "connections": []` |

### Snapshot API — New tRPC query `getWorkspaceSnapshot`
- Input: `{ gameId, sinceRevision? }`
- Returns: `{ changed: boolean; snapshot?: WorkspaceSnapshot }`
- If `sinceRevision === currentRevision` → `{ changed: false }`

### Revision Algorithm
1. Per file: `contentHash = hashStringFNV1a64(content)`
2. Canonical line: `${filename}|${size}|${uploaded}|${contentHash}`
3. Sort by filename, join with `\n`, hash the joined string

### Files to Modify
- `api/src/trpc/routes/chat-threads.ts` — Add snapshot query, scaffold in `sendMessage`
- `api/src/trpc/routes/games.ts` — `seedIfMissing` in `create`
- `api/src/agent/artifact-service.ts` — Add `listWorkspaceFileMeta()`, `readWorkspaceFiles()`

### Tests
1. Seeds files, idempotent re-run
2. Snapshot revision deterministic
3. `sinceRevision` short-circuit
4. Game create triggers scaffold

### Success Criteria
- Every new game has scaffold. Legacy games self-heal on chat.
- Snapshot deterministic, ownership-protected.

---

## Phase 2 — Module Graph + Dependency Invalidation

**Dependencies:** Phases 0–1

### Goal
Vite-style dependency graph. File change → propagate up importers → affected tags.

### Files to Create

**`shared/src/workspace/module-graph.ts`**
```ts
export interface ModuleNode {
  path: string;
  deps: Set<string>;       // files this node depends on
  importers: Set<string>;  // reverse edges (who depends on me)
  tagHints: WorkspaceTag[];
}

export interface InvalidationResult {
  changedPaths: string[];
  affectedPaths: string[];      // upward closure through importers
  affectedTags: WorkspaceTag[];
}

export class WorkspaceModuleGraph {
  upsertNode(path: string, tagHints: WorkspaceTag[]): void;
  setDeps(path: string, deps: string[]): void;
  invalidate(changedPaths: string[]): InvalidationResult;
  getNode(path: string): ModuleNode | undefined;
}
```

**`shared/src/workspace/dependency-extractors.ts`** — Extract deps per file type:
- Prefab: `children[].prefab → prefabs/<id>.json`, `visual.url → assets/...`
- Entity: `entity.prefab → prefabs/<id>.json`
- Effects graph: `node.type = "custom:shaders/foo.gdshader" → shaders/foo.gdshader`
- Rules: entity tag/id references (loose coupling)

**`shared/src/workspace/tag-inference.ts`** — `inferTagHints(path: string): WorkspaceTag[]`

| Path | Tags |
|------|------|
| `slopcade.json` | All (manifest = full reload) |
| `world.json` | `["world"]` |
| `entities.json` | `["entities"]` |
| `rules.json` | `["rules"]` |
| `prefabs/*.json` | `["prefabs"]` |
| `scripts/*.js` | `["scripts"]` |
| `effects/*.json` | `["effects"]` |
| `shaders/*.gdshader` | `["effects"]` |
| `assets/**` | `["assets"]` |
| `scenes/*/entities.json` | `["entities"]` |
| `scenes/*/rules.json` | `["rules"]` |
| Unknown | All (safe fallback) |

### Tests
1. Shader → effects graph → effects tag
2. Asset → prefab → parent prefab → prefabs tag
3. Multiple changes = union closure
4. Cycle-safe
5. Missing refs still tracked

### Success Criteria
- Deterministic `affectedTags` for all dependency chains
- Handles cycles and large workspaces

---

## Phase 3 — Generic Tag Hot-Reload Handlers

**Dependencies:** Phases 0–2

### Goal
Every tag gets a uniform handler. No special-casing.

### Files to Create

**`app/lib/game-engine/live/tag-handlers/types.ts`**
```ts
export interface HotReloadContext {
  mode: "edit" | "play";
  activeScene: string | null;
  bridge: GodotBridge;
  runtime: { applyRules: (rules: GameRule[]) => void; applyScript: (source: string) => Promise<void> };
}

export interface TagHotReloadHandler<TPayload = unknown> {
  canHotSwap(oldHash: string, newHash: string, context: HotReloadContext): boolean;
  hotSwap(oldPayload: TPayload, newPayload: TPayload, context: HotReloadContext): Promise<void>;
  fullReload(payload: TPayload, context: HotReloadContext): Promise<void>;
}
```

**7 handler files** in `app/lib/game-engine/live/tag-handlers/`:

| Handler | Hot-Swap Action | Bridge Call |
|---------|----------------|-------------|
| `world-handler.ts` | Re-apply world config | `bridge.setupWorld()` |
| `prefabs-handler.ts` | Reconcile instances (Phase 5) | `bridge.registerPrefabs()` + reconciler |
| `entities-handler.ts` | Clear + reload | `bridge.clearEntities()` + `loadEntities()` |
| `rules-handler.ts` | Runtime reload | `runtime.applyRules()` |
| `scripts-handler.ts` | Sandbox reload | `runtime.applyScript()` |
| `effects-handler.ts` | Compile, diff plans, apply | `bridge.applyEffectPlan()` or `hotSwapShader()` |
| `assets-handler.ts` | Preload textures | `bridge.preloadTextures()` |

**`app/lib/game-engine/live/WorkspaceFileStore.ts`** — Holds latest snapshot, provides lazy file access.

**`app/lib/game-engine/live/TagPayloadResolver.ts`** — Parses file content on-demand per tag.

**`app/lib/game-engine/live/HotReloadOrchestrator.ts`** — For each affected tag: `canHotSwap()` → `hotSwap()` or `fullReload()`. Failure → retry `fullReload()` once → escalate to full reset.

### Tests
1. Orchestrator routes hotSwap vs fullReload by mode
2. Resolver resolves lazily
3. Each handler calls correct bridge method

### Success Criteria
- No shader-specific path anywhere
- All tags through `TagHotReloadHandler`
- Payloads resolved lazily

---

## Phase 4 — Live Preview Controller + State Model + Reset

**Dependencies:** Phases 1–3

### Goal
Wire preview to snapshot polling + module graph. Two orthogonal states. Hard reset.

### Files to Create

**`app/lib/game-engine/live/LivePreviewController.ts`**
```ts
export type PreviewLoadState = "idle" | "loading" | "ready" | "error";
export type PreviewMode = "edit" | "play";

export class LivePreviewController {
  initialize(snapshot: WorkspaceSnapshot, mode: PreviewMode): Promise<void>;
  onSnapshot(snapshot: WorkspaceSnapshot): Promise<void>;
  setMode(mode: PreviewMode): Promise<void>;
  reset(): Promise<void>;
  dispose(): void;
}
```

**`app/components/editor/useWorkspaceSnapshot.ts`** — Polls every 1s with `sinceRevision`.

### Mode Transitions

| Transition | Action |
|---|---|
| Edit → Play | Full reset, `setInspectMode(false)`, `resumePhysics()` |
| Play → Edit | Full reset, `setInspectMode(true)`, `pausePhysics()` |
| File change in Edit | Incremental via tag handlers |
| File change in Play | Full reset + toast |
| Reset button | `clearGame()` → full reload |

### Files to Modify
- `StageContainer.tsx` — Controller on bridge ready
- `EditorProvider.tsx` — Expose `previewLoadState`, `previewMode`, `resetPreview()`
- `EditorTopBar.tsx` — RESET button
- `PreviewControls.tsx` — Edit/Play toggle
- `GodotBridge.native.ts` — Implement `setInspectMode`

### Tests
1. Load state transitions
2. Mode switch triggers full reset
3. Snapshot coalescing
4. Reset button

### Success Criteria
- 4 load states × 2 modes only
- Reset reliably reloads
- No remount churn

---

## Phase 5 — Prefab Reconciliation (React-like)

**Dependencies:** Phases 2–4

### Goal
Diff prefab changes. Apply minimally. Preserve runtime state.

### Files to Create

**`app/lib/game-engine/reconcile/PrefabInstanceIndex.ts`** — Maps prefab IDs to entity instances (direct + nested).

**`app/lib/game-engine/reconcile/PrefabDiff.ts`** — Diffs old vs new prefab: visual, physics, collider, children, tags, behaviors.

**`app/lib/game-engine/reconcile/PrefabReconciler.ts`** — Applies minimal changes per diff result.

### Reconciliation Rules

| Change | Action | Preserved |
|--------|--------|-----------|
| Visual only | Update render props | Physics, velocity, position |
| Physics | Recreate body | Position, rotation, velocity |
| Children | Reconcile by key | Parent state, unchanged children |
| Tags | Update list | Everything else |
| Unrelated | Nothing | Everything |
| Nested | Walk deps, reconcile downstream | Each instance's own state |

### Tests
1. Visual-only preserves velocity
2. Physics recreate preserves position
3. Child add/remove/reorder
4. Nested propagation
5. Unrelated untouched

### Success Criteria
- No `clearEntities()` for visual changes
- State preservation across prefab edits

---

## Phase 6 — Effects Pipeline + Scene-Ready Loading

**Dependencies:** Phases 2–5

### Goal
Effects through generic handler. Scene-ready file structure.

### Effect Graph Structure
```
effects/screen.json → references → shaders/crt.gdshader (via "custom:shaders/crt.gdshader")
```

### Effects Handler
- Compile graphs via `compileGraph()`
- Diff plans: shader-only → `hotSwapShader()`, structural → `applyEffectPlan()`
- All through generic `TagHotReloadHandler`

### Scene Design
- V1: top-level files, `activeScene: null`
- V2: `scenes/{name}/entities.json`, `scenes/{name}/rules.json`. Shared prefabs/assets/effects.
- `TagPayloadResolver` checks `activeScene`

### Tests
1. Effects resolver compiles and links shaders
2. Handler hot-swaps through generic path
3. Scene-local loading doesn't break V1

### Success Criteria
- Effects exclusively through generic handler
- Scene loading V2-ready

---

## Phase 7 — Bridge Methods + Agent Tools + Debug Bridge

**Dependencies:** Phases 0–6

### New Bridge Methods
```ts
loadRules(rules: GameRule[]): void;
loadScript(source: string): Promise<{ ok: boolean; error?: string }>;
applyEffectPlan(plan: CompiledPlan): Promise<{ ok: boolean; error?: string }>;
```

### Agent Prompt (workspace-first)
- Remove `document.md` assumption
- Add workspace conventions, effect graph structure, prefab nesting
- File selection guide

### New Chat Tools
- `listFiles({ prefix? })`, `readFilesBatch({ filenames[] })`

### Debug Tools (HITL)
- `pauseGame`, `resumeGame`, `stepGame`, `readGameState`, `inspectEntity`, `queryEntities`, `captureGameScreenshot`
- Generalized `PendingClientTool` replaces `PendingAskUser`
- Frontend executes against `window.debugOps` (web) / `SlopcadeDebugBridge` (native)

### Tests
1. Bridge methods web/native
2. Generic HITL suspend/resume
3. Workspace tool validation
4. Mobile graceful degradation

### Success Criteria
- Agent edits workspace files
- Debug through generic HITL
- No hardcoded special paths

---

## Final Verification

- [ ] `pnpm tsc --noEmit` passes
- [ ] All tests pass
- [ ] Edit mode: incremental hot reload via generic handlers
- [ ] Play mode: full reload on invalidated tags
- [ ] Prefab changes preserve runtime state
- [ ] Effects/shaders through module graph → effects handler
- [ ] Reset button works
- [ ] V1 files load, V2 scenes don't break V1
- [ ] Agent writes workspace files
- [ ] Debug tools work on web, degrade on mobile
- [ ] Legacy games still load via `bridge.loadGame()`
