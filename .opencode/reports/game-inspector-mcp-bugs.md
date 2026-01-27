# Game Inspector MCP - Bug Report

**Date**: 2026-01-25  
**Tested Game**: `candyCrush`  
**MCP Version**: Initial release

---

## Summary

First-time testing of the game inspector MCP revealed three issues:

| Issue | Severity | Status |
|-------|----------|--------|
| Entities always empty | **Critical** | Blocking |
| Screenshot capture fails | Medium | Feature incomplete |
| Assertion message bug | Low | Minor UX issue |

---

## Issue 1: Entities Always Empty (Critical)

### Observed Behavior
```json
{
  "entities": [],
  "entityCount": 0
}
```

Despite the game opening successfully (world/camera/viewport all report correctly), no entities are returned.

### Root Cause Analysis

In `app/lib/godot/debug/GodotDebugBridge.ts` (lines 147-182):

```typescript
const getSnapshot = async (options: SnapshotOptions = {}): Promise<GameSnapshot> => {
  bridge.getAllTransforms();
  const transforms = (bridge._lastResult ?? {}) as Record<string, ...>;
  // ...
  const entityIds = Object.keys(transforms);  // <-- Empty if getAllTransforms returns nothing
```

The entity list comes from `bridge.getAllTransforms()`. Either:

1. **Missing GDScript implementation**: `getAllTransforms()` isn't implemented in `GameBridge.gd`
2. **Sync timing issue**: The call is synchronous but Godot may need async handling
3. **No entities spawned**: The candyCrush game may not have spawned entities yet (unlikely - we waited ~5 seconds)

### Verification Needed

Check if `GameBridge.gd` exposes these methods:
- `getAllTransforms()` 
- `getAllProperties()`

These should return all active entity transforms/properties for the debug bridge to consume.

### Suggested Fix

1. Implement `getAllTransforms()` in GDScript that returns a dictionary of all entity transforms
2. Implement `getAllProperties()` that returns entity metadata (template, tags, velocity, etc.)
3. Ensure `_lastResult` pattern works correctly for web bridge communication

---

## Issue 2: Screenshot Capture Fails (Medium)

### Observed Behavior
```
Error: [GodotDebugBridge] Screenshot capture not supported - captureScreenshot method not available on bridge
```

### Root Cause

In `GodotDebugBridge.ts` (line 273):
```typescript
if (bridge.captureScreenshot) {
  bridge.captureScreenshot(withOverlays, JSON.stringify(overlayTypes));
  // ...
} else {
  throw new Error('[GodotDebugBridge] Screenshot capture not supported...');
}
```

The web bridge (`GodotBridge.web.ts`) doesn't expose a `captureScreenshot` method.

### Suggested Fix

Implement `captureScreenshot` in GDScript that:
1. Captures the viewport texture
2. Encodes to PNG/base64
3. Returns via the JS callback bridge

Alternative: Use Playwright's native screenshot for the MCP (bypass Godot entirely).

---

## Issue 3: Assertion Message Bug (Low)

### Observed Behavior
```json
{
  "passed": false,
  "message": "Entity count is 0, expected undefined",
  "actual": 0
}
```

When calling `game_assert(type="entityCount", count=0)`, the message says "expected undefined" instead of "expected 0".

### Root Cause

In `packages/game-inspector-mcp/src/index.ts`, the assertion handler likely has a parameter access issue where `count` isn't being read properly from the parameters object.

### Suggested Fix

Check the entityCount assertion handler - ensure it accesses `p.count` (or equivalent) correctly instead of getting `undefined`.

---

## Working Features

These features work correctly:

| Feature | Status | Notes |
|---------|--------|-------|
| `game_list` | ✅ | Lists all games and aliases |
| `game_open` | ✅ | Opens game, waits for ready |
| `game_snapshot` (world/camera/viewport) | ✅ | Returns correct world info |
| `game_tap` | ⚠️ | Untested (needs entities first) |
| `game_drag` | ⚠️ | Untested (needs entities first) |

---

## Test Reproduction Steps

```bash
# 1. Ensure dev server running
pnpm dev

# 2. Via MCP tool calls:
game_list()                        # ✅ Returns games
game_open(name="candyCrush")       # ✅ Opens game
game_snapshot(detail="high")       # ❌ entities: []
game_screenshot()                  # ❌ Throws error
game_assert(type="entityCount", count=0)  # ❌ Wrong message
```

---

## Priority Order

1. **Fix getAllTransforms/getAllProperties** - Without entities, the inspector is unusable
2. **Fix assertion parameter handling** - Quick fix for better UX
3. **Implement captureScreenshot** - Nice to have, can use Playwright workaround
