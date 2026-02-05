# Plan: Fix lifecycle events + BallSort spawn + simplify games pipeline

## TL;DR

**Objective**: Make `game_loaded` a reliable, single-shot lifecycle event that fires only after Godot is fully ready to render the first frame (templates loaded + textures preloaded), so games like BallSort can run scripts to spawn entities and see them visually.

**Deliverables**
- Trigger types standardized to snake_case: `game_loaded`, `game_started` (no aliases/back-compat).
- End-to-end lifecycle pipeline verified: load → preload → emit lifecycle event → rules run → scripts spawn → Godot renders.
- Script `ctx.spawnEntity()` spawns via Godot bridge (with a safe defer/queue if re-entrancy is detected).
- Remove the **games server** indirection (`games/scripts/serve.ts` + API proxying to port 3847) and instead output static bundled games into the Metro app public directory for web refresh simplicity.

**Estimated effort**: Large

**Parallel execution**: YES — 3 waves (discovery + event system, spawn pipeline, games pipeline)

**Critical path**: Trigger type standardization → lifecycle “ready” semantics → script spawning path

---

## Context

### Original request
- BallSort is “acting weird” after recent changes; we reverted to regain baseline.
- Now we want a **holistic** architectural cleanup that:
  1) Standardizes event naming and event delivery (input + lifecycle events through the same queue/snapshot)
  2) Makes `game_loaded` fire only after assets are preloaded
  3) Fixes script spawn to go through Godot correctly
  4) Simplifies `games/` pipeline to remove a separate server and serve bundled games from Metro `public/`

### Key evidence from repo (verified)

#### Trigger naming mismatch (root cause of BallSort not running on “loaded”)
- `shared/src/types/rules.ts` defines trigger types as camelCase: `gameStart`, `gameLoaded`.
  - Reference: `shared/src/types/rules.ts:26-29` and interfaces `GameStartTrigger`, `GameLoadedTrigger`.
- Engine runner produces lifecycle input events as snake_case:
  - Reference: `app/lib/game-engine/systems/runner/types.ts:74-97` defines `InputEvent` types `game_started` and `game_loaded`.
- Rules runtime converts raw frame events and sets boolean flags `result.gameLoaded`/`result.gameStarted` when it sees `game_loaded` / `game_started`.
  - Reference: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts:673-712`.
- BUT trigger evaluation currently routes `gameStart`/`gameLoaded` (camelCase) into `LogicTriggerEvaluator`.
  - Reference: `RulesSystem.ts:753-772`.
- `LogicTriggerEvaluator` switches on `gameStart` and `gameLoaded`.
  - Reference: `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts:36-45`.
- BallSort compiled game currently uses `trigger: { type: "gameLoaded" }`.
  - Reference: `games/compiled/ballSort/game.ts:248-250`.

**Net effect**: `game_loaded` lifecycle events exist, but many game definitions (and shared types) refer to `gameLoaded` → rules don’t fire consistently.

#### Script spawning bypasses Godot
- Script runtime `ctx.spawnEntity()` currently creates JS-only entities via `entityManager.createEntity(...)`.
  - Reference: `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:63-73`.
- The correct spawn pattern uses `context.bridge.spawnEntity(...)` (or a fallback for tests).
  - Reference: `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts:58-69`.

#### Games pipeline indirection (to be removed)
- `games/scripts/serve.ts` runs a node server on port `3847`, serving `games/dist/*.json` and local pack manifests/assets.
  - Reference: `games/scripts/serve.ts`.
- `api/src/index.ts` proxies `/local-games` and `/local-packs` to `http://localhost:3847/...`.
  - Reference: `api/src/index.ts:73-149`.
- The app fetches from the API dev server (`http://localhost:8789/local-games...`, `local-packs...`).
  - References:
    - `app/hooks/useBrowseGames.ts:45-60`
    - `app/app/test-games/[id].tsx` (fetching local game + packs)
    - `app/lib/game-engine/hooks/useAssetResolution.ts` (pack fetch)

---

## Work objectives

### Core objective
Make lifecycle events and rule triggers consistent and reliable, so `game_loaded` is a deterministic “Godot ready” point and script-driven spawns render in Godot.

### Concrete deliverables
1) `shared/src/types/rules.ts` uses snake_case trigger types for lifecycle triggers.
2) Rules evaluation supports snake_case lifecycle triggers end-to-end.
3) `RunScriptActionExecutor` spawnEntity uses the bridge spawn path (and does not silently create JS-only entities in production).
4) A clear lifecycle contract:
   - `game_loaded` emitted once per game load
   - emitted only after textures are preloaded (first frame render-ready)
5) Games pipeline simplified:
   - remove `games/scripts/serve.ts` from dev path
   - remove API proxy dependency on port 3847
   - web can fetch compiled game JSON from Metro static/public output

### Definition of Done (DoD)
- BallSort loads and shows balls on initial load (no invisible JS-only entities).
- The `generate_level` rule triggers on `game_loaded` reliably.
- There are **zero** `gameStart`/`gameLoaded` trigger types remaining in the codebase.
- Dev workflow: modifying `games/compiled/**` and refreshing web page loads updated JSON from Metro public assets (no 3847 server).

### Must NOT have (guardrails)
- No mixed naming state (some snake_case triggers, some camelCase).
- No alias/mapping layer for old trigger names.
- No broad renaming of unrelated triggers/actions/conditions beyond the lifecycle triggers.
- No reliance on a human to verify; all verification must be agent-executable.

---

## Verification strategy (MANDATORY)

### Test decision
- **Infrastructure exists**: YES (Vitest present across packages)
- **Automated tests**: Tests-after
- **Agent-executed QA**: Required for each critical task

### Global verification commands
These are referenced across tasks:

```bash
pnpm tsc --noEmit
pnpm test
```

### Evidence requirements
- UI/game validation screenshots: `.sisyphus/evidence/`
- CLI output logs: `.sisyphus/evidence/`
- For lifecycle debugging: capture console logs containing lifecycle events and rule firing.

---

## URL Construction Contract (final review — web/native × online/offline)

This section locks down the **string-level URL/path contracts** so the new pipeline (direct-to-app outputs + dev symlinks) remains consistent.

### Definitions
- **R2 key**: always begins with `generated/`.
  - Example: `generated/ballSort/<packId>/<assetId>.png`
- **Local base** (for offline-mode URLs via `getAssetUrl(...)`): `localServerUrl` (no trailing slash)

### Shared URL builder behavior (source of truth)
- `@slopcade/shared:getAssetUrl(r2Key, cdnBaseUrl, config)` behaves as:
  - Offline-mode (when `offlineMode && gameId && localServerUrl`):
    - `${localServerUrl}/{gameId}/{r2Key}`
  - Online-mode:
    - `${cdnBaseUrl}/{r2Key}`

Reference: `shared/src/utils/asset-url.ts:13-25`.

### Required runtime behavior by platform

#### Web (DEV, local template games)
- `localServerUrl` MUST be `'/slopcade/games'` (NOT `http://localhost:8789/local-assets`).
- Asset URL becomes:
  - `/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png`
- Static files must exist at:
  - `app/public/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png`
- Game JSON must be fetchable at:
  - `/games/{gameId}/game.json`

#### Native (DEV, embedded games installed to offline storage)
- `localServerUrl` MUST be `file://${FileSystem.documentDirectory}slopcade/games`.
- Asset URL becomes:
  - `file://{documentDirectory}slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png`
- Files must exist at runtime after installation:
  - `{documentDirectory}slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png`
  - `{documentDirectory}slopcade/games/{gameId}/manifest.json`

Reference installer: `app/lib/offline/embedded-games.ts` (writes manifest and copies assets based on r2Key).

#### Online mode (web + native)
- `cdnBaseUrl` MUST be `env.assetCdnUrl` and should continue to yield:
  - `https://.../assets/generated/...`

### Immediate mismatches to fix (observed)
- `app/lib/offline/local-asset-server.ts:getServerUrl()` currently returns `http://localhost:8789/local-assets` on web and `file://slopcade/games/` on native — both must be updated to the contracts above.
- Template-mode pack resolution currently fetches `http://localhost:8789/local-packs/...` in:
  - `app/lib/game-engine/hooks/useAssetResolution.ts:165-175`
  - `app/app/test-games/[id].tsx:30-40`
  These must be replaced with static/public + embedded sources (no API dependency).

---

## Execution strategy

### Parallel execution waves

**Wave 1 (Discovery + contracts)**
- Identify all remaining `gameLoaded/gameStart` usages (including compiled games, bundler tests, any transforms).
- Decide and document the exact “ready” semantics & where `game_loaded` is emitted.

**Wave 2 (Lifecycle + trigger type standardization)**
- Convert shared trigger types and engine trigger evaluation to snake_case.
- Update all compiled games to use snake_case triggers.

**Wave 3 (Spawn pipeline + games pipeline simplification)**
- Fix script spawn to call the bridge.
- Add a safe defer/queue around bridge operations if re-entrancy is observed.
- Replace games server + API proxy with static output into Metro `public/` (web).

Critical path: Wave 2 → Wave 3.

---

## TODOs

> Note: Tasks include references so the executor can work with minimal additional discovery.

### 1) Discovery: locate all lifecycle trigger usages and transformations

**What to do**
- Search for all occurrences of `gameLoaded`, `gameStart`, `game_loaded`, `game_started`.
- Determine whether any tooling auto-transforms snake_case ↔ camelCase (e.g., game bundler).
- List every compiled game that uses lifecycle triggers.

**References**
- `shared/src/types/rules.ts` (source of trigger type union)
- `games/compiled/ballSort/game.ts` (known offender)
- `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts` (mentions `gameStart`)

**Acceptance criteria**
- A list of files to change is produced and attached in the PR description or captured in `.sisyphus/evidence/task-1-lifecycle-search.txt`.

**Agent-Executed QA Scenario**
```
Scenario: Enumerate lifecycle trigger usage
  Tool: Bash
  Steps:
    1. Run grep to find lifecycle trigger strings across repo
    2. Save output to .sisyphus/evidence/task-1-lifecycle-search.txt
  Expected Result: File contains all occurrences for follow-up tasks
  Evidence: .sisyphus/evidence/task-1-lifecycle-search.txt
```

---

### 2) Standardize shared trigger types to snake_case

**What to do**
- In `shared/src/types/rules.ts`:
  - Change `RuleTriggerType` union: remove `gameStart`, `gameLoaded`; add `game_started`, `game_loaded`.
  - Update `GameStartTrigger` and `GameLoadedTrigger` interfaces accordingly.
  - Ensure exports/types align with other engine packages.

**Must NOT do**
- Don’t change unrelated trigger types (tap/drag/collision/etc.).

**References**
- `shared/src/types/rules.ts:15-125`

**Acceptance criteria**
- TypeScript compilation succeeds:
  - `pnpm tsc --noEmit` → exit code 0
- No remaining references to old trigger type strings in `shared/`.

**Agent-Executed QA Scenario**
```
Scenario: Type-level validation of trigger union
  Tool: Bash
  Steps:
    1. Run pnpm tsc --noEmit
    2. Grep shared/src/types/rules.ts for 'gameLoaded' and 'gameStart'
  Expected Result: typecheck passes and old trigger strings absent
  Evidence: terminal output captured
```

---

### 3) Update engine rule evaluation to use snake_case lifecycle trigger types

**What to do**
- Update `RulesSystem.evaluateTrigger(...)` routing to handle `game_loaded` and `game_started` trigger types.
- Update `LogicTriggerEvaluator` to switch on `game_loaded` / `game_started` instead of camelCase.
- Verify that the rule context field used is consistent (current engine uses `context.inputEvents.gameLoaded/gameStarted` flags derived from raw events).

**Important architectural note**
- We are standardizing **trigger.type values** to snake_case.
- We are NOT attempting to rename all internal snapshot property names (e.g. `dragStart`), because that would balloon scope. The stable contract is:
  - raw `InputEvent.type` values are snake_case
  - rule trigger types are snake_case
  - internal snapshot booleans may remain camelCase (`gameLoaded`) as an implementation detail.

**References**
- `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts:673-712` (conversion of raw input events)
- `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts:753-772` (trigger routing)
- `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts:36-45`

**Acceptance criteria**
- `pnpm test` includes a test that:
  - a rule with `trigger.type === 'game_loaded'` fires when lifecycle event is emitted
- No remaining string literals `case 'gameLoaded'` or `case 'gameStart'` in engine trigger evaluation.

**Agent-Executed QA Scenarios**
```
Scenario: Unit test for game_loaded trigger evaluation
  Tool: Bash
  Preconditions: tests exist / can be added (Vitest)
  Steps:
    1. Run pnpm test --filter game_loaded (or full suite)
    2. Assert test passes
  Expected Result: game_loaded triggers are evaluated correctly
  Evidence: terminal output captured
```

---

### 4) Update compiled games to use snake_case lifecycle trigger types

**What to do**
- Update all `games/compiled/*/game.ts` (and any sources that generate them) to use:
  - `trigger: { type: 'game_loaded' }` and `trigger: { type: 'game_started' }`
  - Replace existing `gameLoaded`/`gameStart`.

**References**
- `games/compiled/ballSort/game.ts:244-251` (BallSort generate_level rule)

**Acceptance criteria**
- `grep -R "gameLoaded\"" games/compiled` → no matches
- `grep -R "gameStart\"" games/compiled` → no matches
- `pnpm tsc --noEmit` passes

**Agent-Executed QA Scenario**
```
Scenario: Ensure compiled games contain only snake_case lifecycle triggers
  Tool: Bash
  Steps:
    1. grep -R "gameLoaded" games/compiled
    2. grep -R "gameStart" games/compiled
  Expected Result: both commands return no matches (exit code 1 or empty output)
  Evidence: terminal output captured
```

---

### 5) Make `game_loaded` truly mean “assets preloaded and first-frame ready”

**What to do**
- Define and implement a single authoritative point where lifecycle events are queued.
- Ensure the pipeline is:
  1. JS loads game definition into Godot
  2. Textures are preloaded (blocking/awaitable)
  3. Only then: enqueue `game_loaded` into the frame input events queue

**Implementation approach (recommended)**
- Add an **async bridge method** (QuerySystem handler) to perform “load + preload” as one atomic async step, e.g. `loadGameAsync`.
- JS uses `queryAsync('loadGameAsync', [jsonDef])` to await completion.

**References**
- Godot bridge exposure pattern: `godot_project/scripts/GameBridge.gd:_setup_js_bridge()`
- Query proxy layer: `app/lib/godot/query.ts` and `godot_project/scripts/bridge/QuerySystem.gd` (existing pattern)
- VisualRenderer preloading capability: `godot_project/scripts/bridge/VisualRenderer.gd` (`_js_preload_textures`)
- Current non-async load: `godot_project/scripts/GameBridge.gd:242-256` (`load_game_json`)

**Acceptance criteria**
- When running BallSort, logs show:
  - preload completes before `game_loaded` is delivered to rules
- `game_loaded` does not fire twice on initial load.

**Agent-Executed QA Scenario (Game Inspector)**
```
Scenario: game_loaded fires only after preload
  Tool: game-inspector (MCP)
  Steps:
    1. Open http://localhost:8085/test-games/ballSort
    2. Capture console logs filtered by "Lifecycle" and/or preload logs
    3. Assert ordering: preload complete → then game_loaded
  Expected Result: deterministic ordering; no early rule execution
  Evidence: .sisyphus/evidence/task-5-lifecycle-logs.txt
```

---

### 6) Fix script ctx.spawnEntity to spawn visually in Godot (bridge path)

**What to do**
- Update `RunScriptActionExecutor.createRuntimeContext().entityManager.spawnEntity` implementation:
  - If `context.bridge` exists, spawn through the bridge.
  - Provide a test-friendly fallback if bridge is absent.
- Ensure IDs are consistent enough for immediate tag operations in script (BallSort tags the returned entity ID).

**WASM re-entrancy guard (required)**
- If calling `context.bridge.spawnEntity` from inside script execution can re-enter WASM or crash:
  - Queue spawn requests and flush them after script execution, preferably in a microtask or next tick.

**References**
- Broken behavior: `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:63-73`
- Working reference: `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts:58-69`
- BallSort script: `games/compiled/ballSort/script.ts:17-31`

**Acceptance criteria**
- In BallSort, after `generateLevel()`, balls appear visually (not just in JS entity manager).
- No crashes due to re-entrancy when spawning multiple balls.

**Agent-Executed QA Scenario (UI)**
```
Scenario: BallSort spawns visible balls after game_loaded
  Tool: game-inspector (MCP)
  Preconditions: pnpm dev running; BallSort accessible at /test-games/ballSort
  Steps:
    1. Open ballSort test game
    2. Take screenshot after load
    3. Query entity count for tag 'ball'
  Expected Result:
    - Screenshot shows balls
    - Entity count for 'ball' is > 0
  Evidence:
    - .sisyphus/evidence/task-6-ballsort-after-load.png
```

---

### 7) Simplify games pipeline: remove games server + API proxy dependency

**What to do**
- Remove `games/scripts/serve.ts` from the dev path.
- Remove `/local-games` and `/local-packs` proxying to port 3847 from `api/src/index.ts`.
- Change games build output to also write bundled JSON into Metro web static/public directory.
  - Current build writes to `games/dist/*.json` and `games/dist/manifest.json`.
  - Add a second output target under `app/public/` (exact path is a decision; see below).
- Update app to fetch from static paths (for web), not from `http://localhost:8789/local-games`.

**Decisions (confirmed)**
1) **Platform scope**: Web + Native.
   - Web: load game JSON and assets from Metro static output.
   - Native: use the existing **embedded/offline pipeline** so template games behave like “downloaded games”.

2) **Web static output layout** (confirmed):
   - Game JSON: `/games/{id}/game.json` (built into `app/public/games/{id}/game.json`).

3) **Local packs/assets** (confirmed):
   - Pack manifest + generated PNGs must be available as static files.
   - For offline URL resolution, align with `app/lib/offline/local-asset-server.ts` expectations.
     - Web base dir is `'/slopcade/games/'`.
     - Offline asset URLs resolve as: `/{baseDir}/{gameId}/{r2Key}`.
     - Example: `/slopcade/games/ballSort/generated/ballSort/<packId>/<assetId>.png`.

**Concrete approach (updated requirement: NO games/dist)**

> Requirement: nothing should ever read from `@slopcade/games/dist`. Ideally it does not exist.
> The games build should emit **directly** into the app’s served/embedded locations.

- Replace the games server (port 3847) with **direct build outputs**, using a *single* source of truth and dev-only symlinks to avoid duplication:

  - **Single source of truth (build output)** (preferred):
    - Build everything into **native-embedded layout**:
      - `app/assets/embedded-games/{gameId}/game.json`
      - `app/assets/embedded-games/{gameId}/asset-manifest.json`
      - `app/assets/embedded-games/{gameId}/assets/*.png`
      - (Optional) also emit files into the offline-path-shaped layout if needed for URL compatibility (see below).

  - **Web dev static serving (NO copies)**:
    - Create **dev-only symlinks** so Metro can serve the same files under the required URLs:
      - `/games/{id}/game.json` → `app/public/games/{id}/game.json`
      - `/slopcade/games/{gameId}/...` → `app/public/slopcade/games/{gameId}/...`
    - Symlink strategy (recommended):
      - `app/public/games/{gameId}` symlinks to `app/assets/embedded-games/{gameId}`
        - so `/games/{gameId}/game.json` reads the embedded output
      - `app/public/slopcade/games` symlinks to a directory whose internal layout matches `local-asset-server.ts` web base dir `'/slopcade/games/'`.
        - Contract from `app/lib/offline/local-asset-server.ts:getLocalAssetPath()`:
          - URL: `/slopcade/games/{gameId}/{r2Key}`
          - Example: `/slopcade/games/ballSort/generated/ballSort/<packId>/<assetId>.png`

  - **Native runtime**:
    - Keep `app/lib/offline/embedded-games.ts` + `installEmbeddedGames()` as the runtime installer into documentDirectory.
    - This preserves the existing offline pipeline and makes “template games” behave like local/offline games.

  - **Dev-only symlink creation**:
    - Prefer creating/refreshing symlinks as part of the games watch/dev command (idempotent), rather than committing them to git.
    - Confirmed constraints:
      - **Dev-only** (not required for production builds)
      - **No Windows support required**

**Implications / required refactors**
- Refactor `app/scripts/embed-games.ts` to NOT read `games/dist/*`.
  - Instead, it should either:
    1) become a thin wrapper that triggers the games build to write the embedded outputs directly, OR
    2) be removed entirely if the games build can write embedded outputs as part of `pnpm dev`.
- Refactor `@slopcade/games` build script(s):
  - Replace `DIST_DIR` output with targets under `app/assets/embedded-games` and `app/public/...`.

**Guardrail**
- MUST ensure any other package (API, app, scripts) does not reference `games/dist`.

**References**
- Current games build output: `games/scripts/build.ts:86-156`
- Current games server: `games/scripts/serve.ts`
- API proxy: `api/src/index.ts:73-149`
- App local games list: `app/hooks/useBrowseGames.ts:45-60`
- Offline asset URL contract: `app/lib/offline/local-asset-server.ts:7-48,130-151`
- Embedded install pipeline: `app/lib/offline/embedded-games.ts` and `app/scripts/embed-games.ts`

**Acceptance criteria**
- With no 3847 server running:
  - Web can list and load local template games.
- `api/src/index.ts` contains no proxy calls to `http://localhost:3847`.

---

### 8) Align URL construction + template asset-pack resolution with static/public + offline pipeline

**What to do**
- Update `app/lib/offline/local-asset-server.ts`:
  - Web: `getServerUrl()` returns `'/slopcade/games'`.
  - Native: `getServerUrl()` returns `file://${FileSystem.documentDirectory}slopcade/games`.
  - Ensure behavior matches `shared/src/utils/asset-url.ts` offline branch.
- Remove remaining hard-coded localhost template pack fetches and replace with static/embedded reads:
  - Replace `http://localhost:8789/local-packs/...` in:
    - `app/lib/game-engine/hooks/useAssetResolution.ts`
    - `app/app/test-games/[id].tsx`
  - Source of pack entries should come from the new direct build outputs:
    - Web: a static JSON file colocated with `game.json` (recommended: `/games/{gameId}/asset-manifest.json`)
    - Native: `app/assets/embedded-games/{gameId}/asset-manifest.json` (already used by embed pipeline)
- Ensure the resolved URLs passed into preloading and rendering are consistent across platforms.

**References**
- URL builder: `shared/src/utils/asset-url.ts:13-25`
- Current (to replace):
  - `app/lib/game-engine/hooks/useAssetResolution.ts:165-192`
  - `app/app/test-games/[id].tsx:30-69`
- Offline base dir expectations:
  - `app/lib/offline/local-asset-server.ts:31-48,130-151`
- Embedded installer:
  - `app/lib/offline/embedded-games.ts:101-176`

**Acceptance criteria**
- No remaining `http://localhost:8789/local-packs/` fetches in the app.
- Web template game loads assets from `/slopcade/games/...` (network panel shows same-origin requests, no API).
- Native template game resolves asset URLs as `file://{documentDirectory}...` and does not attempt to fetch packs from network.

**Agent-Executed QA Scenarios**
```
Scenario: Web template asset URLs resolve via /slopcade/games
  Tool: Playwright (or game-inspector open + console logs)
  Steps:
    1. Open /test-games/ballSort
    2. Capture network requests for PNGs
    3. Assert each image request URL path starts with /slopcade/games/
  Expected Result: all template assets are served locally via static path
  Evidence: .sisyphus/evidence/task-8-web-network.txt + screenshot

Scenario: Native offline asset URL format is file://{documentDirectory}
  Tool: Bash (unit test) + logs
  Steps:
    1. Run a unit test for getServerUrl() on native platform shim
    2. Assert returned base includes FileSystem.documentDirectory
  Expected Result: file:// base points to documentDirectory, not a relative path
  Evidence: terminal output
```

**Agent-Executed QA Scenario**
```
Scenario: Web loads template game without games server
  Tool: Bash + browser automation (Playwright) OR game-inspector open
  Steps:
    1. Ensure no process is listening on :3847
    2. Open /test-games/ballSort and confirm it fetches static JSON successfully
  Expected Result: BallSort loads without local-games/local-packs proxy dependency
  Evidence: console logs + screenshot
```

---

## Commit strategy (recommended)
- 1 commit for trigger type standardization (shared + engine + compiled games)
- 1 commit for lifecycle readiness (async load + preload + event emission)
- 1 commit for script spawn + re-entrancy guard
- 1 commit for games pipeline simplification (build output + API cleanup + app fetch path changes)

---

## Success criteria

### Functional
- BallSort generates level on first load via `game_loaded` and balls are visible.
- `game_loaded` happens after assets are preloaded.

### Architectural
- Lifecycle triggers are snake_case end-to-end in definitions and engine.
- Events (raw types + triggers) are consistent; no accidental casing transforms.

### Pipeline
- No dedicated games server required for web dev; games are served as static assets from Metro.
