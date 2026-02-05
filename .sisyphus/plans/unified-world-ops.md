# Unified WorldOps Interface — Implementation Plan

## TL;DR

> **Quick Summary**: Replace the three separate entity manipulation interfaces (GodotBridge, GodotDebugBridge, Script Sandbox) with a single `WorldOps` interface. Script hooks stay sync with sync reads from cache + fire-and-forget writes via `ctx.world`. Multi-frame work (animation chains, delays) uses `ctx.startSequence()`. A `SequenceManager` manages async routines across frames.
>
> **Deliverables**:
> - `shared/src/types/world-ops.ts` — `WorldOps` interface + DTOs
> - `shared/src/types/debug-ops.ts` — `DebugOps extends WorldOps`
> - `app/lib/game-engine/WorldOpsImpl.ts` — in-process implementation
> - `app/lib/game-engine/SequenceManager.ts` — async sequence runner
> - Updated `ScriptContext` with sync reads + `world: WorldOps` + `startSequence()`
> - Updated `ScriptSandboxRuntimeSystem` — uses WorldOps, adds async safety guard
> - Updated MCP tools — call WorldOps/DebugOps instead of raw queryGodot
> - Contract tests ensuring WorldOps works consistently across all consumers
>
> **Estimated Effort**: Large (6 waves, ~16 tasks)
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 8 → Task 13 → Task 15

---

## Context

### Original Request
Unify three separate entity manipulation interfaces into one canonical `WorldOps` interface. Solve the async/sync tension for script hooks: `onUpdate` runs at 60fps and must never block, but scripts need to express multi-frame sequences (animations, delays).

### Design Document
Full design rationale and resolved questions: `.claude/memory/roadmap/active/unified-world-ops.md`

### Key Design Decisions (confirmed)
1. **WorldOps is all async** — every method returns a Promise. One interface for MCP, debug, sequences.
2. **Godot is the authority** — TypeScript caches state for performance but doesn't own it.
3. **All script hooks are sync** — `onStart`, `onUpdate`, `onInput`, `onCollision` all return `void`. No exceptions.
4. **Multi-frame work uses `startSequence()`** — the one escape hatch from sync hooks to async sequences.
5. **ScriptContext has two layers** — sync reads from cache (flat on ctx) + `ctx.world: WorldOps` for fire-and-forget writes.
6. **Async safety guard** — if any hook returns a Promise, engine detects it, warns, disables the script.
7. **Sequences use game time** — affected by pause/timeScale. Optional `{ realtime: true }` for UI animations during pause.
8. **DebugOps extends WorldOps** — MCP/inspector gets time control, screenshots, CSS selectors on top.

### QuickJS Sandbox: Transport vs Hook Boundaries

The new ScriptContext has function references (`ctx.getPosition()`, `ctx.world.setPosition()`, `ctx.startSequence()`). This creates a boundary problem for the QuickJS sandbox that the plan must address.

**Current bug (pre-existing, not introduced by this migration):**
The QuickJS sandbox's `callHook` method serializes the context via `JSON.stringify(contextToPlainObject(ctx))`, which drops ALL function references. The script inside QuickJS receives a dead data object. This already means QuickJS scripts can't call `ctx.spawnEntity()`, `ctx.destroyEntity()`, etc. — they silently receive `undefined` for those methods.

**The fix (part of Task 7):**
Replace `JSON.stringify` + `engine.evaluate(string)` with `engine.callFunction(hookHandle, [contextHandle])` where the context is built via `valueToHandle()`. The engine's existing `valueToHandle()` already converts JS functions into QuickJS host function bindings — a function passed from the host becomes callable from within the QuickJS sandbox and executes synchronously on the host side.

**Three transport layers to reason about:**

| Concern | UnsafeScriptSandbox | QuickJS (same-thread WASM) | QuickJS (future: Web Worker) |
|---|---|---|---|
| `IScriptSandbox.runX()` return type | `ScriptResult<void>` (sync) | `ScriptResult<void>` (sync — WASM is same-thread) | `Promise<ScriptResult<void>>` (async — postMessage) |
| Hook execution inside sandbox | Sync ✅ | Sync ✅ | Sync ✅ (always, regardless of transport) |
| Function references on context | Live JS closures | Host function bindings via `valueToHandle` | Host function bindings (same, inside Worker) |
| `ctx.getPosition()` | Direct call, returns value | Host function binding — sync callback to host | Host function binding — sync within Worker |
| `ctx.world.setPosition()` | Direct call, fire-and-forget | Host function binding — sync callback to host | Host function binding — sync within Worker |

**Key invariant**: The script code's perspective never changes. `onUpdate(ctx, dt)` is always sync. `ctx.getPosition()` always returns a value synchronously. `ctx.world.setPosition()` is always fire-and-forget. The only thing that varies is the *transport* wrapping the sandbox call.

**Sequence support in QuickJS (the hard part):**
`startSequence('name', async (world) => { await world.animate(...); })` requires:
1. The `fn` parameter is a QuickJS function handle (not a serialized string)
2. The host's SequenceManager invokes `fn(worldProxy)` inside QuickJS
3. `world.animate()` is a host function binding that returns a QuickJS Promise
4. QuickJS suspends the async function at `await`
5. When the host-side tween completes, it resolves the QuickJS Promise
6. `executePendingJobs()` resumes the sequence function
7. This requires `quickjs-emscripten`'s Promise interop API

This is complex but architecturally sound. The SequenceManager on the host side manages the lifecycle; QuickJS just provides the function body and awaits host-resolved Promises.

**Future-proofing for async transport (Worker isolation):**
If `IScriptSandbox.runX()` becomes `async` later (for Worker-based QuickJS), the changes are:
- `ScriptSandboxRuntimeSystem.update()` becomes async
- RuntimeSystem runner awaits the sandbox call
- Zero changes to script code, ScriptContext, WorldOps, or SequenceManager
- This is a contained transport-layer change, not a design change

**Sequence expression: async/await now, generators as escape hatch later:**

Sequences use `async (world) => { await world.animate(...); }` syntax. This was chosen because:
- Async/await is the dominant JS paradigm — more natural for both human and AI authors
- Works trivially in UnsafeScriptSandbox (same JS thread, native Promise support)
- All design docs and examples already use this syntax

Generators (`function*`/`yield`) are an equivalent alternative — async/await was historically compiled to generators by Babel/TypeScript. They're interchangeable via a small adapter:

```typescript
// Generator → async adapter (~5 lines)
function generatorToAsync(genFn, worldOps) {
  const gen = genFn(commandBuilder);
  async function step(result) {
    if (result.done) return;
    const ret = await executeCommand(result.value, worldOps);
    return step(gen.next(ret));
  }
  return step(gen.next());
}
```

**This is NOT a one-way door.** When QuickJS production time comes, if Promise interop proves too costly, we can:
1. Add a `generatorToAsync()` adapter to the SequenceManager (accepts either syntax)
2. Or add native generator support (generators are fully sync from QuickJS's perspective — no Promise interop needed)
3. AI scripts in QuickJS would use `function*`/`yield`, the SequenceManager handles both

The SequenceManager's internal command execution logic is the same regardless of whether the input is an async function or a generator. The difference is only who drives the resumption (Promise resolution vs explicit `gen.next()`).

**Plan impact:**
- Task 7 must rewrite QuickJS `callHook` to use `callFunction` + `valueToHandle` instead of `JSON.stringify`
- Task 8 implements async/await sequences first; documents generator escape hatch for QuickJS
- Task 12 (cleanup) must remove `contextToPlainObject` and the `JSON.stringify` calling pattern
- `IScriptSandbox.runX()` stays sync for now; a note is added for future Worker migration

### Existing Code (key files)

| File | Role | Lines |
|------|------|-------|
| `app/lib/scripting/types.ts` | Current ScriptContext + SandboxRuntimeContext | 186 |
| `app/lib/scripting/IScriptSandbox.ts` | Sandbox interface (sync runX methods) | 132 |
| `app/lib/scripting/UnsafeScriptSandbox.ts` | Eval-based sandbox impl | ~270 |
| `app/lib/scripting/QuickJSScriptSandbox.ts` | QuickJS sandbox impl | ~240 |
| `app/lib/scripting/GameScriptAPI.ts` | Builds ScriptContext from SandboxRuntimeContext | ~120 |
| `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | Creates entity adapter each frame | 385 |
| `app/lib/game-engine/animation/TweenSystem.ts` | Tween engine (position/rotation/scale/opacity) | 174 |
| `app/lib/game-engine/systems/runner/wrappers/TweenRuntimeSystem.ts` | TweenSystem lifecycle wrapper | 57 |
| `app/lib/godot/debug/types.ts` | GodotDebugBridge types | ~661 |
| `app/lib/godot/debug/GodotDebugBridge.ts` | Debug bridge impl (query RPC) | ~800 |
| `app/lib/godot/GodotPhysicsAdapter.ts` | Caches transforms/velocities from Godot | ~200 |
| `app/lib/game-engine/EntityManager.ts` | Entity state management | ~600 |
| `packages/game-inspector-mcp/src/tools/*.ts` | MCP tool definitions | ~20 files |
| `shared/src/types/common.ts` | Vec2, Bounds, TransformComponent | existing |

---

## Work Objectives

### Core Objective
Replace fragmented entity manipulation with one canonical `WorldOps` interface. Add `startSequence()` for multi-frame operations. Keep all script hooks synchronous.

### Concrete Deliverables
- `shared/src/types/world-ops.ts` — WorldOps interface, DTOs, SequenceHandle
- `shared/src/types/debug-ops.ts` — DebugOps extends WorldOps
- `app/lib/game-engine/WorldOpsImpl.ts` — in-process implementation backed by EntityManager + Physics + GodotBridge
- `app/lib/game-engine/SequenceManager.ts` — manages named async sequences with cancellation
- Updated `app/lib/scripting/types.ts` — new ScriptContext with sync reads + world + startSequence
- Updated `app/lib/scripting/GameScriptAPI.ts` — builds new ScriptContext
- Updated `ScriptSandboxRuntimeSystem.ts` — uses WorldOps, integrates SequenceManager
- Updated `IScriptSandbox.ts` — async safety guard on hook return values
- Updated MCP tools — use WorldOps/DebugOps
- Contract tests

### Definition of Done
- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm test` passes
- [x] Existing scripted test games still work (breakoutScripted, etc.)
- [x] A new test/example demonstrates `startSequence()` with chained animations
- [x] MCP tools still work through game-inspector
- [x] If a script hook accidentally returns a Promise, it's detected and logged

### Must NOT Have (Guardrails)
- No `as any`, `@ts-ignore`, or `@ts-expect-error`
- No async script hooks — all return `void`
- No breaking changes to MCP tool external API (Zod schemas stay compatible)
- No removal of existing capabilities — only unification
- No new npm dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest in app and shared)
- **Framework**: vitest
- **Approach**: Contract tests ensuring WorldOps behaves identically across all consumers

### Manual QA
- Run `breakoutScripted` test game on web — verify hooks fire, animations work
- Run game-inspector MCP tools — verify spawn/destroy/animate still work
- Test `startSequence()` with a chained animation example

### Commands
```bash
pnpm tsc --noEmit
pnpm test
pnpm dev  # then test breakoutScripted and MCP tools
```

---

## Execution Strategy

### Parallel Execution Waves

**Wave 1** (Types — can start immediately, all parallel)
- Task 1: WorldOps interface + DTOs in shared
- Task 2: DebugOps interface in shared
- Task 3: SequenceManager implementation

**Wave 2** (Core implementation — depends on Wave 1)
- Task 4: WorldOpsImpl (depends on 1)
- Task 5: Wire animate/wait to TweenSystem with Promise completion (depends on 1)
- Task 6: New ScriptContext types + sync read interface (depends on 1)

**Wave 3** (Script sandbox migration — depends on Wave 2)
- Task 7: Migrate ScriptSandboxRuntimeSystem to WorldOps + new ScriptContext (depends on 4, 5, 6)
- Task 8: Integrate SequenceManager into script sandbox (depends on 3, 7)
- Task 9: Add async-return-value safety guard (depends on 7)

**Wave 4** (Secondary migration — can overlap with Wave 3)
- Task 10: Migrate Debug/MCP to WorldOps/DebugOps (depends on 4)
- Task 11: Migrate RulesSystem to WorldOps (depends on 4)

**Wave 5** (Cleanup + verification)
- Task 12: Big Bang Legacy Cleanup — remove ALL old code paths (depends on 7, 8, 9, 10, 11)
- Task 13: Contract tests + startSequence example (depends on 8, 9)
- Task 14: Documentation updates (depends on all)

**Wave 6** (Final verification — nothing ships without this)
- Task 15: Final Verification Sweep — grep for dead patterns, prove zero legacy references (depends on 12)
- Task 16: Smoke test — run games, MCP tools, verify no regressions (depends on 15)

**Critical Path**: 1 → 4 → 7 → 8 → 13 → 15

---

## TODOs (Detailed)

### 1) Create WorldOps interface + shared DTOs ✅ (DONE — minor fixup needed)

**Status**: File exists. Minor fixup: `WaitOptions` type is defined in the design doc but missing from the file. The `wait()` method signature should be `wait(ms: number, opts?: WaitOptions): Promise<void>` to support `{ realtime: true }`.

**What to do**:
- ~~Create~~ Fix `shared/src/types/world-ops.ts`:
  - `WorldOps` interface (all methods return Promises) — copy from design doc Section 4
  - `SpawnOptions`, `CloneOptions`, `ReparentOptions`
  - `WorldEntityData`, `WorldEntityQuery`
  - `RaycastOptions`, `RaycastHit`
  - `AnimateTarget`, `AnimateOptions`, `WaitOptions`
  - `EasingFunction` type
  - `SequenceHandle` interface
- Reuse existing `Vec2` and `Bounds` from `shared/src/types/common.ts` — do NOT redefine
- Export from `shared/src/types/index.ts`

**Must NOT do**:
- Don't add implementation code — types only
- Don't redefine Vec2 or Bounds

**Recommended Agent Profile**:
- Category: `quick`
- Skills: none needed (pure type definitions)

**Parallelization**: Can run in parallel with Tasks 2 and 3.

**References**:
- `.claude/memory/roadmap/active/unified-world-ops.md` Section 4 — exact interface definition
- `shared/src/types/common.ts` — existing Vec2, Bounds types
- `app/lib/scripting/types.ts` — existing AnimateConfig, EntityData, EntityQuery to align with

**Acceptance Criteria**:
- [x] `shared/src/types/world-ops.ts` compiles with no errors
- [x] All methods on WorldOps return Promises
- [x] Vec2 and Bounds are imported from common.ts, not redefined
- [x] Exported from shared package index

---

### 2) Create DebugOps interface ✅ (DONE)

**What to do**:
- Create `shared/src/types/debug-ops.ts`:
  - `DebugOps extends WorldOps` with additional methods
  - Time control: `pause`, `resume`, `step`, `getTimeState`, `setTimeScale`
  - Inspection: `screenshot`, `getEntityProps`, `setEntityProps`, `getAllEntityProps`
  - Advanced queries: `queryCss`, `getShapes`, `getJoints`, `getOverlaps`
  - Event subscriptions: `subscribe`, `unsubscribe`, `pollEvents`
  - Supporting types: `TimeState`, `ShapeInfo`, `JointInfo`, `GameEvent`
- Export from `shared/src/types/index.ts`

**Must NOT do**:
- Don't duplicate WorldOps methods — only add debug-specific extensions

**Recommended Agent Profile**:
- Category: `quick`
- Skills: none needed

**Parallelization**: Can run in parallel with Tasks 1 and 3.

**References**:
- `.claude/memory/roadmap/active/unified-world-ops.md` Section 4 — DebugOps definition
- `app/lib/godot/debug/types.ts` — existing debug bridge types to align with

**Acceptance Criteria**:
- [x] `DebugOps extends WorldOps` compiles
- [x] All existing debug bridge capabilities have a corresponding method
- [x] Exported from shared package index

---

### 3) Implement SequenceManager

**What to do**:
- Create `app/lib/game-engine/SequenceManager.ts`:
  - `SequenceManager` class with methods: `start(name, fn, worldOps)`, `isRunning(name)`, `cancel(name)`, `cancelAll()`, `dispose()`
  - Named sequence tracking via `Map<string, ActiveSequence>`
  - Auto-cancel on re-trigger: if `start()` called with an already-running name, cancel the old one first
  - Cancellation model: wrap WorldOps in a cancellation-aware proxy
    - Use an `AbortController`-like pattern internally
    - When cancelled, in-progress `animate()` and `wait()` reject with `SequenceCancelledError`
    - The async function exits via the thrown error
    - SequenceManager catches `SequenceCancelledError` (expected, not logged)
    - Real errors are captured and reported (logged, don't crash)
  - `SequenceCancelledError` class (extends Error, typed)
  - Return `SequenceHandle` from `start()`: `{ name, isRunning, cancel() }`
- Create `app/lib/game-engine/SequenceManager.test.ts`:
  - Test: start sequence, verify it runs
  - Test: cancel sequence, verify animate/wait reject with SequenceCancelledError
  - Test: re-trigger same name cancels old
  - Test: cancelAll() cleans up everything
  - Test: errors in sequence body are caught and reported

**Must NOT do**:
- Don't couple to ScriptSandbox — SequenceManager is a standalone utility
- Don't use real TweenSystem in tests — mock WorldOps

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `test-driven-development`

**Parallelization**: Can run in parallel with Tasks 1 and 2.

**References**:
- `.claude/memory/roadmap/active/unified-world-ops.md` Decision 5 — sequence lifecycle, cancellation model
- `app/lib/game-engine/animation/TweenSystem.ts` — how tweens complete (onComplete callback)

**Acceptance Criteria**:
- [x] SequenceManager starts, cancels, and tracks named sequences
- [x] SequenceCancelledError is a typed, catchable error
- [x] Re-triggering same name cancels the old sequence
- [x] Tests pass

---

### 4) Implement WorldOpsImpl

**What to do**:
- Create `app/lib/game-engine/WorldOpsImpl.ts`:
  - Implements `WorldOps` interface
  - Constructor takes: `EntityManager`, `Physics2D` (or GodotPhysicsAdapter), `GodotBridge`, `RulesSystem`, `TweenSystem`
  - Entity lifecycle: `spawn` → EntityManager.createEntity + GodotBridge.spawnEntity; `destroy` → EntityManager.destroy + GodotBridge.destroyEntity; `clone` → GodotDebugBridge pattern; `reparent` → GodotDebugBridge pattern
  - Transform: `getPosition` → read from EntityManager cache; `setPosition` → EntityManager + Physics + GodotBridge
  - Physics: `getVelocity` → Physics adapter cache; `applyImpulse` → Physics.applyImpulseToCenter + GodotBridge
  - Metadata: `getTags/addTag/removeTag/hasTag` → EntityManager (in-process)
  - Queries: `queryEntities` → EntityManager.query; `queryPoint/queryAABB/raycast` → GodotBridge (sync on web via _lastResult, async on native)
  - Game state: `getVariable/setVariable` → RulesSystem (in-process); `emit/win/lose` → RulesSystem
  - Animation: `animate` → create tween in TweenSystem, return Promise that resolves on tween complete; `wait` → return Promise that resolves after N ms of game time
- Expose as singleton: `window.worldOps` on web (for MCP page.evaluate access)

**Must NOT do**:
- Don't break existing spawn/destroy patterns — WorldOpsImpl wraps them
- Don't make EntityManager or GodotBridge public through WorldOps
- Don't use `as any` to bridge type gaps

**Recommended Agent Profile**:
- Category: `deep`
- Skills: `test-driven-development`

**Parallelization**: Depends on Task 1. Can run in parallel with Tasks 5 and 6.

**References**:
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:249-383` — existing entity adapter pattern (this is what WorldOpsImpl replaces)
- `app/lib/godot/GodotPhysicsAdapter.ts` — how transforms/velocities are cached
- `app/lib/game-engine/EntityManager.ts` — entity CRUD operations
- `app/lib/godot/GodotBridge.web.ts` — spawn/destroy/setPosition/applyImpulse calls
- `app/lib/game-engine/animation/TweenSystem.ts` — createTween with onComplete callback

**Acceptance Criteria**:
- [x] WorldOpsImpl implements all WorldOps methods
- [x] `spawn` creates entity in both EntityManager and Godot
- [x] `getPosition` reads from cache (not async Godot call)
- [x] `animate` returns Promise that resolves when tween completes
- [x] `wait` returns Promise that resolves after specified game time
- [x] Exposed as `window.worldOps` on web

---

### 5) Wire animate() and wait() to TweenSystem with Promise completion

**What to do**:
- Update `TweenSystem.ts`:
  - `createTween` already has `onComplete` callback — verify it fires reliably
  - Add: if entity destroyed mid-tween, cancel the tween and reject with error
- In `WorldOpsImpl.animate()`:
  - Cancel any existing tween on same entity+property before starting new one
  - Create tween via TweenSystem.createTween
  - Return Promise that resolves in `onComplete`, rejects if entity destroyed
- In `WorldOpsImpl.wait()`:
  - Register a timer that decrements by `dt` each frame
  - Return Promise that resolves when timer reaches 0
  - Timer uses game time (affected by pause/timeScale)
  - Optional `{ realtime: true }` uses wall-clock time
- Add a `TimerManager` (or add to SequenceManager) for wait() timers:
  - `update(dt)` called each frame to advance timers
  - Timers resolve their Promises when they expire

**Must NOT do**:
- Don't use `setTimeout` for wait() — must use game time
- Don't block the frame when animate/wait are called without await

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `test-driven-development`

**Parallelization**: Depends on Task 1. Can run in parallel with Tasks 4 and 6.

**References**:
- `app/lib/game-engine/animation/TweenSystem.ts:49-67` — createTween with onComplete
- `app/lib/game-engine/systems/runner/wrappers/TweenRuntimeSystem.ts:32-35` — how TweenSystem.update(dt) is called each frame

**Acceptance Criteria**:
- [x] `animate()` returns Promise that resolves when tween completes
- [x] `animate()` cancels existing tween on same entity+property
- [x] `wait(500)` resolves after 500ms of game time (not wall-clock)
- [x] If game is paused, wait/animate timers don't advance
- [x] Fire-and-forget (no await) doesn't cause unhandled rejections

---

### 6) Define new ScriptContext types with sync reads + startSequence

**What to do**:
- Update `app/lib/scripting/types.ts`:
  - New `ScriptContext` interface with:
    - Sync reads: `getPosition`, `getVelocity`, `getRotation`, `getTags`, `hasTag`, `getTemplate`, `getVariable`, `getConstant`, `queryEntities`, `getEntityData`, `queryEntitiesWithData`
    - `world: WorldOps` — full async API
    - `startSequence(name, fn)`, `isSequenceRunning(name)`, `cancelSequence(name)`
    - Frame info: `dt`, `elapsed`, `frameId`
    - Input: `input`, `mouse`, `drag`
    - Utils: `random()`, `randomInt()`, `randomChoice()`, `clamp()`, `lerp()`, `distance()`
  - Updated `ScriptLifecycleExports`:
    - ALL hooks return `void` (not `Promise<void> | void`)
    - `onStart?(ctx: ScriptContext): void`
    - `onUpdate?(ctx: ScriptContext, dt: number): void`
    - `onInput?(ctx: ScriptContext, event: ScriptInputEvent): void`
    - `onCollision?(ctx: ScriptContext, collision: ScriptCollisionEvent): void`
  - Keep `SandboxRuntimeContext` temporarily for backward compat (mark deprecated)

**Must NOT do**:
- Don't remove existing types yet — just add new ones alongside
- Don't change IScriptSandbox interface yet (that's Task 7)

**Recommended Agent Profile**:
- Category: `quick`
- Skills: none needed (pure type definitions)

**Parallelization**: Depends on Task 1. Can run in parallel with Tasks 4 and 5.

**References**:
- `.claude/memory/roadmap/active/unified-world-ops.md` Section 5 — full ScriptContext definition
- `app/lib/scripting/types.ts` — current ScriptContext (to preserve backward compat initially)

**Acceptance Criteria**:
- [x] New ScriptContext interface compiles
- [x] All hooks return `void` (not Promise)
- [x] `world: WorldOps` is typed correctly
- [x] `startSequence` signature matches SequenceHandle return type

---

### 7) Migrate ScriptSandboxRuntimeSystem to WorldOps + new ScriptContext

**What to do**:
- Update `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`:
  - Remove `createEntityManagerAdapter()` method (lines 249-383) — this is the hand-built adapter that WorldOps replaces
  - Instead, build the new `ScriptContext` from:
    - Sync reads: delegate to EntityManager/Physics cache directly (same as today, just different interface shape)
    - `world`: pass the `WorldOpsImpl` instance
    - `startSequence/isSequenceRunning/cancelSequence`: delegate to SequenceManager
    - Frame info, input, utils: same as today
  - Update `GameScriptAPI.ts` to build the new ScriptContext shape
- Update `UnsafeScriptSandbox.ts`:
  - Update `callHook` to pass new ScriptContext instead of old SandboxRuntimeContext
  - Since hooks are sync, `runUpdate`/`runStart`/etc. stay returning `ScriptResult<void>` (no change to IScriptSandbox)
- Update `QuickJSScriptSandbox.ts` (**critical — see "QuickJS Sandbox: Transport vs Hook Boundaries" section above**):
  - **Rewrite `callHook`**: Replace `JSON.stringify(contextToPlainObject(ctx))` + `engine.evaluate(string)` with `engine.callFunction(hookHandle, [contextHandle])` where context is passed through `valueToHandle()`
  - This preserves function references (`ctx.getPosition`, `ctx.world.setPosition`, `ctx.startSequence`) as host function bindings callable from within QuickJS
  - The `valueToHandle()` method already handles functions — it creates `context.newFunction()` wrappers that call back to host JS synchronously
  - Test: verify that a QuickJS script can call `ctx.getPosition('ball')` and get a real value back

**Must NOT do**:
- Don't change IScriptSandbox interface signatures (they stay sync)
- Don't break existing scripts — the new ScriptContext must provide all the same operations
- Don't fall back to JSON.stringify for "simplicity" — the function references MUST work in QuickJS

**Recommended Agent Profile**:
- Category: `deep`
- Skills: `test-driven-development`

**Parallelization**: Depends on Tasks 4, 5, 6.

**References**:
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:249-383` — the adapter code being replaced
- `app/lib/scripting/GameScriptAPI.ts` — builds ScriptContext from SandboxRuntimeContext (to be removed later in Task 12)
- `app/lib/scripting/UnsafeScriptSandbox.ts:217-237` — callHook method
- `app/lib/scripting/QuickJSScriptSandbox.ts:253-277` — callHook method (needs rewrite)
- `app/lib/scripting/engine/QuickJSEngine.ts:216-260` — valueToHandle (already handles functions)
- `app/lib/scripting/engine/QuickJSEngine.ts:163-209` — callFunction method

**Acceptance Criteria**:
- [x] `createEntityManagerAdapter()` removed
- [x] ScriptContext built from WorldOpsImpl + EntityManager cache
- [x] UnsafeScriptSandbox passes context with live function closures
- [x] QuickJSScriptSandbox passes context via `callFunction` + `valueToHandle` (NOT JSON.stringify)
- [x] QuickJS scripts can call `ctx.getPosition()`, `ctx.world.setPosition()` etc.
- [x] Existing test games still work (breakoutScripted)
- [x] `pnpm test` passes
- [x] `pnpm tsc --noEmit` passes

---

### 8) Integrate SequenceManager into script sandbox

**What to do**:
- Wire SequenceManager into `ScriptSandboxRuntimeSystem`:
  - Create SequenceManager instance in `initialize()`
  - Pass `startSequence/isSequenceRunning/cancelSequence` into ScriptContext
  - Call `sequenceManager.cancelAll()` on script reload/dispose
  - The SequenceManager's wait() timers need to be advanced each frame — wire into the system's `update()` method
- Update TweenRuntimeSystem or add a new SequenceRuntimeSystem:
  - Needs to call `sequenceManager.updateTimers(dt)` each frame
  - Should run in GAME_LOGIC phase (same as scripts)
- Add an example test game or script demonstrating startSequence:
  - `onStart`: start intro sequence (animate title, wait, fade, destroy)
  - `onUpdate`: detect condition, start death sequence
  - `onCollision`: start hit sequence
- **QuickJS sequence support** (see "QuickJS Sandbox: Transport vs Hook Boundaries" section):
  - Implement async/await sequences first (works in UnsafeScriptSandbox immediately)
  - For QuickJS: attempt Promise interop (`executePendingJobs()` pattern)
  - **If Promise interop proves too complex**: add generator support as escape hatch
    - SequenceManager detects generator functions vs async functions
    - Generator adapter wraps `function*`/`yield` into the same command execution pipeline
    - Generators are fully synchronous from QuickJS's perspective — no Promise interop needed
    - AI scripts in QuickJS would use `function*`/`yield` syntax instead of `async`/`await`
    - This is a small additive change, not a rewrite — the execution logic is the same
  - Either way: document the QuickJS sequence story explicitly

**Must NOT do**:
- Don't couple SequenceManager tightly to TweenSystem — it just calls WorldOps methods
- Don't silently skip QuickJS sequence support without documenting the gap

**Recommended Agent Profile**:
- Category: `deep`
- Skills: `test-driven-development`

**Parallelization**: Depends on Tasks 3 and 7.

**References**:
- `app/lib/game-engine/systems/runner/types.ts` — RuntimeSystem interface, SystemPhase
- `app/lib/game-engine/systems/runner/wrappers/TweenRuntimeSystem.ts` — pattern for a system that wraps a utility
- `app/lib/scripting/engine/QuickJSEngine.ts` — callFunction, valueToHandle, executePendingJobs potential

**Acceptance Criteria**:
- [x] `startSequence` works from onUpdate (UnsafeScriptSandbox) — kicks off async routine
- [x] Sequences survive across frames (animate → wait → destroy chain works)
- [x] Re-triggering same name cancels old sequence
- [x] Script reload cancels all active sequences
- [x] Example test game demonstrates the pattern
- [x] QuickJS sequence support works OR limitation is explicitly documented with a follow-up task

---

### 9) Add async-return-value safety guard

**What to do**:
- Update hook calling code in `UnsafeScriptSandbox.ts` and `QuickJSScriptSandbox.ts`:
  - After calling a hook (onStart, onUpdate, onInput, onCollision), check if the return value is a Promise (thenable)
  - If it is: log a warning with the hook name and script ID, and disable the script
  - Implementation: `if (result && typeof result.then === 'function') { warn(...); disable(); }`
- Add a `ScriptResult` field or flag to indicate "script disabled due to async hook"
- Add test: a script with `async function onUpdate(ctx, dt) { ... }` triggers the guard

**Must NOT do**:
- Don't silently swallow — always log a clear warning
- Don't crash the game — just disable the offending script

**Recommended Agent Profile**:
- Category: `quick`
- Skills: none needed

**Parallelization**: Depends on Task 7.

**References**:
- `app/lib/scripting/UnsafeScriptSandbox.ts:218-235` — callHook method
- `app/lib/scripting/QuickJSScriptSandbox.ts:217-226` — runUpdate method

**Acceptance Criteria**:
- [x] Sync hooks work as before
- [x] `async function onUpdate` triggers warning and disables script
- [x] Game continues running after script is disabled
- [x] Test verifies the guard

---

### 10) Migrate Debug/MCP to WorldOps/DebugOps

**What to do**:
- Create `app/lib/game-engine/DebugOpsImpl.ts`:
  - `DebugOpsImpl extends WorldOpsImpl implements DebugOps`
  - Delegate debug-specific methods to existing `GodotDebugBridge` + `SlopcadeDebugBridge`
  - Time control: delegate to SlopcadeDebugBridge
  - CSS selectors, property paths, shapes, joints: delegate to GodotDebugBridge
  - Screenshots: delegate to GodotDebugBridge
- Expose as `window.debugOps` on web (for MCP page.evaluate access)
- Update MCP tools in `packages/game-inspector-mcp/src/tools/*.ts`:
  - Replace `queryGodot(page, method, args)` calls with `page.evaluate(() => window.debugOps.method(...))`
  - Keep the same Zod schemas (external API doesn't change)
  - Update `packages/game-inspector-mcp/src/utils.ts` — simplify queryGodot to use debugOps

**Must NOT do**:
- Don't change MCP tool Zod schemas (external API stays compatible)
- Don't remove GodotDebugBridge yet — DebugOpsImpl wraps it

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: none needed

**Parallelization**: Depends on Task 4. Can run in parallel with Wave 3 tasks.

**References**:
- `app/lib/godot/debug/GodotDebugBridge.ts` — debug bridge impl
- `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` — time control
- `packages/game-inspector-mcp/src/tools/` — MCP tool definitions
- `packages/game-inspector-mcp/src/utils.ts` — queryGodot/querySlopcade helpers

**Acceptance Criteria**:
- [x] DebugOpsImpl implements all DebugOps methods
- [x] MCP tools work through game-inspector (spawn, destroy, screenshot, etc.)
- [x] `window.debugOps` available on web page
- [x] No changes to MCP tool external Zod schemas

---

### 11) Migrate RulesSystem to WorldOps

**What to do**:
- Update `RulesSystem` (and `RunScriptActionExecutor`, behavior executors) to use WorldOps:
  - Replace direct EntityManager/GodotBridge calls with WorldOps calls
  - Since RulesSystem runs in game loop, it can `await` WorldOps (same as sequences)
  - Or keep sync patterns where possible (rules typically don't need animations)
- Update `BehaviorExecutor` to use WorldOps for entity manipulation
- This is a gradual migration — start with spawn/destroy/position, expand later

**Must NOT do**:
- Don't refactor the entire rules engine — just swap the entity manipulation calls
- Don't change behavior logic — only the plumbing

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: none needed

**Parallelization**: Depends on Task 4. Can run in parallel with Wave 3 tasks.

**References**:
- `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` — uses SandboxRuntimeContext for entity ops
- `app/lib/game-engine/BehaviorExecutor.ts` — behavior handler registration
- `app/lib/game-engine/behaviors/TweenBehaviors.ts` — uses globalTweenSystem directly

**Acceptance Criteria**:
- [x] RulesSystem uses WorldOps for entity manipulation
- [x] Existing game behaviors work as before
- [x] `pnpm test` passes

---

### 12) Big Bang Legacy Cleanup

This is NOT a quick task. This is a comprehensive removal of every old code path, every deprecated interface, every duplicated type, and every shim. After this task, there is ONE way to do each thing. Zero tech debt increase.

**Approach**: Grep first, delete second, verify third. For each item below: (1) grep to confirm it's unused, (2) delete it, (3) run `pnpm tsc --noEmit` to confirm nothing breaks.

**What to do**:

**12a) Remove old intermediary types from `app/lib/scripting/types.ts`:**
- Remove `SandboxRuntimeContext` interface (lines 142-178) — replaced by ScriptContext + WorldOps
- Remove `AnimateConfig` interface (lines 24-29) — replaced by `AnimateTarget` + `AnimateOptions` from world-ops.ts
- Remove `EntityData` interface (lines 31-36) — replaced by `WorldEntityData` from world-ops.ts
- Remove `EntityQuery` interface (lines 83-92) — replaced by `WorldEntityQuery` from world-ops.ts
- Remove `SpawnOptions` in scripting/types.ts (lines 77-81) — replaced by `SpawnOptions` from world-ops.ts
- Update all imports across the codebase to point to the world-ops.ts versions
- Keep: `ScriptBudgetConfig`, `DragSnapshot`, `InputSnapshot`, `ScriptContext` (new version), `ScriptLifecycleExports`, `ScriptInputEvent`, `ScriptCollisionEvent`, `ScriptErrorReport`, `ScriptResult`, `ScriptSandboxConfig`, `ScriptErrorType`

**12b) Remove `GameScriptAPI.ts` shim layer:**
- Remove `createScriptContext()` function — context is now built directly in ScriptSandboxRuntimeSystem using WorldOps + cache reads
- Remove `contextToPlainObject()` function — QuickJS now uses `valueToHandle()` / `callFunction()` instead of JSON serialization
- Delete the entire file if nothing else lives in it
- Update all imports that referenced it

**12c) Remove old `ScriptContext` interface (the sync-everything version):**
- The old `ScriptContext` (types.ts lines 38-75) has methods like `spawnEntity()`, `destroyEntity()`, `getEntityPosition()`, `setEntityPosition()`, `animateEntity()` — all flat sync methods
- These are replaced by the new `ScriptContext` which has sync reads + `world: WorldOps` + `startSequence()`
- Remove the old interface, ensure the new one is the only `ScriptContext` export
- Remove `addScore()` and `addLives()` convenience methods — these are just `setVariable('score', ...)` wrappers and add API surface with no value

**12d) Update `IScriptSandbox` interface:**
- The `runX()` methods currently accept `SandboxRuntimeContext` — change to accept the new context type (or whatever replaces it)
- If `SandboxRuntimeContext` is fully removed, the `runX` methods should accept the new `ScriptContext` directly (or the raw building blocks that each sandbox impl uses to construct context)
- Update both `UnsafeScriptSandbox` and `QuickJSScriptSandbox` to match

**12e) Remove old QuickJS JSON serialization path:**
- Remove `contextToPlainObject()` usage from `QuickJSScriptSandbox.callHook()` 
- Remove the `JSON.stringify(ctxObj)` + `engine.evaluate(string)` pattern
- This should already be replaced by Task 7 with `callFunction` + `valueToHandle`
- Verify no fallback to the old pattern remains

**12f) Remove old entity adapter in ScriptSandboxRuntimeSystem:**
- Remove `createEntityManagerAdapter()` method (should already be gone from Task 7)
- Remove any "backward compat" shim code added during migration
- Verify no method on the system directly constructs an adapter outside WorldOps

**12g) Clean up MCP tool legacy patterns:**
- Remove old `queryGodot()` / `querySlopcade()` helper functions from `packages/game-inspector-mcp/src/utils.ts` if no longer needed (replaced by DebugOps calls)
- Remove any direct `GodotDebugBridge` references from MCP tool files (should go through DebugOps)
- Remove `window.godotDebugBridge` exposure if replaced by `window.debugOps`

**12h) Clean up direct system access that should go through WorldOps:**
- Remove direct `globalTweenSystem` usage from behavior executors (e.g., `TweenBehaviors.ts`) — use WorldOps.animate()
- Remove direct EntityManager entity manipulation calls from RulesSystem action executors — use WorldOps
- Remove direct GodotBridge spawn/destroy calls that bypass WorldOps (except in WorldOpsImpl itself)

**12i) Dead import sweep:**
- Run `pnpm tsc --noEmit` after each sub-task to catch broken imports early
- Grep for every removed type/function name across the entire codebase
- Fix any remaining references

**Must NOT do**:
- Don't remove types that are still referenced — grep FIRST for every deletion
- Don't remove GodotBridge itself — it's the transport layer, WorldOps is built on top of it
- Don't remove GodotDebugBridge — DebugOpsImpl wraps it
- Don't change MCP Zod schemas (external API)
- Don't remove any type that `shared/` exports if external consumers exist

**Recommended Agent Profile**:
- Category: `deep`
- Skills: none needed (but requires careful, methodical work)

**Parallelization**: Depends on Tasks 7, 8, 9, 10, 11 (ALL implementation tasks must be complete first). Sub-items 12a-12i can be done sequentially within the task.

**References**:
- `app/lib/scripting/types.ts` — types to remove/replace
- `app/lib/scripting/GameScriptAPI.ts` — entire file to remove
- `app/lib/scripting/IScriptSandbox.ts` — interface to update
- `app/lib/scripting/UnsafeScriptSandbox.ts` — remove SandboxRuntimeContext usage
- `app/lib/scripting/QuickJSScriptSandbox.ts` — remove JSON.stringify pattern
- `shared/src/types/world-ops.ts` — canonical replacement types
- `packages/game-inspector-mcp/src/utils.ts` — queryGodot helpers to remove
- `app/lib/game-engine/behaviors/TweenBehaviors.ts` — globalTweenSystem direct usage

**Acceptance Criteria**:
- [x] Zero duplicated entity/query/animate/spawn types remain
- [x] `SandboxRuntimeContext` interface deleted — zero references anywhere
- [x] `GameScriptAPI.ts` deleted (or gutted to just the seeded random utility)
- [x] `contextToPlainObject()` deleted — zero references
- [x] `createEntityManagerAdapter()` deleted — zero references
- [x] No file imports `SandboxRuntimeContext`, `AnimateConfig` (old), `EntityData` (old), `EntityQuery` (old) from scripting/types
- [x] `queryGodot()` helper removed or simplified (if still needed for non-WorldOps calls)
- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm test` passes
- [x] `grep -r 'SandboxRuntimeContext' app/ shared/ packages/` returns zero results
- [x] `grep -r 'contextToPlainObject' app/` returns zero results
- [x] `grep -r 'createEntityManagerAdapter' app/` returns zero results

---

### 13) Contract tests + startSequence example

**What to do**:
- Create `app/lib/game-engine/WorldOpsImpl.test.ts`:
  - Test: spawn returns entity ID
  - Test: getPosition reads from cache
  - Test: setPosition updates cache + fires bridge call
  - Test: animate returns Promise that resolves on tween completion
  - Test: wait returns Promise that resolves after specified game time
  - Test: queryEntities filters correctly
- Create `app/lib/game-engine/SequenceManager.integration.test.ts`:
  - Test: full sequence flow (animate → wait → destroy)
  - Test: cancellation mid-sequence
  - Test: multiple sequences running concurrently
- Create or update a test game demonstrating startSequence:
  - Intro sequence in onStart (gate gameplay with variable)
  - Death animation in onCollision
  - Cascade sequence in onUpdate

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `test-driven-development`

**Parallelization**: Depends on Tasks 8 and 9.

**References**:
- `app/lib/scripting/UnsafeScriptSandbox.test.ts` — existing test patterns
- `.claude/memory/roadmap/active/unified-world-ops.md` Section 5 — example code for test games

**Acceptance Criteria**:
- [x] WorldOpsImpl has comprehensive unit tests
- [x] SequenceManager has integration tests
- [x] A test game demonstrates startSequence() with visible animations
- [x] `pnpm test` passes

---

### 14) Documentation updates

**What to do**:
- Update `docs/game-maker/reference/scripting.md`:
  - Document new ScriptContext interface (sync reads + world + startSequence)
  - Document the "hooks are sync, sequences are async" pattern
  - Add examples: onUpdate with startSequence, onStart with intro sequence, onCollision with death animation
  - Document SequenceHandle and cancellation
  - Document time semantics (game time vs realtime)
- Update `.claude/memory/roadmap/active/unified-world-ops.md`:
  - Mark status as "Implementation Complete" when done
  - Update any sections that changed during implementation

**Recommended Agent Profile**:
- Category: `writing`
- Skills: none needed

**Parallelization**: Depends on all implementation tasks.

**References**:
- `docs/game-maker/reference/scripting.md` — existing scripting docs
- `.claude/memory/roadmap/active/unified-world-ops.md` — design document

**Acceptance Criteria**:
- [x] Scripting docs explain the sync hooks + startSequence pattern
- [x] Examples are copy-pasteable and correct
- [x] Design doc marked as implemented

---

### 15) Final Verification Sweep

The purpose of this task is to PROVE that no legacy code paths remain. This is not a "check if it compiles" — this is an exhaustive grep-based audit.

**What to do**:

**15a) Dead pattern grep audit — every one of these must return zero results:**

```bash
# Old intermediary types
grep -r 'SandboxRuntimeContext' app/ shared/ packages/ --include='*.ts' --include='*.tsx'
grep -r 'contextToPlainObject' app/ --include='*.ts'
grep -r 'createEntityManagerAdapter' app/ --include='*.ts'
grep -r 'createScriptContext' app/ --include='*.ts'  # Old GameScriptAPI function

# Old ScriptContext methods (replaced by WorldOps)
grep -r 'spawnEntity\b' app/lib/scripting/ --include='*.ts'  # Should be world.spawn
grep -r 'destroyEntity\b' app/lib/scripting/ --include='*.ts'  # Should be world.destroy
grep -r 'getEntityPosition\b' app/lib/scripting/ --include='*.ts'  # Should be getPosition
grep -r 'setEntityPosition\b' app/lib/scripting/ --include='*.ts'  # Should be world.setPosition
grep -r 'getEntityVelocity\b' app/lib/scripting/ --include='*.ts'  # Should be getVelocity
grep -r 'setEntityVelocity\b' app/lib/scripting/ --include='*.ts'  # Should be world.setVelocity
grep -r 'animateEntity\b' app/lib/scripting/ --include='*.ts'  # Should be world.animate
grep -r 'getEntityTags\b' app/lib/scripting/ --include='*.ts'  # Should be getTags

# Old duplicated types (should import from world-ops.ts instead)
grep -r "from.*scripting/types.*import.*AnimateConfig" app/ --include='*.ts'
grep -r "from.*scripting/types.*import.*EntityData\b" app/ --include='*.ts'
grep -r "from.*scripting/types.*import.*EntityQuery\b" app/ --include='*.ts'

# Old MCP patterns
grep -r 'queryGodot\b' packages/game-inspector-mcp/ --include='*.ts'  # Should be debugOps.*
grep -r 'querySlopcade\b' packages/game-inspector-mcp/ --include='*.ts'  # Should be debugOps.*

# Old direct system access (should go through WorldOps)
grep -r 'globalTweenSystem' app/lib/game-engine/behaviors/ --include='*.ts'  # Should be WorldOps.animate
```

**15b) Single-source-of-truth verification:**
- Confirm there is exactly ONE `ScriptContext` interface exported (the new one with `world: WorldOps`)
- Confirm there is exactly ONE `SpawnOptions` type used across the codebase (from world-ops.ts)
- Confirm there is exactly ONE way to spawn an entity: `WorldOps.spawn()` (or `ctx.world.spawn()`)
- Confirm there is exactly ONE way to animate an entity: `WorldOps.animate()` (or `ctx.world.animate()`)

**15c) Build + test verification:**
```bash
pnpm tsc --noEmit
pnpm test
```

**Must NOT do**:
- Don't skip any grep — every one must be run and results confirmed
- Don't hand-wave "it probably compiles" — run the actual commands

**Recommended Agent Profile**:
- Category: `quick`
- Skills: `verification-before-completion`

**Parallelization**: Depends on Task 12. Can run in parallel with Task 16.

**Acceptance Criteria**:
- [x] Every grep in 15a returns zero results
- [x] Single-source-of-truth checks in 15b all pass
- [x] `pnpm tsc --noEmit` exits 0
- [x] `pnpm test` exits 0

---

### 16) Smoke Test — End-to-End Verification

Run the actual application and verify nothing is broken with real gameplay and real MCP tool usage.

**What to do**:
- Start dev server: `pnpm dev`
- Load `breakoutScripted` test game on web — verify:
  - onStart hook fires (game initializes)
  - onUpdate hook fires every frame (paddle follows mouse, ball moves)
  - onCollision hook fires (bricks break on ball hit)
  - Score updates correctly
  - Game win/lose conditions trigger
- Load a game with animations — verify:
  - `startSequence()` example runs (chained animations complete in order)
  - Cancelling a sequence mid-animation doesn't crash
  - Re-triggering the same sequence name cancels the old one
- Test MCP tools via game-inspector:
  - `spawn` — creates entity at position
  - `destroy` — removes entity
  - `screenshot` — returns image
  - `pause` / `resume` — time control works
  - `get_props` / `set_props` — property inspection works
- Test async safety guard:
  - Load a script with `async function onUpdate(ctx, dt) { ... }`
  - Verify: warning is logged, script is disabled, game continues running

**Must NOT do**:
- Don't skip MCP testing — these are external consumers and must work
- Don't skip the async safety guard test — this is a safety-critical feature

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `playwright`, `verification-before-completion`

**Parallelization**: Depends on Task 15. Can overlap.

**Acceptance Criteria**:
- [x] breakoutScripted gameplay works end-to-end on web
- [x] startSequence chained animation demo works
- [x] MCP tools work through game-inspector
- [x] Async hook safety guard triggers correctly
- [x] No console errors during any of the above

---

## Commit Strategy

Suggested atomic commits (executor can adjust):

1. `feat(shared): add WorldOps and DebugOps type definitions` (Tasks 1, 2)
2. `feat(game-engine): implement SequenceManager with cancellation` (Task 3)
3. `feat(game-engine): implement WorldOpsImpl backed by EntityManager + Bridge` (Task 4)
4. `feat(game-engine): wire animate/wait to TweenSystem with Promise completion` (Task 5)
5. `feat(scripting): add new ScriptContext types with sync reads and startSequence` (Task 6)
6. `refactor(scripting): migrate ScriptSandboxRuntimeSystem to WorldOps` (Task 7)
7. `feat(scripting): integrate SequenceManager into script sandbox` (Task 8)
8. `feat(scripting): add async-return-value safety guard for hooks` (Task 9)
9. `refactor(game-inspector): migrate MCP tools to DebugOps` (Task 10)
10. `refactor(game-engine): migrate RulesSystem to WorldOps` (Task 11)
11. `chore!: big bang legacy cleanup — remove all old code paths` (Task 12)
12. `test(game-engine): add WorldOps contract tests and startSequence example` (Task 13)
13. `docs(scripting): document sync hooks + startSequence pattern` (Task 14)
14. `chore: final verification sweep — prove zero legacy references` (Task 15, no code changes — audit only)
15. `chore: smoke test end-to-end verification` (Task 16, no code changes — verification only)

---

## Final Verification Commands

**Automated (must all pass):**
```bash
pnpm tsc --noEmit
pnpm test
```

**Dead pattern audit (must all return zero results):**
```bash
grep -r 'SandboxRuntimeContext' app/ shared/ packages/ --include='*.ts' --include='*.tsx'
grep -r 'contextToPlainObject' app/ --include='*.ts'
grep -r 'createEntityManagerAdapter' app/ --include='*.ts'
grep -r 'createScriptContext' app/ --include='*.ts'
grep -r 'AnimateConfig' app/lib/scripting/ --include='*.ts'
grep -rw 'EntityData' app/lib/scripting/ --include='*.ts'
grep -rw 'EntityQuery' app/lib/scripting/ --include='*.ts'
```

**Manual smoke test:**
- Run `breakoutScripted` test game on web — verify hooks fire, gameplay works
- Run startSequence example — verify chained animations complete correctly
- Run game-inspector MCP tools — verify spawn/destroy/animate/screenshot still work
- Verify: a script with `async function onUpdate(...)` triggers warning and gets disabled
- Verify: QuickJS sandbox can call `ctx.getPosition()` and `ctx.world.setPosition()` (not just UnsafeScriptSandbox)
