# Unified Bridge Design Brief

> **Purpose**: Everything needed to continue designing and implementing a unified Godot ↔ TypeScript bridge from scratch. Written for an AI agent with zero prior context.
>
> **Status**: Analysis complete. Architecture design needed. No implementation started yet.
>
> **Worktree**: All prior bridge refactoring work lives on branch `refactor/godot-bridge-dedup-dispatch` in worktree `/Users/hassoncs/Workspaces/Personal/slopcade/.worktrees/refactor/godot-bridge-dedup-dispatch`. The new unified bridge work should likely be a NEW branch/worktree.

---

## 1. Project Overview

Slopcade is a React Native + Godot 4 game engine. TypeScript (React Native) controls game logic; Godot handles physics and rendering. They communicate via a "bridge" — different implementations for web (WASM + JavaScriptBridge) and native (JSI).

---

## 2. The Problem

There are currently **5 different communication paths** between TypeScript and Godot, using **2 separate dispatch mechanisms** on the Godot side, with **3 separate TypeScript interfaces** that overlap in functionality but diverge in signatures. This creates:

- Duplicated method registrations (same methods registered twice in different maps)
- Untestable debug methods (headless tests only cover one dispatch path)
- No single source of truth for the bridge contract
- MCP server forced to use Playwright (can't connect directly)

---

## 3. Current Architecture (Detailed)

### 3.1 Godot Side: Two Dispatch Mechanisms

#### Mechanism A: Method Dispatch (`GameBridge._method_map`)
- **File**: `godot_project/scripts/GameBridge.gd`
- **Registration**: `_build_method_map()` (line ~164) builds a Dictionary: `{method_name: Callable}`
- **Count**: ~92 methods
- **Dispatch**: `native_dispatch(method_name, args_json)` (line ~273) — parses JSON args, looks up callable, calls it, returns result
- **Web exposure**: `_setup_js_bridge()` (line ~307) iterates the map, wraps each callable in `JavaScriptBridge.create_callback()`, assigns to `window.GodotBridge.camelCaseName`
- **Pattern**: Mostly fire-and-forget (void). Some return values synchronously.
- **Recent refactoring**: We added `_js_*` prefix auto-registration convention — modules expose `_js_spawn_entity`, etc. and `_auto_register_bridge_methods()` scans for them. Manual overrides still applied after.
- **Consumers**: GodotBridge.web.ts, GodotBridge.native.ts, HeadlessTestAdapter.gd (TCP)

#### Mechanism B: Query Dispatch (`QuerySystem._handlers`)
- **File**: `godot_project/scripts/bridge/QuerySystem.gd` (95 lines)
- **Registration**: `register_handler(method_name, callback)` — stores in `_handlers` Dictionary
- **Count**: ~42 handlers (9 core + 33 debug)
- **Dispatch**: JS calls `window.GodotBridge.query(requestId, method, argsJson)`:
  1. `_on_js_query(args)` receives the 3 args
  2. Looks up handler in `_handlers`
  3. Calls handler with parsed args
  4. Sends response via `JavaScriptBridge.eval("window._godotQueryResolve('requestId', 'resultJson')")` 
- **Async support**: Methods listed in `_async_methods` array (currently just `"step"`) use `dispatch_async()` which awaits coroutines
- **Pattern**: Always async request/response with requestId correlation
- **Core handlers** registered by `GameBridge._register_core_query_handlers()` (line ~153):
  - `getAllTransforms`, `getAllProperties`, `getWorldInfo`, `getCameraInfo`, `getViewportInfo`, `getEntityTransform`, `queryPointEntity`, `screenToWorld`, `getSplatTexture`
- **Debug handlers** registered by `DebugBridge._register_handlers()` (line ~36):
  - Snapshot: `getSceneSnapshot`, `findEntities`, `getEntityDetails`, `getEntitiesAtPoint`, `getEntitiesInRect`, `getEntityCount`, `query`, `queryAst`
  - Props: `getProps`, `getAllProps`, `setProps`, `patchProps`
  - Lifecycle: `spawn`, `destroy`, `clone`, `reparent`, `lifecycleBatch`
  - Time: `getTimeState`, `step`, `setTimeScale`, `setSeed`
  - Events: `subscribe`, `unsubscribe`, `pollEvents`, `listSubscriptions`
  - Physics: `raycast`, `raycastAll`, `getShapes`, `getJoints`, `getEntityJoints`, `getOverlaps`, `getAllOverlaps`, `queryPoint`, `queryAABB`
- **Consumers**: GodotDebugBridge.ts (via bridge.query()), then DebugOpsImpl, MCP

#### DebugBridge Loading
- **File**: `godot_project/scripts/bridge/debug/DebugBridge.gd` (579 lines)
- **Currently always loaded**: `GameBridge._init_modules()` (line 123) unconditionally creates `DebugBridge.new(self, _query_system)`
- **Has unregister**: `unregister_handlers()` method exists to remove all 33 debug handlers
- **Modular**: Internally delegates to `DebugSelector`, `DebugProps`, `DebugLifecycle`, `DebugTime`, `DebugEvents`, `DebugPhysics`

#### Key Difference Between A and B
- **A (Method)**: Direct callable invocation. No request ID. Sync return or fire-and-forget. Fast.
- **B (Query)**: Request/response with ID. Always async. Response sent via JS eval. Richer error handling.

### 3.2 TypeScript Side: Three Interfaces

#### Interface 1: `GodotBridge` (Production)
- **File**: `app/lib/godot/types.ts` (extends `EffectsBridge`)
- **~120 methods** — the big one
- **Mix of sync and async**: Most are `void` (fire-and-forget). ~15 return `Promise<T>` (use queryAsync internally)
- **Implementations**:
  - `app/lib/godot/GodotBridge.web.ts` — calls `window.GodotBridge.methodName(args)`
  - `app/lib/godot/GodotBridge.native.ts` — calls `native_dispatch("snake_case", argsJson)` via JSI
- **Categories**: Entity mgmt, transforms, velocity/forces, joints, queries, events/callbacks, input/UI, assets/rendering, pixel buffer, camera/effects, 3D, debug settings
- **Consumed by**: `WorldOpsImpl`, `GameRuntime`, React components

#### Interface 2: `GodotDebugBridge` (Debug/Inspection)
- **File**: `app/lib/godot/debug/types.ts` (661 lines of types)
- **~40 methods**, all `Promise<T>` (async)
- **Two generations**:
  - Legacy: `getSnapshot()`, `getEntity()`, `captureScreenshot()`, `simulateTap()`, `simulateDrag()`, assertions, wait helpers, collision history
  - V2: `query()`, `getProps()`, `setProps()`, `patchProps()`, `spawn()`, `destroy()`, `clone()`, `reparent()`, time control, events, physics queries
- **Implementation**: `app/lib/godot/debug/GodotDebugBridge.ts` — wraps `bridge.query(requestId, handlerName, argsJson)` calls
- **Consumed by**: `DebugOpsImpl`, DevTools panel

#### Interface 3: `WorldOps` / `DebugOps` (Game Scripting)
- **Files**: `shared/src/types/world-ops.ts` (140 lines), `shared/src/types/debug-ops.ts` (60 lines)
- **`WorldOps`**: ~35 methods, all `Promise<T>` — high-level game scripting API
  - Entity lifecycle, transforms, physics, metadata (tags), queries, game state (variables, win/lose), pixel buffer, animation/timing
- **`DebugOps extends WorldOps`**: Adds time control, inspection, advanced queries, events
- **Implementation**: 
  - `app/lib/game-engine/WorldOpsImpl.ts` — wraps `GodotBridge` + `EntityManager` + `Physics2D`
  - `app/lib/game-engine/DebugOpsImpl.ts` — extends WorldOpsImpl, adds `GodotDebugBridge` + `SlopcadeDebugBridge` calls
- **Consumed by**: Game scripts (via `ScriptContext`), MCP server (via `window.debugOps`)

### 3.3 Method Overlap (Same Operation, Different Signatures)

| Operation | GodotBridge | GodotDebugBridge | WorldOps |
|-----------|-------------|------------------|----------|
| spawn | `spawnEntity(request: SpawnEntityRequest): void` | `spawn(req: SpawnRequest): Promise<SpawnResult>` | `spawn(templateId, pos, opts?): Promise<string \| null>` |
| destroy | `destroyEntity(entityId): void` | `destroy(entityId, opts?): Promise<DestroyResult>` | `destroy(entityId): Promise<void>` |
| raycast | `raycast(origin, dir, maxDist): Promise<RaycastHit \| null>` | `raycast(req: RaycastRequest): Promise<RaycastResult>` | `raycast(from, to, opts?): Promise<RaycastHit \| null>` |
| queryPoint | `queryPoint(point): Promise<number \| null>` | `queryPoint(x, y, opts?): Promise<QueryPointResult>` | `queryPoint(point): Promise<string \| null>` |
| step | `stepPhysics(frames): Promise<StepResult>` | `step(frames): Promise<StepResult>` | N/A |
| pause | `pausePhysics(): void` | `pause(): Promise<TimeControlResult>` | `pause(): Promise<void>` |
| setPosition | `setPosition(id, x, y): void` | via `setProps(id, {'transform.position.x': x})` | `setPosition(id, pos): Promise<void>` |

### 3.4 The Five Communication Paths

```
Path 1 (Web gameplay):     React → WorldOpsImpl → GodotBridge.web.ts → window.GodotBridge.method() → GameBridge._method_map
Path 2 (Native gameplay):  React → WorldOpsImpl → GodotBridge.native.ts → JSI native_dispatch() → GameBridge._method_map
Path 3 (Debug/DevTools):   DevTools → DebugOpsImpl → GodotDebugBridge → bridge.query() → QuerySystem → DebugBridge handlers
Path 4 (MCP Inspector):    MCP → Playwright → page.evaluate → window.debugOps (DebugOpsImpl) → Paths 1+3
Path 5 (Headless Tests):   Node.js → TCP:9876 → HeadlessTestAdapter.gd → native_dispatch() → GameBridge._method_map ONLY
```

---

## 4. What We Want (Design Goals)

The user's verbatim requirements:

1. **One shared method registry** — all methods (core + debug) registered the same way on the Godot side
2. **Dynamic registration** — debug methods only installed when needed, not always present in production
3. **Type-safe single contract** — one TypeScript source of truth defining all bridge methods with sync/async annotated
4. **Unified test coverage** — headless harness tests ALL methods (core ~92 + debug ~40), not just the method_map
5. **MCP flexibility** — MCP can keep using Playwright OR switch to TCP for direct communication
6. **Future AI game-building** — in production, AI connects over the bridge in debug mode to help users inspect/build games

### Design Constraints (also from user)

- **Don't over-unify** — if it adds complexity or dynamic dispatch overhead, don't do it
- **Backward compatible** — existing consumers of GodotBridge, GodotDebugBridge, WorldOps must keep working
- **Production path stays fast** — Paths 1 and 2 must remain sync/fast, no overhead
- **Debug is opt-in** — debug capabilities dynamically installed, not shipped in prod
- **Web-only for testing** initially

---

## 5. Key Architecture Questions (For Oracle)

These are the specific design decisions that need resolution:

### Q1: Godot-Side Unified Registry
How do we merge `_method_map` (92 sync methods) and `QuerySystem._handlers` (42 async handlers) into one registration system while preserving the sync vs async distinction?

Options to evaluate:
- **A**: Single registry with a `mode` flag (`sync` vs `async`). One dispatch entry point routes based on mode.
- **B**: Keep both dispatch mechanisms but feed from one registry. Methods declare their dispatch type at registration.
- **C**: Everything goes through QuerySystem (async). Fire-and-forget methods just don't wait for response.

Concerns: Option C adds overhead to the hot path. Option A requires a new abstraction. Option B is closest to current state.

### Q2: TypeScript-Side Unified Contract
How do we define one type covering all ~130 methods?

Options:
- **A**: One big `BridgeContract` interface, composed from domain sub-interfaces (`CoreBridge & DebugBridge & EffectsBridge`)
- **B**: Keep separate interfaces but generate them from a shared schema/definition
- **C**: One interface with method metadata (decorators/maps) indicating sync/async/dispatch-type

### Q3: Dynamic Debug Registration
How does DebugBridge conditionally register its handlers?

Current state: Always loaded (line 123 of GameBridge.gd). Has `unregister_handlers()`.

Options:
- **A**: Conditional load in `_init_modules()` based on a flag (env var, project setting, or message from TS)
- **B**: TS sends "enableDebug" message → Godot dynamically instantiates DebugBridge and registers handlers
- **C**: Always register but gate at dispatch time (check debug flag before calling handler)

### Q4: Transport Layer
How do TCP test harness, MCP, and web/native bridges all use the same dispatch?

Currently: TCP only calls `native_dispatch()` (method_map). It can't reach QuerySystem handlers.

Options:
- **A**: TCP adapter also exposes query dispatch. Wire protocol distinguishes `call` (sync) vs `query` (async with requestId).
- **B**: Unify into one dispatch on Godot side (per Q1), then TCP just calls that one entry point.
- **C**: TCP adapter gets its own routing to both method_map and QuerySystem.

### Q5: Test Strategy
How do we test all ~130 methods through headless harness?

Current: 100 tests covering 92 method_map methods via TCP → native_dispatch().

Need: Also test 42 QuerySystem handlers.

Options:
- **A**: Extend TCP wire protocol with query support (send request, wait for response)
- **B**: Generate contract tests from the unified TypeScript type definition
- **C**: Both — generate tests from types AND support query protocol over TCP

### Q6: Migration Path
How do we get from current → unified without breaking anything?

Key constraint: Multiple consumers (GameRuntime, WorldOpsImpl, DebugOpsImpl, MCP, ScriptContext) all depend on current interfaces.

---

## 6. Key Files Reference

### Godot Side
| File | Purpose | Lines |
|------|---------|-------|
| `godot_project/scripts/GameBridge.gd` | Central bridge, _method_map, _setup_js_bridge, native_dispatch | ~600+ |
| `godot_project/scripts/bridge/QuerySystem.gd` | Async query dispatch with requestId | 95 |
| `godot_project/scripts/bridge/debug/DebugBridge.gd` | Coordinator, registers 33 handlers | 579 |
| `godot_project/scripts/bridge/debug/DebugProps.gd` | Property get/set/patch | ? |
| `godot_project/scripts/bridge/debug/DebugLifecycle.gd` | Spawn/destroy/clone/reparent | ? |
| `godot_project/scripts/bridge/debug/DebugTime.gd` | Pause/resume/step/timescale | ? |
| `godot_project/scripts/bridge/debug/DebugEvents.gd` | Subscribe/poll events | ? |
| `godot_project/scripts/bridge/debug/DebugPhysics.gd` | Raycast/shapes/joints/overlaps | ? |
| `godot_project/scripts/bridge/debug/DebugSelector.gd` | CSS-like entity selector | ? |
| `godot_project/scripts/testing/HeadlessTestAdapter.gd` | TCP:9876 test adapter | 252 |

### TypeScript Side
| File | Purpose | Lines |
|------|---------|-------|
| `app/lib/godot/types.ts` | `GodotBridge` interface (production) | ~large |
| `app/lib/godot/GodotBridge.web.ts` | Web implementation | ? |
| `app/lib/godot/GodotBridge.native.ts` | Native implementation | ? |
| `app/lib/godot/query.ts` | queryAsync request/response system | ? |
| `app/lib/godot/debug/types.ts` | `GodotDebugBridge` interface + all debug types | 661 |
| `app/lib/godot/debug/GodotDebugBridge.ts` | Debug bridge implementation | ? |
| `app/lib/game-engine/WorldOpsImpl.ts` | `WorldOps` implementation wrapping GodotBridge | ? |
| `app/lib/game-engine/DebugOpsImpl.ts` | `DebugOps` implementation extending WorldOpsImpl | ? |
| `shared/src/types/world-ops.ts` | `WorldOps` interface (game scripting) | 140 |
| `shared/src/types/debug-ops.ts` | `DebugOps extends WorldOps` interface | 60 |
| `app/lib/scripting/types.ts` | `ScriptContext extends SyncWorldOps` | ? |
| `packages/game-inspector-mcp/` | MCP server using Playwright | ? |

### Test Files (on refactor branch)
| File | Purpose |
|------|---------|
| `tests/e2e/bridge/GodotHeadlessDriver.ts` | Spawns Godot headless, TCP client |
| `tests/e2e/bridge/TypedBridgeClient.ts` | Typed wrapper for all 92 methods |
| `tests/e2e/bridge/bridge-contract.test.ts` | Contract smoke tests (89 tests) |
| `tests/e2e/bridge/bridge.test.ts` | Deep integration tests (11 tests) |

---

## 7. Prior Work (Already Done)

On branch `refactor/godot-bridge-dedup-dispatch` (8 commits ahead of main):

1. **Convention-based auto-registration** (`_js_*` prefix) in GameBridge.gd
2. **Unified web/native method registration** — one map feeds both
3. **Structured dispatch errors** and arg guardrails in native_dispatch
4. **Headless E2E test harness** — TCP:9876, NDJSON protocol, Godot headless WASM
5. **TypedBridgeClient** with full method signatures for all 92 methods
6. **100 passing tests** (89 contract smoke + 11 integration)
7. **Registry diagnostics** logging on startup

All committed, clean working tree.

---

## 8. Next Step

**Consult Oracle** (or equivalent architecture-grade model) with the full context above and the 6 architecture questions in Section 5. Get back a concrete design with:

1. Godot-side unified registry design (GDScript interfaces/classes)
2. TypeScript-side unified contract (type definitions)
3. Dynamic debug registration mechanism
4. Wire protocol for TCP (supporting both sync and async)
5. Test generation strategy
6. Migration plan (phase by phase, what breaks when)

Then write an implementation plan and execute it.

---

## 9. User Preferences

- Prefers `ultrabrain` or `oracle` agent types for architecture tasks
- Wants a written plan before implementation
- Implementation should be in its own worktree (isolated from main)
- Web-only scope for testing
- Conservative about over-engineering — if unification adds complexity, keep things separate
- Goal: eventually AI can connect to a live running game in debug mode to help users
