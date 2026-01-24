# Godot Migration Gap Analysis

*Consolidated on Jan 23, 2026*

This is the **single source of truth** for the Godot migration status. All other gap/roadmap documents should be considered deprecated.

## Architecture

```
React Native App (Expo)
    │
    ├─► TypeScript (game logic, AI generation, UI)
    │
    └─► GodotBridge Interface
            │
            ├─► Web: iframe + window.GodotBridge (postMessage)
            └─► Native: react-native-godot + worklets (JSI)
                    │
                    ▼
            Godot 4.5 Runtime
            ├─► GameBridge.gd (JSON → physics nodes)
            ├─► Physics (RigidBody2D, StaticBody2D, Area2D)
            └─► Rendering (Polygon2D, Sprite2D, Label)
```

## Platform Status

| Platform | Status | Notes |
|----------|--------|-------|
| Web | **Working** | 38MB WASM in `app/public/godot/` |
| iOS Native | **Working** | Event polling for callbacks, async queries |
| Android | **Untested** | Should work same as iOS |

---

## Feature Parity Matrix

### Core Physics

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| Dynamic bodies (RigidBody2D) | ✅ | ✅ | |
| Static bodies (StaticBody2D) | ✅ | ✅ | |
| Kinematic bodies (CharacterBody2D) | ✅ | ✅ | |
| Box shapes | ✅ | ✅ | |
| Circle shapes | ✅ | ✅ | |
| Polygon shapes | ✅ | ✅ | ConvexPolygonShape2D |
| Sensors (Area2D) | ✅ | ✅ | |
| Collision filtering | ✅ | ✅ | categoryBits/maskBits |
| Gravity scale | ✅ | ✅ | |
| Damping (linear/angular) | ✅ | ✅ | |
| Fixed rotation | ✅ | ✅ | |
| CCD (bullet mode) | ✅ | ✅ | |

### Collision Events

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| Basic collision callback | ✅ | ✅ | Native via poll_events() |
| Detailed manifold (point, normal, impulse) | ✅ | ✅ | Via _integrate_forces |
| Sensor begin/end | ✅ | ✅ | Native via poll_events() |

### Rendering

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| Rectangle primitives | ✅ | ✅ | Polygon2D |
| Circle primitives | ✅ | ✅ | Polygon2D (32 segments) |
| Polygon primitives | ✅ | ✅ | Polygon2D |
| Image/texture (bundled) | ✅ | ✅ | res:// URLs |
| Image/texture (remote) | ✅ | ✅ | HTTP download, cached |
| Text/labels | ✅ | ✅ | Label node |
| Opacity/alpha | ✅ | ✅ | |
| Z-ordering | ✅ | ✅ | z_index property |
| Dynamic image assignment | ✅ | ✅ | setEntityImage() |

### Joints

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| Revolute (PinJoint2D) | ✅ | ✅ | Motor supported |
| Distance (DampedSpringJoint2D) | ✅ | ✅ | |
| Prismatic (GrooveJoint2D) | ✅ | ✅ | Motor via PrismaticJointDriver.gd |
| Weld (dual PinJoint2D) | ✅ | ✅ | |
| Mouse joint | ✅ | ✅ | Force-based simulation |
| Angle limits | 🟡 | 🟡 | Not supported by PinJoint2D |

### Transform Control

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| setTransform() | ✅ | 🟡 | Fire-and-forget on native |
| setPosition() | ✅ | 🟡 | Fire-and-forget on native |
| setRotation() | ✅ | 🟡 | Fire-and-forget on native |
| setLinearVelocity() | ✅ | 🟡 | Fire-and-forget on native |
| setAngularVelocity() | ✅ | 🟡 | Fire-and-forget on native |
| applyForce() | ✅ | 🟡 | Fire-and-forget on native |
| applyImpulse() | ✅ | 🟡 | Fire-and-forget on native |
| applyTorque() | ✅ | 🟡 | Fire-and-forget on native |

### State Queries

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| getEntityTransform() | ✅ | ✅ | Native via worklet return |
| getAllTransforms() | ✅ | ✅ | Native via worklet return |
| getLinearVelocity() | ✅ | ✅ | Native via worklet return |
| getAngularVelocity() | ✅ | ✅ | Native via worklet return |
| queryPoint() | ✅ | ✅ | Native via worklet return |
| queryPointEntity() | ✅ | ✅ | Native via worklet return |
| createMouseJointAsync() | ✅ | ✅ | Async version for proper joint ID |
| queryAABB() | ✅ | ✅ | Native via worklet return |
| raycast() | ✅ | ✅ | Native via worklet return |

### Input

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| sendInput (tap) | ✅ | ✅ | Raycast + callback |
| onInputEvent callback | ✅ | ✅ | Returns hit entity |
| Touch forwarding | ✅ | ✅ | Via React Native overlay |

---

## Resolved Gaps

### ~~Native Return Values~~ ✅ RESOLVED

Native bridge now uses worklet return values. Methods like `getEntityTransform`, `queryPointEntity`, etc. work correctly. For interactive queries, use the async variants (e.g., `createMouseJointAsync`).

### ~~Native Event Callbacks~~ ✅ RESOLVED  

Event callbacks (collision, sensor) now work via `poll_events()` pattern:
- GDScript queues events into an array
- Native bridge polls every 16ms via worklet
- Events are dispatched to registered callbacks

### ~~Camera System~~ ✅ RESOLVED

Camera is now wired in GameRuntime.godot:
- `setCameraPosition(x, y)` - synced every frame
- `setCameraZoom(zoom)` - synced every frame

### ~~Particle Effects~~ ✅ RESOLVED

`triggerParticleEffect()` now calls `bridge.spawnParticle()`.

### ~~Touch Input~~ ✅ RESOLVED

Touch input now wired in GameRuntime.godot:
- Touch handlers on viewport container
- Coordinates converted to world space
- Forwarded to bridge via `sendInput()`

---

## Remaining Gaps (P1)

### 1. Revolute Joint Angle Limits

**Problem**: PinJoint2D doesn't support angle limits (lowerAngle, upperAngle).

**Workaround**: Custom constraint checking in _physics_process, or use physics server directly.

### 2. Audio/SFX

**Problem**: `playSound()` exists in bridge but not exposed in BehaviorContext.

**Solution**: Add `playSound` to BehaviorContext interface and wire to bridge.

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/lib/godot/types.ts` | TypeScript bridge interface |
| `app/lib/godot/GodotBridge.web.ts` | Web implementation |
| `app/lib/godot/GodotBridge.native.ts` | Native implementation |
| `godot_project/scripts/GameBridge.gd` | GDScript bridge singleton |
| `godot_project/scripts/PhysicsBody.gd` | RigidBody2D collision manifold |
| `godot_project/scripts/PrismaticJointDriver.gd` | Prismatic joint motor |
| `app/public/godot/` | Web export (WASM) |

---

## Next Steps

1. ~~Implement native return values~~ ✅ DONE
2. ~~Wire native event callbacks~~ ✅ DONE
3. ~~Add camera system~~ ✅ DONE
4. ~~Add particle effects~~ ✅ DONE
5. ~~Wire touch input~~ ✅ DONE
6. **Add audio to BehaviorContext** - Expose playSound
7. **Performance testing** - Benchmark vs Box2D
8. **Remove debug logging** - Clean up print statements

---

## Deprecated Documents

The following documents are superseded by this file:
- `docs/GODOT_MIGRATION_GAP_ANALYSIS.md`
- `docs/godot-migration/MIGRATION_PLAN.md`
- `godot_project/MIGRATION_ROADMAP.md`
