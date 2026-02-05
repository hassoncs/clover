# BallSort Spawn Issue - Debugging Session

**Date:** 2026-02-04
**Status:** IN PROGRESS - WASM re-entrancy issue being fixed

## Problem Statement

Ball Sort game: balls spawned via script during `game_loaded` event don't appear visually. The `generateLevel()` script runs, calls `spawnEntity()` for each ball, but balls exist only in JS state - not rendered in Godot.

## Root Causes Identified

### 1. ✅ FIXED: Script spawnEntity bypassed Godot Bridge

**File:** `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`

**Original (broken):**
```typescript
spawnEntity: (templateId, position, opts) => {
  const entity = entityManager.createEntity({...}); // JS only!
  return entity.id;
}
```

**Compare to SpawnActionExecutor (working):**
```typescript
if (context.bridge) {
  context.bridge.spawnEntity(templateId, x, y, initialVelocity); // Goes to Godot!
}
```

### 2. ✅ FIXED: Race condition - templates not loaded before spawn

**File:** `godot_project/scripts/GameBridge.gd` in `_load_game_with_preload()`

**Original (broken):**
```gdscript
clear_game()  # Clears templates
# ... await texture preload ...
templates = game_data.get("templates", {})  # Set AFTER await
```

**Fixed:**
```gdscript
clear_game()
templates = game_data.get("templates", {})  # Set IMMEDIATELY
_entity_factory.update_state()
# ... await texture preload ...
```

### 3. ✅ FIXED: loadGame didn't wait for Godot

**File:** `app/lib/godot/GodotBridge.web.ts`

**Original (broken):**
```typescript
async loadGame(definition: GameDefinition) {
  godotBridge.loadGameJson(JSON.stringify(definition)); // Fire and forget!
}
```

**Fixed:**
```typescript
async loadGame(definition: GameDefinition) {
  await queryAsync<{ ok: boolean }>("loadGameAsync", [JSON.stringify(definition)], 30000);
}
```

**Also added in GameBridge.gd:**
```gdscript
func _load_game_async_handler(args: Array) -> Dictionary:
  if args.size() == 0:
    return {"ok": false, "error": "No game definition provided"}
  var result = await _load_game_with_preload(str(args[0]))
  return {"ok": result}
```

And registered handler:
```gdscript
_query_system.register_handler("loadGameAsync", _load_game_async_handler)
_query_system._async_methods.append("loadGameAsync")
```

### 4. 🔄 IN PROGRESS: WASM re-entrancy crash

**Problem:** Calling `bridge.spawnEntity()` during script execution crashes WASM with "memory access out of bounds"

**Cause:** Script runs inside Godot's JS bridge callback. Calling back into Godot synchronously causes WASM re-entrancy/corruption.

**Solution (partially implemented):** Queue spawns during script, process after script completes.

**File:** `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`

**Current fix:**
```typescript
interface PendingSpawn {
  entityId: string;
  templateId: string;
  x: number;
  y: number;
}

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private pendingSpawns: PendingSpawn[] = [];

  execute(action: RunScriptAction, context: RuleContext): void {
    this.pendingSpawns = [];
    const runtimeContext = this.createRuntimeContext(context);
    const result = this.sandbox.callFunction(runtimeContext, functionName, action.args);

    if (result.success) {
      this.processPendingSpawns(context);  // Process AFTER script finishes
    }
  }

  private processPendingSpawns(context: RuleContext): void {
    for (const spawn of this.pendingSpawns) {
      if (context.bridge) {
        context.bridge.spawnEntity(spawn.templateId, spawn.x, spawn.y);
      }
    }
    this.pendingSpawns = [];
  }

  // In createRuntimeContext:
  spawnEntity: (templateId, position, opts) => {
    const entityId = `spawned_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    entityManager.createEntity({...}); // Create in JS immediately
    
    if (context.bridge) {
      this.pendingSpawns.push({ entityId, templateId, x: position.x, y: position.y });
    }
    
    return entityId;
  }
}
```

## Files Modified

1. `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`
   - Added PendingSpawn interface
   - Added pendingSpawns array
   - Modified execute() to process spawns after script
   - Modified spawnEntity to queue instead of direct call

2. `godot_project/scripts/GameBridge.gd`
   - Moved `templates = game_data.get("templates", {})` before await
   - Added `_load_game_async_handler()` function
   - Registered "loadGameAsync" query handler

3. `app/lib/godot/GodotBridge.web.ts`
   - Changed loadGame to use queryAsync instead of fire-and-forget

## Architecture Understanding

### Game Loading Flow (should be)
```
JS → Godot: "Load this game definition"
     ↓
Godot: Parse definition, set templates, preload textures
     ↓
Godot → JS: "Ready!" (via queryAsync response)
     ↓
JS: Fire game_loaded event
     ↓
Script runs, spawns entities (Godot is fully ready)
```

### Script Spawn Flow (should be)
```
Script calls spawnEntity()
     ↓
Queue spawn request (don't call Godot yet)
     ↓
Script continues...
     ↓
Script finishes
     ↓
Process pending spawns (NOW call Godot)
     ↓
Godot creates visual entities
```

## Key Code Locations

| File | Purpose |
|------|---------|
| `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` | Script execution, spawn handling |
| `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` | Reference for correct spawn pattern |
| `godot_project/scripts/GameBridge.gd` | Godot-side game loading, bridge setup |
| `godot_project/scripts/entity/EntityManager.gd` | Godot entity spawning |
| `godot_project/scripts/entity/EntityFactory.gd` | Godot entity creation |
| `godot_project/scripts/bridge/QuerySystem.gd` | Async query handling |
| `app/lib/godot/GodotBridge.web.ts` | JS→Godot bridge |
| `app/lib/game-engine/GameRuntime.godot.tsx` | React game runtime |

## Verification Commands

```bash
# Open game in inspector
mcp_game-inspector_open name="http://localhost:8085/test-games/ballSort"

# Check game state
mcp_game-inspector_game_state detail="tags"

# Check console logs
mcp_game-inspector_get_console_logs filter="SCRIPT" limit=30
mcp_game-inspector_get_console_logs filter="spawn_entity" limit=20
mcp_game-inspector_get_console_logs filter="Template" limit=30

# Take screenshot
mcp_game-inspector_game_screenshot
```

## Evidence from Logs

### Before fixes - templates empty:
```
[EntityManager] ❌ Template 'ball0' not found (available: [])
```

### After template fix - template found but crash:
```
[EntityManager] ✅ Template 'ball0' found, creating entity...
[🟪 SCRIPT] ❌ generateLevel() error: RuntimeError: memory access out of bounds
```

### Timeline showing race condition:
```
0.002s - [MERGE] Merged 9 templates with image URLs (JS side)
1.450s - [EntityManager] spawn_entity called: template=ball0
1.450s - ERROR: Template 'ball0' not found (available: [])
```

## Next Steps

1. **Test the queued spawn fix** - reopen ballSort and check if WASM crash is resolved
2. **If still crashing** - may need to use `setTimeout(0)` or similar to defer spawn processing outside of current call stack
3. **Verify balls appear** - take screenshot, check game_state for ball entities
4. **Clean up** - remove debug logs if everything works

## Potential Issues with Current Fix

1. The `processPendingSpawns` is called immediately after script - might still be in same WASM call stack
2. May need to use `requestAnimationFrame` or `setTimeout(0)` to truly defer
3. Entity IDs are pre-generated but Godot spawn uses different ID format - may cause mismatch

## Alternative Approach if Current Fix Fails

Use `requestAnimationFrame` or `queueMicrotask` to defer spawn processing:

```typescript
if (result.success) {
  if (this.pendingSpawns.length > 0) {
    queueMicrotask(() => this.processPendingSpawns(context));
  }
}
```

Or store spawns on context and process in next game loop iteration.
