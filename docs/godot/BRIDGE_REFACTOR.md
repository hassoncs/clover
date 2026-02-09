# Bridge Dedup Refactor

## Overview

The Godot bridge uses a **convention-based method registration** pattern where GDScript modules expose `_js_*` methods that are automatically wired into a unified `_method_map` dispatch table. Both web (WASM/JavaScriptBridge) and native (react-native-godot JSI) platforms share the same `_method_map` registry, ensuring a single source of truth for all bridge methods.

On the TypeScript side, callback registration is deduplicated through a shared `callback-registry.ts` module that both `GodotBridge.web.ts` and `GodotBridge.native.ts` consume via `createCallbackArrays()` and `createCallbackMethods()`.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  TypeScript (React Native)                     │
│                                                                │
│  GodotBridge.web.ts    GodotBridge.native.ts                   │
│       │                      │                                 │
│       ├── callback-registry.ts  (shared subscribe/unsub)       │
│       ├── GodotBridgeBase.ts    (effects normalization)        │
│       └── BridgeCore.ts         (request/response dispatch)    │
└─────────────────┬────────────────┬─────────────────────────────┘
                  │                │
          ┌───────▼──────┐  ┌─────▼───────────┐
          │  Web (WASM)  │  │  Native (JSI)   │
          │ window.      │  │ callGameBridge() │
          │ GodotBridge  │  │ → runOnGodot     │
          │ .methodName()│  │   Thread()       │
          └───────┬──────┘  └─────┬───────────┘
                  │                │
          ┌───────▼────────────────▼──────────────────────┐
          │          GameBridge.gd (GDScript)              │
          │                                                │
          │  _method_map: Dictionary                       │
          │    "set_position" → _transform_system._js_*    │
          │    "apply_impulse" → _physics_controller._js_* │
          │    "spawn_entity" → _entity_manager._js_*      │
          │    ...                                         │
          │                                                │
          │  native_dispatch(method, args_json) → Variant  │
          │  _setup_js_bridge() → window.GodotBridge       │
          └────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `app/lib/godot/callback-registry.ts` | Shared callback subscribe/unsubscribe for all event types |
| `app/lib/godot/GodotBridgeBase.ts` | Effects result normalization, shared base utilities |
| `app/lib/godot/BridgeCore.ts` | Request/response dispatch with timeout, progress |
| `app/lib/godot/GodotBridge.web.ts` | Web platform bridge (iframe + WASM) |
| `app/lib/godot/GodotBridge.native.ts` | Native platform bridge (JSI + worklets) |
| `app/lib/godot/types.ts` | `GodotBridge` interface (contract for both platforms) |
| `godot_project/scripts/GameBridge.gd` | GDScript dispatch hub with `_method_map` |

## How Auto-Registration Works

### GDScript Side

1. Each module (e.g., `PhysicsController`, `TransformSystem`, `JointManager`) defines `_js_*` methods:

```gdscript
# scripts/physics/PhysicsController.gd
func _js_set_linear_velocity(args: Array) -> void:
    # Implementation...

func _js_apply_impulse(args: Array) -> void:
    # Implementation...
```

2. `GameBridge.gd` builds `_method_map` in `_build_method_map()`, mapping snake_case keys to `_js_*` methods:

```gdscript
func _build_method_map() -> void:
    _method_map = {
        "set_linear_velocity": _physics_controller._js_set_linear_velocity,
        "apply_impulse": _physics_controller._js_apply_impulse,
        # ...
    }
```

3. All calls flow through `native_dispatch()`:

```gdscript
func native_dispatch(method_name: String, args_json: String) -> Variant:
    if not _method_map.has(method_name):
        push_warning("[GameBridge] Unknown native method: " + method_name)
        return null
    var args = JSON.parse(args_json)
    return _method_map[method_name].call(args)
```

### TypeScript Side

Both web and native use the same callback registry:

```typescript
// In both GodotBridge.web.ts and GodotBridge.native.ts
const cbs = createCallbackArrays();

const bridge: GodotBridge = {
    // Spread shared callback methods (onCollision, onEntityDestroyed, etc.)
    ...createCallbackMethods(cbs),

    // Platform-specific implementations...
    spawnEntity(request) { /* web or native specific */ },
};
```

## How to Add a New Bridge Method

### Step 1: Define the GDScript Implementation

Add a `_js_*` method to the appropriate module:

```gdscript
# scripts/physics/PhysicsController.gd
func _js_set_gravity_scale(args: Array) -> void:
    if args.size() < 2: return
    var entity_id = str(args[0])
    var scale = float(args[1])
    var body = _game_bridge.get_entity(entity_id)
    if body is RigidBody2D:
        body.gravity_scale = scale
```

### Step 2: Register in `_method_map`

Add the mapping in `GameBridge.gd`'s `_build_method_map()`:

```gdscript
func _build_method_map() -> void:
    _method_map = {
        # ... existing entries ...
        "set_gravity_scale": _physics_controller._js_set_gravity_scale,
    }
```

### Step 3: Add to Web Bridge (JavaScriptBridge bindings)

In `GameBridge.gd`'s `_setup_js_bridge()`, the method is already exposed through the `_method_map` iteration for snake_case methods. For camelCase web bindings, add to the explicit web bindings dict:

```gdscript
# In _setup_js_bridge() - the camelCase web bindings
"setGravityScale": _physics_controller._js_set_gravity_scale,
```

### Step 4: Add to TypeScript Interface

Update `app/lib/godot/types.ts`:

```typescript
export interface GodotBridge extends EffectsBridge {
    // ... existing methods ...
    setGravityScale(entityId: string, scale: number): void;
}
```

### Step 5: Implement on Both Platforms

**Web** (`GodotBridge.web.ts`):
```typescript
setGravityScale(entityId: string, scale: number) {
    getGodotBridge()?.setGravityScale(entityId, scale);
},
```

**Native** (`GodotBridge.native.ts`):
```typescript
setGravityScale(entityId: string, scale: number) {
    callGameBridge('set_gravity_scale', entityId, scale);
},
```

### Step 6: Add to Window Declaration (Web)

Update the `Window["GodotBridge"]` interface in `GodotBridge.web.ts`:

```typescript
declare global {
    interface Window {
        GodotBridge?: {
            // ... existing ...
            setGravityScale: (entityId: string, scale: number) => void;
        };
    }
}
```

## Web vs Native Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| GDScript methods | `_js_snake_case` | `_js_set_linear_velocity` |
| `_method_map` keys | `snake_case` | `"set_linear_velocity"` |
| Web JS bindings | `camelCase` | `window.GodotBridge.setLinearVelocity` |
| Native dispatch | `snake_case` | `callGameBridge('set_linear_velocity', ...)` |
| TypeScript interface | `camelCase` | `bridge.setLinearVelocity(id, vel)` |

The web bridge translates camelCase → snake_case at the `_setup_js_bridge()` level. The native bridge passes snake_case directly to `native_dispatch()`.

## Callback System

Events flow from Godot → TypeScript through a shared callback registry:

```
Godot emits event
    ↓
Web: JS callback → parse → cbs.collision[*](event)
Native: poll_events() → parse → cbs.collision[*](event)
    ↓
All subscribers notified
```

The `callback-registry.ts` module provides:
- `createCallbackArrays()` - Creates typed arrays for all 10 event types
- `createCallbackMethods()` - Returns `onCollision()`, `onEntityDestroyed()`, etc. with unsubscribe
- `clearAllCallbacks()` - Cleanup on dispose

### Supported Event Types

| Event | Callback Signature |
|-------|-------------------|
| `collision` | `(event: CollisionEvent) => void` |
| `destroy` | `(entityId: string) => void` |
| `entitySpawned` | `(event: EntitySpawnedEvent) => void` |
| `sensorBegin` | `(event: SensorEvent) => void` |
| `sensorEnd` | `(event: SensorEvent) => void` |
| `inputEvent` | `(type, x, y, entityId) => void` |
| `uiButton` | `(eventType, buttonId) => void` |
| `transformSync` | `(transforms: Record<string, EntityTransform>) => void` |
| `propertySync` | `(properties: PropertySyncPayload) => void` |
| `score` | `(points, entityId) => void` |

## Migration Guide

### From Duplicate Callback Code

**Before** (each bridge had its own callback arrays and subscribe logic):
```typescript
// GodotBridge.web.ts - OLD
protected collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
onCollision(callback) {
    this.collisionCallbacks.push(callback);
    return () => { /* manual splice */ };
}
```

**After** (shared registry):
```typescript
// Both platforms
import { createCallbackArrays, createCallbackMethods, clearAllCallbacks } from './callback-registry';

const cbs = createCallbackArrays();
const bridge = {
    ...createCallbackMethods(cbs),
    dispose() { clearAllCallbacks(cbs); },
};
```

### From Inheritance to Composition

**Before**: `GodotBridgeBase` was a class with callback methods that both bridges extended.

**After**: `callback-registry.ts` exports pure functions. Bridges compose via spread:
```typescript
const bridge: GodotBridge = {
    ...createCallbackMethods(cbs),  // All on* methods
    // Platform-specific implementations
};
```

## Testing

Run bridge-related tests:

```bash
pnpm vitest run app/lib/godot/__tests__/
```

Current test coverage:
- `callback-registry.test.ts` - 11 tests covering subscribe, unsubscribe, clear, multi-callback
- `effects-bridge.test.ts` - 6 tests covering effects result normalization
- `coordinateUtils.test.ts` - 28 tests covering coordinate conversions
