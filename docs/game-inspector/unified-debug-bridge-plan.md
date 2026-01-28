# Unified Debug Bridge Implementation Plan

> **Goal**: Create a unified debugging interface for the Slopcade game engine that abstracts away React vs Godot implementation details, enabling both local MCP-based development tooling and future in-app agent-assisted debugging.

## Problem Statement

### Current Architecture Issue

The game engine has a split brain:

```
┌─────────────────────────────────────────────────────────┐
│                    React (GameRuntime)                   │
│  - setInterval game loop (runs independently)            │
│  - Rules evaluation (game logic)                         │
│  - Game state (score, lives, win/lose, variables)       │
│  - Input processing                                      │
│  - Behaviors execution                                   │
└─────────────────────────┬───────────────────────────────┘
                          │ bridge calls (one-way)
┌─────────────────────────▼───────────────────────────────┐
│                    Godot (WASM)                          │
│  - Physics simulation                                    │
│  - Rendering                                             │
│  - Entity transforms                                     │
│  - GodotDebugBridge (what MCP currently attaches to)    │
└─────────────────────────────────────────────────────────┘
```

**The MCP game-inspector only talks to Godot**, but critical game logic lives in React:
- When MCP calls `step(300)`, Godot physics advances 300 frames
- But React's `setInterval` game loop never fires during this batch step
- Rules never evaluate, game state never changes, behaviors don't run
- Result: Physics moves entities but game doesn't actually "play"

### What We Fixed So Far (This Session)

1. **Loading screen stuck in debug mode**: Added `window.slopcadeGameReady` flag that React sets when fully initialized. MCP now waits for this before pausing.

2. **Removed autostart parameter**: Consolidated to single `debug=true` URL param.

3. **Debug mode auto-starts game**: When `debugMode=true`, game goes straight to "playing" state (skipping Play button) but physics remains paused.

4. **Screenshots capture game canvas only**: All screenshot functions now use centralized utility that captures just the Godot iframe, not full page.

### Remaining Problem

Stepping frames via MCP only advances Godot physics. React rules don't evaluate because:
- React's game loop is a `setInterval` that runs independently
- When MCP calls Godot's `step()`, JavaScript is blocked
- React's interval callbacks don't fire during Godot's batch processing

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│           MCP / In-App Agent / Any Consumer              │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              SlopcadeDebugBridge (unified)               │
│  window.SlopcadeDebugBridge                              │
│  - Exposes clean API for ALL debugging operations       │
│  - Coordinates React and Godot internally               │
│  - Single source of truth for debug tooling             │
└──────────┬─────────────────────────────┬────────────────┘
           │                             │
┌──────────▼──────────┐      ┌──────────▼──────────┐
│   React GameRuntime  │      │   GodotDebugBridge  │
│   (rules, state)     │      │   (physics, render) │
└─────────────────────┘      └─────────────────────┘
```

## Design Decisions

### 1. React Drives Time

React becomes the single orchestrator of frame advancement:

```typescript
// Current (broken for MCP):
// - React: setInterval → stepGame(dt)
// - Godot: independent physics loop
// - MCP calls Godot.step() → React never knows

// New (unified):
// - React: stepGame(dt) is the ONLY way frames advance
// - stepGame calls: rules.tick(dt) → godot.stepPhysics(dt) → sync transforms
// - MCP calls SlopcadeDebugBridge.step() → which calls React's stepGame()
```

**When paused**: 
- React's automatic interval is disabled
- Frames ONLY advance when `SlopcadeDebugBridge.step(n)` is called
- Each step calls `stepGame(fixedDt)` once, which advances both rules AND physics

### 2. SlopcadeDebugBridge Lives in React

- Created by `GameRuntime` after setup completes
- Has direct access to React's game state, rules evaluator, entity manager
- Has reference to GodotBridge for physics/entity operations
- Exposed on `window.SlopcadeDebugBridge`
- Cleaned up when game unmounts

### 3. MCP Uses Unified Bridge

- MCP tools call `window.SlopcadeDebugBridge.*` 
- GodotDebugBridge remains for low-level Godot-specific operations if needed
- MCP waits for `SlopcadeDebugBridge` to be ready (not just GodotDebugBridge)

### 4. Works for In-App Agent Too

The same `window.SlopcadeDebugBridge` API that MCP uses can be called by:
- An in-app debugging agent
- A voice-controlled assistant ("debug why the ball isn't moving")
- Any future tooling

## SlopcadeDebugBridge API Specification

### Lifecycle

```typescript
interface SlopcadeDebugBridge {
  // Ready state
  readonly ready: boolean;
  readonly gameId: string;
  
  // Reset/restart
  reset(): Promise<void>;
}
```

### Time Control

```typescript
interface SlopcadeDebugBridge {
  // Pause/resume
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  
  // Frame stepping (advances BOTH physics AND rules)
  step(frames?: number): void;  // default 1
  
  // Time scale (for slow-mo effects)
  setTimeScale(scale: number): void;
  readonly timeScale: number;
  
  // Frame info
  readonly frame: number;
  readonly elapsed: number;  // seconds
}
```

### Game State

```typescript
interface SlopcadeDebugBridge {
  // High-level game state
  readonly gameState: 'loading' | 'ready' | 'playing' | 'paused' | 'won' | 'lost';
  readonly score: number;
  readonly lives: number;
  readonly variables: Record<string, unknown>;
  
  // Full snapshot (entities + state + metadata)
  getSnapshot(options?: { detail?: 'low' | 'med' | 'high' }): GameSnapshot;
}
```

### Entity Operations

```typescript
interface SlopcadeDebugBridge {
  // Query
  getEntities(): EntityInfo[];
  getEntity(id: string): EntityInfo | null;
  query(selector: string): EntityInfo[];  // CSS-like: '.tag', '#id', 'template'
  
  // Spatial queries
  getEntitiesAtPoint(x: number, y: number): EntityInfo[];
  getEntitiesInRect(minX: number, minY: number, maxX: number, maxY: number): EntityInfo[];
  
  // Mutation
  spawn(template: string, position: {x: number, y: number}, options?: SpawnOptions): string;
  destroy(entityId: string): void;
  
  // Transform
  setPosition(entityId: string, x: number, y: number): void;
  setVelocity(entityId: string, vx: number, vy: number): void;
  setRotation(entityId: string, angle: number): void;
  
  // Properties
  getProps(entityId: string, paths: string[]): Record<string, unknown>;
  setProps(entityId: string, values: Record<string, unknown>): void;
}
```

### Input Simulation

```typescript
interface SlopcadeDebugBridge {
  // All input goes through React's normal input path
  simulateInput(input: InputEvent): void;
}

type InputEvent = 
  | { type: 'tap', x: number, y: number }
  | { type: 'drag_start', x: number, y: number, entityId?: string }
  | { type: 'drag_move', x: number, y: number }
  | { type: 'drag_end', x: number, y: number, velocity?: {x: number, y: number} }
  | { type: 'key_down', key: string }
  | { type: 'key_up', key: string };
```

### Rules Inspection (New!)

```typescript
interface SlopcadeDebugBridge {
  // Rules state
  getRules(): RuleInfo[];
  getRuleState(ruleId: string): RuleState;
  
  // What rules fired recently
  getRecentlyTriggeredRules(sinceFr: number): TriggeredRule[];
  
  // Breakpoints (pause when condition met)
  addBreakpoint(condition: BreakpointCondition): string;
  removeBreakpoint(breakpointId: string): void;
  getBreakpoints(): Breakpoint[];
}

interface RuleInfo {
  id: string;
  name: string;
  trigger: unknown;
  conditions: unknown[];
  actions: unknown[];
  enabled: boolean;
}

interface RuleState {
  id: string;
  lastTriggered: number | null;  // frame number
  triggerCount: number;
  cooldownRemaining: number;
  firedOnce: boolean;
}
```

### Event Log

```typescript
interface SlopcadeDebugBridge {
  // Subscribe to events
  subscribe(eventType: EventType, callback: (event: GameEvent) => void): () => void;
  
  // Get historical events
  getEventLog(options?: { since?: number, types?: EventType[], limit?: number }): GameEvent[];
  
  // Clear log
  clearEventLog(): void;
}

type EventType = 
  | 'collision'
  | 'spawn'
  | 'destroy'
  | 'rule_triggered'
  | 'state_change'
  | 'score_change'
  | 'variable_change';

interface GameEvent {
  type: EventType;
  frame: number;
  timestamp: number;
  data: unknown;
}
```

### Screenshots

```typescript
interface SlopcadeDebugBridge {
  // Capture current frame
  screenshot(): Promise<string>;  // base64 PNG
  
  // Capture to file (if available)
  screenshotToFile(path: string): Promise<void>;
}
```

## Implementation Plan

### Phase 1: Create SlopcadeDebugBridge Foundation

**Files to create:**
- `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` - Main class
- `app/lib/game-engine/debug/types.ts` - TypeScript interfaces
- `app/lib/game-engine/debug/index.ts` - Exports

**Tasks:**
1. Define all TypeScript interfaces
2. Create `SlopcadeDebugBridge` class with constructor taking:
   - `gameRef` (LoadedGame)
   - `bridgeRef` (GodotBridge)
   - `rulesEvaluatorRef`
   - `entityManagerRef`
   - `gameStateRef`
3. Implement basic lifecycle methods
4. Expose on `window.SlopcadeDebugBridge` when created

### Phase 2: Refactor Time Control

**Current problem:** React's `setInterval` and Godot's physics run independently.

**Changes to `GameRuntime.godot.tsx`:**

1. Remove automatic `setInterval` game loop when in debug mode
2. Create `manualStep(frames: number)` function that:
   ```typescript
   for (let i = 0; i < frames; i++) {
     stepGame(FIXED_DT);  // This evaluates rules AND syncs with Godot
   }
   ```
3. Wire `SlopcadeDebugBridge.step()` to call `manualStep()`

**Key insight:** `stepGame(dt)` already does everything:
- Syncs transforms from physics
- Evaluates rules
- Updates game state
- Advances elapsed time

We just need to call it manually instead of via setInterval.

### Phase 3: Implement Core Bridge Methods

**Time Control:**
- `pause()` - Sets paused flag, stops auto-advance
- `resume()` - Clears paused flag, restarts auto-advance (if not debug mode)
- `step(n)` - Calls `manualStep(n)`
- `setTimeScale(s)` - Updates timeScaleRef

**State Query:**
- `getSnapshot()` - Combines React game state with Godot entity snapshot
- `getGameState()` - Returns current state string
- Getters for score, lives, variables

**Entity Operations:**
- Most can delegate to existing GodotBridge methods
- Add React-side entity info (behaviors, tags from definition)

### Phase 4: Update MCP to Use Unified Bridge

**Changes to `packages/game-inspector-mcp/`:**

1. Update `waitForGameReady()` to check for `window.SlopcadeDebugBridge`
2. Update all tools to call `SlopcadeDebugBridge.*` instead of `GodotDebugBridge.*`
3. Remove direct Godot calls where possible

**Mapping:**
| Old (GodotDebugBridge) | New (SlopcadeDebugBridge) |
|------------------------|---------------------------|
| `pause()` | `pause()` |
| `resume()` | `resume()` |
| `step(n)` | `step(n)` - now includes rules! |
| `getSnapshot()` | `getSnapshot()` - now includes game state! |
| `queryPoint()` | `getEntitiesAtPoint()` |
| etc. | etc. |

### Phase 5: Add Rules Inspection

**New capability:** See which rules fired, why, and when.

1. Add event logging to `RulesEvaluator`:
   - Log when rule triggers
   - Log when conditions pass/fail
   - Log when actions execute

2. Expose via `SlopcadeDebugBridge`:
   - `getRules()` - all rules with current state
   - `getRecentlyTriggeredRules()` - what fired since frame N
   - `getRuleState(id)` - cooldowns, trigger count, etc.

### Phase 6: Event Logging System

1. Create `GameEventLog` class that captures:
   - Collisions
   - Spawns/destroys
   - Rule triggers
   - State changes
   - Score changes
   - Variable changes

2. Ring buffer with configurable size (last N events)
3. Subscribe/unsubscribe pattern for real-time monitoring
4. Query interface for historical events

## File Structure

```
app/lib/game-engine/debug/
├── index.ts                    # Exports
├── types.ts                    # All TypeScript interfaces
├── SlopcadeDebugBridge.ts      # Main unified bridge class
├── GameEventLog.ts             # Event logging system
└── RulesInspector.ts           # Rules debugging utilities

packages/game-inspector-mcp/
├── src/
│   ├── utils.ts                # Update waitForGameReady
│   ├── tools/
│   │   ├── game-management.ts  # Use SlopcadeDebugBridge
│   │   ├── time-control.ts     # Use SlopcadeDebugBridge
│   │   ├── snapshot.ts         # Use SlopcadeDebugBridge
│   │   └── ...
```

## Migration Strategy

1. **Phase 1-2**: Create bridge, refactor time - MCP still works (maybe with issues)
2. **Phase 3**: Implement core methods - MCP works better
3. **Phase 4**: Update MCP - Everything works correctly
4. **Phase 5-6**: Add advanced features - Enhanced debugging

## Testing Strategy

After each phase:
1. Open flappyBird with game-inspector
2. Verify game loads and pauses correctly
3. Step through frames - verify bird falls AND rules evaluate
4. Simulate tap - verify bird flaps
5. Step more - verify pipes spawn (timer rules)
6. Verify score increases when passing pipes

## Success Criteria

1. **Basic**: `step(300)` advances 5 seconds of gameplay, bird falls, pipes spawn, scoring works
2. **Input**: `simulateInput({type: 'tap'})` makes bird flap
3. **State**: `getSnapshot()` returns complete game state including score, lives, rules state
4. **Rules**: Can see which rules fired and why
5. **Events**: Can see collision/spawn/destroy events

## Future Vision

Once this unified bridge exists:

1. **In-app agent debugging**: User says "the ball isn't moving, debug it"
   - Agent calls `SlopcadeDebugBridge.getSnapshot()`
   - Sees ball has zero velocity
   - Calls `step(1)` and checks again
   - Determines gravity isn't applying
   - Checks entity physics config
   - Suggests fix

2. **Visual debugging UI**: Overlay that shows:
   - Rules firing in real-time
   - Entity inspection on hover
   - Event timeline
   - Breakpoints

3. **Record/replay**: Capture all inputs and random seeds, replay exactly

4. **Time travel**: Snapshot state, step forward, restore to previous state

## Appendix: Current Code References

### Key Files

- `app/lib/game-engine/GameRuntime.godot.tsx` - Main game runtime (~2000 lines)
  - `stepGame` callback (line ~803) - The function that ticks the game
  - Game loop effect (line ~1113) - The `setInterval` that needs refactoring
  - `handleStart` (line ~1431) - Starts game, resumes physics

- `app/lib/game-engine/RulesEvaluator.ts` - Rules evaluation (~1000 lines)
  - `tick()` method - Evaluates all rules for a frame
  - `start()` - Transitions to playing state

- `app/lib/godot/GodotBridge.web.ts` - Godot communication
  - Current bridge that MCP talks to

- `packages/game-inspector-mcp/src/` - MCP server
  - `utils.ts` - `waitForDebugBridge`, `waitForGameReady`
  - `tools/game-management.ts` - `open` tool
  - `tools/time-control.ts` - `step`, `pause`, `resume`

### Important State

```typescript
// In GameRuntime
gameState.state: 'loading' | 'ready' | 'playing' | 'paused' | 'won' | 'lost'
isReady: boolean  // true after setup() completes
godotReady: boolean  // true when Godot iframe loaded
debugMode: boolean  // from URL param

// Refs
bridgeRef: GodotBridge
gameRef: LoadedGame  // contains rulesEvaluator, entityManager
physicsRef: Physics2D
```

### Window Globals (Current)

```typescript
window.GodotDebugBridge  // Godot-side debug interface
window.slopcadeGameReady  // boolean flag we added this session
```

### Window Globals (After Implementation)

```typescript
window.SlopcadeDebugBridge  // Unified debug interface (NEW)
window.GodotDebugBridge     // Keep for low-level access if needed
window.slopcadeGameReady    // Can be removed, check SlopcadeDebugBridge.ready instead
```
