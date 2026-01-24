# Physics Engine Documentation

> **LEGACY: Box2D documentation (migrated to Godot)**
>
> This documentation covers the legacy Box2D physics system. The project has migrated to Godot 4 for physics and rendering.
> See [Godot Migration](../godot-migration/MIGRATION_PLAN.md) for current architecture.

---

## Current State

The physics engine has been **migrated to Godot 4**. Key changes:
- **Rendering**: Godot's built-in renderer (was: Skia)
- **Physics**: Godot's physics engine (was: Box2D)
- **Platform support**: Native via react-native-godot, Web via WASM

See [Godot Bridge documentation](../../app/lib/godot/) for the current implementation.

---

## Legacy Reference (Box2D)

These documents describe the previous Box2D implementation, kept for historical reference.

| Document | Description |
|----------|-------------|
| [Box2D API Coverage](reference/box2d-api-coverage.md) | Which Box2D features were exposed |
| [Box2D Fork Strategy](decisions/box2d-fork-strategy.md) | Why and how we forked react-native-box2d |
| [MouseJoint Investigation](troubleshooting/mousejoint-wasm-issue.md) | SetTarget issue in box2d-wasm |

---

## Related

- [Godot Migration Plan](../godot-migration/MIGRATION_PLAN.md) - Migration documentation
- [Game Maker Documentation](../game-maker/INDEX.md) - Uses the physics engine
- [Global Documentation Index](../INDEX.md)
