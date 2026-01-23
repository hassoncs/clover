# Godot Migration Gap Analysis

## Overview

This document analyzes the current state of the Godot 4 migration from Skia + Box2D, identifying what's implemented, what's missing, and priorities for completion.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native App                              │
├─────────────────────────────────────────────────────────────────┤
│  GodotBridge Interface (types.ts)                               │
│  - Defines all expected methods                                  │
├──────────────────────┬──────────────────────────────────────────┤
│  GodotBridge.web.ts  │  GodotBridge.native.ts                   │
│  (iframe + postMsg)  │  (worklets + react-native-godot)         │
├──────────────────────┴──────────────────────────────────────────┤
│                    GameBridge.gd (GDScript)                      │
│  - _js_* methods: Web callbacks via JavaScriptBridge             │
│  - Direct methods: Native calls via react-native-godot           │
└─────────────────────────────────────────────────────────────────┘
```

## Platform Support Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| Web | ✅ Working | Iframe + JavaScriptBridge pattern |
| iOS Native | 🟡 Partial | react-native-godot + worklets |
| Android Native | ❓ Untested | Should work with same pattern |

---

## Implementation Status

### ✅ Fully Working (Web + Native)

| Method | Web | Native | Notes |
|--------|-----|--------|-------|
| `initialize()` | ✅ | ✅ | |
| `dispose()` | ✅ | ✅ | |
| `loadGame()` | ✅ | ✅ | |
| `clearGame()` | ✅ | ✅ | |
| `spawnEntity()` | ✅ | ✅ | |
| `destroyEntity()` | ✅ | ✅ | |
| `queryPointEntityAsync()` | N/A | ✅ | Native-only async method |
| `createMouseJointAsync()` | N/A | ✅ | Native-only async method |
| `setMouseTarget()` | ✅ | ✅ | |
| `destroyJoint()` | ✅ | ✅ | |

### 🟡 Partial (Fire-and-forget, no return value on native)

These methods work via `callGameBridge()` but don't return proper values on native because the call is async and we don't wait for results.

| Method | Web | Native | Issue |
|--------|-----|--------|-------|
| `setTransform()` | ✅ | 🟡 | Fire-and-forget |
| `setPosition()` | ✅ | 🟡 | Fire-and-forget |
| `setRotation()` | ✅ | 🟡 | Fire-and-forget |
| `setLinearVelocity()` | ✅ | 🟡 | Fire-and-forget |
| `setAngularVelocity()` | ✅ | 🟡 | Fire-and-forget |
| `applyImpulse()` | ✅ | 🟡 | Fire-and-forget |
| `applyForce()` | ✅ | 🟡 | Fire-and-forget |
| `applyTorque()` | ✅ | 🟡 | Fire-and-forget |
| `createRevoluteJoint()` | ✅ | 🟡 | Returns fake ID on native |
| `createDistanceJoint()` | ✅ | 🟡 | Returns fake ID on native |
| `createPrismaticJoint()` | ✅ | 🟡 | Returns fake ID on native |
| `createWeldJoint()` | ✅ | 🟡 | Returns fake ID on native |
| `createMouseJoint()` | ✅ | 🟡 | Use async version instead |
| `setMotorSpeed()` | ✅ | 🟡 | Fire-and-forget |
| `sendInput()` | ✅ | 🟡 | Fire-and-forget |

### ❌ Not Implemented (Return stubs on native)

| Method | Web | Native | Priority | Notes |
|--------|-----|--------|----------|-------|
| `getEntityTransform()` | ✅ | ❌ | HIGH | Returns `null` |
| `getAllTransforms()` | ✅ | ❌ | HIGH | Returns `{}` |
| `getLinearVelocity()` | ✅ | ❌ | MEDIUM | Returns `null` |
| `getAngularVelocity()` | ✅ | ❌ | MEDIUM | Returns `null` |
| `queryPoint()` | ✅ | ❌ | LOW | Returns `null` |
| `queryPointEntity()` | ✅ | ❌ | LOW | Use async version |
| `queryAABB()` | ✅ | ❌ | LOW | Returns `[]` |
| `raycast()` | ✅ | ❌ | LOW | Returns `null` |
| `getUserData()` | ✅ | ❌ | LOW | Returns `undefined` |
| `getAllBodies()` | ✅ | ❌ | LOW | Returns `[]` |
| `setEntityImage()` | ❌ | ❌ | HIGH | Not in types |
| `clearTextureCache()` | ❌ | ❌ | LOW | Not in types |

### Event Callbacks

| Event | Web | Native | Notes |
|-------|-----|--------|-------|
| `onCollision()` | ✅ | 🟡 | Callback registered but not wired to Godot signals |
| `onEntityDestroyed()` | ✅ | 🟡 | Callback registered but not wired |
| `onSensorBegin()` | ✅ | 🟡 | Callback registered but not wired |
| `onSensorEnd()` | ✅ | 🟡 | Callback registered but not wired |

---

## GDScript Method Coverage

### Native-Ready Methods (can be called directly)

These have been added for react-native-godot direct calling:

```gdscript
func query_point_entity(x: float, y: float) -> Variant
func create_mouse_joint(entity_id, target_x, target_y, max_force, stiffness, damping) -> int
func set_mouse_target(joint_id: int, target_x: float, target_y: float) -> void
func destroy_joint(joint_id: int) -> void
```

### Web-Only Methods (need native versions)

These only have `_js_*` callback versions that won't work on native:

```gdscript
# Need native equivalents:
func _js_get_entity_transform(args)     # -> get_entity_transform(entity_id)
func _js_get_all_transforms(args)       # -> get_all_transforms()
func _js_get_linear_velocity(args)      # -> get_linear_velocity(entity_id)
func _js_get_angular_velocity(args)     # -> get_angular_velocity(entity_id)
func _js_set_motor_speed(args)          # -> set_motor_speed(joint_id, speed)
func _js_query_point(args)              # -> query_point(x, y)
func _js_query_aabb(args)               # -> query_aabb(min_x, min_y, max_x, max_y)
func _js_raycast(args)                  # -> raycast(origin_x, origin_y, dir_x, dir_y, max_dist)
```

---

## Priority Tasks

### P0 - Critical for Games to Work

1. **Transform queries on native**
   - Add `get_entity_transform(entity_id)` to GDScript
   - Add `get_all_transforms()` to GDScript
   - Update native bridge with async versions
   - Games need to read entity positions for game logic

2. **Event system on native**
   - Wire collision callbacks from Godot to JS
   - Wire sensor callbacks
   - Games need collision detection for scoring/game over

### P1 - Important for Full Feature Parity

3. **Velocity queries**
   - Add native methods for `get_linear_velocity`, `get_angular_velocity`
   - Some games need velocity for logic

4. **Image/texture support**
   - Implement `setEntityImage()` - dynamic image assignment
   - Handle texture loading on both platforms
   - Important for player avatars, dynamic content

5. **Physics queries**
   - `raycast()` for line-of-sight, aiming
   - `queryAABB()` for area detection

### P2 - Nice to Have

6. **Low-level body API**
   - `createBody()`, `addFixture()` - currently fire-and-forget
   - `getUserData()`, `setUserData()` - metadata storage
   - `getAllBodies()` - enumeration

---

## Code Quality Issues

### Native Bridge Repetition

The worklet pattern is verbose. Every native method that needs return values looks like:

```typescript
async someMethodAsync(args): Promise<T> {
  const { RTNGodot, runOnGodotThread } = await getGodotModule();
  return runOnGodotThread(() => {
    'worklet';
    try {
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        return gameBridge.some_method(args) as T;
      }
    } catch (e) {
      console.log(`[Godot worklet] error: ${e}`);
    }
    return defaultValue;
  });
}
```

**Recommendation**: Create a helper:

```typescript
async function callGodotAsync<T>(
  methodName: string, 
  args: unknown[], 
  defaultValue: T
): Promise<T> {
  const { RTNGodot, runOnGodotThread } = await getGodotModule();
  return runOnGodotThread(() => {
    'worklet';
    try {
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        const method = gameBridge[methodName];
        if (typeof method === 'function') {
          return method.apply(gameBridge, args) as T;
        }
      }
    } catch (e) {
      console.log(`[Godot worklet] ${methodName} error: ${e}`);
    }
    return defaultValue;
  });
}
```

### GDScript Duplication

Many methods have three versions:
- `_js_method_name(args)` - Web callback with JavaScriptBridge.eval
- `method_name(...)` - Direct call for native
- `method_name_async(request_id, ...)` - Signal-based (unused)

**Recommendation**: Consolidate to two patterns:
- Web: Keep `_js_*` callbacks
- Native: Single direct method that returns value

---

## Testing Checklist

Before considering migration complete:

- [ ] Basic physics (gravity, collision) works on both platforms
- [ ] Drag interaction works on both platforms
- [ ] Transform queries return correct values on native
- [ ] Collision events fire on native
- [ ] Multiple entity types spawn correctly
- [ ] Joint creation/destruction works
- [ ] Game logic that reads entity state works
- [ ] Performance is acceptable (60fps target)
- [ ] Memory usage is reasonable
- [ ] Hot reload works during development

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/lib/godot/types.ts` | Bridge interface definition |
| `app/lib/godot/GodotBridge.native.ts` | Native iOS/Android implementation |
| `app/lib/godot/GodotBridge.web.ts` | Web implementation |
| `app/lib/godot/react-native-godot.d.ts` | Type definitions for native module |
| `godot_project/scripts/GameBridge.gd` | GDScript bridge singleton |
| `godot_project/scripts/Main.gd` | Main scene script |
| `app/plugins/withGodotAssets.js` | Expo plugin for bundling .pck |
