write a # Event System Unification, Game Inspector Integration & Debug Logging

> Research document generated 2026-02-04. Analysis of current systems + design proposals.

---

## Table of Contents

1. [Current Event Architecture (As-Is)](#1-current-event-architecture-as-is)
2. [Problem Statement](#2-problem-statement)
3. [Proposed: Unified Event Model](#3-proposed-unified-event-model)
4. [Game Inspector: Auto-Advance on Event](#4-game-inspector-auto-advance-on-event)
5. [Godot→TypeScript Communication Cleanup](#5-godottypescript-communication-cleanup)
6. [Proposed: Log Level System](#6-proposed-log-level-system)
7. [Implementation Plan](#7-implementation-plan)

---

## 1. Current Event Architecture (As-Is)

### 1.1 Two Separate Event Pipelines

Today, "lifecycle events" and "input events" follow **completely different code paths** before they converge inside `stepGame()`:

#### Lifecycle Events Pipeline

```
pendingLifecycleEventsRef.current.push('game_loaded')   // React ref, pushed imperatively
                    ↓
stepGame() line 951:
  lifecycleEvents = pendingLifecycleEventsRef.current.map(type => ({ type }))
  pendingLifecycleEventsRef.current = []
                    ↓
UpdateContext.frame.inputEvents = lifecycleEvents   // ← INJECTED as "input events"!
                    ↓
RulesSystem.convertFrameInputEvents()
  → maps { type: 'game_loaded' } to { gameLoaded: true }
                    ↓
LogicTriggerEvaluator: trigger.type === 'game_loaded' → context.inputEvents.gameLoaded
```

**Key files:**
- `GameRuntime.godot.tsx:345` — `pendingLifecycleEventsRef` defined
- `GameRuntime.godot.tsx:843,1444,1513` — pushed to
- `GameRuntime.godot.tsx:951-955` — consumed in stepGame()

#### Input Events Pipeline

```
User touches screen / keyboard / game inspector simulate_input
                    ↓
inputRef.current.tap = { x, y, worldX, worldY, targetEntityId }   // React ref, mutated
  OR
inputRef.current.buttons = { left: true, ... }                     // Continuous state
  OR
inputRef.current.drag = { startX, ..., currentX, ... }             // Continuous state
                    ↓
stepGame() line 961:
  UpdateContext.input = inputRef.current as InputState              // Passed as continuous state
                    ↓
InputRuntimeSystem.update() [PRE_UPDATE phase]:
  if (ctx.input.tap) → ctx.frame.inputEvents.push({ type: 'tap', ...tap })
                    ↓
RulesSystem.convertFrameInputEvents()
  → maps { type: 'tap', ... } to { tap: { x, y, worldX, worldY, targetEntityId } }
                    ↓
InputTriggerEvaluator: trigger.type === 'tap' → context.inputEvents.tap
```

**Key files:**
- `GameRuntime.godot.tsx:1391-1434` — `__GAME_RUNTIME__` exposes `setInput`, `clearInput`
- `app/lib/game-engine/hooks/useGameInput.ts` — touch/keyboard handlers
- `app/lib/game-engine/systems/runner/wrappers/InputRuntimeSystem.ts` — converts input state → frame events
- `packages/game-inspector-mcp/src/tools/interaction.ts` — `simulate_input` tool

#### Collision Events Pipeline (third pipeline!)

```
Godot detects collision (physics step)
                    ↓
CollisionSystem.gd → EventEmitter.gd → JS callback
                    ↓
GodotBridge.web.ts onCollision callback:
  collisionsRef.current.push({ entityA, entityB, normal, impulse })
                    ↓
stepGame() line 948-949:
  frameCollisions = collisionsRef.current.slice()
  collisionsRef.current = []
                    ↓
UpdateContext.frame.collisions = frameCollisions
                    ↓
RulesSystem reads ctx.frame.collisions for collision triggers
```

### 1.2 The InputEvents "Bag" Type

All events converge into the `InputEvents` interface in `BehaviorContext.ts:54-63`:

```typescript
export interface InputEvents {
  tap?: { x, y, worldX, worldY, targetEntityId? };
  dragStart?: { x, y, worldX, worldY, targetEntityId? };
  dragEnd?: { velocityX, velocityY, worldVelocityX, worldVelocityY };
  swipe?: { direction: 'left' | 'right' | 'up' | 'down' };
  buttonPressed?: Set<string>;
  buttonReleased?: Set<string>;
  gameStarted?: boolean;      // ← lifecycle event crammed in here
  gameLoaded?: boolean;        // ← lifecycle event crammed in here
}
```

**Problem**: Lifecycle events (`gameStarted`, `gameLoaded`) are boolean flags on the same object as actual input events. They're fundamentally different things that got mashed together.

### 1.3 The `InputEvent` Union Type

In `systems/runner/types.ts:89-97`, the formal type definition actually already treats them similarly:

```typescript
export type InputEvent =
  | TapInputEvent           // { type: 'tap', x, y, worldX, worldY, targetEntityId? }
  | MouseMoveInputEvent     // { type: 'mouse_move', x, y, worldX, worldY }
  | DragStartInputEvent     // { type: 'drag_start', ... }
  | DragEndInputEvent       // { type: 'drag_end', velocityX, velocityY, ... }
  | ButtonPressedInputEvent // { type: 'button_pressed', button }
  | ButtonReleasedInputEvent// { type: 'button_released', button }
  | GameStartedInputEvent   // { type: 'game_started' }
  | GameLoadedInputEvent    // { type: 'game_loaded' }
```

So the **type system** already has lifecycle events in the `InputEvent` union. But the **runtime flow** splits them into different refs and different injection points.

---

## 2. Problem Statement

### 2.1 Fragmented Event Queuing

| Event Category | Where Queued | How Consumed | Timing |
|---|---|---|---|
| Lifecycle (game_loaded, game_started) | `pendingLifecycleEventsRef` (React ref) | Read + cleared in stepGame() | Queued at setup, consumed on first frame |
| Input (tap, drag, keys) | `inputRef.current` (React ref, mutated) | Read in InputRuntimeSystem.update() | Set imperatively, cleared after 1 frame (tap) or on release (drag/buttons) |
| Collisions | `collisionsRef.current` (React ref) | Read + cleared in stepGame() | Pushed by bridge callback, consumed next frame |
| Godot input events | `_queue_event()` in GameBridge.gd | Never consumed by TS game loop | Queued in Godot's EventQueue, polled only on native |

**There is no single event queue.** Events arrive through 4+ different mechanisms.

### 2.2 Game Inspector Deadlock

When the game inspector (MCP) is active:

1. `SlopcadeDebugBridge.pause()` → sets `timeControl.paused = true` + `gameLoopControllerRef.current?.pause()`
2. The `GameLoopController.tick()` returns immediately when `this.paused === true`
3. **No frames advance** → `stepGame()` never runs → no events get processed

**What happens when `simulate_input` fires while paused:**

```
MCP calls simulate_input(tap, worldX=5, worldY=3)
    ↓
interaction.ts evaluates in browser:
    runtime.setInput("tap", { x: 0, y: 0, worldX: 5, worldY: 3, targetEntityId: "ball_1" })
    ↓
inputRef.current.tap = { ... }    // Set on the ref
    ↓
... nothing. Game loop is paused. stepGame() never runs.
    ↓
MCP then calls `step(1)` to advance 1 frame
    ↓
SlopcadeDebugBridge.step() → manualStep(1) → bridge.stepPhysics(1) + stepGame(FIXED_DT)
    ↓
NOW the tap gets consumed
```

**The problem**: The AI/user must always remember to call `step` after `simulate_input`. If they forget, the input sits in the ref until the next step. If another input overwrites it first, the original is lost.

### 2.3 Lifecycle Events in Paused State

```
Game loads in debug mode (line 645-651):
    state set directly to "playing"
    pendingLifecycleEventsRef.current.push('game_loaded')   // Line 843
    ↓
Debug bridge immediately pauses (line 1127):
    bridge.pause()
    ↓
game_loaded sits in pendingLifecycleEventsRef... waiting
    ↓
AI must call step(1) to process it
    ↓
But AI doesn't know game_loaded is pending unless it reads the code
```

### 2.4 Godot-Side Event Queuing Confusion

Godot has its own `EventQueue.gd` (max 100 events). When JS callbacks aren't registered yet, events queue there. On **native**, a poll loop reads them. On **web**, events go directly via JS callbacks and the Godot EventQueue is rarely used.

But there's also `_queue_event()` in `GameBridge.gd:142-159` which queues events from `InputRouter` and `InputSystem` into the Godot-side queue. These events are **separate from** the TypeScript-side `inputRef`/`pendingLifecycleEventsRef`.

**The confusion**: Two event queues exist in parallel (Godot's `EventQueue.gd` and TypeScript's various refs), and it's unclear which one is the "real" source of truth.

---

## 3. Proposed: Unified Event Model

### 3.1 Design Principles

1. **Single event queue on the TypeScript side** — all events flow into one queue
2. **Godot fires events to TypeScript immediately** — no Godot-side queuing for game logic events
3. **Events are processed asynchronously on the next frame** — the setInterval-driven frame from TypeScript
4. **When paused (inspector mode), events still queue** — but auto-advance processes them

### 3.2 Proposed: `GameEventQueue`

Replace the scattered refs with a single typed event queue:

```typescript
// New file: app/lib/game-engine/GameEventQueue.ts

export type GameEvent =
  // Lifecycle
  | { type: 'game_loaded' }
  | { type: 'game_started' }
  // User Input
  | { type: 'tap'; x: number; y: number; worldX: number; worldY: number; targetEntityId?: string }
  | { type: 'drag_start'; x: number; y: number; worldX: number; worldY: number; targetEntityId?: string }
  | { type: 'drag_move'; x: number; y: number; worldX: number; worldY: number }
  | { type: 'drag_end'; velocityX: number; velocityY: number; worldVelocityX: number; worldVelocityY: number }
  | { type: 'mouse_move'; x: number; y: number; worldX: number; worldY: number }
  | { type: 'mouse_leave' }
  | { type: 'button_pressed'; button: string }
  | { type: 'button_released'; button: string }
  // Collisions (from Godot physics)
  | { type: 'collision'; entityA: string; entityB: string; normal: Vec2; impulse: number }
  | { type: 'sensor_begin'; sensorEntityId: string; otherEntityId: string }
  | { type: 'sensor_end'; sensorEntityId: string; otherEntityId: string };

export class GameEventQueue {
  private queue: GameEvent[] = [];
  private onEventQueued?: () => void;  // For auto-advance notification

  push(event: GameEvent): void {
    this.queue.push(event);
    this.onEventQueued?.();
  }

  drain(): GameEvent[] {
    const events = this.queue;
    this.queue = [];
    return events;
  }

  peek(): readonly GameEvent[] {
    return this.queue;
  }

  get length(): number {
    return this.queue.length;
  }

  setOnEventQueued(callback: () => void): void {
    this.onEventQueued = callback;
  }
}
```

### 3.3 Migration: Who Pushes Events

| Current | New |
|---|---|
| `pendingLifecycleEventsRef.current.push('game_loaded')` | `eventQueue.push({ type: 'game_loaded' })` |
| `pendingLifecycleEventsRef.current.push('game_started')` | `eventQueue.push({ type: 'game_started' })` |
| `inputRef.current.tap = { ... }` | `eventQueue.push({ type: 'tap', ... })` |
| `inputRef.current.drag = { ... }` | Keep as continuous state (drag is ongoing, not discrete) |
| `inputRef.current.buttons = { ... }` | Keep as continuous state (held keys are not discrete) |
| `inputRef.current.dragEnd = { ... }` | `eventQueue.push({ type: 'drag_end', ... })` |
| `collisionsRef.current.push(...)` | `eventQueue.push({ type: 'collision', ... })` |
| `runtime.setInput("tap", ...)` (game inspector) | `eventQueue.push({ type: 'tap', ... })` |

**Note**: Continuous state (buttons held, drag position, tilt, mouse position) stays in `inputRef` because it's not event-based — it's polled every frame.

### 3.4 Migration: Who Consumes Events

In `stepGame()`, replace the current 3-source gathering:

```typescript
// BEFORE (current):
const lifecycleEvents = pendingLifecycleEventsRef.current.map(type => ({ type }));
pendingLifecycleEventsRef.current = [];
const frameCollisions = collisionsRef.current.slice();
collisionsRef.current = [];
const updateContext = {
  ...
  frame: {
    inputEvents: lifecycleEvents,    // Only lifecycle here!
    collisions: frameCollisions,
  },
};

// AFTER (proposed):
const frameEvents = eventQueueRef.current.drain();
const inputEvents = frameEvents.filter(e => e.type !== 'collision' && e.type !== 'sensor_begin' && e.type !== 'sensor_end');
const collisions = frameEvents.filter(e => e.type === 'collision');
const updateContext = {
  ...
  frame: {
    inputEvents,      // All non-collision events (lifecycle + input) together
    collisions,       // Collision events separate (different consumer pattern)
  },
};
```

### 3.5 Downstream: RulesSystem Changes

`convertFrameInputEvents()` already handles the `InputEvent` union type correctly. It would need minimal changes since `GameEvent` aligns with the existing `InputEvent` union.

The `InputRuntimeSystem` would no longer need to convert `ctx.input.tap` → `frame.inputEvents.push(tapEvent)` because taps arrive directly in `frame.inputEvents` from the queue. The `InputRuntimeSystem` would still handle continuous state like drag tracking and input entity management.

---

## 4. Game Inspector: Auto-Advance on Event

### 4.1 Current Problem

When the game inspector is active (physics paused), events queue but nothing processes them until the AI explicitly calls `step`. This creates confusion:

- AI simulates a tap → must remember to step
- `game_loaded` fires at setup → must step to see entities spawn
- Collision happens (if physics was running before pause) → must step to process

### 4.2 Proposed: Auto-Step on Event

When the game is in inspector/paused mode and an event arrives in the `GameEventQueue`, automatically advance exactly **1 frame** to process it:

```typescript
// In GameRuntime.godot.tsx, when setting up the event queue:

eventQueueRef.current.setOnEventQueued(() => {
  const tc = timeControlRef.current;
  
  // Only auto-advance in inspector mode when paused
  if (tc.mode !== 'inspect' || !tc.paused) return;
  
  // Don't auto-advance if we're already processing a manual step
  if (isSteppingRef.current) return;
  
  // Schedule a single frame advance (debounced to batch rapid events)
  if (!autoStepTimerRef.current) {
    autoStepTimerRef.current = setTimeout(() => {
      autoStepTimerRef.current = null;
      manualStep(1);  // Advance exactly 1 frame
    }, 0);  // Next microtask — batches all events from the same source
  }
});
```

### 4.3 Behavior After Auto-Advance

| Scenario | Before (current) | After (proposed) |
|---|---|---|
| `simulate_input(tap)` while paused | Input sits in ref. Must call `step(1)` manually. | Input queued → auto-step fires → tap processed in 1 frame. |
| `game_loaded` at startup in debug mode | Sits in ref. Must call `step(1)` to see entities spawn. | Queued → auto-step fires → entities spawn immediately. |
| Collision callback while paused | Sits in ref. Must call `step(1)`. | Queued → auto-step fires → collision rules process. |
| Multiple rapid events | Each needs separate `step` or batch with `step(N)`. | All batch into 1 auto-step (setTimeout(0) debounce). |

### 4.4 MCP Tool Changes

The `simulate_input` tool would still work the same, but would no longer need the `waitMs` hack (currently waits 100ms hoping the game loop picks it up). Instead:

1. Input is pushed to `GameEventQueue`
2. Auto-step fires in next microtask
3. `stepGame()` runs synchronously
4. Screenshot/logs captured after the step completes

For `step(N)` called explicitly: still works exactly as before — advances N frames, processing whatever events are queued.

### 4.5 Edge Cases

**Multiple auto-steps**: If an event's processing triggers another event (e.g., tap rule spawns entity which triggers `entity_count` rule), the second event will auto-step again. This is intentional — cascading events should resolve immediately in inspector mode.

**Rate limiting**: Add a maximum auto-steps-per-second guard (e.g., 60) to prevent infinite loops from recursive event chains.

**Manual step override**: If the AI is actively calling `step(N)`, disable auto-step for the duration to avoid double-advancing.

---

## 5. Godot→TypeScript Communication Cleanup

### 5.1 Current Dual-Queue Problem

Today there are two event queues:
- **Godot side**: `EventQueue.gd` (max 100, polled on native)
- **TypeScript side**: Various React refs (`collisionsRef`, `pendingLifecycleEventsRef`, `inputRef`)

Events from Godot can arrive via:
1. **Direct JS callback** (web) — `_js_collision_callback.call("call", null, ...)` — fires synchronously into TypeScript
2. **Queued in EventQueue.gd** — when JS callbacks aren't registered yet
3. **Polled via `poll_events()`** (native only) — periodic polling from TypeScript

### 5.2 Proposed: Godot Always Fires, TypeScript Always Queues

**Principle**: Godot's job is to detect events and fire them to TypeScript immediately. TypeScript's job is to queue them and process them on the next frame.

```
GODOT SIDE (producer):
  CollisionSystem detects collision
    → EventEmitter.emit_collision(entityA, entityB, impulse)
    → JS callback fires immediately (web)
    → OR queued for poll (native)

TYPESCRIPT SIDE (consumer):
  Bridge collision callback:
    → eventQueue.push({ type: 'collision', entityA, entityB, normal, impulse })
  
  Next frame (or auto-step in inspector mode):
    → stepGame() drains queue
    → Processes all events
```

**Changes needed on Godot side:**
- Remove `_queue_event()` calls from `InputSystem.gd` and `InputRouter.gd` — Godot shouldn't queue input events locally since TypeScript handles input directly
- Keep `EventQueue.gd` only as a fallback for events that arrive before bridge initialization
- Godot's `_input()` handler in `GameBridge.gd` should ONLY forward to `_event_emitter` (which fires to JS), not also to `_queue_event()`

**Changes needed on TypeScript side:**
- Bridge callbacks push directly to `GameEventQueue` instead of various refs
- Remove `collisionsRef`, `pendingLifecycleEventsRef` — replaced by single `GameEventQueue`
- `inputRef` stays for continuous state (buttons held, drag position, mouse position)

### 5.3 Official Communication Patterns

After cleanup, the communication patterns should be:

| Direction | Pattern | Mechanism | Example |
|---|---|---|---|
| **TS → Godot (command)** | Fire-and-forget | `getGodotBridge().methodName(args)` | `bridge.spawnEntity(...)`, `bridge.setPosition(...)` |
| **TS → Godot (query)** | Async request/response | `queryAsync(method, args)` via QuerySystem.gd | `bridge.getAllTransforms()`, `bridge.queryPoint(...)` |
| **Godot → TS (event)** | Immediate callback | `EventEmitter._js_callback.call(...)` | Collision, sensor overlap, input |
| **Godot → TS (event, native)** | Polled queue | `EventQueue.poll_events()` | Same events, but batched via polling |
| **TS → TS (lifecycle)** | Direct queue push | `eventQueue.push(...)` | `game_loaded`, `game_started` |

**No other patterns should exist.** If something doesn't fit one of these 5, it's a bug.

---

## 6. Proposed: Log Level System

### 6.1 Current Logging State

**TypeScript side** — unconditional `console.log` everywhere:
- `GameRuntime.godot.tsx` — ~40 console.log statements with prefixes like `[stepGame]`, `[Lifecycle]`, `[GameLoop Effect]`, `[handleStart]`
- `RulesSystem.ts` — `[Lifecycle]` prefix logs in convertFrameInputEvents and rule evaluation
- `GameEventBus.ts` — logs every subscribe/emit
- `GameStateHelpers.ts` — logs every variable set

**GDScript side** — `print()`, `push_error()`, `push_warning()`:
- `GameBridge.gd` — startup sequence with `print()`
- Various modules — `push_error()` for actual errors, `push_warning()` for warnings
- No way to control verbosity

**Game inspector** — captures browser `console.log` via Playwright `page.on('console')`:
- Stored in `state.consoleLogs` array
- Accessible via `get_console_logs` MCP tool
- Can filter by string match, but no level-based filtering

### 6.2 Proposed: TypeScript Log System

```typescript
// New file: app/lib/game-engine/debug/Logger.ts

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

export type LogCategory =
  | 'lifecycle'    // game_loaded, game_started, state transitions
  | 'input'        // tap, drag, keyboard events
  | 'physics'      // collisions, forces, velocities
  | 'rules'        // rule evaluation, trigger matching, action execution
  | 'entities'     // spawn, destroy, property changes
  | 'bridge'       // Godot↔TS communication
  | 'assets'       // image loading, texture preloading
  | 'render'       // visual updates, camera, viewport
  | 'audio'        // sound playback
  | 'state'        // game state changes, variable updates
  | 'loop'         // game loop, frame timing
  | 'inspector';   // debug bridge, MCP tools

interface LogConfig {
  level: LogLevel;
  categories: Partial<Record<LogCategory, LogLevel>>;  // Per-category overrides
}

class GameLogger {
  private config: LogConfig = {
    level: LogLevel.WARN,  // Default: only warnings and errors
    categories: {},
  };

  configure(config: Partial<LogConfig>): void {
    Object.assign(this.config, config);
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    const categoryLevel = this.config.categories[category];
    const effectiveLevel = categoryLevel ?? this.config.level;
    return level <= effectiveLevel;
  }

  error(category: LogCategory, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(`[${category}]`, ...args);
    }
  }

  warn(category: LogCategory, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(`[${category}]`, ...args);
    }
  }

  info(category: LogCategory, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.log(`[${category}]`, ...args);
    }
  }

  debug(category: LogCategory, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.log(`[${category}:debug]`, ...args);
    }
  }

  trace(category: LogCategory, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.TRACE, category)) {
      console.log(`[${category}:trace]`, ...args);
    }
  }
}

// Singleton
export const logger = new GameLogger();
```

### 6.3 Usage Examples

```typescript
// In GameRuntime.godot.tsx
import { logger } from './debug/Logger';

// Replace: console.log("[Lifecycle] Pushing game_loaded to pendingLifecycleEventsRef");
// With:
logger.info('lifecycle', 'Pushing game_loaded event');

// Replace: console.log(`[stepGame] frame ${frameNum} starting`);
// With:
logger.trace('loop', `frame ${frameNum} starting`);

// Replace: console.log("[Lifecycle] convertFrameInputEvents: Found game_loaded event");
// With:
logger.debug('lifecycle', 'convertFrameInputEvents: Found game_loaded event');
```

### 6.4 Controlling Log Levels

**From code (game initialization):**
```typescript
// In debug mode, enable verbose lifecycle + rules logging
if (debugMode) {
  logger.configure({
    level: LogLevel.WARN,  // Default: only warnings
    categories: {
      lifecycle: LogLevel.DEBUG,   // Show lifecycle debug
      rules: LogLevel.DEBUG,       // Show rule evaluation
      inspector: LogLevel.INFO,    // Show inspector actions
    },
  });
}
```

**From game inspector MCP (new tool):**
```typescript
// New MCP tool: set_log_level
server.tool("set_log_level", "Set logging verbosity", {
  level: z.enum(["silent", "error", "warn", "info", "debug", "trace"]),
  category: z.string().optional(),
}, async (args) => {
  // Evaluate in page context
  await page.evaluate((params) => {
    const runtime = window.__GAME_RUNTIME__;
    if (runtime?.logger) {
      if (params.category) {
        runtime.logger.configure({
          categories: { [params.category]: LogLevel[params.level.toUpperCase()] }
        });
      } else {
        runtime.logger.configure({ level: LogLevel[params.level.toUpperCase()] });
      }
    }
  }, args);
});
```

### 6.5 GDScript Log System

```gdscript
# New file: godot_project/scripts/utils/Logger.gd
class_name GameLogger extends RefCounted

enum Level { SILENT, ERROR, WARN, INFO, DEBUG, TRACE }

var _level: Level = Level.WARN
var _category_levels: Dictionary = {}

func configure(level: Level, categories: Dictionary = {}) -> void:
    _level = level
    _category_levels = categories

func _should_log(level: Level, category: String) -> bool:
    var effective = _category_levels.get(category, _level)
    return level <= effective

func error(category: String, message: String) -> void:
    if _should_log(Level.ERROR, category):
        push_error("[%s] %s" % [category, message])

func warn(category: String, message: String) -> void:
    if _should_log(Level.WARN, category):
        push_warning("[%s] %s" % [category, message])

func info(category: String, message: String) -> void:
    if _should_log(Level.INFO, category):
        print("[%s] %s" % [category, message])

func debug_log(category: String, message: String) -> void:
    if _should_log(Level.DEBUG, category):
        print("[%s:debug] %s" % [category, message])

func trace(category: String, message: String) -> void:
    if _should_log(Level.TRACE, category):
        print("[%s:trace] %s" % [category, message])
```

**Controllable from TypeScript** via a new bridge method:
```typescript
bridge.setLogLevel("entities", "debug");
// → GodotBridge calls GameBridge.gd → Logger.configure(...)
```

### 6.6 What Gets Logged Where

| Category | TypeScript Examples | GDScript Examples |
|---|---|---|
| `lifecycle` | game_loaded/started events, state transitions | N/A (lifecycle is TS-side) |
| `input` | tap/drag/key events, simulate_input | InputRouter processing, hit testing |
| `physics` | Collision callbacks received | Collision detection, velocity changes |
| `rules` | Rule evaluation, trigger matching, action execution | N/A (rules are TS-side) |
| `entities` | Entity creation/destruction in EntityManager | EntityFactory creation, visual setup |
| `bridge` | Bridge init, callback registration | JS bridge setup, method dispatch |
| `assets` | Preloading progress, URL resolution | Texture loading, HTTP fetching |
| `render` | Camera updates, viewport changes | VisualRenderer, sprite updates |
| `audio` | Sound playback triggers | AudioManager playback |
| `state` | Variable changes, score/lives updates | N/A (state is TS-side) |
| `loop` | Frame timing, step execution | N/A (loop is TS-side) |
| `inspector` | MCP tool calls, debug bridge operations | Debug bridge queries |

---

## 7. Implementation Plan

### Phase 1: Logger System (Low Risk, High Value)

1. Create `app/lib/game-engine/debug/Logger.ts`
2. Create `godot_project/scripts/utils/Logger.gd`
3. Add `set_log_level` MCP tool
4. Migrate existing `console.log` statements in `GameRuntime.godot.tsx` and `RulesSystem.ts`
5. Add `setLogLevel` to GodotBridge interface

**Why first**: Immediately useful for debugging the next phases. Zero risk to existing behavior since it's additive.

### Phase 2: Unified Event Queue (Medium Risk, High Value)

1. Create `GameEventQueue` class
2. Create `gameEventQueueRef` in `GameRuntime.godot.tsx`
3. Migrate lifecycle event pushing: `game_loaded`, `game_started`
4. Migrate collision callback: push to queue instead of `collisionsRef`
5. Migrate tap input: push to queue instead of `inputRef.current.tap`
6. Migrate dragEnd: push to queue instead of `inputRef.current.dragEnd`
7. Update `stepGame()` to drain queue instead of reading 3 separate refs
8. Update `simulate_input` in `__GAME_RUNTIME__` to push to queue
9. Keep `inputRef` for continuous state (buttons, drag position, mouse, tilt)

**Why second**: Core architectural change that simplifies everything else.

### Phase 3: Auto-Step in Inspector Mode (Low Risk, High Value)

1. Add `onEventQueued` callback to `GameEventQueue`
2. In inspector mode, wire callback to trigger `manualStep(1)` with debounce
3. Update `simulate_input` MCP tool to remove `waitMs` hack
4. Test: `simulate_input(tap)` → immediate frame advance → screenshot shows result

**Why third**: Builds on Phase 2. Makes the game inspector dramatically easier to use.

### Phase 4: Godot Communication Cleanup (Low Risk, Medium Value)

1. Remove `_queue_event()` calls from `GameBridge.gd:_input()` — TypeScript handles input directly
2. Remove duplicate input paths in `InputSystem.gd` (Godot-side queuing)
3. Document the 5 official communication patterns
4. Verify `EventQueue.gd` is only used during bridge initialization

**Why last**: Polish step. The system already works; this just removes confusion.

---

## Appendix: Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `app/lib/game-engine/GameRuntime.godot.tsx` | ~2000 | Main orchestrator, event refs, stepGame, game loop |
| `app/lib/game-engine/GameLoopController.ts` | 182 | setInterval loop with pause/timeScale |
| `app/lib/game-engine/systems/runner/types.ts` | 305 | InputEvent union, UpdateContext, FrameData |
| `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` | ~750 | convertFrameInputEvents, rule evaluation |
| `app/lib/game-engine/systems/runner/wrappers/InputRuntimeSystem.ts` | 78 | Converts input state → frame events |
| `app/lib/game-engine/BehaviorContext.ts` | 113 | InputState, InputEvents, GameState |
| `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` | 105 | Debug bridge for MCP |
| `app/lib/game-engine/debug/types.ts` | 117 | TimeControl, TimeMode, StepResult |
| `app/lib/godot/GodotBridge.web.ts` | ~1250 | Web bridge TS→Godot |
| `godot_project/scripts/GameBridge.gd` | ~300 | Main Godot bridge |
| `godot_project/scripts/bridge/EventEmitter.gd` | 177 | Godot→JS callbacks |
| `godot_project/scripts/bridge/EventQueue.gd` | 23 | Godot-side event queue |
| `godot_project/scripts/input/InputRouter.gd` | 169 | Godot input processing |
| `packages/game-inspector-mcp/src/tools/interaction.ts` | 455 | simulate_input MCP tool |
