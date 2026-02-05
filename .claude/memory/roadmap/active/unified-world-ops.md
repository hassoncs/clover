# Unified WorldOps Interface

**Status**: Implementation Complete (2026-02-05)  
**Created**: 2026-02-05  
**Last Updated**: 2026-02-05  

---

## 1. Problem Statement

We have **three separate interfaces** for manipulating the Godot game world from TypeScript, each with different APIs, different type shapes, and accidental capability gaps. They should be one unified interface.

### The Three Interfaces Today

#### Interface 1: GodotBridge (Transport Layer)
- **Location**: `app/lib/godot/types.ts` (~100+ methods)
- **Communication**: Direct JS ↔ Godot interop (iframe on web, JSI on native)
- **Sync model**: Sync writes, async reads
- **Role**: Low-level transport to Godot. Includes everything: entities, physics, visual effects, camera, audio, particles, shaders, UI, 3D models. This is the "raw Godot API" — not a world manipulation abstraction.

#### Interface 2: GodotDebugBridge (Inspector/Debug)
- **Location**: `app/lib/godot/debug/types.ts` + `GodotDebugBridge.ts`
- **Communication**: Async RPC via `GodotBridge.query(requestId, method, argsJson)` → Godot's `QuerySystem.gd`
- **Sync model**: All async
- **Role**: The richest entity manipulation API. Has spawn, destroy, clone, reparent, CSS-like selectors, dot-path property access, batch operations, time control, event subscriptions, physics shape/joint/overlap introspection. BUT missing visual effects, camera, joints creation, audio.

#### Interface 3: Script Sandbox (AI Scripting)
- **Location**: `app/lib/scripting/types.ts` (ScriptContext + SandboxRuntimeContext)
- **Communication**: `ScriptSandboxRuntimeSystem` builds a `SandboxRuntimeContext` each frame from `EntityManager` + `physics` + `GodotBridge`
- **Sync model**: All synchronous
- **Role**: Simplest API. Scripts get: spawn, destroy, position, velocity, impulse, tags, queries, variables, events, input. BUT missing clone, reparent, raycast, physics queries, property paths, visual effects.

#### Interface 4: MCP Tools (Thin Wrapper)
- **Location**: `packages/game-inspector-mcp/src/tools/`
- **Role**: Just Zod schemas + `queryGodot(page, method, args)` via Playwright. Forwards to GodotDebugBridge's RPC. Not a separate interface — it wraps Interface 2.

### Capability Gap Matrix

| Capability | GodotBridge | DebugBridge | Script Sandbox |
|---|:---:|:---:|:---:|
| spawn | ✅ flat args | ✅ rich request | ✅ |
| destroy | ✅ | ✅ with options | ✅ |
| clone | ❌ | ✅ | ❌ |
| reparent | ❌ | ✅ | ❌ |
| get/set position | ✅ | ✅ via props | ✅ |
| get/set velocity | ✅ | ✅ via props | ✅ |
| apply impulse/force | ✅ | ❌ | ✅ |
| tags | ❌ | ✅ via patchProps | ✅ |
| CSS selector query | ❌ | ✅ | ❌ |
| query by tag/template | ❌ | ❌ | ✅ |
| queryPoint | ✅ | ✅ | ❌ |
| queryAABB | ✅ | ✅ | ✅ partial |
| raycast | ✅ | ✅ | ❌ |
| getShapes/getJoints | ❌ | ✅ | ❌ |
| property paths | ❌ | ✅ | ❌ |
| variables | ❌ | ❌ | ✅ |
| visual effects | ✅ full | ❌ | ❌ |
| camera | ✅ | ❌ | ❌ |
| time control | ✅ basic | ✅ full | ❌ |
| animate/tween | ❌ | ❌ | ✅ partial |

**The gaps are accidental, not intentional.** There's no reason scripts can't raycast or clone. There's no reason the debug bridge can't apply impulses.

---

## 2. Design Decisions

### Decision 1: WorldOps Is All Async ✅

**The `WorldOps` interface is fully async (all methods return Promises).**

Rationale:
- **Animations/tweening are inherently async.** A sequence needs: `await animate('gem', {x:5}, {duration:500}); await wait(3000); await animate('character', ...)`. WorldOps must support this.
- **AI writes the scripts.** AI handles `await` on every line trivially. This isn't a human ergonomics concern.
- **Uniform interface.** One way to call every operation. MCP, debug, sequences — all use the same async signature.
- **Honest about the architecture.** Godot owns the world. TypeScript asks for data. Async makes that explicit.

**Important nuance (see Decision 5):** Script hooks (`onUpdate`, `onStart`, etc.) do NOT directly await WorldOps. Instead, `ScriptContext` provides **sync read helpers** that read from the per-frame cache, and scripts call `ctx.world.*` methods fire-and-forget for writes. Only inside `startSequence()` callbacks do scripts fully `await` WorldOps methods. This gives us the best of both worlds: one canonical async interface, zero async overhead in frame-critical code.

### Decision 2: Godot Is the Authority ✅

**Godot is the single source of truth for all entity and physics state. TypeScript runs the rules/logic but does NOT own entity state.**

What this means:
- TypeScript loads the game definition and hands it to Godot
- Once in Godot, Godot is authoritative on positions, velocities, shapes, collisions, everything
- TypeScript gets a cached view for performance (via `onTransformSync`, `onPropertySync` callbacks)
- The cache is an optimization, not the source of truth
- If cache and Godot disagree, Godot wins

Split of authority:
| Aspect | Authority | Notes |
|--------|-----------|-------|
| Physics state (position, velocity, rotation) | **Godot** | TS gets cached copies |
| Collision shapes, joints, overlaps | **Godot** | Only Godot knows these |
| Physics queries (raycast, queryPoint, queryAABB) | **Godot** | Must go through Godot |
| Entity metadata (tags, template) | **Godot** (with TS cache) | Could live in either; Godot is authority |
| Game variables | **TypeScript** | Pure game logic, not physics |
| Rules/behaviors | **TypeScript** | Game logic layer |
| Visual rendering | **Godot** | TS sends commands, Godot renders |

### Decision 3: One Interface for All Consumers ✅

**All three consumers (scripts, debug/MCP, runtime) use the same `WorldOps` interface.** The debug/MCP layer may have additional capabilities (time control, screenshots, event subscriptions), but the core world manipulation operations are identical.

### Decision 4: GodotBridge Stays as Transport ✅

**GodotBridge remains the low-level transport layer.** It's not the world manipulation API — it's how commands get to Godot. WorldOps is built ON TOP of GodotBridge, not replacing it.

GodotBridge also handles non-entity concerns (visual effects, camera, audio, UI) that don't belong in WorldOps.

### Decision 5: Frame Operations vs Sequences ✅

**All script hooks (`onStart`, `onUpdate`) are synchronous. Multi-frame work uses `startSequence()`. Hooks read from cache (sync) and issue commands via `ctx.world` (fire-and-forget). Sequences use `ctx.world` with full `await`.**

The core problem: script hooks run in the game loop and must never block. But scripts need to express multi-frame routines like "animate gem from A to B over 500ms, wait 200ms, fade out." These routines span hundreds of frames and can't live inside a synchronous callback.

**Why all script hooks must be sync (not async):**

1. **Frame budgets are unenforceable on async functions.** `Promise.race(timeout)` detects overruns but can't stop the running code. The "bad" work keeps executing.
2. **Even "instant" awaits have cost.** Resolved Promises schedule microtasks. At 60fps across many scripts, this creates measurable jitter and reorders work relative to engine code.
3. **Accidental `await animate()` is catastrophic.** One mistaken `await` blocks rendering for the entire animation duration. A sync signature makes this impossible at the type level.
4. **onStart has the same problem.** You don't want onStart to block real-world time either. If you need an intro animation, use `startSequence()` and gate gameplay with a variable.
5. **Safety net**: If any hook accidentally returns a Promise (someone made it `async`), the engine detects this, logs a warning, and disables the script. Fail fast.

**The two calling contexts:**

| Context | Examples | Signature | Can Await? | Use For |
|---------|----------|-----------|------------|---------|
| **Script hooks** | `onStart`, `onUpdate`, `onInput`, `onCollision` | `(ctx, ...) → void` | ❌ Sync only | Reads, fire-and-forget commands, start sequences |
| **Sequences** | `startSequence()` callbacks | `(world) → Promise<void>` | ✅ Fully async | Animation chains, delays, multi-frame routines |

**How script hooks work with WorldOps:**

ScriptContext provides **sync read helpers** for operations that read from the cache (already synced from Godot at the start of each frame). For writes and animations, scripts call `ctx.world.*` methods fire-and-forget (don't await the void Promise). For multi-frame routines, scripts use `ctx.startSequence()`.

```typescript
// onUpdate — SYNC. Runs every frame. Must return quickly.
function onUpdate(ctx, dt) {
  // Sync reads from cache (no await, no Promise)
  const pos = ctx.getPosition('ball');
  const vel = ctx.getVelocity('ball');

  // Fire-and-forget writes via WorldOps (don't await)
  if (pos && vel) {
    ctx.world.setPosition('ball', { x: pos.x + vel.x * dt, y: pos.y });
  }

  // Condition detected → kick off multi-frame sequence
  if (pos && pos.y < -10 && !ctx.isSequenceRunning('ball-death')) {
    ctx.startSequence('ball-death', async (world) => {
      await world.animate('ball', { opacity: 0, y: -20 }, { duration: 300 });
      await world.wait(200);
      await world.destroy('ball');
      const lives = await world.getVariable('lives') as number;
      await world.setVariable('lives', lives - 1);
    });
  }
}
```

**Why two interfaces are justified:**
- Different performance requirements: `onUpdate` < 2ms, sequences span seconds
- Sync reads from cache vs async reads from Godot are genuinely different operations
- The type system enforces "what's safe in onUpdate" — you *can't* accidentally await
- `startSequence()` is the explicit, clean bridge between the two worlds

**The `startSequence()` contract:**

```typescript
interface ScriptContext {
  // Start a named async sequence (fire-and-forget from caller)
  startSequence(name: string, fn: (world: WorldOps) => Promise<void>): SequenceHandle;

  // Check if a named sequence is currently running
  isSequenceRunning(name: string): boolean;

  // Cancel a running sequence (also cancels its in-progress animations)
  cancelSequence(name: string): void;
}

interface SequenceHandle {
  readonly name: string;
  readonly isRunning: boolean;
  cancel(): void;
}
```

**Sequence lifecycle:**
1. `startSequence('name', fn)` called from `onUpdate` — returns immediately
2. The async function `fn` begins executing (same tick, up to first real `await`)
3. When it hits `await animate()` or `await wait()`, it yields
4. Game loop continues — `onUpdate` keeps running every frame
5. When the awaited animation/timer completes, `fn` resumes
6. If same `name` is started again, old sequence is **cancelled first** (prevents duplicates)
7. Sequences auto-cancel on: entity destroy, script reload, game end

**Cancellation model:**
The `world` parameter passed to the sequence function is a cancellation-aware wrapper around WorldOps. When a sequence is cancelled:
- Any in-progress `animate()` or `wait()` rejects with `SequenceCancelledError`
- The async function exits via the thrown error
- The SequenceManager catches expected cancellations (not logged as errors)
- In-progress tweens for cancelled animations are cleaned up

**Time semantics:**
- `wait()` and `animate()` use **game time** by default (affected by pause/timeScale)
- When game is paused, sequences pause too (their timers stop advancing)
- Optional: `world.wait(ms, { clock: 'realtime' })` for UI animations during pause

---

## 3. Architecture

```
                    ┌──────────────────────────────┐
                    │     WorldOps Interface         │  ← packages/shared (types only)
                    │  All async. Canonical ops.     │
                    │  Shared DTOs (Vec2, etc.)      │
                    └──────────────┬─────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
     ┌────────▼──────────┐  ┌─────▼───────────┐  ┌─────▼──────────────┐
     │  WorldOpsImpl      │  │  MCP Adapter    │  │  GodotBridge       │
     │  (in-process,      │  │  (Playwright    │  │  (transport,       │
     │   web: instant     │  │   page.evaluate │  │   stays as-is)     │
     │   resolve from     │  │   wraps calls)  │  │                    │
     │   cache or sync    │  │                 │  │  Also handles:     │
     │   Godot call)      │  │                 │  │  - Visual effects  │
     │                    │  │                 │  │  - Camera           │
     │  Backs:            │  │  Backs:         │  │  - Audio            │
     │  - Script Sandbox  │  │  - MCP Tools    │  │  - UI               │
     │  - Runtime Logic   │  │                 │  │                    │
     └────────────────────┘  └─────────────────┘  └────────────────────┘
              │
      ┌────────▼──────────┐
      │  ScriptContext      │
      │  (sync reads from   │
      │   cache + world:    │
      │   WorldOps for      │
      │   fire-and-forget   │
      │   + startSequence   │
      │   + input, random)  │
      └────────────────────┘
```

### Communication Paths

```
Script Sandbox (hooks — sync):
  script code → ScriptContext.getPosition() → cache (instant, sync)
  script code → ScriptContext.world.setPosition() → WorldOpsImpl → GodotBridge → Godot (fire-and-forget)

Script Sandbox (sequences — async):
  startSequence() → SequenceManager → async fn(world) → WorldOpsImpl → GodotBridge → Godot
  (sequences await WorldOps methods across frames)

MCP Tools:
  MCP tool → page.evaluate(() => window.worldOps.method()) → WorldOpsImpl → GodotBridge → Godot
  (async transport via Playwright, WorldOps calls resolve per-platform)

Runtime Game Logic (Rules, Behaviors):
  RulesSystem → WorldOpsImpl → GodotBridge → Godot
  (same as scripts — await, resolves from cache)
```

### How "Async but Instant" Works on Web

On web, Godot runs in an iframe in the **same JS thread**. Direct calls to `GodotBridge` methods execute synchronously. The existing `_lastResult` pattern in `GodotDebugBridge.ts` proves this:

```typescript
bridge.queryPointEntity(x, y);
const hitEntity = bridge._lastResult as string | null;  // Sync!
```

So `WorldOpsImpl` on web can do:
```typescript
async getPosition(entityId: string): Promise<Vec2 | null> {
  // Option A: Read from cache (synced from Godot every frame)
  const cached = this.cache.getTransform(entityId);
  return cached ? { x: cached.x, y: cached.y } : null;

  // Option B: Query Godot directly (sync on web via _lastResult)
  // this.bridge.getEntityTransform(entityId);
  // return this.bridge._lastResult as Vec2 | null;
}

async queryPoint(point: Vec2): Promise<string | null> {
  // Goes to Godot — sync on web, async on native
  return this.bridge.queryPointSync(point);
}
```

Either way, the Promise resolves in the same microtask. Scripts don't wait.

---

## 4. The WorldOps Interface (Final)

> **Note**: Reuses `Vec2` and `Bounds` from `@slopcade/shared/types/common`.
> New types go in `shared/src/types/world-ops.ts`.

```typescript
import type { Vec2, Bounds } from './common';

// =====================================================================
// WORLD OPS — Core world manipulation interface
// =====================================================================

interface WorldOps {
  // --- Entity Lifecycle ---
  spawn(templateId: string, position: Vec2, opts?: SpawnOptions): Promise<string | null>;
  destroy(entityId: string): Promise<void>;
  clone(entityId: string, opts?: CloneOptions): Promise<string | null>;
  reparent(entityId: string, newParentId: string, opts?: ReparentOptions): Promise<void>;

  // --- Transform ---
  getPosition(entityId: string): Promise<Vec2 | null>;
  setPosition(entityId: string, position: Vec2): Promise<void>;
  getRotation(entityId: string): Promise<number | null>;
  setRotation(entityId: string, angle: number): Promise<void>;
  getScale(entityId: string): Promise<Vec2 | null>;
  setScale(entityId: string, scale: Vec2): Promise<void>;
  setVisible(entityId: string, visible: boolean): Promise<void>;

  // --- Physics ---
  getVelocity(entityId: string): Promise<Vec2 | null>;
  setVelocity(entityId: string, velocity: Vec2): Promise<void>;
  getAngularVelocity(entityId: string): Promise<number | null>;
  setAngularVelocity(entityId: string, velocity: number): Promise<void>;
  applyImpulse(entityId: string, impulse: Vec2): Promise<void>;
  applyForce(entityId: string, force: Vec2): Promise<void>;

  // --- Entity Metadata ---
  getTags(entityId: string): Promise<string[]>;
  addTag(entityId: string, tag: string): Promise<void>;
  removeTag(entityId: string, tag: string): Promise<boolean>;
  hasTag(entityId: string, tag: string): Promise<boolean>;
  getTemplate(entityId: string): Promise<string | undefined>;
  getEntityData(entityId: string): Promise<WorldEntityData | null>;

  // --- Queries ---
  queryEntities(query?: WorldEntityQuery): Promise<string[]>;
  queryEntitiesWithData(query?: WorldEntityQuery): Promise<WorldEntityData[]>;
  queryPoint(point: Vec2): Promise<string | null>;
  queryAABB(min: Vec2, max: Vec2): Promise<string[]>;
  raycast(from: Vec2, to: Vec2, opts?: RaycastOptions): Promise<RaycastHit | null>;

  // --- Game State ---
  getVariable(name: string): Promise<unknown>;
  setVariable(name: string, value: unknown): Promise<void>;
  getConstant(name: string): Promise<unknown>;
  emit(eventName: string, data?: Record<string, unknown>): Promise<void>;
  win(): Promise<void>;
  lose(): Promise<void>;

  // --- Animation / Timing (multi-frame — use ONLY inside startSequence) ---
  //
  // These return Promises that resolve after many frames.
  // In sequences: `await world.animate(...)` chains animations naturally.
  // In hooks: call fire-and-forget `ctx.world.animate(...)` (no await) to start
  //           a one-shot animation, but prefer startSequence() for chains.
  //
  animate(entityId: string, target: AnimateTarget, opts: AnimateOptions): Promise<void>;
  wait(ms: number, opts?: WaitOptions): Promise<void>;
}
```

### Shared DTOs

```typescript
import type { Vec2, Bounds } from './common';

// Reuses Vec2 from common.ts — DO NOT redefine

interface SpawnOptions {
  velocity?: Vec2;
  angle?: number;
  tags?: string[];
  parentId?: string;
}

interface CloneOptions {
  position?: Vec2;
  withChildren?: boolean;
}

interface ReparentOptions {
  keepGlobalTransform?: boolean;
}

interface WorldEntityData {
  id: string;
  template?: string;
  tags: string[];
  position: Vec2;
  rotation: number;
  scale: Vec2;
  velocity?: Vec2;
  angularVelocity?: number;
}

interface WorldEntityQuery {
  tag?: string;
  templateId?: string;
  inAABB?: Bounds;
}

interface RaycastOptions {
  mask?: number;
  excludeEntityId?: string;
  includeSensors?: boolean;
}

interface RaycastHit {
  entityId: string;
  point: Vec2;
  normal: Vec2;
  distance: number;
}

interface AnimateTarget {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
}

type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-quad' | 'ease-out-quad' | 'ease-in-out-quad';

interface AnimateOptions {
  duration: number;
  easing?: EasingFunction;
}

interface WaitOptions {
  /** Use real time instead of game time (unaffected by pause/timeScale). Default: false. */
  realtime?: boolean;
}
```

### DebugOps Extension

```typescript
interface DebugOps extends WorldOps {
  // --- Time Control ---
  pause(): Promise<void>;
  resume(): Promise<void>;
  step(frames?: number): Promise<void>;
  getTimeState(): Promise<TimeState>;
  setTimeScale(scale: number): Promise<void>;

  // --- Inspection ---
  screenshot(): Promise<string>;
  getEntityProps(entityId: string, paths: string[]): Promise<Record<string, unknown>>;
  setEntityProps(entityId: string, values: Record<string, unknown>): Promise<void>;
  getAllEntityProps(entityId: string): Promise<Record<string, unknown>>;

  // --- Advanced Queries ---
  queryCss(selector: string): Promise<string[]>;
  getShapes(entityId: string): Promise<ShapeInfo[]>;
  getJoints(entityId?: string): Promise<JointInfo[]>;
  getOverlaps(entityId: string): Promise<string[]>;

  // --- Event Subscriptions ---
  subscribe(eventType: string, selector?: string): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  pollEvents(subscriptionId?: string): Promise<GameEvent[]>;
}

interface TimeState {
  paused: boolean;
  timeScale: number;
  frame: number;
  elapsed: number;
}
```

---

## 5. How Each Consumer Uses WorldOps

### Script Sandbox

Scripts get a `ScriptContext` with two layers:

1. **Sync reads + helpers** — flat on ctx, for the onUpdate hot path (reads from frame cache)
2. **`ctx.world: WorldOps`** — full async API for writes, animations, and sequences

```typescript
interface ScriptContext {
  // ═══════════════════════════════════════════════════════════════
  // SYNC READS — from frame cache, safe in onUpdate
  // ═══════════════════════════════════════════════════════════════
  getPosition(entityId: string): Vec2 | null;
  getVelocity(entityId: string): Vec2 | null;
  getRotation(entityId: string): number | null;
  getTags(entityId: string): string[];
  hasTag(entityId: string, tag: string): boolean;
  getTemplate(entityId: string): string | undefined;
  getVariable(name: string): unknown;
  getConstant(name: string): number | string | boolean | undefined;
  queryEntities(query?: WorldEntityQuery): string[];
  getEntityData(entityId: string): WorldEntityData | null;
  queryEntitiesWithData(query?: WorldEntityQuery): WorldEntityData[];

  // ═══════════════════════════════════════════════════════════════
  // ASYNC WORLD OPS — full API, for writes + animations + sequences
  // ═══════════════════════════════════════════════════════════════
  world: WorldOps;

  // ═══════════════════════════════════════════════════════════════
  // SEQUENCE MANAGEMENT — bridge from sync onUpdate to async work
  // ═══════════════════════════════════════════════════════════════
  startSequence(name: string, fn: (world: WorldOps) => Promise<void>): SequenceHandle;
  isSequenceRunning(name: string): boolean;
  cancelSequence(name: string): void;

  // ═══════════════════════════════════════════════════════════════
  // FRAME INFO + INPUT (sync, per-frame)
  // ═══════════════════════════════════════════════════════════════
  readonly dt: number;
  readonly elapsed: number;
  readonly frameId: number;
  input: InputSnapshot | null;
  mouse: Vec2 | null;
  drag: DragSnapshot | null;

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES (sync, pure functions)
  // ═══════════════════════════════════════════════════════════════
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: readonly T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Vec2, b: Vec2): number;
}
```

**Script hook signatures:**

```typescript
interface ScriptLifecycleExports {
  onStart?(ctx: ScriptContext): void;                                               // SYNC — runs once at game start
  onUpdate?(ctx: ScriptContext, dt: number): void;                                  // SYNC — runs every frame
  onInput?(ctx: ScriptContext, event: ScriptInputEvent): void;                      // SYNC — runs on input events
  onCollision?(ctx: ScriptContext, collision: ScriptCollisionEvent): void;           // SYNC — runs on collisions
}
```

**All hooks are sync.** They read from cache, issue fire-and-forget commands via `ctx.world`, and kick off sequences via `ctx.startSequence()`. If any hook accidentally returns a Promise (someone made it `async`), the engine detects it, logs a warning, and disables the script.

**Example: onUpdate — sync frame operation**
```typescript
function onUpdate(ctx, dt) {
  // ✅ Sync reads from frame cache (no await, no Promise)
  const pos = ctx.getPosition('ball');
  const vel = ctx.getVelocity('ball');

  // ✅ Fire-and-forget commands via ctx.world (don't await)
  if (pos && ctx.hasTag('ball', 'active')) {
    ctx.world.setPosition('paddle', { x: ctx.mouse?.x ?? 0, y: -8 });
  }

  // ✅ Condition → kick off multi-frame sequence
  if (pos && pos.y < -10 && !ctx.isSequenceRunning('ball-death')) {
    ctx.startSequence('ball-death', async (world) => {
      await world.animate('ball', { opacity: 0, y: -20 }, { duration: 300 });
      await world.wait(200);
      await world.destroy('ball');
      const lives = await world.getVariable('lives') as number;
      await world.setVariable('lives', lives - 1);
    });
  }

  // ❌ WRONG — these would block the frame:
  // await ctx.world.animate('ball', { y: 5 }, { duration: 500 });
  // await ctx.world.wait(1000);
}
```

**Example: onStart — sync setup, sequences for intro animations**
```typescript
function onStart(ctx) {
  // Sync — runs once, returns immediately.
  // If you need an intro animation, use a sequence and gate gameplay with a variable.
  ctx.world.setVariable('gameReady', false);

  ctx.startSequence('intro', async (world) => {
    await world.animate('title', { opacity: 1 }, { duration: 800 });
    await world.wait(1500);
    await world.animate('title', { y: -100 }, { duration: 500, easing: 'ease-in' });
    await world.destroy('title');
    await world.setVariable('gameReady', true);
  });
}

// Then in onUpdate, gate gameplay:
function onUpdate(ctx, dt) {
  if (!ctx.getVariable('gameReady')) return; // Skip gameplay until intro finishes
  // ... normal gameplay logic
}
```

**Example: onCollision — sync handler, sequence for death animation**
```typescript
function onCollision(ctx, collision) {
  // Sync — fires immediately on collision. Use sequence for multi-frame work.
  if (ctx.hasTag(collision.entityA, 'gem') && !ctx.isSequenceRunning('gem-' + collision.entityA)) {
    const gemId = collision.entityA;
    ctx.startSequence('gem-' + gemId, async (world) => {
      await world.animate(gemId, { opacity: 0, y: -5 }, { duration: 300 });
      await world.destroy(gemId);
      const score = await world.getVariable('score') as number;
      await world.setVariable('score', score + 100);
    });
  }
}
```

**Example: Complex game pattern — Match-3 cascade**
```typescript
function onUpdate(ctx, dt) {
  // Check for matches every frame (sync reads)
  const gems = ctx.queryEntities({ tag: 'gem' });
  const matched = findMatches(gems, ctx);

  if (matched.length >= 3 && !ctx.isSequenceRunning('cascade')) {
    ctx.startSequence('cascade', async (world) => {
      // Phase 1: Flash matched gems
      for (const id of matched) {
        world.animate(id, { opacity: 0.3 }, { duration: 150 });
      }
      await world.wait(200);

      // Phase 2: Destroy them
      for (const id of matched) {
        await world.destroy(id);
      }

      // Phase 3: Drop remaining gems
      const remaining = await world.queryEntities({ tag: 'gem' });
      for (const id of remaining) {
        const pos = await world.getPosition(id);
        if (pos) {
          await world.animate(id, { y: pos.y - 1 }, { duration: 200, easing: 'ease-out' });
        }
      }

      // Phase 4: Spawn replacements
      for (let i = 0; i < matched.length; i++) {
        await world.spawn('gem', { x: i * 1.2, y: 8 });
      }
    });
  }
}
```

### MCP / Debug Inspector

MCP tools call DebugOps via `page.evaluate()`:

```typescript
server.tool("spawn", "Spawn a new entity", schema, async (args) => {
  const result = await page.evaluate(async (a) => {
    return window.debugOps.spawn(a.template, a.position, a.opts);
  }, args);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

MCP tools use `DebugOps` (which extends `WorldOps`) for the full feature set including time control, screenshots, CSS selectors, property path access, etc.

### Runtime Game Logic

The rules engine and behavior systems use WorldOps directly:

```typescript
const entities = await worldOps.queryEntities({ tag: 'enemy' });
for (const id of entities) {
  const pos = await worldOps.getPosition(id);
  if (pos && pos.y < deathZone) {
    await worldOps.destroy(id);
    await worldOps.setVariable('score', score + 100);
  }
}
```

---

## 6. Resolved Questions

### Q1: Where do "debug-only" operations live? ✅

**Decision: `DebugOps extends WorldOps`**

The DebugBridge has capabilities that scripts/runtime don't need:
- Time control (pause/resume/step)
- Screenshots
- CSS-like selector queries (`.peg`, `#ball`)
- Dot-path property access (`physics.velocity.x`)
- Event subscriptions (subscribe/poll pattern)
- Collision shape introspection
- Joint introspection

MCP tools use `DebugOps`. Scripts use `WorldOps` (via ScriptContext). Runtime uses `WorldOps`.

### Q2: How does the sandbox support multi-frame operations? ✅

**Decision: All hooks stay sync. Multi-frame work goes through `startSequence()`.**

Today all `runX` methods return `ScriptResult<void>` (sync). This doesn't change. The migration:
1. All `IScriptSandbox.runX()` methods stay `ScriptResult<void>` — **sync, no change**
2. `SandboxRuntimeContext` is replaced by `ScriptContext` (sync reads + `world: WorldOps` + `startSequence()`)
3. A `SequenceManager` is added to manage active sequences (start, cancel, cleanup)
4. **Safety guard**: If any hook returns a Promise, engine detects it, logs warning, disables script

### Q3: Should `onUpdate` be async? ✅

**Decision: NO — `onUpdate` is synchronous. So is `onStart`.**

Reasoning:
- **Frame budgets are unenforceable on async.** `Promise.race(timeout)` can't stop running code.
- **Even "instant" awaits have cost.** Resolved Promises schedule microtasks. Jitter at 60fps.
- **Accidental `await animate()` is catastrophic.** A sync signature makes this impossible at the type level.
- **onStart has the same problem.** You don't want to block real-world time in onStart either. An intro animation should be a sequence, not a blocking await.
- **Sync reads are all hooks need.** Position, velocity, tags — all cached. No async needed.
- **Writes are fire-and-forget.** `ctx.world.setPosition(...)` returns a Promise, but you don't await it.
- **Multi-frame work uses `startSequence()`.** This is the clean escape hatch (see Decision 5).

All hook signatures are `→ void`. Period.

### Q4: What about `onCollision` and `onInput`? ✅

**Decision: All hooks are sync. Multi-frame responses use `startSequence()`.**

A collision handler that needs to animate + destroy + update score:
```typescript
function onCollision(ctx, collision) {
  if (ctx.hasTag(collision.entityA, 'gem')) {
    ctx.startSequence('gem-' + collision.entityA, async (world) => {
      await world.animate(collision.entityA, { opacity: 0 }, { duration: 300 });
      await world.destroy(collision.entityA);
      const score = await world.getVariable('score') as number;
      await world.setVariable('score', score + 100);
    });
  }
}
```

The pattern is uniform across ALL hooks: sync body, `startSequence()` for anything that spans frames. No special cases, no "this hook is async but that one isn't." One mental model.

### Q5: Tags — Godot or TypeScript authority? ✅

**Decision: Tags stay in TypeScript (EntityManager)**

Reasoning:
- Tags are pure game-logic metadata (not physics state)
- EntityManager already manages tags with addTag/removeTag/hasTag/query
- Moving tags to Godot would add RPC overhead for every tag operation
- The DebugBridge reads tags from TypeScript already (via the entity sync)
- Tags don't need physics-engine awareness

WorldOps.addTag/removeTag etc. operate on EntityManager directly (in-process). No Godot round-trip.

### Q6: Variables — where do they live? ✅

**Decision: Variables stay in TypeScript (RulesSystem/game state)**

Reasoning:
- Variables (`score`, `lives`, `level`) are pure game logic
- Godot doesn't need them for physics simulation
- RulesSystem already manages variables
- In-process access = zero overhead

WorldOps.getVariable/setVariable reads/writes RulesSystem state directly. No Godot round-trip.

### Q7: Package structure ✅

**Decision: Types in `@slopcade/shared`, implementation in `app/lib/game-engine/`**

- `shared/src/types/world-ops.ts` — `WorldOps` interface + DTOs
- `shared/src/types/debug-ops.ts` — `DebugOps extends WorldOps` interface
- `app/lib/game-engine/WorldOpsImpl.ts` — in-process implementation
- Types reuse existing `Vec2`, `Bounds` from `shared/src/types/common.ts`

The `@slopcade/shared` package already has Vec2, Bounds, TransformComponent, GameEntity — WorldOps DTOs should reuse these, not redefine them.

### Q8: Coroutine Model for Multi-Frame Sequences ✅ (NEW)

**Decision: All hooks are sync. Multi-frame work is expressed exclusively through `startSequence()`.**

Today's `animateEntity` is fire-and-forget — script calls it, animation runs in background with no completion signal. This is broken for sequencing (`animate A, then animate B, then destroy`).

The new model:

| Hook | Execution Model | Multi-frame work? |
|------|----------------|-------------------|
| `onStart` | Sync — runs once, returns immediately | Via `startSequence()` |
| `onUpdate` | Sync — runs every frame, returns immediately | Via `startSequence()` |
| `onInput` | Sync — runs on input event, returns immediately | Via `startSequence()` |
| `onCollision` | Sync — runs on collision, returns immediately | Via `startSequence()` |

**One pattern for everything:** Every hook follows the same pattern — sync body, `startSequence()` for multi-frame work. No hook is "special." No async/sync split to remember.

**How sequences work across frames:**
```
Frame 1:  onCollision fires (sync) → calls startSequence('gem-hit', ...)
          startSequence returns immediately
          Sequence begins: animate() starts a tween
          Game loop continues normally

Frame 2:  onUpdate runs normally (sync)
          Tween system advances the animation by dt
          Sequence is suspended at `await world.animate(...)`

Frame 15: Tween completes → sequence resumes → hits `await world.wait(200)`
          Timer registered for 200ms of game time

Frame 27: Timer expires → sequence resumes → `await world.destroy('gem')`
          Entity destroyed → sequence resumes → updates score → sequence ends
```

The `SequenceManager` manages active sequences:
- Named sequences auto-cancel if re-triggered with same name
- Sequences are tracked for cleanup on script reload/dispose
- Cancelled sequences get `SequenceCancelledError` (expected, not logged as error)
- Real errors in sequences are captured and reported (don't crash the game)
- Sequences use **game time** (affected by pause/timeScale)

---

## 7. Migration Path

### Phase 1: Define Types
1. Create `WorldOps` interface and all shared DTOs in `packages/shared`
2. No code changes yet — just types

### Phase 2: Implement WorldOpsImpl
1. Build `WorldOpsImpl` in `app/lib/game-engine/` backed by EntityManager + Physics + GodotBridge
2. Start with the subset that all three interfaces already share (spawn, destroy, position, velocity, tags)
3. Add missing capabilities (raycast to scripts, impulse to debug, clone to scripts)

### Phase 3: Migrate Script Sandbox
1. Build `SequenceManager` for `startSequence()` support
2. Replace `SandboxRuntimeContext.entityManager` adapter with sync cache reads + `WorldOps`
3. Update `ScriptContext` to expose sync reads, `world: WorldOps`, and `startSequence()`
4. Add safety guard: detect hooks that return Promises, log + disable
5. Verify existing scripts still work (hooks stay sync — minimal migration)

### Phase 4: Migrate Debug/MCP
1. Refactor `GodotDebugBridge` to use `WorldOps` for core operations
2. Keep debug-only extensions (time control, screenshots, etc.) separate
3. Update MCP tools to call WorldOps instead of raw queryGodot

### Phase 5: Migrate Runtime
1. Update RulesSystem and behaviors to use WorldOps
2. Remove direct EntityManager manipulation where possible

### Phase 6: Cleanup
1. Remove old adapter code in ScriptSandboxRuntimeSystem
2. Remove duplicated type definitions
3. Add contract tests ensuring WorldOps works consistently across all consumers

---

## 8. Key Files Reference

| File | Current Role | After Migration |
|------|-------------|-----------------|
| `app/lib/godot/types.ts` | GodotBridge interface | Stays — transport layer |
| `app/lib/godot/debug/types.ts` | GodotDebugBridge types (661 lines) | Split: WorldOps types → shared, debug-only types stay |
| `app/lib/godot/debug/GodotDebugBridge.ts` | Debug bridge implementation | Refactored to use WorldOps internally |
| `app/lib/scripting/types.ts` | Script sandbox types | Replaced by WorldOps + ScriptContext |
| `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | Creates entity adapter (lines 249-383) | Uses WorldOps instead of hand-built adapter |
| `app/lib/game-engine/EntityManager.ts` | Entity state management | Still exists, but WorldOps is the public API |
| `app/lib/godot/GodotPhysicsAdapter.ts` | Caches transforms/velocities from Godot | Still exists as cache layer under WorldOpsImpl |
| `app/lib/physics2d/Physics2D.ts` | Physics interface | May be absorbed into WorldOpsImpl |
| `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` | Time control bridge | Becomes part of DebugOps |
| `app/lib/game-engine/debug/types.ts` | SlopcadeDebugBridge types | Merged into DebugOps types |
| `packages/game-inspector-mcp/src/tools/*.ts` | MCP tool definitions | Updated to call WorldOps |
| `packages/game-inspector-mcp/src/utils.ts` | queryGodot/querySlopcade helpers | Simplified — calls WorldOps |

---

## 9. Data Flow: How State Syncs Today

Understanding this is critical for the implementation.

### Godot → TypeScript (Every Frame)

```
Godot _physics_process()
  → Computes new positions/velocities
  → Sends transforms via onTransformSync (all entities, ~60fps)
  → Sends properties via onPropertySync (velocities, angular velocities)
      │
      ▼
GodotBridge receives callbacks
      │
      ▼
GodotPhysicsAdapter.handleTransformSync()
  → Updates cachedStates Map (position, angle)
GodotPhysicsAdapter.handlePropertySync()
  → Updates cachedStates Map (velocity, angular velocity)
      │
      ▼
EntityManagerRuntimeSystem (PRE_UPDATE phase)
  → Calls syncTransformsFromPhysics()
  → EntityManager.transform ← now matches Godot
      │
      ▼
ScriptSandbox (GAME_LOGIC phase) reads from EntityManager
  → Sees fresh data (synced this frame)
```

### TypeScript → Godot (On Demand)

```
Script calls ctx.world.setPosition(id, pos)
      │
      ├─→ EntityManager.transform updated (TS cache)
      ├─→ Physics adapter updated (if physics body)
      └─→ GodotBridge.setPosition() called (fire-and-forget to Godot)
```

### Key Invariant

Scripts run in `GAME_LOGIC` phase (priority 40). Transform sync runs in `PRE_UPDATE` phase (priority 70, which runs BEFORE GAME_LOGIC). So scripts always see fresh data from the current frame.

### What Only Godot Knows (Not Cached in TypeScript)

These require Godot RPC calls:
- Collision shape details (circle, rect, capsule, polygon — actual geometric data)
- Joint info (type, parameters, connected entities)
- Sensor overlaps (which entities are currently touching)
- Physics spatial queries (queryPoint, queryAABB, raycast)
- Rendered visual state

On web, these RPC calls are effectively synchronous (same JS thread, `_lastResult` pattern). On native, they're genuinely async.

---

## 10. Principles / Non-Negotiables

1. **One interface.** All consumers use `WorldOps`. No per-consumer variations of the core API.
2. **WorldOps is all async.** Every WorldOps method returns a Promise. Script hooks access it via sync reads (cache) + fire-and-forget writes.
3. **Godot is the authority.** TypeScript caches state for performance but doesn't own it.
4. **Capability parity.** If one consumer can do it, all consumers can do it (within reason — debug-only ops like screenshots are exceptions).
5. **AI-first ergonomics.** The interface is designed to be written by AI, not optimized for human typing speed.
6. **GodotBridge stays as transport.** WorldOps is built on top of GodotBridge, not replacing it.
7. **Shared types.** One `Vec2`, one `EntityData`, one `SpawnOptions` — no per-interface type duplication.
8. **Hooks are sync, sequences are async.** All script hooks (`onStart`, `onUpdate`, `onInput`, `onCollision`) return `void`. Multi-frame work goes through `startSequence()`. One pattern, no exceptions.
9. **No blocking real time.** No hook or operation should ever block real-world time. Animations and delays are expressed as sequences that advance on game time across frames.
