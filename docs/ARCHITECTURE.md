# Slopcade Target Architecture

**Date**: 2026-02-06
**Based on**: AUDIT.md findings
**Scope**: Phased refactoring — high-impact changes first

---

## Design Principles

1. **Single Responsibility**: Each module does one thing.
2. **Explicit Dependencies**: No reaching into internals.
3. **Single Source of Truth**: Every piece of state lives in one place.
4. **Fail Loudly**: Invalid operations produce clear errors.
5. **Minimal Public API**: Smallest interface necessary.
6. **Clean Teardown**: Every system has a clear cleanup path.

---

## Phase A: API Route Decomposition (Highest Impact)

### A1. Split `asset-system.ts` (2,231 lines → 4 files)

**Current**: One massive file handles themes, asset packs, generation jobs, and UI components.

**Target**:
```
api/src/trpc/routes/
├── asset-system/
│   ├── index.ts           (~30 lines)  — mergeRouters re-export
│   ├── themes.ts          (~400 lines) — Theme CRUD + theme planner
│   ├── asset-packs.ts     (~500 lines) — Pack management + entries
│   ├── generation-jobs.ts (~800 lines) — Job/task orchestration + provider calls
│   └── ui-components.ts   (~500 lines) — UI component generation
```

**Module boundaries**:
- `themes`: Owns theme records. Exposes: create, list, get, update, delete, plan.
- `asset-packs`: Owns pack + entry records. Exposes: create, list, get, addEntry, removeEntry.
- `generation-jobs`: Owns job + task records. Depends on themes, asset-packs, wallet. Exposes: create, get, retry, cancel.
- `ui-components`: Owns UI component specs. Depends on generation-jobs for image generation. Exposes: generate, getPack.

**Migration**: Pure file split — no behavior changes. Move procedures to appropriate files, update mergeRouters in index.ts.

### A2. Split `RunCoordinatorDO.ts` (1,803 lines → 5 files)

**Current**: WebSocket management, run state machine, recovery, billing, gate processing all in one class.

**Target**:
```
api/src/agent/
├── RunCoordinatorDO.ts      (~400 lines) — DO class: WebSocket handler + state dispatch
├── run-state-machine.ts     (~400 lines) — Pure state machine: transitions, validation
├── run-event-store.ts       (~200 lines) — Event persistence + replay
├── run-recovery.ts          (~200 lines) — Lease management + recovery attempts
├── run-billing-bridge.ts    (~150 lines) — Cost reservation/settlement delegation
├── gate-processor.ts        (existing)   — Gate evaluation
└── types.ts                 (existing)   — Shared types
```

**Module boundaries**:
- `RunCoordinatorDO`: Owns WebSocket connections and DO lifecycle. Delegates all logic.
- `run-state-machine`: Pure functions for state transitions. No I/O. Testable in isolation.
- `run-event-store`: Owns event persistence to DO KV. Exposes: append, replay, getRange.
- `run-recovery`: Owns lease logic. Exposes: acquireLease, releaseLease, shouldRecover.
- `run-billing-bridge`: Thin wrapper calling WalletService + AgentBillingService.

### A3. Split `agent-runs.ts` route (1,020 lines → 2 files)

**Target**:
```
api/src/trpc/routes/
├── agent-runs.ts            (~500 lines) — tRPC procedures only (thin layer)
└── agent-runs-service.ts    (~500 lines) — Business logic (estimation, orchestration)
```

---

## Phase B: Game Engine Decomposition (Second Highest Impact)

### B1. Split `GameRuntime.godot.tsx` (2,288 lines → 6 modules)

**Current**: One React component handling initialization, input collection, event routing, frame loop, lifecycle, and UI.

**Target**:
```
app/lib/game-engine/
├── GameRuntime.godot.tsx          (~400 lines) — React component shell: mounts systems, renders UI
├── runtime/
│   ├── GameInitializer.ts         (~300 lines) — Setup: bridge, physics, loader, system registration
│   ├── GameInputCollector.ts      (~250 lines) — Unified input collection (keyboard, touch, tilt, drag, buttons)
│   ├── GameFrameOrchestrator.ts   (~200 lines) — Per-frame: collect input → build context → runner.update → bridge sync
│   ├── GameLifecycleManager.ts    (~200 lines) — State transitions: loading → ready → playing → won/lost/paused
│   └── GameEventRouter.ts         (~150 lines) — Route collision/spawn/destroy events to event queue
```

**Module boundaries**:
- `GameRuntime`: React component. Owns React state (gameState enum, showDialog, isPaused). Delegates everything else.
- `GameInitializer`: Owns setup sequence. Returns initialized game + systems. Pure async function.
- `GameInputCollector`: Owns input refs. Exposes: `collectInputSnapshot(): InputState`. Called once per frame.
- `GameFrameOrchestrator`: Owns frame loop. Calls input collector → builds UpdateContext → calls runner.update().
- `GameLifecycleManager`: Owns state machine for game lifecycle. Exposes: start, pause, resume, win, lose, restart.
- `GameEventRouter`: Subscribes to bridge events, writes to event queue. No business logic.

### B2. Fix RulesSystem duplicate initialization

**Current**: Action executors created in constructor AND in `initialize()`. Constructor instances are dead code.

**Target**: Remove constructor executor creation. Only create in `initialize()`.

### B3. Extract shared Godot bridge base

**Current**: `GodotBridge.native.ts` and `GodotBridge.web.ts` have near-identical logic.

**Target**:
```
app/lib/godot/
├── GodotBridgeBase.ts        — Shared logic (entity management, state tracking, method signatures)
├── GodotBridge.native.ts     — Native-specific transport only
├── GodotBridge.web.ts        — Web-specific transport only (postMessage)
```

---

## Phase C: Shared Types Cleanup

### C1. Eliminate duplicate type re-exports in `shared/src/types/index.ts`

Lines 28-61 re-export types already exported via `*` on lines 1-27. Remove the redundant named exports.

### C2. Split `GameDefinition.ts` (545 lines)

Extract nested config types into dedicated files:
```
shared/src/types/
├── GameDefinition.ts        (~200 lines) — Root type + metadata
├── world-config.ts          (~80 lines)  — WorldConfig, CameraConfig
├── ui-config.ts             (~80 lines)  — UIConfig, VariableDisplay
├── input-config.ts          (~60 lines)  — InputConfig, TapZones, DPad
├── audio-config.ts          (~40 lines)  — SoundConfig
├── persistence-config.ts    (~40 lines)  — PersistenceConfig, AutoSave
```

---

## Phase D: Dead Code Removal

### D1. Remove confirmed dead code

| Item | Action |
|------|--------|
| `munim-bluetooth-peripheral` dep | Remove from `app/package.json` |
| `installedProcedure` (games.ts) | Remove deprecated procedure |
| Duplicate executor creation (RulesSystem constructor) | Remove constructor creation |
| Daily login bonus (DISABLED) | Remove unless planned for reactivation |
| Gem service (disconnected) | Remove unless planned for use |

### D2. Clean up in-progress deletions

The ~80 deleted docs and deleted games (simple, asteroids) should be committed as a cleanup.

---

## Phase E: Test Coverage (Alongside Refactoring)

### E1. Tests for newly-split modules

Each module created in Phases A-C gets 5-15 focused unit tests:

| Module | Test Focus |
|--------|------------|
| `themes.ts` route | CRUD operations, validation |
| `asset-packs.ts` route | Pack creation, entry management |
| `generation-jobs.ts` route | Job lifecycle, provider error handling |
| `run-state-machine.ts` | All state transitions, invalid transition rejection |
| `run-event-store.ts` | Append, replay, ordering |
| `run-recovery.ts` | Lease acquisition, expiry, max attempts |
| `GameInitializer.ts` | Setup sequence, error cases |
| `GameInputCollector.ts` | Input normalization, platform differences |
| `GameLifecycleManager.ts` | All state transitions |

### E2. Test priorities for existing untested code

| Priority | Module | Rationale |
|----------|--------|-----------|
| High | `RulesSystem.ts` | Core game logic, only 1 test file |
| High | `WalletService.ts` | Financial operations |
| Medium | `GodotBridge*.ts` | 1 test for 21 files |
| Medium | `EntityManager.ts` | Core state management |
| Low | React components | Integration-test with runtime later |

---

## Migration Order

### Step 1: API Asset System Split (Phase A1)
- Risk: Low — pure file reorganization
- Files touched: ~5 created, 1 modified
- Verification: All existing asset-system tests pass unchanged

### Step 2: RunCoordinatorDO Split (Phase A2)
- Risk: Medium — Durable Object lifecycle is nuanced
- Files touched: ~5 created, 1 refactored
- Verification: Agent run tests pass, WebSocket functionality intact

### Step 3: Agent Runs Route Split (Phase A3)
- Risk: Low — service extraction
- Files touched: 2 created, 1 modified
- Verification: Agent run route tests pass

### Step 4: Dead Code Removal (Phase D)
- Risk: Low — removing unused code
- Files touched: ~5 modified
- Verification: Type-check passes, tests pass

### Step 5: Shared Types Cleanup (Phase C)
- Risk: Low-Medium — many consumers of these types
- Files touched: ~8 created/modified
- Verification: `tsc --noEmit` across all workspaces

### Step 6: GameRuntime Decomposition (Phase B1)
- Risk: Medium-High — core game loop
- Files touched: ~6 created, 1 heavily refactored
- Verification: Games load and play correctly (manual smoke test for all 9 games)

### Step 7: RulesSystem Fix + Bridge Extraction (Phase B2-B3)
- Risk: Medium — behavioral components
- Files touched: ~4 created/modified
- Verification: Rule evaluation tests pass, games play correctly on both web and native

### Step 8: Test Coverage (Phase E)
- Risk: None — additive
- Files touched: ~15 created
- Verification: All new tests pass

---

## What This Architecture Does NOT Change

1. **The 6-phase system runner pattern** — it's good, keep it
2. **tRPC + React Query stack** — working well
3. **Cloudflare Workers + D1 + R2 deployment model** — appropriate for scale
4. **Durable Objects for agent orchestration** — good fit
5. **Platform-specific file resolution** (`.native.ts`/`.web.ts`) — standard Expo pattern
6. **GameDefinition JSON format** — this is the product's data model
7. **Supabase auth** — working integration
8. **Wallet idempotency model** — well-designed
