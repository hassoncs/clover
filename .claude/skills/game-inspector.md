# Game Inspector

> **Skill for AI Agents**: Debugging and testing games using the inspector tools
> **Version**: 1.0
> **Last Updated**: 2026-02-11
> **Source Docs**: docs/game-inspector/unified-input-simulation-plan.md, docs/testing/INPUT_CONTROL_TESTING.md

## When to Use This Skill

Load this skill when:
- Writing automated tests for games
- Debugging entity state or physics
- Inspecting game internals at runtime
- Simulating user input for testing
- Verifying game behavior programmatically

## Key Concepts

### Inspector Architecture

The Game Inspector provides programmatic control and observation of running games through MCP (Model Context Protocol) tools:

```
AI Agent → MCP Tools → GodotDebugBridge → QuerySystem → GameEngine
              ↑
         Assertions/State
```

**Two interfaces**:
1. **DebugBridge**: TypeScript API for programmatic control
2. **MCP Tools**: Direct tools AI can call (spawn, query, simulate input)

### DebugBridge Capabilities

**Entity Inspection:**
- `getSnapshot()` — Full game state
- `getEntity(id)` — Single entity details
- `query(selector)` — Find entities by tag/prefab

**Entity Control:**
- `spawn(prefabId, position, properties)`
- `destroy(entityId)`
- `setProps(entityId, values)`
- `patchProps(entityId, operations)`

**Time Control:**
- `step(frames)` — Advance physics N frames
- `setTimeScale(scale)` — Slow-motion or fast-forward
- `getTimeState()` — Current time info

**Input Simulation:**
- `simulateInput(inputEvent)` — Trigger any input type

**Physics Queries:**
- `raycast(from, to)` — Find entities along line
- `getOverlaps(entityId)` — What's touching entity
- `queryPoint(x, y)` — Entity at position
- `queryAABB(minX, minY, maxX, maxY)` — Entities in region

### MCP Tools Available

| Tool | Purpose | Example |
|------|---------|---------|
| `game-inspector_game_state` | Get variables, score, entity counts | `detail: "full"` for complete state |
| `game-inspector_game_entity` | Get specific entity details | `id: "ball-1"` |
| `game-inspector_query` | Find entities by selector | `.peg`, `#player`, `[prefab=ball]` |
| `game-inspector_spawn` | Create entity | `template: "ball", position: {x:0,y:0}` |
| `game-inspector_destroy` | Remove entity | `entityId: "ball-1"` |
| `game-inspector_set_props` | Modify entity properties | Position, velocity, etc. |
| `game-inspector_simulate_input` | Trigger input event | Tap, drag, key press |
| `game-inspector_game_assert` | Verify condition | exists, nearPosition, hasVelocity, etc. |
| `game-inspector_step` | Advance physics | `frames: 60` for 1 second |
| `game-inspector_pause/resume` | Control simulation | Pause for inspection |

## Common Patterns

### Basic Test Flow

```typescript
// 1. Spawn entity
const ballId = await debugBridge.spawn('ball', { x: 0, y: 10 });

// 2. Simulate input
await debugBridge.simulateInput({
  type: 'tap',
  worldX: 0,
  worldY: 10
});

// 3. Step physics
await debugBridge.step(60);  // 1 second at 60fps

// 4. Assert state
const ball = await debugBridge.getEntity(ballId);
assert(ball.transform.position.y < 0, 'Ball should have fallen');
```

### Entity Lifecycle Test

```typescript
// Spawn and verify
const id = await debugBridge.spawn('peg', { x: 100, y: 200 });
let entity = await debugBridge.getEntity(id);
assert(entity != null, 'Entity should exist');

// Destroy and verify gone
await debugBridge.destroy(id);
entity = await debugBridge.getEntity(id);
assert(entity == null, 'Entity should be destroyed');
```

### Physics Assertion

```typescript
// Wait for entity to stop moving
await debugBridge.game_wait_stationary('ball-1', { timeout: 5000 });

// Verify final position
await debugBridge.game_assert({
  type: 'nearPosition',
  entityId: 'ball-1',
  position: { x: 100, y: 50 },
  tolerance: 5
});
```

### Batch Operations

```typescript
// Query all pegs
const pegs = await debugBridge.query('.peg');

// Modify all at once
await debugBridge.patchProps(
  pegs.map(id => ({
    entityId: id,
    op: 'set',
    path: 'physics.isSensor',
    value: true
  }))
);
```

## Gotchas & Warnings

- **DebugBridge is not for production**: These APIs are for testing/debug only. Don't use in production game code.

- **Step is blocking**: `step(frames)` waits for all frames to complete. For long simulations, step in chunks to avoid timeouts.

- **Entity IDs are strings**: Even if they look numeric, always treat as strings.

- **Query selectors are CSS-like**: Use `.tag` for tags, `#id` for IDs, `[prefab=name]` for prefabs.

- **Input simulation goes through full pipeline**: Simulated inputs trigger the same code paths as real user input, including coordinate conversion.

- **Time scale affects physics**: Setting `timeScale: 0` pauses physics but not necessarily animations or tweens.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Entity not found` | Wrong ID or already destroyed | Check ID format, verify entity exists |
| `Query returns empty` | No matches or wrong selector | Try simpler selector first (e.g., just `.tag`) |
| `Step timeout` | Physics stuck in infinite loop | Step fewer frames, check for collision issues |
| `Spawn failed` | Invalid prefab or position | Verify prefab ID exists in GameDefinition |
| `Props not updating` | Wrong path or read-only | Check property path exists and is mutable |
| `Assertion fails` | Timing issue | Add `wait_stationary` or extra step frames |

## Quick Reference

| Task | Tool/Method |
|------|-------------|
| See all entities | `game-inspector_game_state` with `detail: "tags"` |
| Find entity by tag | `game-inspector_query` with selector `.tagname` |
| Move entity | `game-inspector_set_props` with `transform.position` |
| Check collision | `game-inspector_game_assert` with `collisionOccurred` |
| Fast-forward time | `game-inspector_set_time_scale` with `scale: 10` |
| Pause for inspection | `game-inspector_pause` |

## Related Skills

- `input-handling.md` — Simulating user input
- `bridge-development.md` — How DebugBridge communicates
- `testing-patterns.md` — General testing approaches

## Changelog

- 2026-02-11: Created from unified-input-simulation-plan.md and INPUT_CONTROL_TESTING.md
