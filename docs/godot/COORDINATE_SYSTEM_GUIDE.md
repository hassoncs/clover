# Complete Coordinate System & Transformation Guide

> **Last Updated:** 2026-01-25  
> **Purpose:** Understanding the full coordinate transformation pipeline from user input to Godot rendering

---

## Architecture Overview

The rendering pipeline involves TWO separate layers that must stay in sync:

1. **React Native Layer (TypeScript)** - Handles input, computes viewport rect, positions the GodotView container
2. **Godot Layer (GDScript)** - Renders the game world with its own camera zoom

These layers communicate but compute scaling independently. Mismatches between them cause coordinate bugs.

---

## Visual Layer Breakdown

When viewing a game on a wide monitor:

| Layer | What You See | Source | Purpose |
|-------|--------------|--------|---------|
| **Black letterbox** | Black bars on sides | React Native `letterboxColor` | Outside the viewport container |
| **Gray canvas** | Godot's background color | Godot viewport (700x900 fixed) | Godot's canvas stretched to fit |
| **Game world** | Red/colored game area | Game entities and background | The actual game content |

---

## Godot Viewport Configuration

Godot is configured with a **fixed viewport size** that gets stretched:

```ini
# project.godot
[display]
window/size/viewport_width=700
window/size/viewport_height=900
window/stretch/mode="canvas_items"
```

- **viewport_width/height**: The internal canvas size (700x900 pixels)
- **stretch/mode="canvas_items"**: Godot stretches this 700x900 to fill the browser/app window

This means:
1. All Godot rendering happens in a 700x900 pixel space
2. The browser/app then scales this to fit the actual window
3. Camera zoom inside Godot determines how much world fits in the 700x900

---

## Camera Auto-Zoom (The Key Fix)

When a game loads, Godot automatically calculates camera zoom to fit the world:

```gdscript
# GameBridge.gd:_setup_world()
var world_width = bounds.width * pixels_per_meter   # e.g., 8.4m * 50 = 420px
var world_height = bounds.height * pixels_per_meter # e.g., 8.4m * 50 = 420px
var viewport_size = get_viewport().get_visible_rect().size  # 700x900

var zoom_x = viewport_size.x / world_width  # 700/420 = 1.67
var zoom_y = viewport_size.y / world_height # 900/420 = 2.14
camera.zoom = Vector2(min(zoom_x, zoom_y), min(zoom_x, zoom_y))  # Use smaller = 1.67
camera.global_position = Vector2.ZERO
```

**Result for Candy Crush (8.4m x 8.4m world):**
- World in pixels: 420 x 420
- Godot viewport: 700 x 900
- Auto-zoom: min(700/420, 900/420) = 1.67
- The 420x420 world scales to 700x700, centered in the 700x900 viewport
- Gray bars appear above/below (100px each side)

---

## Coordinate Systems (5 Total)

### 1. **World Coordinates (Game Logic)**
- **Origin:** Center of game world `(0, 0)`
- **Y-Axis:** Y+ is UP
- **Scale:** Meters
- **Usage:** Physics, entity positions, game logic
- **Example:** Candy Crush world is 8.4m x 8.4m, corners at `(-4.2, -4.2)` to `(4.2, 4.2)`

### 2. **Godot Scene Coordinates (Rendering)**
- **Origin:** Center of viewport (when camera is at origin)
- **Y-Axis:** Y+ is DOWN
- **Scale:** Pixels
- **Conversion:** `godot_pos = Vector2(world.x * ppm, -world.y * ppm)`
- **Example:** World `(1, 1)` → Godot `(50, -50)` at 50 PPM

### 3. **Viewport Coordinates (TypeScript)**
- **Origin:** Top-left of the GodotView container
- **Y-Axis:** Y+ is DOWN
- **Scale:** Pixels (screen pixels, not Godot pixels)
- **Note:** This is the gray area in screenshots

### 4. **Screen Coordinates (Device)**
- **Origin:** Top-left of device screen
- **Y-Axis:** Y+ is DOWN
- **Scale:** Pixels
- **Note:** Includes black letterbox margins

### 5. **Canvas Coordinates (Godot Internal)**
- **Origin:** Top-left of Godot's 700x900 canvas
- **Y-Axis:** Y+ is DOWN
- **Scale:** Godot pixels (before stretch)

---

## Two Independent Scaling Systems

### React Native Side (ViewportSystem)

```typescript
// ViewportSystem.ts
class ViewportSystem {
  computeViewportRect() {
    // Determines where the GodotView container goes on screen
    // and what scale factor to use for input → world conversion
    
    const scale = viewportHeight / worldHeightMeters;  // pixels per meter
    
    this.viewportRect = {
      x: (screenWidth - viewportWidth) / 2,   // Letterbox offset
      y: (screenHeight - viewportHeight) / 2,
      width: viewportWidth,
      height: viewportHeight,
      scale: scale  // Used for input coordinate conversion
    };
  }
}
```

### Godot Side (GameBridge)

```gdscript
# GameBridge.gd
func _setup_world(world_data):
    # Determines camera zoom so world fills Godot's 700x900 viewport
    
    var world_pixels = bounds.width * pixels_per_meter
    var viewport = get_viewport().get_visible_rect().size  # 700x900
    var zoom = min(viewport.x / world_pixels, viewport.y / world_pixels)
    camera.zoom = Vector2(zoom, zoom)
```

**Critical:** These two systems MUST agree on the effective scale. If they don't, input coordinates won't match rendered positions.

---

## Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Tap/Hover (Screen Coordinates)                      │
│    Origin: device top-left, includes letterbox              │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ViewportSystem.screenToWorld()                           │
│    - Checks if inside viewport bounds                       │
│    - Strips letterbox offset                                │
│    - Converts to world using viewportRect.scale             │
│    - Flips Y axis                                           │
│    Output: World coordinates (meters, Y+ up)                │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Game Logic (Match3, behaviors, etc.)                     │
│    - Uses world coordinates for all calculations            │
│    Output: World position for highlight/entity              │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GodotBridge.setPosition(entityId, worldX, worldY)        │
│    - Sends world coordinates to Godot                       │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. GameBridge.gd: game_to_godot_pos()                       │
│    godot_pos = Vector2(world.x * ppm, -world.y * ppm)       │
│    Output: Godot pixels                                     │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Camera2D Transform                                       │
│    - Camera at (0,0) with auto-calculated zoom              │
│    - Zoom scales the world to fill viewport                 │
│    Output: Final screen position                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/lib/game-engine/ViewportSystem.ts` | Screen ↔ World coordinate conversion |
| `app/lib/game-engine/CameraSystem.ts` | Camera follow/shake (TypeScript side) |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Main game component, input handling |
| `godot_project/scripts/GameBridge.gd` | Godot-side game loading, coordinate conversion |
| `godot_project/scripts/effects/CameraEffects.gd` | Camera shake/zoom effects |
| `godot_project/project.godot` | Godot viewport config (700x900) |

---

## Candy Crush Example Values

### World Configuration
- `world.bounds`: 8.4m x 8.4m
- `pixelsPerMeter`: 50
- World in Godot pixels: 420 x 420

### Grid Configuration
- Rows: 7, Cols: 7
- Cell size: 1.2m x 1.2m
- Grid bounds: `(-4.2, -4.2)` to `(4.2, 4.2)`

### Godot Camera
- Viewport: 700 x 900 (from project.godot)
- Auto-zoom: min(700/420, 900/420) = **1.67**
- Position: `(0, 0)` (Godot coordinates)
- Result: 420 * 1.67 = 700px wide, centered vertically

### Cell World Positions
| Cell | World Position |
|------|----------------|
| (0, 0) | (-3.6, 3.6) |
| (0, 6) | (3.6, 3.6) |
| (3, 3) | (0, 0) |
| (6, 0) | (-3.6, -3.6) |
| (6, 6) | (3.6, -3.6) |

---

## Common Bugs

### 1. World appears too small (not filling viewport)
**Cause:** Camera zoom not calculated or set incorrectly
**Fix:** Ensure `_setup_world()` calculates and sets camera zoom based on world bounds

### 2. Input coordinates offset from visual
**Cause:** ViewportSystem scale doesn't match Godot camera zoom
**Debug:** Log both `viewportRect.scale` and Godot `camera.zoom`

### 3. Highlight appears in wrong grid cell
**Cause:** Grid origin or cell size mismatch
**Debug:** Log world coordinates at tap, verify they're in expected range

### 4. Everything offset by constant amount
**Cause:** Letterbox offset not stripped from input coordinates
**Debug:** Check `viewportRect.x` and `viewportRect.y` are being subtracted

---

## Debugging Checklist

1. **Verify Godot viewport**: Should be 700x900 (check project.godot)
2. **Verify camera zoom**: Log `camera.zoom` after `_setup_world()` - should be ~1.67 for Candy Crush
3. **Verify viewportRect**: Log in `updateScreenSize()` - scale should be close to Godot's effective PPM
4. **Verify input coords**: Log raw screen, viewport, and world coordinates at tap
5. **Verify entity positions**: Log world coords sent to Godot vs expected cell centers
