# Game Lifecycle Architecture Cleanup (Ball Sort spawn + event naming + offline games pipeline)

## TL;DR

> **Quick Summary**: Fix Ball Sort’s invisible script-spawned entities by (1) making `game_loaded` truly “Godot ready to render first frame”, (2) routing script spawns through the Godot bridge with a re-entrancy-safe deferral mechanism, and (3) standardizing lifecycle + input events and rule trigger types to **snake_case** everywhere.
>
> **Also**: simplify the games pipeline so games compile into **static** `app/public/games/{gameId}/game.json` (definition + inline script), remove the separate games server, and unify loading so the engine can load **local/offline** or **remote (DB/CDN)** via the same code path.

**Deliverables**
- Static game artifacts: `app/public/games/{gameId}/game.json` (definition + script inline)
- Removal/simplification of `games/scripts/serve.ts`-based serving; watcher/build only
- Snake_case event + trigger naming across engine + shared types + compiled games
- `loadGame()` becomes **awaitable** and resolves only after Godot has preloaded textures and can render the first frame
- Script `ctx.spawnEntity()` spawns in Godot via bridge, using a **defer/queue** to avoid WASM re-entrancy
- Tests-after coverage for critical paths (casing, lifecycle gating, spawn deferral)

**Estimated Effort**: **XL** (multi-system changes: games toolchain + shared types + engine + Godot)

**Parallel Execution**: **YES** (Phase 0 pipeline work can be parallelized with Phase 1 renames, but integration points require sequencing)

**Critical Path**: Phase 0 (pipeline) → Phase 1 (rename) → Phase 2 (awaitable ready) → Phase 3 (script spawn + defer) → Phase 4 (tests + cleanup)

---

## Context

### Original Request
- Ball Sort: balls spawned during `game_loaded` via script don’t appear visually.
- Standardize event naming to snake_case across input + lifecycle (`game_loaded`, `game_started`, `tap`, `drag_start`, …).
- Ensure `game_loaded` fires only after Godot has parsed the game definition, templates are set, textures are preloaded, and Godot is ready to render the first frame.
- Fix script spawning: `ctx.spawnEntity()` must call into the Godot bridge.
- Handle/avoid WASM re-entrancy: queue spawn requests during script execution and process after the script completes; validate that re-entrancy is actually implicated.
- Simplify games pipeline: build to `app/public/games/…` with no separate games server; enable offline/static loading on all platforms.

### Key Evidence from Codebase Exploration

#### Current lifecycle event creation/consumption
- Godot emits: `godot_project/scripts/GameBridge.gd`
  - `signal game_loaded`
  - `game_loaded.emit(game_data)` after `load_game_json()` completes (approx line ~255)
- TS runtime queues lifecycle event: `app/lib/game-engine/GameRuntime.godot.tsx`
  - `pendingLifecycleEventsRef.current.push('game_loaded')` (approx line ~843)
- Runner converts frame events into input flags: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
  - `convertFrameInputEvents()` maps `'game_loaded'` → `result.gameLoaded = true` (approx ~701)
- Trigger evaluator reads camelCase: `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts`
  - `case 'gameLoaded'` checks `context.inputEvents.gameLoaded` (approx ~39)

#### Spawn bug
- Spawn action goes to Godot: `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` calls `context.bridge.spawnEntity(...)` (approx ~59)
- Script action is JS-only (bug): `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` implements `spawnEntity()` via `entityManager.createEntity(...)` (approx ~66)
- Script sandbox runtime also creates entities JS-side and has a deferred mutation precedent (`pendingDestroys`):
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` (spawn around ~258; `pendingDestroys` around ~44)

#### Naming mismatch already documented in tests
- `app/lib/game-engine/__tests__/trigger-type-casing.test.ts` documents casing mismatch risk.

#### Bridge surfaces
- `app/lib/godot/GodotBridge.web.ts` (`loadGame()` ~460; `spawnEntity()` ~487)
- `app/lib/godot/GodotBridge.native.ts` mirrors web.

#### Games pipeline files exist
- `games/scripts/build.ts`, `games/scripts/watch.ts`, `games/scripts/serve.ts`
- `app/app/test-games/[id].tsx`
- Existing offline embedding mechanism:
  - `app/scripts/embed-games.ts` copies `games/dist/*.json` into `app/assets/embedded-games/**` and generates `app/lib/offline/embedded-games-registry.ts`
  - This provides a proven native-offline loading path via `require(...)`.
- Compiled Ball Sort: `games/compiled/ballSort/game.ts`, `games/compiled/ballSort/script.ts`

### External Research (re-entrancy guidance)
- Godot JavaScriptBridge callbacks are synchronous; re-entrancy is a known pitfall.
- Safer patterns:
  - queue work and flush outside the callback / at end-of-frame
  - use `call_deferred()` (Godot side) to postpone engine mutations
- Practical implication: avoid calling JS→Godot mutating bridge methods from within script execution paths that may be nested in callbacks.
  - References:
    - https://docs.godotengine.org/en/stable/classes/class_javascriptbridge.html
    - https://docs.godotengine.org/en/stable/tutorials/platform/web/javascript_bridge.html

---

## Work Objectives

### Core Objective
Make the lifecycle + event + spawn architecture consistent and deterministic so scripts can safely generate levels on `game_loaded` and entities appear visually (Godot-side), while simplifying the games development pipeline and enabling offline/static loading.

### Concrete Deliverables
- All lifecycle + input events and rule triggers are snake_case (no alias layer).
- `game_loaded` is emitted only after Godot preload is complete and the first frame is render-ready.
- Scripts spawn entities via bridge (with safe deferral/queue).
- Games compile to static JSON with inline script at `app/public/games/{id}/game.json` and are loadable offline on all platforms.

### Definition of Done
- Ball Sort: running `generate_level` on `game_loaded` results in visible balls.
- No remaining references to `gameLoaded` / `gameStart` trigger types in shared types, engine, or compiled games.
- `loadGame()` is awaitable and does not resolve until Godot is render-ready.
- No separate “games server” required in dev; Metro serves static game JSON.

### Must NOT Have (Guardrails)
- No “human verification” steps in acceptance criteria. All verification must be agent-executable.
- No backward compatibility mapping/alias layer for old trigger names.
- No lazy initial texture loading: `game_loaded` must come after preload.
- Avoid a broad “queue everything” architecture unless we validate it’s needed; start minimal, instrument, and expand only if required.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every task below must be verifiable by the executing agent running commands, inspecting logs, and/or using automated tooling (e.g., Playwright, game-inspector tooling). No “user manually checks”.

### Test Decision
- **Automated tests**: **YES (tests-after)**
- **Agent-Executed QA Scenarios**: **YES (mandatory for all tasks)**

### Primary QA Tools
- **Web UI**: Playwright (if already used in repo) or `game-inspector_*` tools for deterministic checks.
- **App runtime checks**: `game-inspector_open`, `game-inspector_game_state`, `game-inspector_get_console_logs`, `game-inspector_game_screenshot`.
- **CLI build checks**: shell commands via `interactive_bash` or one-shot bash.

---

## Target Architecture (end state)

### 1) Events & Triggers
- **Single naming convention**: snake_case everywhere.
  - Frame input events: `game_loaded`, `game_started`, `tap`, `drag_start`, …
  - Rules triggers: `{ type: 'game_loaded' }`
  - InputEvents shape: `inputEvents.game_loaded: boolean`

### 2) Game load readiness
- `bridge.loadGame(definition)` is **async**.
- It resolves only when:
  1) game definition parsed in Godot
  2) templates registered
  3) textures preloaded
  4) Godot is ready to render the first frame
- Only then does JS enqueue `game_loaded` into the engine lifecycle events.

### 3) Script execution & safe mutations
- Scripts run inside sandbox context.
- Mutations that require Godot (spawn/destroy/…) must be **deferred** until the sandbox returns control.
  - Start with spawn deferral.
  - Add instrumentation (log / counters) to confirm whether re-entrancy occurs.
  - Expand scope (other mutations) only if needed.

### 4) Games pipeline
- Build output becomes static content:
  - `app/public/games/{gameId}/game.json` (definition + script inline)
- App game loader chooses source:
  1) local bundled/static assets (offline)
  2) remote DB/CDN (online)

**Note (important for native)**:
- `app/public/**` is a web/Metro static concept.
- For **native offline**, prefer leveraging the existing embedded games mechanism:
  - `pnpm --filter slopcade embed:games` + `app/assets/embedded-games/**` + generated registry.
- The plan below aligns Phase 0 so that `app/public/games/**` (web/static) and embedded games (native/offline) both consume the *same* underlying game JSON shape.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 0.1 (games build output) and Task 1.1 (snake_case renames) can be developed in parallel.

Wave 2 (After Wave 1):
- Task 0.2/0.3 (loader + test-games screen) depends on 0.1.
- Task 1.2/1.3 (update compiled games + fix tests) depends on 1.1.

Wave 3 (After Wave 2):
- Task 2.x (awaitable load readiness) depends on 1.x naming agreement.
- Task 3.x (script spawn + deferral) depends on 2.x.

Critical Path:
0.1 → 0.2 → 1.1 → 2.1 → 3.1 → 4.x

---

## TODOs

> Implementation + verification are combined per task (tests-after, but each task still includes QA scenarios).

### Phase 0 — Simplify games build pipeline (static, offline-capable)

- [ ] 0.1 Change games build output to `app/public/games/{gameId}/game.json` (inline script)

  **What to do**:
  - Update `games/scripts/build.ts` to emit per-game directory output into `app/public/games/{gameId}/game.json`.
  - Define the JSON shape (definition + inline script) explicitly and ensure the runtime loader expects this.
  - Ensure `games/scripts/watch.ts` rebuilds incrementally into the same output folder.
  - Ensure output is deterministic (stable formatting) to improve caching + diffs.
  - Confirm how this interacts with the existing `games/dist/manifest.json` flow:
    - Option A (recommended): keep `games/dist` as canonical and *also* mirror/copy into `app/public/games/` for web.
    - Option B: change canonical output from `games/dist` → `app/public/games/` and update `app/scripts/embed-games.ts` accordingly.

  **Must NOT do**:
  - Don’t keep writing to the old output path in parallel (avoid two sources of truth).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`
    - Reason: build pipeline changes can have non-obvious consumers.

  **Parallelization**:
  - Can run in parallel with: 1.1

  **References**:
  - `games/scripts/build.ts` — build output and JSON generation
  - `games/package.json` — scripts: `pnpm --filter @slopcade/games build|watch|serve`
  - `games/compiled/ballSort/game.ts` / `games/compiled/ballSort/script.ts` — examples of compiled sources that feed JSON
  - `app/public/` — current static serving location (already used for Godot web export)
  - `app/scripts/embed-games.ts` — existing embedding pipeline consuming `games/dist/manifest.json`

  **Acceptance Criteria (agent-executable)**:
  - [ ] Running `pnpm --filter @slopcade/games build` produces `app/public/games/ballSort/game.json`.
  - [ ] `game.json` contains:
    - a game definition payload
    - an inline script payload
  - [ ] Re-running build produces identical output for unchanged sources (byte-for-byte or stable JSON formatting).

  **Agent-Executed QA Scenarios**:
  - Scenario: Build emits static JSON
    - Tool: CLI (bash)
    - Steps:
      1. Run the repo’s games build script (as defined in `games/package.json` or workspace scripts).
      2. Assert file exists: `app/public/games/ballSort/game.json`.
      3. Read JSON and assert required keys present (definition + script).
    - Evidence: captured command output + file listing.

- [ ] 0.2 Remove separate games server; convert to watcher-only dev workflow

  **What to do**:
  - Deprecate/remove `games/scripts/serve.ts`.
  - Ensure development loop relies on Metro serving `app/public/games/...`.
  - Update any references to the old server port/URL.

  **Must NOT do**:
  - Don’t leave a hidden fallback that still points to `localhost:8789` (or similar) — single source.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`, `devmux`

  **Parallelization**:
  - Blocked by: 0.1

  **References**:
  - `games/scripts/serve.ts` — current server logic to remove
  - `games/scripts/watch.ts` — likely base for watcher-only behavior
  - Any devmux configuration that starts the games server (project-specific)

  **Acceptance Criteria**:
  - [ ] No dev workflow requires starting a separate games server.
  - [ ] `games/scripts/serve.ts` is removed or becomes a thin wrapper that prints deprecation and exits non-zero.

- [ ] 0.3 Implement unified “game source” loader for local/offline + remote (all platforms)

  **What to do**:
  - Create a `GameSource` abstraction in the app engine layer:
    - `LocalStaticGameSource` (offline bundle / Metro public on web)
    - `RemoteGameSource` (DB/CDN)
    - A `CompositeGameSource` with priority ordering: local → remote
  - Web behavior: fetch from `/games/{id}/game.json` (served from `app/public/games/**`).
  - Native behavior: integrate with the **existing offline pipeline**:
    - Offline games live under `FileSystem.documentDirectory/slopcade/games/{gameId}/`.
    - `manifest.json` format is already established in:
      - `app/lib/offline/download-manager.ts` (downloaded games)
      - `app/lib/offline/embedded-games.ts` (embedded games installation writes the same manifest into the same directory)
    - Local source should resolve game definition (including inline script) from the local `manifest.json` first.
    - Embedded games should be treated as a *feeder* into the same offline directory (via `installEmbeddedGames()`), not a separate parallel store.
  - Establish the explicit contract: “if games exist locally, loader uses them; otherwise remote.”

  **Must NOT do**:
  - Don’t hardcode web-only `/public` semantics into native.
  - Don’t rely on dev-only server URLs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `building-native-ui`, `systematic-debugging`

  **Parallelization**:
  - Blocked by: 0.1

  **References**:
  - `app/app/test-games/[id].tsx` — current game fetch path
  - `app/public/` — static web assets precedent
  - `app/scripts/embed-games.ts` — generates embedded JSON + assets + registry
  - `app/lib/offline/embedded-games.ts` — installs embedded games into offline directory + writes offline manifest
  - `app/lib/offline/download-manager.ts` — offline manifest contract + storage structure
  - `app/lib/offline/local-asset-server.ts` — file:// URL strategy for locally stored assets
  - Platform-specific module pattern (preferred in this repo):
    - see AGENTS.md guidance for `*.web.ts` / `*.native.ts` modules

  **Acceptance Criteria**:
  - [ ] Web: `test-games/ballSort` loads game JSON from local static path.
  - [ ] Native: `test-games/ballSort` loads from local offline-capable source (no network required) when local artifact exists.
  - [ ] Remote fallback: when local artifact absent, loader fetches from remote source.

  **Agent-Executed QA Scenarios**:
  - Scenario: Web loads local static game
    - Tool: Playwright OR game-inspector (web)
    - Steps:
      1. Start app in web mode.
      2. Navigate to `/test-games/ballSort`.
      3. Assert network request is to `/games/ballSort/game.json` (not external server).
      4. Assert game loads successfully (no error UI).
    - Evidence: screenshot + console logs.
  - Scenario: Offline local load (native)
    - Tool: agent-run native simulator flow (tmux / devmux as applicable)
    - Steps:
      1. Ensure embedded games is enabled and generated (e.g., `EXPO_PUBLIC_EMBED_GAMES=true pnpm --filter slopcade embed:games`).
      2. Disable network or simulate offline.
      3. Open `test-games/ballSort`.
      4. Assert loader chooses embedded local source and game loads.
    - Evidence: logs showing chosen source.

- [ ] 0.4 Update `app/app/test-games/[id].tsx` to use new loader (no external server)

  **What to do**:
  - Replace hardcoded external server URL with `CompositeGameSource`.
  - Ensure both web/native behave consistently.

  **References**:
  - `app/app/test-games/[id].tsx`

  **Acceptance Criteria**:
  - [ ] No references to games dev server remain in this file.
  - [ ] Ball Sort test-game loads via local-first source.

---

### Phase 1 — Standardize naming to snake_case everywhere (no alias layer)

- [ ] 1.1 Rename rule trigger types and InputEvents to snake_case

  **What to do**:
  - Update shared rule trigger types:
    - `shared/src/types/rules.ts`: change `GameLoadedTrigger` from `type: 'gameLoaded'` → `type: 'game_loaded'`.
  - Update engine trigger evaluation:
    - `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts`: update switch cases to snake_case.
  - Update InputEvents shape:
    - `app/lib/game-engine/BehaviorContext.ts` / `app/lib/game-engine/rules/types.ts` (where InputEvents is defined/consumed): rename flags to snake_case.
  - Update `RulesSystem.convertFrameInputEvents()` to set `result.game_loaded = true` (and similarly for other lifecycle events).

  **Must NOT do**:
  - Do not keep `gameLoaded` compatibility mapping.

  **References**:
  - `shared/src/types/rules.ts` — trigger type definitions (camelCase today)
  - `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts` — currently checks `gameLoaded`
  - `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` — maps `'game_loaded'` → `gameLoaded` today
  - `app/lib/game-engine/systems/runner/types.ts` — already has snake_case `FrameInputEventType` entries
  - `app/lib/game-engine/__tests__/trigger-type-casing.test.ts` — update/replace to enforce snake_case

  **Acceptance Criteria**:
  - [ ] TypeScript build passes (tsc/tsserver) with no remaining references to `gameLoaded` trigger.
  - [ ] Trigger evaluator handles `game_loaded` and reads `context.inputEvents.game_loaded`.

- [ ] 1.2 Update all compiled games to snake_case triggers

  **What to do**:
  - Update game compilation pipeline or compiled outputs so triggers use `game_loaded`.
  - Ensure Ball Sort compiled game uses `{ type: 'game_loaded' }`.

  **References**:
  - `games/compiled/ballSort/game.ts` — currently uses `gameLoaded` (approx ~248)
  - `games/scripts/build.ts` — compilation output code path

  **Acceptance Criteria**:
  - [ ] `app/public/games/ballSort/game.json` (from Phase 0) contains snake_case triggers.

- [ ] 1.3 Rename remaining lifecycle/input events to snake_case (inventory + sweep)

  **What to do**:
  - Identify all lifecycle events: `gameStart/game_started`, `gameLoaded/game_loaded`, etc.
  - Rename consistently in:
    - engine event collection
    - trigger evaluation
    - rule definitions
    - tests

  **Acceptance Criteria**:
  - [ ] A grep/sweep finds no camelCase lifecycle trigger types.

---

### Phase 2 — Fix game loading lifecycle (await Godot preload)

- [ ] 2.1 Make `bridge.loadGame()` awaitable and resolve only on render-ready

  **What to do**:
  - Update `app/lib/godot/GodotBridge.web.ts` and `.native.ts` so `loadGame()` returns a Promise.
  - Ensure it uses the existing `queryAsync()` pattern (request IDs) or adds one for `loadGameJson`.
  - Ensure `GameRuntime.godot.tsx` awaits this promise before pushing `game_loaded` into pending lifecycle.

  **References**:
  - `app/lib/godot/GodotBridge.web.ts` — current `loadGame()` call path
  - `app/lib/godot/GodotBridge.native.ts` — mirror behavior
  - `app/lib/game-engine/GameRuntime.godot.tsx` — call site that queues `game_loaded`
  - `godot_project/scripts/GameBridge.gd` — current `load_game_json()` and `game_loaded` signal

  **Acceptance Criteria**:
  - [ ] `loadGame()` does not resolve until Godot reports preload complete.
  - [ ] `game_loaded` event is not emitted/queued earlier.

  **Agent-Executed QA Scenarios**:
  - Scenario: `game_loaded` is gated on preload
    - Tool: game-inspector + console logs
    - Steps:
      1. Open Ball Sort via test-games.
      2. Capture logs around load sequence.
      3. Assert sequence: `loadGame start` → `Godot preload complete` → `game_loaded queued` → `generate_level executed`.
    - Evidence: console log excerpt saved.

- [ ] 2.2 Update Godot `load_game_json()` to include texture preloading

  **What to do**:
  - In `godot_project/scripts/GameBridge.gd`, ensure load path includes:
    - parsing
    - template registration
    - texture preload completion barrier
  - Only after barrier should Godot emit `game_loaded` *and/or* resolve JS async query.
  - Prefer `call_deferred()` or frame-safe scheduling where appropriate.

  **Acceptance Criteria**:
  - [ ] A game that uses many textures still fires `game_loaded` only after preload completion.
  - [ ] No missing-texture/flicker on first frame of spawned entities.

---

### Phase 3 — Fix script spawning + re-entrancy-safe deferral

- [ ] 3.1 Route script `ctx.spawnEntity()` to Godot bridge (not JS-only EntityManager)

  **What to do**:
  - Update `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` so the script context’s `spawnEntity()` calls into:
    - a deferral queue (preferred), which later flushes to `context.bridge.spawnEntity()`.
  - Ensure return value semantics are defined (recommended default: **pre-generate ID** in JS and pass it through the bridge so scripts get a stable, final ID immediately):
    - `GodotBridge.web.ts` `spawnEntity()` already supports passing an explicit `entityId` (see current signature usage).
    - Queue items should include `entityId` so flush is deterministic.
    - This avoids “temporary ID” mapping and simplifies scripts like Ball Sort that store spawned IDs.

  **References**:
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` — current buggy spawn
  - `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` — correct bridge-based spawn
  - `app/lib/godot/GodotBridge.web.ts` / `.native.ts` — `spawnEntity()` methods

  **Acceptance Criteria**:
  - [ ] Ball Sort `generateLevel()` spawns balls that appear visually.
  - [ ] No remaining `entityManager.createEntity()` usage in script spawn path for Godot runtime.

  **Agent-Executed QA Scenarios**:
  - Scenario: Ball Sort level generation creates visible balls
    - Tool: game-inspector
    - Steps:
      1. Open Ball Sort.
      2. Wait for `game_loaded`.
      3. Query entity count for ball templates/tags.
      4. Screenshot board.
    - Expected: non-zero balls and screenshot shows balls.
    - Evidence: `.sisyphus/evidence/task-3-1-ballsort-level.png`

- [ ] 3.2 Add minimal defer/queue mechanism to avoid WASM re-entrancy (validate with instrumentation)

  **What to do**:
  - Implement a queue for bridge-bound mutations initiated during script execution.
  - Start with **spawn only** unless evidence indicates broader scope is required.
  - Place queue in a centralized runtime location with existing deferred patterns:
    - preferred: `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` (has `pendingDestroys` precedent)
  - Queue item structure should include a caller-provided `entityId` (see 3.1) so script-returned IDs match Godot entity IDs.
  - Add instrumentation:
    - log when a spawn is queued vs flushed
    - capture call stack markers / “script executing” flag
    - optionally detect nested bridge calls

  **References**:
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — pendingDestroys precedent
  - Godot JavaScriptBridge docs for synchronous callbacks:
    - https://docs.godotengine.org/en/stable/tutorials/platform/web/javascript_bridge.html

  **Acceptance Criteria**:
  - [ ] Spawns invoked inside script do not call Godot bridge synchronously.
  - [ ] Flushed spawns occur after script completes (same frame or next frame — explicitly documented).
  - [ ] If re-entrancy was the cause, bug is fixed; if not, logs make root cause evident.

- [ ] 3.3 Align ScriptSandboxRuntimeSystem and RunScriptActionExecutor behavior (single “script context” contract)

  **What to do**:
  - Ensure both script execution pathways (rules `run_script` and sandbox runtime) use the same spawning semantics.
  - Prevent future divergence by centralizing the adapter or helper.

  **Acceptance Criteria**:
  - [ ] There is exactly one authoritative implementation of `ScriptContext.spawnEntity()` for Godot runtime.

---

### Phase 4 — Tests-after + cleanup

- [ ] 4.1 Update/replace casing tests to enforce snake_case (no alias)

  **References**:
  - `app/lib/game-engine/__tests__/trigger-type-casing.test.ts`

  **Acceptance Criteria**:
  - [ ] Tests assert `game_loaded` is the only supported trigger casing.

- [ ] 4.2 Add tests for `loadGame` readiness gating (preload barrier)

  **Acceptance Criteria**:
  - [ ] Unit/integration test fails if `game_loaded` is queued before preload-complete signal.

- [ ] 4.3 Add tests for script spawn deferral

  **Acceptance Criteria**:
  - [ ] A test asserts that script spawn enqueues then flushes, and results in bridge spawn calls.

---

## Commit Strategy

Suggested commits (conventional):
1. `chore(games): output static games to app/public` (Phase 0.1)
2. `chore(games): remove games dev server` (Phase 0.2)
3. `feat(engine): add local/remote game sources` (Phase 0.3/0.4)
4. `refactor(rules): rename triggers to snake_case` (Phase 1)
5. `feat(godot): await preload before game_loaded` (Phase 2)
6. `fix(scripting): spawn entities via bridge with deferral` (Phase 3)
7. `test(engine): add lifecycle + spawn deferral coverage` (Phase 4)

---

## Success Criteria

### Final Verification Checklist (agent-executable)
- [ ] Build games → static JSON exists under `app/public/games/`.
- [ ] Running the app (web) loads `test-games/ballSort` without external games server.
- [ ] `game_loaded` is logged/emitted only after preload barrier completion.
- [ ] Ball Sort generates level and balls appear visually.
- [ ] No camelCase lifecycle trigger types remain (`gameLoaded`, `gameStart`, etc.).
- [ ] Tests (added after) pass for critical paths.
