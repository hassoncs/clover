# Sync World Ops Architecture and Migration Plan

## TL;DR

> **Quick Summary**: Standardize scripting on a sync-first `SyncWorldOps` facade for gameplay hooks, keep a clearly named `AsyncWorldOps` capability layer for true async/time-based operations, and migrate all script/runtime entry points to one canonical contract.
>
> **Deliverables**:
> - Canonical operation matrix (sync vs async) with ownership and semantics
> - Unified script API contract and naming (`ctx.*` sync, `ctx.worldAsync.*` async)
> - Migration plan across shared types, runtime context builders, scripts, tests, and inspector/MCP
> - TDD + runtime verification plan for BallSort and cross-game safety
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 7 -> Task 10

---

## Context

### Original Request
- User wants a **big, complete markdown plan** defining all world operations, whether each is sync or async, and exactly how API behavior changes.
- User preference is sync scripting semantics for gameplay (`spawn`, `setVariable`, queries, etc.) and explicit async only where truly necessary.
- User also wants inspector/MCP interoperability preserved.

### Evidence from Codebase

**Current contracts**
- `shared/src/types/world-ops.ts` defines Promise-returning `WorldOps` for all operations.
- `app/lib/scripting/types.ts` defines runtime `ScriptContext` with sync reads plus `world: WorldOps`.
- `shared/src/scripting/script-authoring-types.ts` defines a separate flat sync authoring API (`spawnEntity`, `setVariable`, etc.).

**Runtime implementation reality**
- `app/lib/game-engine/WorldOpsImpl.ts` executes many operations synchronously in JS state (EntityManager/Physics2D) despite Promise signatures.
- `wait` and `animate` are truly async/multi-frame (`WorldOpsImpl.wait`, `WorldOpsImpl.animate`).

**Bridge constraints**
- `app/lib/godot/types.ts` contains inherently async bridge queries (`getEntityTransform`, `getLinearVelocity`, `queryPoint`, `raycast`, etc.), especially due to native/worklet boundary.

**Script usage reality**
- `r2/games/*` scripts heavily use flat sync methods (`setVariable`, `spawnEntity`, `destroyEntity`, `queryEntities`, etc.).
- `r2/games` currently shows little/no direct `ctx.world.*` usage.

**Sync hook guardrails**
- Hooks are explicitly sync-only (`app/lib/scripting/types.ts`).
- Both sandbox implementations disable scripts that return Promises (`UnsafeScriptSandbox`, `QuickJSScriptSandbox`).

---

## Target Architecture

### Design Principles
1. **Hooks stay synchronous** (`onStart`, `onUpdate`, `onInput`, `onCollision` return `void`).
2. **Sync-first script ergonomics** for gameplay logic and deterministic frame behavior.
3. **Async explicitly isolated** to temporal and bridge-bound operations.
4. **Single canonical script contract**; no parallel incompatible context definitions.
5. **Deterministic command ordering + stable ID generation** for script-issued entity lifecycle operations.

### Canonical API Shape (new world)

- `ctx.*` => **SyncWorldOps facade** + sync reads/utils (default scripting surface)
- `ctx.worldAsync.*` => **AsyncWorldOps** for true async capabilities
- `ctx.startSequence(name, async (worldAsync) => ...)` remains for multi-frame workflows

---

## Operation Matrix (authoritative)

### A) Entity Lifecycle

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| spawn entity | `ctx.spawnEntity` | Sync | ID can be generated and state updated immediately in JS | Bridge apply is fire-and-forget; deterministic ordering required |
| destroy entity | `ctx.destroyEntity` | Sync | Local entity graph mutation is immediate | Bridge destroy command follows same frame ordering |
| clone entity | `ctx.cloneEntity` | Sync (preferred) | Can clone local state synchronously | If deep clone relies on async external fetch, fallback to async variant |
| reparent entity | `ctx.reparentEntity` | Sync | Local hierarchy mutation is immediate | Preserve transform behavior consistent with current options |

### B) Transform

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| get position | `ctx.getEntityPosition` | Sync | Frame cache / EntityManager read | Existing scripts already expect sync |
| set position | `ctx.setEntityPosition` | Sync | Local state update immediate | Bridge update issued command-style |
| get rotation | `ctx.getEntityRotation` | Sync | Local transform read | Add alias if needed for backward compatibility |
| set rotation | `ctx.setEntityRotation` | Sync | Local update immediate | Keep angle conventions consistent |
| get scale | `ctx.getEntityScale` | Sync | Local transform read | Add to facade (currently missing in flat API) |
| set scale | `ctx.setEntityScale` | Sync | Local update immediate | |
| set visible | `ctx.setEntityVisible` | Sync | Local visible state + bridge command | |

### C) Physics

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| get linear velocity | `ctx.getEntityVelocity` | Sync | Physics2D local read | |
| set linear velocity | `ctx.setEntityVelocity` | Sync | Physics2D local write | |
| get angular velocity | `ctx.getEntityAngularVelocity` | Sync | Physics2D local read | Add flat facade |
| set angular velocity | `ctx.setEntityAngularVelocity` | Sync | Physics2D local write | Add flat facade |
| apply impulse | `ctx.applyImpulse` | Sync | Immediate physics command in local sim | |
| apply force | `ctx.applyForce` | Sync | Immediate physics command in local sim | |

### D) Tags / Metadata

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| get tags | `ctx.getEntityTags` | Sync | Local entity metadata read | |
| add tag | `ctx.addTag` | Sync | Local mutation | |
| remove tag | `ctx.removeTag` | Sync | Local mutation | Return boolean |
| has tag | `ctx.hasTag` | Sync | Local query | |
| get template | `ctx.getEntityTemplate` | Sync | Local metadata read | |
| get entity data | `ctx.getEntityData` | Sync | Local aggregate snapshot | |

### E) Queries

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| query entities | `ctx.queryEntities` | Sync | EntityManager query on local state | |
| query entities with data | `ctx.queryEntitiesWithData` | Sync | Local aggregate query | |
| query point | `ctx.queryPoint` | Sync (primary) | Physics2D local query available | Keep async inspector path separate |
| query AABB | `ctx.queryAABB` | Sync (primary) | Physics2D local query available | |
| raycast | `ctx.raycast` | Sync (primary) | Physics2D local raycast available | For expensive/remote path expose `worldAsync.raycast` too |

### F) Variables / Game State

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| get variable | `ctx.getVariable` | Sync | Current frame game state read | |
| set variable | `ctx.setVariable` | Sync | Immediate local state write + event emit | Must be same-frame visible |
| get constant | `ctx.getConstant` | Sync | Static read | |
| emit event | `ctx.emit` | Sync | EventQueue publish is local | |
| win | `ctx.win` | Sync | State transition command | |
| lose | `ctx.lose` | Sync | State transition command | |
| add score | `ctx.addScore` | Sync | Derived from variable/event model | Define canonical behavior |
| add lives | `ctx.addLives` | Sync | Derived from variable/event model | Define canonical behavior |

### G) Timing / Multi-frame

| Operation | New Surface | Sync/Async | Reasoning | Notes |
|---|---|---|---|---|
| animate | `ctx.worldAsync.animate` | Async | Time-based completion semantics | Keep out of sync hook flow |
| wait | `ctx.worldAsync.wait` | Async | Explicit temporal yielding | Use within sequences |
| start sequence | `ctx.startSequence` | Sync entry -> Async body | Bridge from sync hook to async workflow | Existing pattern retained |

### H) Bridge-bound / inspector-centric operations

| Operation class | Surface | Sync/Async | Reasoning |
|---|---|---|---|
| Bridge thread/worklet queries requiring round-trip | `worldAsync.*` | Async | Native/Web boundary and transport latency |
| MCP / Game Inspector tooling operations | `worldAsync.*` (or adapter) | Async | Tooling environment already async and request/response-oriented |

---

## Contracts to Introduce

### 1) `SyncWorldOps` (new)
- Contains all sync-safe gameplay operations listed above.
- No Promises.
- Deterministic semantics and immediate local visibility.

### 2) `AsyncWorldOps` (renamed/explicit)
- Temporal and bridge-bound operations.
- Promise-based.
- Used by sequences, tooling, inspector/MCP, and special async cases.

### 3) `ScriptContext` (canonical)
- Includes sync methods directly on `ctx`.
- Includes `worldAsync` namespace for async ops.
- Keeps `startSequence` as sync bridge into async flow.

---

## Migration Plan (single plan, end-to-end)

## Wave 1 - Contract and type alignment
- [x] Define `SyncWorldOps` and `AsyncWorldOps` interfaces in shared types.
- [x] Update `ScriptContext` canonical definition to include sync facade + `worldAsync`.
- [x] Collapse/align duplicate script context definitions:
  - `shared/src/scripting/script-authoring-types.ts`
  - `app/lib/scripting/types.ts`
- [x] Keep a temporary strict compatibility adapter to avoid immediate breakage.

## Wave 2 - Runtime builders and adapters
- [x] Update `RunScriptActionExecutor.createScriptContext` to expose full sync facade and `worldAsync`.
- [x] Update `ScriptSandboxRuntimeSystem.createScriptContext` with identical surface.
- [x] Ensure deterministic ID generation strategy for sync `spawnEntity`.
- [x] Ensure command ordering guarantees for JS->Godot apply path.

## Wave 3 - Script/runtime migration
- [x] Migrate all `r2/games/*` scripts to canonical sync facade names (if any mismatch remains).
- [x] Replace legacy/duplicated method names with canonical aliases where needed.
- [x] Add lint/static guardrails to prevent Promise use in hooks.

## Wave 4 - Inspector/MCP integration alignment
- [x] Verify `packages/game-inspector-mcp` continues using async operations contract.
- [x] Add adapter/mapping where needed between `SyncWorldOps` world state and async inspector APIs.
- [x] Document consistency guarantees between script state and inspector-visible state.

## Wave 5 - Verification and hardening
- [x] TDD regression: BallSort startup calls `spawnEntity` + `setVariable` successfully.
- [x] Add targeted tests for sync/async boundary invariants.
- [x] Runtime QA in game inspector (error-free startup + entities present).
- [x] Typecheck and test suites.

---

## Detailed TODOs

- [x] 1. Build exhaustive operation inventory and map current ownership
  - **Do**: confirm each op exists in shared contract, runtime impl, context facade, and game usage.
  - **Refs**: `shared/src/types/world-ops.ts`, `app/lib/game-engine/WorldOpsImpl.ts`, `r2/games/*`.
  - **Acceptance**: one-to-one matrix with no unclassified op.

- [x] 2. Define canonical interfaces and naming
  - **Do**: introduce `SyncWorldOps` and rename existing async surface to `AsyncWorldOps` (or alias plan).
  - **Refs**: `shared/src/types/world-ops.ts`, `app/lib/scripting/types.ts`.
  - **Acceptance**: all script-facing signatures compile without Promise-return types for sync facade.

- [x] 3. Unify ScriptContext definitions
  - **Do**: remove interface drift between authoring and runtime types.
  - **Refs**: `shared/src/scripting/script-authoring-types.ts`, `app/lib/scripting/types.ts`.
  - **Acceptance**: single canonical definition source + re-export strategy.

- [x] 4. Implement sync facade in `RunScriptActionExecutor`
  - **Do**: expose complete sync set used by game scripts.
  - **Refs**: `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`.
  - **Acceptance**: run_script path supports BallSort-style flat calls.

- [x] 5. Implement sync facade in `ScriptSandboxRuntimeSystem`
  - **Do**: mirror exact same API as Task 4.
  - **Refs**: `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`.
  - **Acceptance**: lifecycle hooks have identical API surface.

- [x] 6. Determinism and ordering hardening
  - **Do**: formalize spawn ID strategy and command flush ordering.
  - **Acceptance**: deterministic replay behavior for sync script commands.

- [x] 7. TDD: add minimal regression coverage
  - **Do**: one RED->GREEN test for dynamic spawn + variable writes in startup script path.
  - **Refs**: `app/lib/scripting/UnsafeScriptSandbox.test.ts` and/or executor tests.
  - **Acceptance**: test fails pre-fix, passes post-fix.

- [x] 8. Add boundary tests for true async operations
  - **Do**: tests for `wait/animate` sequence-only async workflow.
  - **Acceptance**: hooks remain sync; async only through sequence/worldAsync.

- [x] 9. Inspector/MCP compatibility validation
  - **Do**: verify async tools keep functioning with renamed/aliased async contract.
  - **Refs**: `packages/game-inspector-mcp/src/tools/*`.
  - **Acceptance**: lifecycle/physics/properties tools still operate.

- [x] 10. Runtime QA with game inspector
  - **Do**: open BallSort, inspect logs, verify spawned balls count and no missing-method errors.
  - **Acceptance**:
    - no `ctx.spawnEntity is not a function`
    - no `ctx.setVariable is not a function`
    - ball entity count > 0

---

## Verification Strategy

### Test Decision
- Infrastructure: YES (Vitest)
- Mode: TDD for regression + targeted boundary tests

### Agent-Executed QA scenarios

Scenario: BallSort startup script API parity
  Tool: game-inspector
  Steps:
    1. Open BallSort test game.
    2. Capture script/runtime logs.
    3. Assert no missing-method errors.
    4. Query ball entities by tag/template and assert count > 0.
    5. Save screenshot evidence.
  Evidence: `.sisyphus/evidence/task-10-ballsort-startup.png`

Scenario: Sync facade determinism
  Tool: test runner
  Steps:
    1. Execute deterministic spawn/variable unit tests.
    2. Assert stable ID + same-frame variable visibility.
  Evidence: terminal output snapshots.

Scenario: Async boundary correctness
  Tool: test runner
  Steps:
    1. Run sequence tests validating `wait/animate` path.
    2. Assert no async hook usage and no Promise-return hook passes.
  Evidence: test output.

### Verification Commands
```bash
pnpm test -- RunScriptActionExecutor
pnpm test -- ScriptSandboxRuntimeSystem
pnpm test -- UnsafeScriptSandbox
pnpm test -- SequenceManager
pnpm tsc --noEmit
```

---

## Guardrails
- Do not relax sync-hook enforcement.
- Do not make gameplay correctness depend on async bridge acknowledgment.
- Do not keep dual drifting script contracts after migration completes.
- Do not hide truly async operations behind fake sync semantics without clear documented caveats.

---

## Success Criteria
- [x] One canonical script contract exists and is used everywhere.
- [x] Gameplay scripts use sync-first API without Promise coupling.
- [x] Async operations are explicit and limited to `worldAsync`/sequence pathways.
- [x] BallSort and existing scripted games run without missing-method errors.
- [x] Inspector/MCP tooling remains operational against async contract.
