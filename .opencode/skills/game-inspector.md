# Game Inspector Skill

> **Trigger**: When debugging, testing, or verifying game behavior in running Slopcade games.
>
> **Purpose**: Query game state, capture screenshots, simulate input, and assert game conditions via the GodotDebugBridge.

---

## MCP Tools (Recommended)

The `game-inspector` MCP server provides high-level tools that handle browser automation automatically. **Use these tools instead of manual Playwright operations.**

### Quick Start

```
// Open a game (handles browser launch, navigation, waiting automatically)
game_open(name: "candyCrush")

// Get current game state
game_snapshot(detail: "high")

// Simulate input
game_tap(x: 5, y: 3)
game_drag(startX: 3, startY: 5, endX: 7, endY: 2, durationMs: 500)

// Wait for conditions
game_wait_stationary(entityId: "ball_123", timeout: 5000)
game_wait_collision(entityA: "ball", entityB: "goal", timeout: 10000)

// Assertions
game_assert(type: "nearPosition", entityId: "ball_123", position: {x: 5, y: 3}, tolerance: 0.5)

// Screenshot
game_screenshot(withOverlays: true)

// Clean up
game_close()
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `game_list` | List all available test games |
| `game_open` | Open a game, wait for ready, return initial state |
| `game_snapshot` | Get current game state (entities, positions, etc.) |
| `game_tap` | Simulate tap at world coordinates |
| `game_drag` | Simulate drag gesture |
| `game_wait_stationary` | Wait for entity to stop moving |
| `game_wait_collision` | Wait for collision between entities |
| `game_screenshot` | Capture game screenshot |
| `game_assert` | Run assertion on game state |
| `game_close` | Close browser and clean up |

### Available Games

| ID | Aliases |
|----|---------|
| `candyCrush` | - |
| `slopeggle` | `peggle` |
| `breakoutBouncer` | `breakout` |
| `pinballLite` | `pinball` |
| `physicsStacker` | `stacker` |
| `simplePlatformer` | `platformer` |
| `comboFighter` | - |
| `dungeonCrawler` | - |
| `rpgProgressionDemo` | - |
| `towerDefense` | - |

### Example Workflow

```
// 1. Open the game
game_open(name: "peggle")
// Returns: { success: true, gameId: "slopeggle", url: "...", snapshot: {...} }

// 2. Understand the game state
game_snapshot(detail: "high")
// Returns all entities with positions, velocities, physics properties

// 3. Find the ball entity from snapshot
// Look for entities with template: "ball"

// 4. Simulate firing the ball
game_tap(x: 10, y: 2)

// 5. Wait for physics to settle
game_wait_stationary(entityId: "ball_xxxx", timeout: 10000)

// 6. Check if ball reached goal
game_assert(type: "collisionOccurred", entityA: "ball_xxxx", entityB: "bucket")

// 7. Take screenshot for verification
game_screenshot(withOverlays: true, filename: "/tmp/game-result.png")

// 8. Close when done
game_close()
```

---

## URL Parameters

| Parameter | Effect |
|-----------|--------|
| `?debug=true` | Enable debug bridge injection |
| `?autostart=true` | Skip "Press Play" overlay, start game immediately |

The MCP tools automatically add both parameters when opening games.

---

## Low-Level API Reference

If you need direct access to the debug bridge (e.g., for custom Playwright tests), the following API is available via `window.GodotDebugBridge`.

### Prerequisites

The debug bridge auto-injects in dev mode or when `?debug=true` is in the URL.

### `getSnapshot(options?)`

Returns full game state.

```javascript
const snapshot = await bridge.getSnapshot({ 
  detail: 'high',        // 'low' | 'med' | 'high'
  filterTemplate: 'peg', // Only entities of this template
  filterTags: ['enemy'], // Only entities with these tags
  maxEntities: 100,      // Limit results
});

// snapshot structure:
{
  frameId: 1234,
  timestamp: 1706123456789,
  world: { pixelsPerMeter: 50, gravity: { x: 0, y: 9.8 }, bounds: { width: 20, height: 12 } },
  camera: { position: { x: 10, y: 6 }, zoom: 1, target: 'player' },
  viewport: { width: 800, height: 600 },
  entities: [
    { id: 'ball_123', template: 'ball', position: { x: 5.2, y: 3.1 }, angle: 0, velocity: { x: 1, y: -2 }, ... }
  ],
  entityCount: 45,
}
```

**Detail Levels:**
| Level | Includes |
|-------|----------|
| `low` | id, template, position, angle |
| `med` | + velocity, angularVelocity |
| `high` | + aabb, physics, behaviors, tags, visible, zIndex |

### `captureScreenshot(options?)`

```javascript
const screenshot = await bridge.captureScreenshot({
  withOverlays: true,           // Draw debug overlays
  overlayTypes: ['bounds', 'labels', 'velocity'],
});
// Returns: { base64, width, height, timestamp, frameId }
```

### `simulateTap(x, y)`

```javascript
const result = await bridge.simulateTap(5, 3);
// { hit: 'peg_042', worldPos: { x: 5, y: 3 }, screenPos: { x: 400, y: 300 } }
```

### `simulateDrag(startX, startY, endX, endY, durationMs, options?)`

```javascript
await bridge.simulateDrag(3, 5, 7, 2, 500, { 
  steps: 30,
  easing: 'ease-out',
});
```

### Assertions

```javascript
bridge.assert.exists('ball_123');
bridge.assert.nearPosition('ball_123', { x: 5, y: 3 }, 0.5);
bridge.assert.hasVelocity('ball_123', 1.0);
bridge.assert.isStationary('ball_123', 0.1);
bridge.assert.collisionOccurred('ball_123', 'peg_042');
bridge.assert.hasTag('ball_123', 'player');
bridge.assert.entityCount('peg', 10);
```

### Wait Helpers

```javascript
await bridge.waitForCondition(predicate, timeoutMs, pollIntervalMs);
await bridge.waitForEntity('spawned_ball', 2000);
await bridge.waitForStationary('ball_123', 5000, 0.1);
await bridge.waitForCollision('ball_123', 'goal_sensor', 5000);
```

### Coordinate Conversion

```javascript
const screenPos = bridge.worldToScreen({ x: 5, y: 3 });
const worldPos = bridge.screenToWorld({ x: 400, y: 300 });
```

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/game-inspector-mcp/` | MCP server implementation |
| `app/lib/godot/debug/GodotDebugBridge.ts` | Bridge implementation |
| `app/lib/godot/debug/types.ts` | Type definitions |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Game runtime (autoStart prop) |
| `godot_project/scripts/GameBridge.gd` | Godot-side bridge |
