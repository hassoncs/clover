---
name: bridge-development
description: "Godot-TypeScript bridge communication layer. Covers method registration, dispatch mechanisms, web vs native bridge, QuerySystem RPC, debug bridge. Use when adding bridge methods, debugging TS↔Godot communication, or working with GodotBridge/GodotDebugBridge."
---

# Bridge Development

> **Skill for AI Agents**: Working with the Godot-TypeScript bridge for game engine communication
> **Version**: 1.0
> **Last Updated**: 2026-02-11
> **Source Docs**: docs/godot/BRIDGE_REFACTOR.md, docs/godot/UNIFIED_BRIDGE_DESIGN_BRIEF.md

## When to Use This Skill

Load this skill when:
- Adding new bridge methods between TypeScript and Godot
- Debugging bridge communication issues
- Understanding the method registration and dispatch system
- Working with web vs native bridge implementations
- Adding debug/inspection capabilities to the bridge

## Key Concepts

### Two Dispatch Mechanisms

The bridge has **two different dispatch systems** on the Godot side:

**A. Method Dispatch (`_method_map`)** — Fast, sync/fire-and-forget
- ~92 methods registered in `_build_method_map()`
- Direct callable invocation: `native_dispatch(method_name, args_json)`
- Used for: entity management, transforms, physics, rendering
- Web exposure: `_setup_js_bridge()` creates `window.GodotBridge.camelCaseName`

**B. Query Dispatch (`QuerySystem._handlers`)** — Async request/response
- ~42 handlers (9 core + 33 debug)
- Request/response with `requestId` correlation
- Used for: debug inspection, entity queries, time control, physics queries
- Web exposure: `window.GodotBridge.query(requestId, handlerName, argsJson)`

### Auto-Registration Convention

GDScript modules expose `_js_*` methods that are automatically registered:

```gdscript
# In PhysicsController.gd
func _js_set_linear_velocity(args: Array) -> void:
    var entity_id = args[0]
    var vx = args[1]
    var vy = args[2]
    # implementation

func _js_apply_impulse(args: Array) -> void:
    # implementation
```

These are auto-discovered and added to `_method_map`:
```gdscript
# GameBridge.gd
func _build_method_map() -> void:
    _method_map = {
        "set_linear_velocity": _physics_controller._js_set_linear_velocity,
        "apply_impulse": _physics_controller._js_apply_impulse,
        # ... auto-registered methods
    }
```

### TypeScript Interface Layers

Three interfaces with different purposes:

1. **`GodotBridge`** (`app/lib/godot/types.ts`) — Production game API
   - ~120 methods
   - Mix of sync (fire-and-forget) and async (Promise)
   - Consumed by: WorldOpsImpl, GameRuntime

2. **`GodotDebugBridge`** (`app/lib/godot/debug/types.ts`) — Debug/inspection API
   - ~40 methods, all Promise-based
   - Used for: entity inspection, time control, simulation
   - Consumed by: DebugOpsImpl, DevTools, MCP

3. **`WorldOps/DebugOps`** (`shared/src/types/world-ops.ts`) — High-level scripting API
   - ~35 methods (WorldOps) + debug extensions
   - Abstracts bridge details for game scripts
   - Consumed by: game scripts, test scripts

## Common Patterns

### Adding a New Bridge Method

1. **Add to GodotBridge interface** (`app/lib/godot/types.ts`):
```typescript
interface GodotBridge {
  // Existing methods...
  setLinearVelocity(entityId: string, vx: number, vy: number): void;
}
```

2. **Implement in web bridge** (`GodotBridge.web.ts`):
```typescript
setLinearVelocity: (entityId, vx, vy) => {
  window.GodotBridge.setLinearVelocity([entityId, vx, vy]);
},
```

3. **Implement in native bridge** (`GodotBridge.native.ts`):
```typescript
setLinearVelocity: (entityId, vx, vy) => {
  native_dispatch("set_linear_velocity", JSON.stringify([entityId, vx, vy]));
},
```

4. **Add GDScript handler** (e.g., `PhysicsController.gd`):
```gdscript
func _js_set_linear_velocity(args: Array) -> void:
    var entity_id = args[0]
    var velocity = Vector2(args[1], args[2])
    _set_linear_velocity(entity_id, velocity)
```

5. **Register in GameBridge.gd** (if not using auto-registration):
```gdscript
_method_map["set_linear_velocity"] = _physics_controller._js_set_linear_velocity
```

### Adding a Debug Query Handler

```gdscript
# In DebugBridge.gd or appropriate module
func _register_handlers() -> void:
    _query_system.register_handler("myDebugMethod", _on_my_debug_method)

func _on_my_debug_method(args: Dictionary) -> Dictionary:
    var result = do_something(args)
    return { "success": true, "data": result }
```

TypeScript side:
```typescript
// In GodotDebugBridge.ts
async myDebugMethod(args: MyArgs): Promise<MyResult> {
  return this.query('myDebugMethod', args);
}
```

## Gotchas & Warnings

- **Naming mismatch**: GDScript uses `snake_case`, TypeScript uses `camelCase`. The bridge handles conversion, but registration in `_method_map` must use snake_case.

- **Two different ways to call**: Don't confuse method dispatch (fast, simple) with query dispatch (async, rich responses). Use method dispatch for game logic, query dispatch for debug/inspection.

- **Web vs Native signatures**: Web methods can be sync (direct calls), native methods are always async (via JSI). Design APIs to work with both.

- **DebugBridge is always loaded**: Even in production, DebugBridge registers its 33 handlers. Call `unregister_handlers()` if you need to disable debug features.

- **QuerySystem uses JavaScriptBridge.eval() for responses**: This means query responses go through JS eval, which is slower than method dispatch. Don't use queries in hot paths.

- **Auto-registration scans at runtime**: `_auto_register_bridge_methods()` scans for `_js_*` methods at startup. This adds a small delay but ensures all modules are registered.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Unknown native method` warning | Method not in `_method_map` | Check registration, verify snake_case name |
| Method works on web but not native | JSI marshalling issue | Ensure args are JSON-serializable, check native dispatch format |
| Query never returns | Handler not registered | Verify `register_handler()` was called |
| `window.GodotBridge` undefined | Bridge not initialized | Wait for `_setup_js_bridge()` to complete |
| Callback not firing | Registry mismatch | Check `callback-registry.ts` has the event type |

## Quick Reference

| Task | Solution |
|------|----------|
| Debug bridge calls | Check `window.GodotBridge._lastResult` in web console |
| Find method name | Check `_method_map` in `GameBridge.gd` |
| Test bridge method | Use MCP `game-inspector_debug_eval` with `GameBridge.native_dispatch()` |
| Add fire-and-forget method | Use method dispatch (add to `_method_map`) |
| Add request/response method | Use query dispatch (register with `QuerySystem`) |
| Disable debug features | Call `DebugBridge.unregister_handlers()` |

## Related Skills

- `input-handling.md` — Input events flow through the bridge
- `physics.md` — Coordinate conversion for bridge dispatch
- `game-inspector.md` — Debug bridge powers inspection tools
- `testing-patterns.md` — Headless tests use bridge adapter

## Changelog

- 2026-02-11: Created from BRIDGE_REFACTOR.md and UNIFIED_BRIDGE_DESIGN_BRIEF.md
