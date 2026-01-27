# Slopcade Godot Engine

Godot 4 game engine integration for Slopcade - handles physics and rendering for React Native games.

## Overview

This Godot project is used as a **rendering and physics backend** for Slopcade games. Games are loaded dynamically via the JavaScript bridge from React Native (mobile) or web.

**Note:** Running this project standalone in the Godot editor will show an empty scene. Games must be loaded via the bridge.

## Quick Start

### Prerequisites

1. **Install Godot 4.3+** (with web export templates)
   ```bash
   # macOS with Homebrew
   brew install godot
   
   # Or download from https://godotengine.org/download
   ```

2. **Install Web Export Templates**
   - Open Godot Editor
   - Go to Editor > Manage Export Templates
   - Download templates for your Godot version

### Development

Games are defined in TypeScript and loaded dynamically:
- **Test games:** `app/lib/test-games/games/`
- **Asset configs:** `api/scripts/game-configs/`

To run games, use the React Native app or web version:
```bash
pnpm dev      # Start Metro + API
pnpm web      # Run web version
pnpm ios      # Run iOS simulator
```

### Export to Web (for embedding)

```bash
# Create export directory
mkdir -p godot_project/export/web

# Export (requires export templates installed)
godot --headless --path godot_project --export-release "Web" export/web/index.html
```

## Architecture

```
godot_project/
├── project.godot          # Godot project config
├── Main.tscn              # Root scene (minimal shell)
├── scripts/
│   ├── Main.gd            # Scene setup
│   └── GameBridge.gd      # Autoload singleton - JS bridge
└── export/
    └── web/               # Web export output
```

### GameBridge Singleton

`GameBridge` is an autoload that provides the JS bridge API:

- `load_game_json(json_string)` - Load a game from JSON
- `spawn_entity(template_id, x, y)` - Spawn entity from template
- `destroy_entity(entity_id)` - Remove entity
- `get_entity(entity_id)` - Get entity node
- `set_linear_velocity(entity_id, vx, vy)` - Set entity velocity
- `apply_impulse(entity_id, ix, iy)` - Apply impulse

### Signals

- `game_loaded(game_data)` - Fired when a game is loaded
- `entity_spawned(entity_id, node)` - Fired when entity is created
- `entity_destroyed(entity_id)` - Fired when entity is destroyed
- `collision_occurred(entity_a, entity_b, impulse)` - Physics collision

## Coordinate System

Slopcade uses a **center-origin** coordinate system:
- Origin (0, 0) is at screen center
- X+ is right, X- is left
- Y+ is up, Y- is down

Godot uses top-left origin with Y+ down. GameBridge handles conversion automatically via `game_to_godot_pos()` and `godot_to_game_pos()`.

## Physics Property Mapping

Slopcade uses Godot's physics system with the following type and property mappings:

| Property | Godot |
|----------|-------|
| `type: 'static'` | `StaticBody2D` |
| `type: 'dynamic'` | `RigidBody2D` |
| `type: 'kinematic'` | `CharacterBody2D` / `Area2D` (if sensor) |
| `shape: 'box'` | `RectangleShape2D` |
| `shape: 'circle'` | `CircleShape2D` |
| `shape: 'polygon'` | `ConvexPolygonShape2D` |
| `density` | `mass` (calculated from area) |
| `friction` | `PhysicsMaterial.friction` |
| `restitution` | `PhysicsMaterial.bounce` |

## Features

- [x] Godot project loads and runs (native + web)
- [x] GameDefinition JSON parsing
- [x] Static/dynamic/kinematic body types
- [x] Collision detection and events
- [x] Dynamic image loading
- [x] Camera control
- [x] Joint systems (revolute, distance, prismatic, weld, mouse)
- [x] Physics queries (point, AABB, raycast)
- [x] Area2D velocity support for kinematic sensors
