---
name: godot-engine
description: "Godot 4 engine patterns for Slopcade. Covers GDScript, scenes, .tscn/.gd files, GameBridge, autoloads, WASM export, PCK building, coordinate system, signals, and scene tree. Use when working on Godot scripts, scenes, or engine-level code."
---

# Godot Engine

> **Skill for AI Agents**: GDScript patterns, scene composition, bridge architecture, exports

## When to Use This Skill

Load when working on: Godot, GDScript, scenes, `.tscn`, `.gd`, GameBridge, autoloads, WASM export, PCK, coordinate system, signals, scene tree

## Key Concepts

- **GameBridge (Autoload)**: Central singleton managing TS↔Godot communication
- **Module Architecture**: Functionality split into EntityManager.gd, PhysicsController.gd, etc.
- **Dynamic Scene Loading**: `Main.tscn` is a shell; `load_game_json()` populates `GameRoot` from a GameDefinition
- **Center-Origin Coordinates**: Game uses Y-up center-origin; Godot uses Y-down top-left
- **Automated Exports**: `scripts/export-godot.mjs` watches and rebuilds WASM/PCK on file changes

## Architecture

### Bridge Flow
1. `GameBridge.gd` initializes on `_ready()`, creates module instances
2. `JSBridge.gd` exposes a `GodotBridge` object to browser via `JavaScriptBridge`
3. Methods auto-convert snake_case → camelCase (e.g., `load_game_json` → `loadGameJson`)
4. Collision signals emitted by GameBridge → caught by JS callbacks registered via bridge

### Scene Structure
- `Main.tscn` → `GameRoot` node (cleared and repopulated per game)
- Entities are Godot nodes (`RigidBody2D`, `StaticBody2D`, `Area2D`) stored in `entity_registry`

## Common Patterns

### Coordinate Conversion (CRITICAL)
```
Game → Godot:
  godot_x = game_x * PPM          (PPM = 50.0)
  godot_y = -game_y * PPM         (Y-flip!)
  godot_rotation = -game_angle    (rotation flip!)

Godot → Game:
  game_x = godot_x / PPM
  game_y = -godot_y / PPM
```

### Export Process
- **Web (WASM)**: Exports to `app/public/godot/` for React Native Web
- **Native (PCK)**: Exports to `app/godot/main.pck` for iOS/Android
- **Watcher**: `scripts/export-godot.mjs` rebuilds on `.gd`, `.tscn`, `.tres`, `.gdshader` changes
- **Service**: Managed via `devmux` as the `godot` service

## Gotchas

- NEVER manually rebuild Godot exports — the watcher handles it automatically
- PPM (pixels per meter) defaults to 50.0 — all coordinate math must account for this
- Y-axis is flipped between Game and Godot — forgetting this causes entities to appear inverted
- `JavaScriptBridge` is web-only; native uses JSI via `react-native-godot`
- Autoloads are defined in `project.godot` — adding a new singleton requires updating this file

## File References

| File | Purpose |
|------|---------|
| `godot_project/project.godot` | Project config, autoload definitions |
| `godot_project/scripts/GameBridge.gd` | Core autoload singleton |
| `godot_project/scripts/bridge/JSBridge.gd` | JS-exposed interface |
| `godot_project/scripts/PhysicsBody.gd` | Physics entity base class |
| `godot_project/scripts/utils/CoordinateUtils.gd` | Coordinate conversion |
| `godot_project/Main.tscn` | Root scene |
| `scripts/export-godot.mjs` | WASM/PCK export automation |

## Related Skills

- [bridge-development](bridge-development.md) — TypeScript side of the bridge
- [physics](physics.md) — Physics body types and collision
- [ecs-architecture](ecs-architecture.md) — Entity lifecycle managed by bridge
