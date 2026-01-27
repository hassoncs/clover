# Game Inspector Skill

> **Trigger**: When debugging, testing, or verifying game behavior in Slopcade games.
>
> **Purpose**: Use the Game Inspector MCP to query game state, manipulate entities, control time, and verify behavior.

---

## When to Use This Skill

### Primary Use Cases

| User Request | Use Game Inspector |
|--------------|-------------------|
| "Test if the ball collides with pegs" | ✅ Yes |
| "Debug why the cannon isn't firing" | ✅ Yes |
| "Verify win condition triggers correctly" | ✅ Yes |
| "Check entity positions after spawn" | ✅ Yes |
| "Screenshot the game at specific state" | ✅ Yes |
| "Slow down physics to inspect behavior" | ✅ Yes |
| "Monitor spawn/destroy events" | ✅ Yes |

### Don't Use For

- Writing game code (use normal development)
- Modifying game definitions (edit JSON files directly)
- Production monitoring (this is dev/test only)

---

## Core Workflow Pattern

**ALWAYS follow this pattern:**

```typescript
// 1. List available games first
const available = game_inspector_list()

// 2. Open a game by its ID
game_inspector_open({name: "gameIdFromList"})

// 3. Query/inspect/manipulate
// ... use V2 APIs ...

// 4. Close when done
game_inspector_close()
```

**CRITICAL**: Always close the browser when finished to free resources.

---

## Input Simulation (NEW!)

### `simulate_input` - Unified Input System

**The most important tool for debugging input-related bugs.**

Simulates ANY type of user input through the exact same code path as real input. This ensures MCP tests perfectly match real user behavior.

**Supported Input Types**:

| Type | Parameters | Triggers |
|------|------------|----------|
| `tap` | worldX, worldY | Click/tap on entity or screen |
| `mouse_move` | worldX, worldY | **Hover** (triggers match3 hover, tooltips, etc) |
| `mouse_leave` | - | Clear hover state |
| `drag_start` | startWorldX/Y, targetEntityId | Begin drag gesture |
| `drag_move` | worldX, worldY | Update drag position |
| `drag_end` | velocity{x,y} | Release drag with velocity |
| `key_down` | key (left/right/up/down/jump/action) | Press keyboard button |
| `key_up` | key | Release keyboard button |

**Examples**:
```typescript
// Hover over grid cell at (0, 0)
simulate_input({type: 'mouse_move', worldX: 0, worldY: 0})

// Tap to select
simulate_input({type: 'tap', worldX: 0, worldY: 0})

// Keyboard control
simulate_input({type: 'key_down', key: 'right'})
simulate_input({type: 'key_up', key: 'right'})

// Drag gesture
simulate_input({type: 'drag_start', startWorldX: 0, startWorldY: 5, targetEntityId: 'ball'})
simulate_input({type: 'drag_move', worldX: 0, worldY: 3})
simulate_input({type: 'drag_end', velocity: {x: 0, y: -10}})
```

**Why this is powerful**:
- Goes through `inputRef` → exact same code path as real input
- If MCP test passes, real input will work
- Can test hover, keyboard, complex drag sequences
- Frame-perfect control with pause/step

---

## V2 API Categories (40+ Tools Total)

### 🔍 Query & Selection (CSS-like selectors)

**Primary Tool**: `game_inspector_query(selector, options)`

**Selector Types**:
```typescript
// ID selector (exact match)
query({selector: '#blue-peg-0'})
query({selector: '#my-custom-entity'})

// Tag selector (entities with tag)
query({selector: '.peg'})          // All pegs
query({selector: '.enemy'})        // All enemies
query({selector: '.blue-peg'})     // Specific tag

// Template selector (entities from template)
query({selector: 'bluePeg'})       // Template name
query({selector: '[template=bluePeg]'})  // Attribute syntax

// Attribute selectors
query({selector: '[name=cannon]'})
query({selector: '[physicsBody=dynamic]'})

// Combinators
query({selector: '.peg.blue-peg'})  // AND (has both tags)
query({selector: '.peg, .enemy'})   // OR (has either)
```

**Options**:
- `limit` - Max results (default: 100)
- `offset` - Pagination offset

**When to use**:
- Finding entities by ID: `#entity-id`
- Finding all of a type: `.tag` or `template`
- Filtering entities: `[attribute=value]`

---

### 📊 Properties API (4 tools)

**Get specific properties**:
```typescript
game_inspector_get_props({
  entityId: 'blue-peg-0',
  paths: ['transform.position', 'physics.velocity', 'render.visible']
})
// Returns: { values: { 'transform.position': {x, y}, 'physics.velocity': null, ... } }
```

**Get ALL properties**:
```typescript
game_inspector_get_all_props({entityId: 'blue-peg-0'})
// Returns complete entity state: transform, physics, render, tags, template
```

**Set properties**:
```typescript
game_inspector_set_props({
  entityId: 'blue-peg-0',
  values: {
    'transform.position.x': 5,
    'physics.velocity.y': -10,
    'render.visible': false
  }
})
```

**Batch operations**:
```typescript
game_inspector_patch_props({
  ops: [
    {op: 'increment', entityId: 'peg-1', path: 'transform.position.x', value: 0.5},
    {op: 'multiply', entityId: 'peg-2', path: 'physics.mass', value: 2},
    {op: 'set', entityId: 'peg-3', path: 'render.visible', value: false}
  ]
})
```

**Property Paths Reference**:
- `transform.position` / `.position.x` / `.position.y`
- `transform.rotation` / `.scale.x` / `.scale.y`
- `physics.velocity` / `.velocity.x` / `.velocity.y`
- `physics.angularVelocity`
- `physics.mass` / `.gravityScale` / `.bodyType`
- `render.visible` / `.zIndex` / `.opacity`
- `tags` (array)
- `template` (string)

---

### ⚡ Lifecycle API (4 tools)

**Spawn entities**:
```typescript
game_inspector_spawn({
  template: 'bluePeg',
  position: {x: 0, y: 5},
  id: 'my-custom-peg'  // Optional custom ID
})
// Returns: {ok: true, entityId: 'my-custom-peg'}
```

**Clone entities**:
```typescript
game_inspector_clone({
  entityId: 'blue-peg-0',
  position: {x: 1, y: 0},  // Offset from original
  id: 'cloned-peg',        // Optional custom ID
  deep: true               // Include children
})
```

**Destroy entities**:
```typescript
game_inspector_destroy({
  entityId: 'my-custom-peg',
  recursive: true  // Also destroy children
})
```

**Reparent**:
```typescript
game_inspector_reparent({
  entityId: 'ball',
  newParentId: 'GameRoot',  // or 'root' or another entity ID
  keepGlobalTransform: true  // Maintain world position
})
```

---

### ⏱️ Time Control API (6 tools)

**Pause/Resume**:
```typescript
game_inspector_pause()   // Freeze physics
game_inspector_resume()  // Unfreeze physics
```

**Step-by-step**:
```typescript
game_inspector_pause()
game_inspector_step({frames: 1})  // Advance 1 frame
game_inspector_step({frames: 10}) // Advance 10 frames
```

**Time scaling**:
```typescript
game_inspector_set_time_scale({scale: 0.5})  // Slow motion
game_inspector_set_time_scale({scale: 2.0})  // Fast forward
game_inspector_set_time_scale({scale: 1.0})  // Normal speed
```

**Deterministic playback**:
```typescript
game_inspector_set_seed({
  seed: 12345,
  enableDeterministic: true
})
```

**Check state**:
```typescript
game_inspector_get_time_state()
// Returns: {paused, timeScale, frame, physicsTicksPerSecond, seed, ...}
```

---

### 📡 Events API (3 tools)

**Subscribe to events**:
```typescript
// Monitor all spawn events
game_inspector_subscribe({
  eventType: 'spawn',
  selector: '.peg'  // Optional filter
})
// Returns: {ok: true, subId: 'sub_1'}

// Monitor collisions
game_inspector_subscribe({
  eventType: 'collision'
})

// Monitor property changes
game_inspector_subscribe({
  eventType: 'propertyChange',
  properties: ['transform.position', 'physics.velocity']
})
```

**Poll for events**:
```typescript
game_inspector_poll_events({
  subscriptionId: 'sub_1',  // Optional - omit for all events
  limit: 100
})
// Returns: {events: [{type, data, frame, timestampMs}, ...]}
```

**Unsubscribe**:
```typescript
game_inspector_unsubscribe({subscriptionId: 'sub_1'})
```

---

### 🎯 Physics Queries API (6 tools)

**Raycast**:
```typescript
game_inspector_raycast({
  from: {x: 0, y: 8},
  to: {x: 0, y: -8},
  includeNormals: true
})
// Returns: {hits: [{entityId, point, normal, distance}, ...]}
```

**Find entities at point**:
```typescript
game_inspector_query_point({
  x: -4.8,
  y: 4.5,
  includeSensors: false
})
// Returns: {entities: [{entityId, shapeIndex}, ...]}
```

**Find entities in rectangle**:
```typescript
game_inspector_query_aabb({
  minX: -5, minY: 4,
  maxX: -4, maxY: 5,
  includeSensors: false
})
```

**Get collision shapes**:
```typescript
game_inspector_get_shapes({entityId: 'blue-peg-0'})
// Returns: {shapes: [{kind: 'circle', radius: 0.125, ...}, ...]}
```

**Get physics joints**:
```typescript
game_inspector_get_joints({entityId: 'cannon'})  // Entity's joints
game_inspector_get_joints()                      // All joints
```

**Get overlapping entities**:
```typescript
game_inspector_get_overlaps({entityId: 'ball'})
// Returns entities currently touching the ball
```

---

## Common Testing Patterns

### Pattern 1: Verify Entity Spawns Correctly

```typescript
// Spawn entity
const spawnResult = game_inspector_spawn({
  template: 'bluePeg',
  position: {x: 0, y: 5},
  id: 'test-peg'
});

// Verify it exists
const matches = game_inspector_query({selector: '#test-peg'});
// Assert: matches.count === 1

// Verify position
const props = game_inspector_get_all_props({entityId: 'test-peg'});
// Assert: props.transform.position.x === 0
// Assert: props.transform.position.y === 5
```

### Pattern 2: Test Physics Behavior

```typescript
// Pause physics
game_inspector_pause();

// Spawn ball with velocity
game_inspector_spawn({
  template: 'ball',
  id: 'test-ball',
  position: {x: 0, y: 5}
});

game_inspector_set_props({
  entityId: 'test-ball',
  values: {'physics.velocity.y': -10}
});

// Step physics frame-by-frame
game_inspector_step({frames: 60});  // 1 second at 60fps

// Check new position
const pos = game_inspector_get_props({
  entityId: 'test-ball',
  paths: ['transform.position']
});
// Ball should have moved due to velocity

game_inspector_resume();
```

### Pattern 3: Monitor Collisions

```typescript
// Subscribe to collision events
const sub = game_inspector_subscribe({
  eventType: 'collision',
  selector: '.peg'  // Only peg collisions
});

// Trigger gameplay
game_inspector_tap({x: 0, y: 7});  // Fire cannon

// Wait for collision
game_inspector_wait_collision({
  entityA: 'ball',
  entityB: 'blue-peg-0',
  timeout: 5000
});

// Get collision details from events
const events = game_inspector_poll_events({
  subscriptionId: sub.subId
});

// Clean up
game_inspector_unsubscribe({subscriptionId: sub.subId});
```

### Pattern 4: Visual Regression Testing

```typescript
// Set up specific game state
game_inspector_pause();
game_inspector_set_props({
  entityId: 'ball',
  values: {'transform.position': {x: 0, y: 3}}
});

// Capture screenshot
game_inspector_screenshot({
  filename: '/tmp/ball-at-position.png'
});

// Compare with reference image (external tool)
```

---

## Best Practices

### ✅ DO

- **Always close browser** - Call `game_close()` when done
- **Use CSS selectors** - More flexible than `game_find()`
- **Batch property changes** - Use `patch_props` for multiple entities
- **Pause for precision** - Pause physics for frame-accurate testing
- **Query before manipulate** - Verify entity exists before operating on it
- **Custom IDs for tests** - Use `idHint` parameter for predictable IDs

### ❌ DON'T

- **Don't leave browsers open** - Always clean up
- **Don't use legacy `game_find`** - Use `query` instead (more powerful)
- **Don't assume entity exists** - Check query results before accessing
- **Don't forget coordinate system** - Origin is center, Y+ is up
- **Don't modify production games** - This is dev/test only

---

## Troubleshooting

### Query Returns Empty

```typescript
// ❌ Wrong - entity doesn't exist or wrong selector
query({selector: '#nonexistent'})

// ✅ Fix - verify entity exists first
const all = game_snapshot({detail: 'low'});
// Check all.entities for your target entity
```

### Property Not Found

```typescript
// getProps returns null for missing properties (this is expected)
const props = get_props({
  entityId: 'static-peg',
  paths: ['physics.velocity']
});
// props.values['physics.velocity'] === null
// (Static bodies don't have velocity)
```

### Custom ID Not Working

```typescript
// ❌ Wrong parameter name
spawn({template: 'peg', id: 'test'})  // Ignored!

// ✅ Correct - use 'id' parameter in MCP tool
spawn({template: 'peg', id: 'test'})  // Works (MCP maps to idHint)
```

### Clone Position Wrong

```typescript
// ❌ Position is OFFSET, not absolute
clone({entityId: 'peg', position: {x: 5, y: 3}})
// If original at (0, 0), clone will be at (5, 3) ✅
// If original at (2, 1), clone will be at (7, 4) ⚠️

// ✅ For absolute positioning, calculate offset
const original = get_all_props({entityId: 'peg'});
const offset = {
  x: targetX - original.transform.position.x,
  y: targetY - original.transform.position.y
};
clone({entityId: 'peg', position: offset})
```

---

## API Reference Quick Lookup

### Query & Find (7 tools)

| Tool | Use Case |
|------|----------|
| `query` | CSS selectors (preferred) |
| `game_find` | Legacy template/tag/name filter |
| `game_entity` | Get single entity by ID |
| `game_at_point` | Legacy point query |
| `game_in_rect` | Legacy rect query |
| `game_count` | Count by template/tag |
| `game_snapshot` | Get all entities |

**Prefer**: `query` for new code (more powerful, CSS-like syntax)

---

### Properties (4 tools)

| Tool | Returns |
|------|---------|
| `get_props` | Specific paths (null if missing) |
| `get_all_props` | Complete entity state |
| `set_props` | Apply changes |
| `patch_props` | Batch operations (increment/multiply/etc) |

**Property Operations**:
- `set` - Assign value
- `increment` - Add to number
- `multiply` - Multiply number
- `append` - Add to array
- `remove` - Remove from array

---

### Lifecycle (4 tools)

| Tool | Purpose |
|------|---------|
| `spawn` | Create entity (supports custom ID) |
| `destroy` | Remove entity |
| `clone` | Duplicate entity (supports custom ID) |
| `reparent` | Move to new parent |

**Spawn/Clone ID Support**:
- Use `id` parameter in MCP tool
- Gets mapped to `idHint`/`newName` in Godot
- Enables predictable testing

---

### Time Control (6 tools)

| Tool | Effect |
|------|--------|
| `get_time_state` | Check paused/timeScale/frame |
| `pause` | Freeze physics |
| `resume` | Unfreeze physics |
| `step` | Advance N frames while paused |
| `set_time_scale` | Slow-mo (0.5) or fast-forward (2.0) |
| `set_seed` | Deterministic playback |

**Common workflow**:
```typescript
pause()              // Freeze
step({frames: 1})    // Advance 1 frame
get_time_state()     // Verify frame advanced
resume()             // Continue
```

---

### Events (3 tools)

| Tool | Purpose |
|------|---------|
| `subscribe` | Start monitoring events |
| `poll_events` | Get event stream |
| `unsubscribe` | Stop monitoring |

**Event Types**:
- `spawn` - Entity created
- `destroy` - Entity removed
- `collision` - Entities collided
- `propertyChange` - Property modified

---

### Physics (6 tools)

| Tool | Finds |
|------|-------|
| `raycast` | Entities along ray |
| `query_point` | Entities at exact position |
| `query_aabb` | Entities in rectangle |
| `get_shapes` | Collision shapes on entity |
| `get_joints` | Physics joints |
| `get_overlaps` | Entities touching entity |

---

### Interaction (4 tools)

| Tool | Purpose |
|------|---------|
| `game_tap` | Simulate tap at world coords |
| `game_drag` | Simulate drag gesture |
| `game_wait_stationary` | Wait until entity stops |
| `game_wait_collision` | Wait until collision occurs |

---

## Coordinate System

**Slopcade uses center-origin coordinates:**

```
      Y+
       ↑
       |
X- ←---+--→ X+
       |
       ↓
      Y-
```

- Origin (0, 0) = screen center
- X+ = right, X- = left
- Y+ = up, Y- = down

**World units**: Meters (1 unit = 1 meter)  
**Pixels per meter**: 50 (configurable in game definition)

**Example positions**:
- Center of screen: `{x: 0, y: 0}`
- Top-left: `{x: -6, y: 8}`  (for 12m wide, 16m tall game)
- Bottom-right: `{x: 6, y: -8}`

---

## Available Games

Use `game_inspector_list()` to get the current list of all available games and examples.

**Games are dynamically discovered** from the filesystem:
- Test games: `app/lib/test-games/games/*/game.ts`
- Lab examples: `app/app/examples/*.tsx`

**Workflow**:
1. Call `game_inspector_list()` to see all available games and examples
2. Use the exact game ID or path from the list to open a game
3. The list updates automatically when games are added or removed

---

## Examples by Use Case

### Debugging: Why isn't my entity spawning?

```typescript
// 1. Open game
game_inspector_game_open({name: 'myGame'});

// 2. Check if template exists
const snapshot = game_inspector_game_snapshot({detail: 'low'});
// Look for entities with your template

// 3. Try spawning manually
const result = game_inspector_spawn({
  template: 'myEntity',
  position: {x: 0, y: 0}
});
// If result.ok === false, check result.error

// 4. If spawn works, issue is in game logic not template
game_inspector_game_close();
```

### Testing: Verify win condition

```typescript
// First list games, then pick one
const available = game_inspector_list();
game_inspector_open({name: available.games[0].name});

// Subscribe to collision events
const sub = game_inspector_subscribe({
  eventType: 'collision',
  selector: '#ball'
});

// Spawn ball at specific position
game_inspector_spawn({
  template: 'ball',
  position: {x: 0, y: -7},
  id: 'test-ball'
});

// Wait 1 second
await new Promise(r => setTimeout(r, 1000));

// Check events
const events = game_inspector_poll_events({
  subscriptionId: sub.subId
});

// Verify collision occurred
const collision = events.events.find(e => 
  e.data.entityA === 'test-ball'
);

game_inspector_unsubscribe({subscriptionId: sub.subId});
game_inspector_close();
```

### QA: Visual regression test

```typescript
// List and open a game
const available = game_inspector_list();
game_inspector_open({name: available.games[0].name});

// Set up specific board state
game_inspector_pause();

// Query entities by tag/template
const entities = game_inspector_query({selector: '.targetTag'});
for (const entity of entities.matches) {
  game_inspector_destroy({entityId: entity.entityId});
}

// Spawn test pattern
game_inspector_spawn({template: 'someTemplate', position: {x: 0, y: 0}});
game_inspector_spawn({template: 'someTemplate', position: {x: 1, y: 0}});

// Capture screenshot
game_inspector_screenshot({
  filename: '/tmp/test-screenshot.png'
});

game_inspector_close();
```

---

## Advanced: Frame-Perfect Testing

```typescript
// For deterministic, repeatable tests
const available = game_inspector_list();
game_inspector_open({name: available.games[0].name});

// Enable deterministic mode
game_inspector_set_seed({seed: 42, enableDeterministic: true});

// Pause
game_inspector_pause();

// Set exact initial state
game_inspector_spawn({template: 'ball', position: {x: 0, y: 5}, id: 'ball'});
game_inspector_set_props({
  entityId: 'ball',
  values: {'physics.velocity': {x: 2, y: -5}}
});

// Step exactly 120 frames (2 seconds at 60fps)
game_inspector_step({frames: 120});

// Get final position
const finalPos = game_inspector_get_props({
  entityId: 'ball',
  paths: ['transform.position']
});

// Assert expected position (deterministic physics)
// Assert: finalPos.values['transform.position'].y < 0  // Ball fell

game_inspector_game_close();
```

---

## Integration with Test Suites

### Playwright E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('physics collision test', async () => {
  // List available games, pick one
  const available = await game_inspector_list();
  const gameState = await game_inspector_open({name: available.games[0].name});
  
  // Subscribe to collisions
  const sub = await game_inspector_subscribe({eventType: 'collision'});
  
  // Simulate input
  await game_inspector_simulate_input({type: 'tap', worldX: 0, worldY: 7});
  
  // Wait for entity to settle
  const entity = gameState.snapshot.entities.find(e => e.template === 'ball');
  if (entity) {
    await game_inspector_game_wait_stationary({entityId: entity.id, timeout: 10000});
  }
  
  // Check collision events
  const events = await game_inspector_poll_events({subscriptionId: sub.subId});
  
  expect(events.events.length).toBeGreaterThan(0);
  
  await game_inspector_close();
});
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/game-inspector-mcp/` | MCP server (Node.js, 40 tools) |
| `app/lib/godot/debug/GodotDebugBridge.ts` | TypeScript bridge (21 V2 methods) |
| `godot_project/scripts/bridge/debug/` | Godot handlers (GDScript) |
| `docs/godot/debug-bridge-all-bugs-fixed.md` | Complete API documentation |

---

## Performance Notes

- **Queries are fast** - O(n) scan of entities
- **Property operations are instant** - Direct node access
- **Physics queries use spatial indexing** - Efficient for large worlds
- **Event polling is lightweight** - Only returns new events since last poll
- **Screenshots are slow** - ~100ms, avoid in tight loops

---

## Known Limitations

1. **Web only** - MCP uses Playwright (browser automation)
2. **Single game at a time** - One browser instance per MCP session
3. **No hot reload connection** - Spawns fresh browser each time
4. **Coordinate precision** - Floating point (not pixel-perfect)

Future enhancements documented in `.opencode/reports/game-inspector-mcp-v2-implementation.md`.

---

## Summary

The Game Inspector MCP provides **complete control** over running games:
- ✅ 24 V2 APIs covering all debug needs
- ✅ CSS-like query syntax
- ✅ Frame-accurate time control
- ✅ Event monitoring
- ✅ Physics manipulation
- ✅ 100% tested and working

**Default workflow**: Open → Query/Test → Close  
**Always clean up**: Call `game_close()` when done