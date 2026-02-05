# Game Engine Architecture Reference

> Generated: 2026-02-05. Single source of truth for event system, entity lifecycle, Godot bridge communication, logging, and inspector integration.

## 1. Architecture Overview

### High-Level Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TypeScript (React)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ GameRuntime  │  │EntityManager │  │  GameEvent   │  │  SlopcadeDebug   │ │
│  │  (orchestrator)│  │(entity state)│  │    Queue     │  │     Bridge       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                  │                   │          │
│         └─────────────────┴──────────────────┴───────────────────┘          │
│                                   │                                         │
│                         GodotBridge (commands)                              │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Godot (GDScript)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ GameBridge   │  │PhysicsServer │  │  SceneTree   │  │  RenderingServer │ │
│  │ (singleton)  │  │  (Rapier)    │  │ (visuals)    │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ownership Boundaries

| System | TypeScript Owns | Godot Owns | Sync Mechanism |
|--------|-----------------|------------|----------------|
| Entity State | Runtime properties, tags, behaviors | Scene node tree | Bridge callbacks |
| Physics | Body parameters, collision filters | Simulation, transforms | `syncTransformsFromPhysics()` every frame |
| Visuals | Image URLs, visibility, opacity | Sprite rendering, shaders | Bridge commands |
| Input | Event queue, button state | Touch/mouse detection | Bridge callbacks |
| Audio | Sound triggers | Playback, mixing | Bridge commands |

### Game Loop Flow

```
1. GameLoopController triggers stepGame() at 60fps (16ms intervals)
2. Drain eventQueue (lifecycle/input/collision events)
3. Build UpdateContext with frame data
4. Run systems in phase order:
   - PRE_UPDATE: Viewport, PropertySync, EntityManager, Input, ComputedValues
   - GAME_LOGIC: BehaviorExecutor, ScriptSandbox, Rules
   - POST_UPDATE: Tween, TargetPosition, Camera
5. Sync transforms from physics (Godot→TS)
6. Increment frame counters
```

## 2. Event System (GameEventQueue)

### 2.1 Unified Event Queue

**Location:** `app/lib/game-engine/GameEventQueue.ts`

The `GameEventQueue` class (line 161-207) provides O(1) push/drain operations using array swap:

```typescript
export class GameEventQueue {
  private queue: GameEvent[] = [];
  
  push(event: GameEvent): void {
    this.queue.push(event);
    this.onEventQueued?.();  // Triggers auto-step in inspect mode
  }
  
  drain(): GameEvent[] {
    const events = this.queue;
    this.queue = [];  // O(1) swap, no copying
    return events;
  }
}
```

**GameEvent Union Type** (lines 97-112):
```typescript
export type GameEvent =
  | GameLoadedEvent | GameStartedEvent      // Lifecycle
  | TapEvent | DragStartEvent | DragEndEvent | MouseMoveEvent | MouseLeaveEvent | ButtonPressedEvent | ButtonReleasedEvent  // Input
  | CollisionEvent | SensorBeginEvent | SensorEndEvent;  // Physics
```

**Type Guards** (lines 117-148):
- `isLifecycleEvent(event)` — returns true for `game_loaded`, `game_started`
- `isInputEvent(event)` — returns true for tap, drag, mouse, button events
- `isPhysicsEvent(event)` — returns true for collision, sensor events

### 2.2 Event Producers

| Event Type | Producer | File:Line | Notes |
|------------|----------|-----------|-------|
| `game_loaded` | GameRuntime setup | `GameRuntime.godot.tsx:845` | After all systems initialized |
| `game_started` | handleStart() | `GameRuntime.godot.tsx:997` | When player presses Play |
| `tap` | Bridge onInputEvent | `GameRuntime.godot.tsx:273` | From Godot touch/mouse |
| `tap` | Web mouse click | `GameRuntime.godot.tsx:1427` | Screen→world conversion |
| `drag_start` | useGameInput hook | `InputRuntimeSystem` | Touch drag begin |
| `drag_end` | useGameInput hook | `InputRuntimeSystem` | Touch drag release |
| `mouse_move` | Bridge onInputEvent | `GameRuntime.godot.tsx:281` | Continuous mouse tracking |
| `button_pressed` | Keyboard handler | `GameRuntime.godot.tsx:1282` | Arrow keys, WASD, space |
| `button_released` | Keyboard handler | `GameRuntime.godot.tsx:1328` | Key up events |
| `collision` | Physics callback | `GameRuntime.godot.tsx:256` | From physics.onCollision |
| `sensor_begin` | Physics callback | (via bridge) | Sensor overlap start |
| `sensor_end` | Physics callback | (via bridge) | Sensor overlap end |

### 2.3 Event Consumers

**stepGame() drains the queue** (`GameRuntime.godot.tsx:949`):

```typescript
const frameEvents = eventQueueRef.current.drain();
const lifecycleEvents = frameEvents.filter(isLifecycleEvent);
const inputEvents = frameEvents.filter(isInputEvent);
const collisionEvents = frameEvents.filter(isPhysicsEvent);
```

Events flow into `UpdateContext.frame` (`systems/runner/types.ts:165-187`):

```typescript
const updateContext: UpdateContext = {
  dt, elapsed, frameId,
  input: inputRef.current as InputState,
  gameState: fullGameState,
  frame: {
    inputEvents: [...lifecycleEvents, ...inputEvents],
    collisions: frameCollisions,
  },
};
```

**RulesSystem.convertFrameInputEvents()** (`RulesSystem.ts:674-716`) converts unified events to legacy InputEvents format for rule evaluation.

**InputRuntimeSystem** also pushes input events to the queue during its PRE_UPDATE phase.

### 2.4 Continuous vs Discrete State

**Continuous State (inputRef)** — polled every frame:
- Button held states (`buttons.left`, `buttons.right`, etc.)
- Drag current position (`drag.currentWorldX/Y`)
- Mouse position (`mouse.worldX/Y`)
- Joystick values (`joystick.x`, `joystick.y`)
- Tilt values (`tilt.x`, `tilt.y`)

**Discrete Events (eventQueue)** — pushed once, drained next frame:
- Tap events
- Drag start/end
- Button press/release transitions
- Collisions
- Lifecycle events (game_loaded, game_started)

**Why the split:** Continuous state represents "current condition" (is button held?), while discrete events represent "thing that happened" (button was pressed). Rules check continuous state; triggers fire on discrete events.

## 3. Entity Lifecycle

### 3.1 Entity Creation

**Path A: Game Load** (`GameLoader.ts:43`)
```
GameLoader.load() → EntityManager.createEntity(definition)
```
- Creates RuntimeEntity with template resolution
- Calls `initializePhysicsEntity()` if physics component exists
- Returns entity immediately (no Godot callback needed for initial load)

**Path B: Rule Spawn** (`SpawnActionExecutor.ts:58-69`)
```
Rule trigger fires → SpawnActionExecutor.execute()
  → bridge.spawnEntity(templateId, x, y, velocity)
    → Godot creates node
      → bridge.onEntitySpawned callback
        → EntityManager.handleEntitySpawned(snapshot)
```
- Godot-authoritative: entity created in Godot first
- TS entity created from callback snapshot
- Generation tracking for consistency

**Path C: Script Spawn** (`RunScriptActionExecutor.ts:84-104`)
```
Script calls entityManager.spawnEntity()
  → EntityManager.createEntity() immediately
    → Deferred bridge.spawnEntity() after script returns
```
- TS-optimistic: entity created in TS immediately
- Godot spawn deferred to avoid reentrancy
- Allows scripts to reference entity ID immediately

### 3.2 Entity Destruction

**All entities:** `EntityManager.destroyEntityInternal()` (`EntityManager.ts:398-420`)
```typescript
private destroyEntityInternal(id: string): void {
  const entity = this.entities.get(id);
  if (!entity) return;

  // Always destroy in Godot first (for ALL entity types)
  if (this.bridge) {
    this.bridge.destroyEntity(entity.id);
  }

  // Physics cleanup only for entities with physics components
  if (entity.physics) {
    this.physics.destroyBody(entity.id);
  }
  // ... tag cleanup, pooling
}
```

**Godot-initiated destruction:**
- Bridge callback → `EntityManager.handleEntityDestroyed()` (`EntityManager.ts:184-194`)
- Cancels tweens for entity (`cancelTweensForEntity`)
- Removes from entity map and tag indexes

### 3.3 Transform Sync

**Godot→TS** (`EntityManager.ts:576-593`):
```typescript
syncTransformsFromPhysics(): void {
  this.entities.forEach((entity) => {
    if (entity.physics && entity.active) {
      this.syncEntityTransformFromPhysics(entity);
      // ... hierarchy handling
    }
  });
}
```

Runs every frame in `EntityManagerRuntimeSystem` (PRE_UPDATE phase).

**TS→Godot** — explicit bridge calls:
- `RunScriptActionExecutor.setEntityPosition()` line 117: `bridge.setPosition(entityId, x, y)`
- `ScriptSandboxRuntimeSystem.setEntityPosition()` line 303: same
- Both update TS transform AND call bridge

## 4. Godot Bridge Communication

### 4.1 Communication Patterns

| Pattern | Direction | Example | Async? |
|---------|-----------|---------|--------|
| Command | TS→Godot | `bridge.spawnEntity()` | No (fire-and-forget) |
| Query | TS→Godot | `bridge.queryPointEntity()` | Yes (Promise) |
| Callback | Godot→TS | `bridge.onEntitySpawned()` | N/A (subscription) |
| Lifecycle | TS→TS | `eventQueue.push()` | N/A (internal) |
| Input State | TS polls | `inputRef.current.buttons` | N/A (continuous) |

### 4.2 Bridge Callbacks

Registered in `GameRuntime.setupSubscriptions()` (`GameRuntime.godot.tsx:201-328`):

| Callback | Registration | Handler | Purpose |
|----------|--------------|---------|---------|
| `onEntitySpawned` | line 227 | `EntityManager.handleEntitySpawned` | Godot entity created |
| `onEntityDestroyed` | line 232 | `EntityManager.handleEntityDestroyed` | Godot entity removed |
| `onCollision` | line 238 | Physics callback → eventQueue | Collision events |
| `onInputEvent` | line 267 | Bridge tap/mouse → eventQueue | Input events |
| `onSensorBegin/End` | (via physics) | Physics callback | Sensor overlap |

### 4.3 Key Bridge Methods

**Entity Management:**
- `spawnEntity(template, x, y, velocity?)` → returns entityId
- `destroyEntity(entityId)`
- `setPosition(entityId, x, y)`
- `setRotation(entityId, angle)`
- `setEntityImage(entityId, url, width, height)`
- `setEntityVisible(entityId, visible)`

**Physics:**
- `applyImpulse(entityId, impulse)`
- `setLinearVelocity(entityId, velocity)`
- `setAngularVelocity(entityId, velocity)`
- `setGravityScale(entityId, scale)`
- `setBullet(entityId, isBullet)`

**Visuals:**
- `setEntityOpacity(entityId, opacity)`
- `applySpriteEffect(entityId, effect, params)`
- `clearSpriteEffect(entityId)`
- `setEntityColor(entityId, r, g, b, a)`

**Joints:**
- `createRevoluteJoint(params)`
- `createDistanceJoint(params)`
- `createWeldJoint(params)`
- `destroyJoint(jointId)`

**Effects:**
- `playSound(soundId, volume?)`
- `createParticleEmitter(type, x, y)`
- `stopEmitter(emitterId)`

## 5. Game Loading Flow

10 phases from routing to `game_loaded` event:

| Phase | File:Line | Action |
|-------|-----------|--------|
| 1 | Route render | `<GameRuntimeGodot definition={...} />` mounted |
| 2 | `GameRuntime.godot.tsx:506` | GodotView ready callback fires |
| 3 | `GameRuntime.godot.tsx:528` | Bridge created and initialized |
| 4 | `GameRuntime.godot.tsx:536` | Textures preloaded (if any) |
| 5 | `GameRuntime.godot.tsx:552` | `bridge.loadGame(definition)` |
| 6 | `GameRuntime.godot.tsx:595` | GameLoader loads entities |
| 7 | `GameRuntime.godot.tsx:673` | GameSystemRunner initialized |
| 8 | `GameRuntime.godot.tsx:786` | Subscriptions set up |
| 9 | `GameRuntime.godot.tsx:662` | `setIsReady(true)` |
| 10 | `GameRuntime.godot.tsx:845` | `game_loaded` event pushed |

## 6. Game Loop & Frame Execution

### 6.1 The Game Loop

**GameLoopController** (`GameLoopController.ts`):
- `setInterval` at 16ms (60fps)
- Calls `stepGame(FIXED_DT)` where `FIXED_DT = 1/60`
- Supports time scaling for slow-motion

**stepGame()** (`GameRuntime.godot.tsx:905-1006`):
1. Check refs exist (physics, game, camera, bridge)
2. Check game state is "playing"
3. Build full game state from runtime
4. Drain event queue
5. Build `UpdateContext`
6. Call `runner.update(updateContext)`
7. Update elapsed time and frame counters

### 6.2 System Phases

Systems execute in phase order, priority within phase:

**PRE_UPDATE** (prepare frame):
- `viewport` — update viewport calculations
- `property-sync` — sync watched properties
- `entity-manager` — sync transforms from physics
- `input` — process input state, push events
- `computed-values` — update computed variables

**GAME_LOGIC** (main logic):
- `behavior-executor` — run entity behaviors
- `script-sandbox` — execute script code
- `rules` — evaluate rules (priority 50)
- `match3` — match-3 game logic
- `container` — container system updates

**POST_UPDATE** (visual/animation):
- `tween` — update tween animations
- `target-position` — smooth movement
- `camera` — update camera position

## 7. Logging System

### 7.1 Logger Configuration

**Location:** `app/lib/game-engine/debug/Logger.ts`

**LogLevel enum** (lines 8-15):
```typescript
export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}
```

**LogCategory type** (lines 17-28):
```typescript
export type LogCategory =
  | 'lifecycle' | 'input' | 'physics' | 'rules' | 'entities'
  | 'bridge' | 'assets' | 'render' | 'state' | 'loop' | 'inspector';
```

**Default:** `LogLevel.WARN` (line 42)

### 7.2 Usage Patterns

```typescript
import { logger } from './debug/Logger';

logger.error('physics', 'Body not found:', entityId);
logger.warn('rules', 'Unknown condition type:', condition.type);
logger.info('lifecycle', 'Game loaded:', gameId);
logger.debug('input', 'Tap at:', x, y);
logger.trace('loop', 'Frame', frameId, 'complete');
```

**Output format:** `[category:level] message`

**Runtime control** via `window.__GAME_RUNTIME__.logger`:
```typescript
window.__GAME_RUNTIME__.logger.configure({
  level: LogLevel.DEBUG,
  categories: { rules: LogLevel.TRACE }
});
```

### 7.3 MCP Tools

**set_log_level** (`packages/game-inspector-mcp/src/tools/logging.ts:22-93`):
- Set global level: `{ level: "debug" }`
- Set per-category: `{ level: "trace", category: "rules" }`

**get_log_config** (`packages/game-inspector-mcp/src/tools/logging.ts:95-137`):
- Returns current global level and all category overrides

## 8. Inspector & Debug Bridge

### 8.1 SlopcadeDebugBridge

**Location:** `app/lib/game-engine/debug/SlopcadeDebugBridge.ts`

Wraps runtime API to provide:
- `pause()` — pause game loop
- `resume()` — resume game loop
- `step(frames)` — advance N frames
- `setTimeScale(scale)` — slow-motion/fast-forward
- `getTimeState()` — current time control state
- `getSnapshot()` — full game state snapshot

**TimeControl** (`debug/types.ts:30-34`):
```typescript
export interface TimeControl {
  mode: TimeMode;      // "normal" | "inspect"
  paused: boolean;
  pendingSteps: number;
}
```

### 8.2 Auto-Step

**Wired at** `GameRuntime.godot.tsx:1166`:

```typescript
eventQueueRef.current.setOnEventQueued(() => {
  const tc = timeControlRef.current;
  if (tc.mode !== 'inspect' || !tc.paused) return;
  if (isSteppingRef.current) return;
  
  const now = performance.now();
  if (now - lastAutoStepTimeRef.current < AUTO_STEP_RATE_LIMIT_MS) return;
  
  if (!autoStepTimerRef.current) {
    autoStepTimerRef.current = setTimeout(() => {
      autoStepTimerRef.current = null;
      lastAutoStepTimeRef.current = performance.now();
      manualStep(1);
    }, 0);
  }
});
```

- Rate limited to 60/sec (16.67ms)
- Debounced via `setTimeout(0)`
- Guarded by `isSteppingRef` to prevent overlap

### 8.3 MCP Tools

**simulate_input** (`packages/game-inspector-mcp/src/tools/interaction.ts:12-323`):
- Types: `tap`, `mouse_move`, `mouse_leave`, `drag_start`, `drag_move`, `drag_end`, `key_down`, `key_up`
- Sends through `__GAME_RUNTIME__.setInput()`
- Auto-captures screenshot after input

**step** — advances N frames via `SlopcadeDebugBridge.step()`

**game_state** — returns entity positions, velocities, tags

**game_screenshot** — captures current frame

## 9. Key File Reference

| File | Role |
|------|------|
| `GameRuntime.godot.tsx` | Main orchestrator, bridge setup, game loop |
| `GameEventQueue.ts` | Unified event queue implementation |
| `EntityManager.ts` | Entity lifecycle, tag management, transform sync |
| `GameLoader.ts` | Initial game loading from definition |
| `GameLoopController.ts` | 60fps interval management |
| `SlopcadeDebugBridge.ts` | Inspector bridge wrapper |
| `debug/Logger.ts` | Configurable logging system |
| `debug/types.ts` | TimeControl, TimeMode types |
| `systems/runner/types.ts` | RuntimeSystem, UpdateContext, SystemContext |
| `systems/runner/wrappers/RulesSystem.ts` | Rules evaluation engine |
| `rules/actions/SpawnActionExecutor.ts` | Rule-based entity spawning |
| `rules/actions/RunScriptActionExecutor.ts` | Script execution with deferred spawn |
| `BehaviorContext.ts` | InputState, InputEvents, GameState types |
| `packages/game-inspector-mcp/src/tools/interaction.ts` | MCP input simulation |
| `packages/game-inspector-mcp/src/tools/logging.ts` | MCP logging control |

## 10. Known Limitations & Future Work

| Limitation | Location | Notes |
|------------|----------|-------|
| Two spawn patterns | `SpawnActionExecutor`, `RunScriptActionExecutor` | Godot-authoritative vs TS-optimistic — intentional for different use cases |
| No error handling on bridge commands | All bridge calls | Fire-and-forget; failures logged but not propagated |
| Two transform caches | `EntityManager`, physics adapter | Both synced each frame; could be unified |
| Godot-side event queue | `GameBridge.gd` | `_queue_event` still exists but unused — cleanup pending |
| Auto-step rate limit | `GameRuntime.godot.tsx:1164` | Hardcoded 16.67ms; could be configurable |
| Input event duplication | Keyboard handlers | 20ms deduplication window may miss rapid events |

---

*This document is the single source of truth for game engine architecture. When modifying any system described here, update this document to maintain accuracy.*
