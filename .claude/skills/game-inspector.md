---
description: "MCP-based game debugging and testing tools. Covers entity inspection, property editing, physics queries, time control, event subscriptions, and screenshots via Playwright. Use when debugging game state, inspecting entities, or testing games via the inspector."
---

# Game Inspector

> **Skill for AI Agents**: Debugging and testing games via the game-inspector MCP
> **Version**: 2.0
> **Last Updated**: 2026-02-12

## When to Use This Skill

Load this skill when:
- Debugging entity state or physics
- Inspecting game internals at runtime
- Simulating user input for testing
- Verifying game behavior programmatically

## How to Call Operations

The game-inspector MCP exposes 2 tools: `list_ops` and `call_op`. **Do NOT call `list_ops` every time** — use this skill as your reference.

```
game-inspector_call_op(operation: "open", args: { name: "candyCrush" })
game-inspector_call_op(operation: "step", args: { frames: 60 })
game-inspector_call_op(operation: "game_state", args: { detail: "tags" })
```

Only call `game-inspector_list_ops` if you need to check for newly added operations or see exact parameter schemas.

## Operations Reference

### Game Lifecycle
| Operation | Args | Purpose |
|-----------|------|---------|
| `list` | — | List available games and examples |
| `open` | `name`, `baseUrl?`, `timeout?` | Open game in browser, wait for ready |
| `close` | — | Close browser |

### State & Inspection
| Operation | Args | Purpose |
|-----------|------|---------|
| `game_state` | `detail?` (summary/tags/full), `tags?` | Variables, score, lives, entity counts |
| `game_snapshot` | `detail?` (low/med/high), `filterTemplate?`, `filterTags?` | Full game state snapshot |
| `game_screenshot` | `filename?` | Capture screenshot (base64 or file) |
| `game_entity` | `id` | Detailed info about one entity |
| `game_count` | `template?`, `tag?` | Count entities |
| `get_console_logs` | `filter?`, `limit?`, `since?`, `clear?` | Console output from game |

### Entity Queries
| Operation | Args | Purpose |
|-----------|------|---------|
| `query` | `selector`, `limit?`, `offset?` | CSS-like selector: `.tag`, `#id`, `[prefab=x]` |
| `game_find` | `template?`, `tag?`, `name?`, `limit?` | Find by template/tag/name |
| `game_at_point` | `x`, `y` | Entities at world position |
| `game_in_rect` | `minX`, `minY`, `maxX`, `maxY` | Entities in region |

### Entity Mutation
| Operation | Args | Purpose |
|-----------|------|---------|
| `spawn` | `template`, `position?`, `properties?`, `id?` | Create entity |
| `destroy` | `entityId`, `recursive?` | Remove entity |
| `clone` | `entityId`, `position?`, `id?`, `deep?` | Clone entity |
| `reparent` | `entityId`, `newParentId`, `keepGlobalTransform?` | Move to new parent |
| `get_props` | `entityId`, `paths` | Get specific properties |
| `get_all_props` | `entityId` | Get all properties |
| `set_props` | `entityId`, `values`, `validate?` | Set properties |
| `patch_props` | `ops`, `validate?` | Batch operations (set/inc/mul/append/remove) |

### Time Control
| Operation | Args | Purpose |
|-----------|------|---------|
| `get_time_state` | — | Current time state (paused, scale, frame) |
| `pause` | — | Pause simulation |
| `resume` | — | Resume simulation |
| `step` | `frames`, `screenshot?`, `screenshotFilename?` | Step N physics frames |
| `set_time_scale` | `scale` | Slow-mo (0.5) or fast-forward (10.0) |
| `set_seed` | `seed`, `enableDeterministic?` | Deterministic playback |
| `step_sequence` | `totalFrames`, `captureEvery?`, `showLabels?`, `maxWidth?` | Step + filmstrip capture |

### Input Simulation
| Operation | Args | Purpose |
|-----------|------|---------|
| `simulate_input` | `type`, `worldX?`, `worldY?`, `key?`, ... | Simulate tap/drag/key input |

Input types: `tap`, `drag_start`, `drag_move`, `drag_end`, `key_down`, `key_up`

### Physics
| Operation | Args | Purpose |
|-----------|------|---------|
| `raycast` | `from`, `to`, `mask?`, `excludeEntityId?` | Cast ray, find intersections |
| `get_shapes` | `entityId` | Collision shapes on entity |
| `get_joints` | `entityId?` | Physics joints |
| `get_overlaps` | `entityId` | Currently overlapping entities |
| `query_point` | `x`, `y`, `mask?` | Physics query at point |
| `query_aabb` | `minX`, `minY`, `maxX`, `maxY`, `mask?` | Physics query in box |

### Assertions & Waits
| Operation | Args | Purpose |
|-----------|------|---------|
| `game_assert` | `type`, `entityId?`, `position?`, `tolerance?`, ... | Assert game state |
| `game_wait_stationary` | `entityId`, `timeout?`, `epsilon?` | Wait for entity to stop |
| `game_wait_collision` | `entityA`, `entityB`, `timeout?` | Wait for collision |

Assert types: `exists`, `nearPosition`, `hasVelocity`, `isStationary`, `collisionOccurred`, `hasTag`, `entityCount`

### Events
| Operation | Args | Purpose |
|-----------|------|---------|
| `subscribe` | `eventType`, `selector?`, `properties?` | Watch for events |
| `unsubscribe` | `subscriptionId` | Stop watching |
| `poll_events` | `subscriptionId?`, `limit?` | Get events since last poll |

### Debug
| Operation | Args | Purpose |
|-----------|------|---------|
| `debug_eval` | `code` | Run JS in game page context |
| `debug_script_system` | — | Script sandbox debug info |
| `debug_test_script_console` | `waitMs?` | Test console.log capture |
| `set_log_level` | `level`, `category?` | Set engine log verbosity |
| `get_log_config` | — | Current logger config |

## Common Workflows

### Open game → inspect → close
```
call_op("list")                                    → see available games
call_op("open", { name: "candyCrush" })            → opens browser
call_op("game_state", { detail: "tags" })          → see entities
call_op("close")                                   → cleanup
```

### Step-by-step physics debugging
```
call_op("open", { name: "ballSort" })
call_op("pause")
call_op("step", { frames: 1, screenshot: true })   → one frame at a time
call_op("game_entity", { id: "ball-1" })            → inspect entity
call_op("step", { frames: 60 })                     → advance 1 second
call_op("game_assert", { type: "nearPosition", entityId: "ball-1", position: { x: 0, y: -50 }, tolerance: 10 })
```

### Input simulation
```
call_op("simulate_input", { type: "tap", worldX: 100, worldY: 200 })
call_op("simulate_input", { type: "drag_start", worldX: 50, worldY: 50, targetEntityId: "ball-1" })
call_op("simulate_input", { type: "drag_end", worldX: 200, worldY: 200 })
```

## Gotchas

- `step(frames)` is blocking — step in chunks for long simulations
- Entity IDs are strings
- Query selectors are CSS-like: `.tag`, `#id`, `[prefab=name]`
- Simulated input goes through the full pipeline (same code path as real input)
- `timeScale: 0` pauses physics but not animations/tweens
- Game must be opened with `?debug=true` (the `open` operation handles this)

## Changelog

- 2026-02-12: v2.0 — Migrated to list_ops/call_op pattern (46 operations via 2 MCP tools)
- 2026-02-11: v1.0 — Created from unified-input-simulation-plan.md
