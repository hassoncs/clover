# Game Inspector MCP — Bug Report

**Date**: 2026-02-05 (updated 2026-02-06)  
**Test Game**: `http://localhost:8085/test-games/simple` (single static cube at origin)

---

## Fix Summary (2026-02-06)

Rewrote all MCP tools to use inline `page.evaluate` calling `window.debugOps` (DebugOpsImpl which extends WorldOpsImpl) directly. Eliminated all `queryGodot()` and `querySlopcade()` calls from tool files. The `queryGodot` helper had a mysterious serialization issue where methods existed on `debugOps` but returned "Unknown method" errors — bypassing it entirely fixed the problem.

### Files Changed
- `tools/properties.ts` — get_props, get_all_props, set_props, patch_props
- `tools/query.ts` — query, game_find, game_entity, game_at_point, game_in_rect, game_count
- `tools/lifecycle.ts` — spawn, destroy, clone, reparent
- `tools/physics.ts` — raycast, get_shapes, get_joints, get_overlaps, query_point, query_aabb
- `tools/events.ts` — subscribe, poll_events, unsubscribe
- `tools/interaction.ts` — simulate_input, game_assert, game_wait_stationary, game_wait_collision
- `tools/time-control.ts` — all time control tools
- `tools/game-management.ts` — open tool (setSeed, pause, step, getTimeState)

### Original Bugs — Status After Fix

| # | Bug | Status | Notes |
|---|-----|--------|-------|
| 0 | Method name mismatches | ✅ FIXED | All tools now use inline page.evaluate with correct debugOps methods |
| 1 | `query('*')` fails | ✅ FIXED | Wildcard converts to `queryEntities()` with no filter |
| 2 | `game_in_rect` returns empty | ✅ FIXED | Now uses `queryEntitiesWithData({inAABB: ...})` |
| 3 | `patch_props` set op silently fails | ✅ FIXED | Uses same routing as set_props (setPosition, setRotation, etc.) |
| 4 | `render.modulate` set doesn't apply | ⚠️ ENGINE BUG | Not an MCP issue — `setEntityProps` delegates to bridge which can't set modulate |
| 5 | `hasTag` assertion not implemented | ✅ FIXED | Now calls `ops.hasTag(entityId, tag)` directly |
| 6 | `entityCount` ignores tag filter | ✅ FIXED | Now calls `ops.queryEntities({tag})` and counts result |
| 7 | `nearPosition` uses stale snapshot | ✅ FIXED | Now calls `ops.getPosition()` for live position |
| 8 | `waitForStationary` fails on static bodies | ✅ FIXED | Null velocity treated as stationary |
| 9 | Spawned entities are ghosts | ✅ FIXED | Uses `ops.spawn()` via WorldOpsImpl which registers in EntityManager |

---

## Remaining Issues (Engine-Level, Not MCP)

### Issue A: `getOverlaps` Crashes on Map

**Severity**: Low  
**Tool**: `get_overlaps`  
**Input**: `get_overlaps("cube")`  
**Expected**: `{entityId: "cube", overlappingIds: []}`  
**Actual**: `{error: "Cannot read properties of undefined (reading 'map')"}`  
**Root Cause**: `DebugOpsImpl.getOverlaps()` calls `this.godotDebugBridge.getOverlaps(entityId)` which returns `{overlaps: undefined}`. The `.map()` call on `undefined` throws. Fix: null-check `result.overlaps` in `DebugOpsImpl`.  
**Location**: `app/lib/game-engine/DebugOpsImpl.ts` line ~98

### Issue B: Physics Space Queries Return Empty (raycast, queryPoint, queryAABB)

**Severity**: Medium  
**Tools**: `raycast`, `query_point`, `query_aabb`, `game_at_point`  
**Input**: Any coordinates including exact entity positions  
**Expected**: Should find the cube  
**Actual**: All return empty results  
**Root Cause**: The `WorldOpsImpl` physics query methods delegate to `Physics2D` which calls into Godot's physics space. The simple test game's static body may not have its collision shape registered in the physics space for queries, or queries require `force_update_transform()` first. Confirmed: `ops.queryPoint({x:0,y:0})` returns `null`, `ops.queryAABB(...)` returns `[]`, `ops.raycast(...)` returns `null` even when called directly from JS.  
**Location**: `app/lib/game-engine/WorldOpsImpl.ts` physics query methods + Godot-side physics space

### Issue C: Spawned Entities Not Inspectable via Bridge

**Severity**: Low  
**Tool**: `get_all_props` on spawned entity  
**Input**: `get_all_props("pooled_0_1")` after spawning  
**Expected**: Returns entity properties  
**Actual**: `{error: "Entity not found"}`  
**Root Cause**: `getAllEntityProps` delegates to `godotDebugBridge.getAllProps()` which queries the Godot scene tree. Spawned entities exist in the JS EntityManager but the bridge can't find them by their pooled ID. The entity IS tracked by `queryEntities`/`game_count` (which use EntityManager) but not by bridge-level property inspection (which queries Godot directly).  
**Location**: `app/lib/game-engine/DebugOpsImpl.ts` + Godot bridge entity lookup

### Issue D: `set_props` Rotation Value Not Persisted Correctly

**Severity**: Low  
**Tool**: `set_props`  
**Input**: `set_props("cube", {"transform.rotation": 0.785})`  
**Expected**: Rotation reads back as 0.785  
**Actual**: `set_props` reports ok, but `get_props` returns 0.0137 (near zero)  
**Root Cause**: `setRotation` goes through `WorldOpsImpl.setRotation` → `GodotBridge.setRotation` → Godot. May be a radians/degrees conversion issue or Godot normalizing the rotation differently.  
**Location**: Bridge-side rotation handling
