# Architecture Reference

This document captures key architectural patterns and flows in the Slopcade codebase.

---

## 1. Asset Pipeline Debug Output Pattern

When debugging asset generation issues, save intermediate files to enable traceability and iteration.

### Pattern

Save files to `api/debug-output/{gameId}/{assetId}/` with numbered stages:

````
api/debug-output/{gameId}/{assetId}/
├── 1-silhouette.png      # Physics shape mask
├── 2-prompt.txt          # Full prompt used
├── 3-generated.jpg       # Raw AI output
├── 4-final.png           # Post-processed result
└── manifest.json         # Metadata (seed, model, timestamps)
```P

### Usage

```bash
# Enable debug mode
DEBUG_ASSET_GENERATION=true npx tsx api/scripts/generate-game-assets.ts slopeggle
````

### Benefits

- **Debugging**: Inspect each transformation stage
- **Iteration**: Modify prompts without re-running full pipeline
- **Documentation**: Capture how assets were generated
- **Reproducibility**: Manifest contains all parameters

---

## 2. Platform-Specific Module Pattern

Use file extension resolution to provide platform-appropriate implementations.

### Structure

```
lib/module/
├── Module.native.ts    # iOS/Android implementation (JSI)
├── Module.web.ts       # Web implementation (WASM)
├── index.ts            # Unified export
└── types.ts            # Shared type definitions
```

### How It Works

Metro (React Native) and Webpack resolve the appropriate platform file at build time:

```typescript
// index.ts - unified export
export { Module } from "./Module";
// Compiler picks Module.native.ts or Module.web.ts based on platform

// Usage - same import everywhere
import { Module } from "@/lib/module";
```

### Examples in Codebase

| Module       | Native                                  | Web                                   |
| ------------ | --------------------------------------- | ------------------------------------- |
| Godot Bridge | `lib/godot/GodotBridge.native.ts` (JSI) | `lib/godot/GodotBridge.web.ts` (WASM) |
| Physics      | `lib/physics2d/`                        | Same (shared logic)                   |

### Key Principle

Keep shared types and interfaces in `types.ts`. Platform implementations only contain code that cannot be shared.

---

## 3. Input Event Flow

Input flows from Godot engine → bridge layer → React components → rules engine.

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Godot Engine   │────▶│   Bridge Layer   │────▶│  React Components   │
│  GameBridge.gd  │     │ GodotBridge.*.ts │     │  GameRuntime.tsx    │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────────┐
                                                  │   Rules Engine      │
                                                  │  (triggers/actions) │
                                                  └─────────────────────┘
```

### Godot → Bridge Layer

**File**: `godot_project/scripts/GameBridge.gd`

```gdscript
func send_input(type: String, x: float, y: float, entity_id: String) -> void:
    var payload = {
        "type": type,        # "tap", "drag", etc.
        "x": x,              # World coordinates (meters)
        "y": y,
        "entity_id": entity_id  # Hit entity, if any
    }
    js_callback.call(JSON.stringify(payload))
```

**Physics Point Query** (tap events only):

- Godot performs physics world point query at tap location
- Returns entity ID if hit, null otherwise
- Enables "tap to interact" behavior

### Bridge Layer → React

**Web Bridge** (`lib/godot/GodotBridge.web.ts`):

```typescript
onInputEvent(callback: (type: string, x: number, y: number, entityId: string) => void) {
    window.godotBridge = {
        send_input: (json: string) => {
            const { type, x, y, entity_id } = JSON.parse(json);
            callback(type, x, y, entity_id);
        }
    };
}
```

**Native Bridge** (`lib/godot/GodotBridge.native.ts`):

```typescript
// Uses event polling system
async pollEvents(): Promise<InputEvent[]> {
    return await godotModule.pollInputEvents();
}
```

### React Component Processing

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`

```typescript
// Receive input from bridge
inputEventUnsubRef.current = bridge.onInputEvent((type, x, y, _entityId) => {
  if (type === "tap") {
    // Convert world coords → screen coords
    const ppm = definition.world.pixelsPerMeter ?? 50;
    const screenX = x * ppm;
    const screenY = y * ppm;

    inputRef.current = {
      ...inputRef.current,
      tap: { x: screenX, y: screenY, worldX: x, worldY: y },
    };
  }
});
```

### Coordinate Systems

| System     | Unit   | Conversion                                  |
| ---------- | ------ | ------------------------------------------- |
| **World**  | Meters | —                                           |
| **Screen** | Pixels | `screenCoord = worldCoord × pixelsPerMeter` |

**Example**: Tap at world (5.0, 3.2) with PPM=50:

- Screen: (250, 160) pixels

### Rules Engine Processing

Input stored in `inputRef` is processed each frame by the rules evaluator:

```typescript
// In stepGame()
game.rulesEvaluator.update(
  dt,
  game.entityManager,
  collisionsRef.current,
  inputRef.current, // ← Input processed here
  inputEvents, // ← Derived events (tap, dragEnd)
  physics,
  // ... other dependencies
);
```

Rules reference input via triggers:

- `CollisionTrigger` - entity collisions
- `TimerTrigger` - time-based events
- `EventTrigger` - custom events from behaviors

---

## Quick Reference

### Key Files

| Path                                        | Purpose                      |
| ------------------------------------------- | ---------------------------- |
| `godot_project/scripts/GameBridge.gd`       | Godot-side input handling    |
| `lib/godot/GodotBridge.web.ts`              | Web bridge implementation    |
| `lib/godot/GodotBridge.native.ts`           | Native bridge implementation |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Input consumption            |
| `api/debug-output/`                         | Asset pipeline debug output  |

### Environment Variables

| Variable                 | Purpose                                |
| ------------------------ | -------------------------------------- |
| `DEBUG_ASSET_GENERATION` | Enable debug output for asset pipeline |
| `SCENARIO_API_KEY`       | AI image generation (Scenario.com)     |
| `ASSET_HOST`             | URL prefix for asset serving           |
