# JavaScript Sandbox (QuickJS) for Slopcade — Implementation Plan

## TL;DR

> **Quick Summary**: Add an app-layer scripting system at `app/lib/scripting/` that runs trusted game scripts inside a QuickJS sandbox (via `quickjs-emscripten`), exposes a controlled `ctx` API backed by `EntityManager`/`RulesEvaluator`/`GodotBridge`, and integrates lifecycle hooks into `GameRuntime.godot.tsx` with a 2ms per-tick budget.
>
> **Deliverables**:
> - New module: `app/lib/scripting/*` (sandbox + API + bridge + hooks)
> - `GameRuntime.godot.tsx` integration to call `onStart/onUpdate/onInput/onCollision`
> - Example “scripted test game” demonstrating hooks
> - Unit tests (vitest) for sandbox/hook plumbing
> - Docs: scripting API + usage guide
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Define script contract → implement sandbox+API → integrate into GameRuntime → tests+example+docs

---

## Context

### Original Request
Secure JS sandbox for dynamic game scripting, cross-platform (web/iOS/Android), controlled API, integrated with existing engine.

### Key Decisions (confirmed)
- **Location**: Implement new `app/lib/scripting/` module (app-level integration), reuse patterns/ideas from `shared/src/scripting/*` where helpful.
- **Threat model v1**: Trusted scripts only.
- **Lifecycle v1**: `onStart`, `onUpdate(dt)`, `onInput(event)`, `onCollision(a,b,impulse)`.
- **Module model v1**: Single-file script only (string).
- **Budget v1**: 2ms per tick, 100k instruction cap, 1MB VM memory.
- **Hot reload v1**: Reset VM and re-run `onStart`.
- **Testing**: tests after implementation; basic unit tests included.

### Existing Relevant Code (references)
- `shared/src/scripting/QuickJSSandbox.ts` — QuickJS runtime/context wrapper with:
  - `getQuickJS()` init, `runtime.setMemoryLimit`, `runtime.setInterruptHandler`, `context.evalCode` and error extraction
- `shared/src/scripting/types.ts` — `BudgetConfig` + a `ScriptContext` shape that already includes many needed game operations (spawn/destroy, impulses, tags, win/lose, RNG)
- `shared/src/scripting/QuickJSSandbox.test.ts` — vitest tests for basic eval + timeout termination
- `app/lib/game-engine/GameRuntime.godot.tsx` — main loop; key ordering today:
  - sync physics → update input entities → camera → execute behaviors → build `inputEvents` → `rulesEvaluator.update(...)` → clear input + collisions
  - collisions are accumulated via `physics.onCollision(...)` into `collisionsRef.current` (see around line ~549)
- `app/lib/game-engine/GameLoader.ts` — constructs `EntityManager`, `RulesEvaluator`, loads rules and initial variables
- `app/lib/godot/*` — `GodotBridge` web/native API for spawn/transform/physics control

---

## Work Objectives

### Core Objective
Enable authored (trusted) game scripts to run deterministically and safely within a bounded QuickJS sandbox, using a minimal, explicit API surface and predictable lifecycle integration with the engine loop.

### Concrete Deliverables
- `app/lib/scripting/` module implementing:
  - sandbox runtime wrapper (QuickJS)
  - script compilation/loading + lifecycle dispatch
  - controlled `ctx` bindings backed by engine primitives
  - hot reload (VM reset)
- `GameRuntime.godot.tsx` integration
- At least one test-game example that uses the scripting hooks
- Unit tests for:
  - script lifecycle invocation
  - budget enforcement wiring
  - API bindings call-through
- Documentation page(s) describing script API and lifecycle

### Definition of Done
- [ ] A scripted game runs on Web and Native without crashing
- [ ] `onStart` called once per load; `onUpdate` called each tick; `onInput` called when input events occur; `onCollision` called when collisions occur
- [ ] Script execution respects 2ms/tick budget with a clear failure mode (error surfaced, script skipped, game continues)
- [ ] Hot reload resets VM and reruns `onStart`
- [ ] Tests pass (`pnpm test`)

### Must NOT Have (Guardrails)
- No remote/untrusted code loading in v1
- No multi-file module loader in v1
- No direct exposure of `EntityManager`, `RulesEvaluator`, `GodotBridge`, or other host objects into QuickJS global scope (only safe wrapper functions)
- No leaking QuickJS handles (dispose correctly) in app-layer wrapper

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest; monorepo via `pnpm test`, shared uses `vitest run`)
- **User wants tests**: YES (tests-after)
- **Framework**: vitest

### Manual QA (also required)
- Web: run a scripted test game in the Expo web runtime and verify hooks fire
- Native: run on iOS or Android and verify no platform-specific sandbox failures

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundations — can start immediately)
- Task 1: Define script contract/types + lifecycle + event shapes
- Task 2: Implement QuickJS engine wrapper in app layer (reuse shared patterns)

Wave 2 (Bridge + runtime integration)
- Task 3: Build `GameScriptAPI` bindings (spawn/state/physics/input)
- Task 4: Integrate scripting into `GameRuntime.godot.tsx` loop and collision/input plumbing

Wave 3 (Productization)
- Task 5: Hot reload workflow + dev toggles
- Task 6: Example scripted test game
- Task 7: Unit tests
- Task 8: Documentation

Critical Path: 1 → 2 → 3 → 4 → 7

---

## API Design (v1)

### Script file format (single file)
The script should define functions on an `exports` object (CommonJS-ish) to avoid dealing with ESM module loader in v1.

Required/optional exports:
- `exports.onStart(ctx)` (optional)
- `exports.onUpdate(ctx, dt)` (optional)
- `exports.onInput(ctx, event)` (optional)
- `exports.onCollision(ctx, collision)` (optional)

### Host-provided `ctx` API (controlled surface)
`ctx` is injected as a global (matching existing `shared/src/scripting/QuickJSSandbox.ts` pattern).

Proposed minimal v1 surface (subset of `shared/src/scripting/types.ts:ScriptContext` + lifecycle helpers):
- State:
  - `getVariable(name)`, `setVariable(name, value)` (backed by `RulesEvaluator` variables)
  - `getConstant(name)` (backed by `GameDefinition.constants` if present)
  - `emit(eventName, data?)` (routes to `rulesEvaluator.triggerEvent`)
  - `win()`, `lose()` (routes to rules evaluator state transition)
- Entities:
  - `spawnEntity(templateId, {x,y}, opts?)` (validates template exists; uses `GodotBridge.spawnEntity` + registers with `EntityManager` if needed)
  - `destroyEntity(entityId)`
  - `getEntityPosition(entityId)` / `setEntityPosition(entityId, {x,y})`
  - `getEntityVelocity(entityId)` / `setEntityVelocity(entityId, {x,y})`
  - `applyImpulse(entityId, {x,y})`
  - `getEntityTags(entityId)`, `addTag(entityId, tag)`, `removeTag(entityId, tag)`
  - `queryEntities({ tag?, templateId?, inAabb? ... })` (keep small v1)
- Input:
  - `getInput()` returns last input snapshot (read-only copy)

### Event shapes
- `InputEvent` should align with `inputEvents` in `GameRuntime.godot.tsx` (tap, dragEnd, gameStarted, plus future).
- `CollisionEvent` should align with `collisionsRef.current` entries (entityA, entityB, normal, impulse).

---

## TODOs (Detailed)

> Each task includes: what to do, references, acceptance criteria, and recommended agent profile.

### 1) Define app scripting types + lifecycle contracts

**What to do**:
- Create `app/lib/scripting/types.ts`:
  - `ScriptBudgetConfig` (2ms/100k/1MB defaults)
  - `ScriptLifecycleExports` interface matching `exports.onStart/onUpdate/onInput/onCollision`
  - `ScriptInputEvent` and `ScriptCollisionEvent` (normalized, JSON-serializable)
  - `ScriptErrorReport` shape (message, type, stack, phase, hookName, frameId)
- Create `app/lib/scripting/SandboxContext.ts`:
  - runtime references needed for bindings: `entityManager`, `rulesEvaluator`, `physics`, `bridge`, `inputSnapshot`, `frameId`, `elapsed`, `dt`, `pixelsPerMeter`, etc.

**Must NOT do**:
- Don’t type-expose raw engine objects into scripts.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`
  - Reason: types must match runtime state and engine event shapes

**Parallelization**: Can run in parallel with Task 2.

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:~1036-1076` — source of `inputEvents` shape and where to hook lifecycle
- `app/lib/game-engine/GameRuntime.godot.tsx:~549-587` — collision collection format (`CollisionInfo` entries)
- `shared/src/scripting/types.ts:97-140` — prior `ScriptContext` shape to reuse/trim

**Acceptance Criteria**:
- [ ] `app/lib/scripting/types.ts` compiles (no any/suppressions)
- [ ] Event shapes are JSON-serializable and documented in file comments or docs stub

### 2) Implement app-layer QuickJS engine wrapper

**What to do**:
- Create `app/lib/scripting/engine/QuickJSEngine.ts`:
  - wraps `quickjs-emscripten` similar to `shared/src/scripting/QuickJSSandbox.ts`
  - supports: initialize, set memory limit (1MB), set interrupt budget per-eval, eval code, dispose
  - supports injecting host functions as callable globals OR a single `ctx` object proxy with functions (preferred)
- Create `app/lib/scripting/engine/CodeValidator.ts`:
  - since scripts are trusted in v1, keep minimal:
    - optionally disallow obvious footguns (e.g., `while(true)` heuristic) only as warnings
    - ensure script defines `exports` usage; otherwise provide clear error

**Must NOT do**:
- Don’t add module loader in v1.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`

**Parallelization**: Can run in parallel with Task 1.

**References**:
- `shared/src/scripting/QuickJSSandbox.ts` — proven QuickJS init/budget/error extraction pattern
- `shared/src/scripting/QuickJSSandbox.test.ts` — baseline tests and expected behavior for timeouts

**Acceptance Criteria**:
- [ ] Engine wrapper can eval a string and return structured success/error
- [ ] Budget config defaults match: 2ms, 100k instructions, 1MB
- [ ] Disposes runtime/context cleanly

### 3) Implement `GameScriptAPI` bindings (host → script)

**What to do**:
- Create `app/lib/scripting/GameScriptAPI.ts` (or `bindings/*` if you keep the folder split):
  - Convert a `SandboxContext` into a pure-JSON API object for injection as `ctx`:
    - All functions are small wrappers that call engine methods
    - Return primitives/POJOs only
  - Implement minimal subset listed in API Design
- Create `app/lib/scripting/bridge/ScriptingBridge.ts`:
  - Single place that knows how to apply script actions to:
    - `EntityManager` and/or `GodotBridge`
    - `RulesEvaluator` (variables/events/win/lose)
  - Ensures consistent validation (template exists, entity exists, etc.)

**Must NOT do**:
- Avoid passing references to RuntimeEntity objects; return IDs + snapshots.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`, `slopcade-godot-bridge`

**Parallelization**: Blocks Task 4.

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:~956-1029` — how runtime currently exposes spawn/position/velocity/etc to behaviors
- `app/lib/game-engine/RulesEvaluator.ts:~366-448` — rule context patterns, event trigger, win/lose behavior
- `app/lib/godot/GodotBridge.web.ts` and `.native.ts` — actual operations available for entities/physics

**Acceptance Criteria**:
- [ ] `ctx.spawnEntity` results in entity being created in Godot (via bridge) and visible in the game
- [ ] `ctx.setVariable/getVariable` round-trip reflects in `rulesEvaluator.getFullState().variables`

### 4) Implement ScriptSandbox + lifecycle dispatcher

**What to do**:
- Create `app/lib/scripting/ScriptSandbox.ts`:
  - load script string
  - wrap into executable code that builds `exports`:
    - e.g. `const exports = {}; (function(){ ...script... })(); exports;`
  - cache handles for lifecycle functions (or re-resolve per call)
  - provide methods:
    - `runStart(context)`
    - `runUpdate(context, dt)`
    - `runInput(context, event)`
    - `runCollision(context, collision)`
  - enforce per-call budgets and capture errors with phase metadata
- Create `app/lib/scripting/utils/wrapScript.ts` and `app/lib/scripting/utils/createSandbox.ts`

**Must NOT do**:
- Do not use eval-based sandbox in app layer.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`

**Parallelization**: Depends on Tasks 1–3.

**References**:
- `shared/src/scripting/EvalSandbox.ts:92-130` — example of wrapping code around exports
- `shared/src/scripting/QuickJSSandbox.ts:58-116` — evaluation and error extraction patterns

**Acceptance Criteria**:
- [ ] Running a script with `exports.onUpdate = ...` calls the function with injected `ctx`
- [ ] Errors in any hook do not crash the runtime; they are reported and the frame continues

### 5) Integrate scripting into `GameRuntime.godot.tsx`

**What to do**:
- Add a `scriptRunnerRef`/`sandboxRef` to `GameRuntime.godot.tsx` and initialize it when game loads.
- Determine integration order relative to behaviors and rules:
  - Proposed default: **script hooks run between behaviors and rules** OR **after rules**; choose one and keep stable.
  - Given current order is behaviors → rules, safest is:
    - `onInput` and `onCollision` called before `rulesEvaluator.update` so rules can react to script mutations in same frame.
    - `onUpdate` can run either before or after rules; pick one.
- Hook points:
  - `onStart`: after game is initialized and before first frame (`gameJustStartedRef` exists today; use it)
  - `onUpdate(dt)`: once per `stepGame` invocation (every frame)
  - `onInput(event)`: for each `inputEvents` key set in the frame
  - `onCollision(collision)`: iterate `collisionsRef.current` before it’s cleared
- Ensure budgets are enforced per hook call; if budget exceeded, log + disable scripting for remainder of session (optional) or skip call.

**Must NOT do**:
- Don’t block the main loop indefinitely; budget exceed must short-circuit.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`, `slopcade-godot-bridge`

**Parallelization**: Depends on Task 4.

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:~1031-1096` — current frame flow and where collisions/input are reset
- `app/lib/game-engine/GameRuntime.godot.tsx:~549-587` — collision accumulation
- `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` — stepping and deterministic frame stepping; ensure scripting behaves under `manualStep`

**Acceptance Criteria**:
- [ ] `onStart` fires once per runtime (including after hot reload)
- [ ] `onUpdate` fires each frame in both real-time loop and debug `manualStep`
- [ ] `onCollision` fires for collisions collected that frame
- [ ] `onInput` fires when a tap occurs (verified by logging or script-driven state change)

### 6) Hot reload (VM reset) support

**What to do**:
- Define an app-level mechanism to “reload script” (e.g., changing a `runtimeKey`, or a dev-only toggle).
- On reload:
  - dispose current QuickJS runtime/context
  - recreate sandbox
  - rerun `onStart`

**Recommended Agent Profile**:
- Category: `quick`
- Skills: `slopcade-game-engine`

**Acceptance Criteria**:
- [ ] Triggering reload resets script state (e.g., counter resets)
- [ ] No memory leak / duplicate handlers in repeated reload

### 7) Add a scripted test game example

**What to do**:
- Create a new test game under `app/lib/test-games/games/<id>/` similar to `gemCrush/game.ts`.
- Include a simple script string and a minimal setup:
  - `onStart`: set a variable, spawn an entity
  - `onInput`: on tap, apply impulse
  - `onCollision`: increment score / emit event
  - `onUpdate`: move something or periodically spawn

**Recommended Agent Profile**:
- Category: `visual-engineering`
- Skills: `slopcade-game-engine`, `slopcade-godot-bridge`

**References**:
- `app/lib/test-games/games/gemCrush/game.ts` — how test games are defined and registered

**Acceptance Criteria**:
- [ ] The example appears in test games list and runs
- [ ] Interacting demonstrates `onInput` and `onCollision`

### 8) Unit tests (vitest)

**What to do**:
- Add tests in an appropriate package:
  - If app has no vitest config, add tests in `shared` for pure sandbox logic, and minimal app tests where possible.
  - Prefer testing `ScriptSandbox` and `GameScriptAPI` with mocked `SandboxContext` objects.
- Include tests for:
  - lifecycle dispatch ordering
  - error capture (syntax/runtime)
  - budget handling (timeout/instructions)

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-game-engine`

**References**:
- `shared/src/scripting/QuickJSSandbox.test.ts` — how to test QuickJS wrapper with vitest
- `shared/src/scripting/EvalSandbox.ts:createMockScriptContext` — mocking patterns for script context

**Acceptance Criteria**:
- [ ] `pnpm test` passes
- [ ] Tests cover at least one hook per lifecycle

### 9) Documentation

**What to do**:
- Add docs describing:
  - how to attach a script to a game
  - lifecycle hooks and event shapes
  - `ctx` API reference
  - performance budgets + best practices
  - hot reload semantics

**Recommended Agent Profile**:
- Category: `writing`
- Skills: `organize-docs`

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` — already describes runtime scripts planned; align terminology
- `docs/ARCHITECTURE.md` — engine integration overview

**Acceptance Criteria**:
- [ ] Docs added under `docs/` in appropriate location and linked from an index

---

## Commit Strategy

Suggested atomic commits (executor can adjust):
1. `feat(scripting): add app scripting types and QuickJS engine wrapper`
2. `feat(scripting): add script sandbox lifecycle runner and ctx bindings`
3. `feat(game-runtime): invoke script hooks in game loop`
4. `test(scripting): add unit tests for lifecycle and budgets`
5. `docs(scripting): document script lifecycle and ctx API`

---

## Final Verification Commands

```bash
pnpm tsc --noEmit
pnpm test
pnpm dev
```

Manual:
- Run the scripted test game on web (`pnpm dev` then open test game route)
- Run on iOS or Android (`pnpm ios` / `pnpm android`) and verify behavior
