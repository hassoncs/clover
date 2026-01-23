# Slopcade Godot Spike

This is a spike to validate migrating from Skia+Box2D to Godot 4 for physics-based game rendering.

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

### Running the Spike

#### Option 1: Godot Editor (Recommended for Development)

```bash
# Open the project in Godot
cd godot_project
godot project.godot

# Press F5 or click Play to run
```

#### Option 2: Command Line

```bash
# Run in editor mode
godot --path godot_project

# Run the game directly
godot --path godot_project --main-scene
```

#### Option 3: Export to Web

```bash
# Create export directory
mkdir -p godot_project/export/web

# Export (requires export templates installed)
godot --headless --path godot_project --export-release "Web" export/web/index.html

# Serve locally
cd godot_project/export/web
python3 -m http.server 8080
# Open http://localhost:8080 in browser
```

## How to Use

1. **Press SPACE** to load the Physics Stacker game
2. **Click/Tap** anywhere to spawn blocks from the dropper
3. **Press R** to reload the game

## Architecture

```
godot_project/
├── project.godot          # Godot project config
├── Main.tscn              # Root scene
├── scripts/
│   ├── Main.gd            # Main controller, input handling
│   └── GameBridge.gd      # Autoload singleton for game loading
└── export/
    └── web/               # Web export output
```

### GameBridge Singleton

`GameBridge` is an autoload that provides:

- `load_game_json(json_string)` - Load a game from JSON
- `spawn_entity(template_id, x, y)` - Spawn entity from template
- `destroy_entity(entity_id)` - Remove entity
- `get_entity(entity_id)` - Get entity node
- `connect_to_server(url)` - WebSocket connection (optional)

### Signals

- `game_loaded(game_data)` - Fired when a game is loaded
- `entity_spawned(entity_id, node)` - Fired when entity is created
- `entity_destroyed(entity_id)` - Fired when entity is destroyed
- `collision_occurred(entity_a, entity_b, impulse)` - Physics collision

## JSON Game Definition Format

The spike uses the same `GameDefinition` format as the React Native app:

```json
{
  "metadata": { "id": "game-id", "title": "Game Title", "version": "1.0.0" },
  "world": {
    "gravity": { "x": 0, "y": 9.8 },
    "pixelsPerMeter": 50,
    "bounds": { "width": 14, "height": 18 }
  },
  "templates": {
    "box": {
      "sprite": { "type": "rect", "width": 1, "height": 1, "color": "#FF0000" },
      "physics": {
        "bodyType": "dynamic",  // "static" | "dynamic" | "kinematic"
        "shape": "box",         // "box" | "circle" | "polygon"
        "width": 1,
        "height": 1,
        "density": 1,
        "friction": 0.3,
        "restitution": 0.5
      }
    }
  },
  "entities": [
    {
      "id": "box1",
      "template": "box",
      "transform": { "x": 5, "y": 2, "angle": 0 }
    }
  ]
}
```

## Physics Mapping (Box2D → Godot)

| Box2D | Godot |
|-------|-------|
| `type: 'static'` | `StaticBody2D` |
| `type: 'dynamic'` | `RigidBody2D` |
| `type: 'kinematic'` | `CharacterBody2D` |
| `shape: 'box'` | `RectangleShape2D` |
| `shape: 'circle'` | `CircleShape2D` |
| `shape: 'polygon'` | `ConvexPolygonShape2D` |
| `density` | `mass` (calculated from area) |
| `friction` | `PhysicsMaterial.friction` |
| `restitution` | `PhysicsMaterial.bounce` |

## Success Criteria

This spike succeeds if:

- [x] Godot project loads and runs
- [x] Physics Stacker game definition parses correctly
- [x] Static platform renders and has collision
- [x] Dynamic blocks spawn with physics
- [x] Blocks stack on platform
- [x] Collision detection works
- [ ] Web export runs in browser
- [ ] 60fps with 50+ entities

## Next Steps (If Spike Succeeds)

1. Add behavior system (oscillate, follow, etc.)
2. Add rules/triggers system
3. Add WebSocket multiplayer
4. Add sprite/image loading
5. Migrate remaining games
