# Slopcade Godot Bridge

> **Trigger**: When working with Godot integration, bridge communication, native builds, WebAssembly exports, or React-Native ↔ Godot communication.
>
> **Purpose**: Complete reference for the React Native ↔ Godot bridge system including message passing, entity management, and platform-specific builds.

---

## When to Load This Skill

Load this skill when working on:
- **Bridge communication** between React Native and Godot
- **Native builds** (iOS, Android)
- **Web exports** (WebAssembly, HTML5)
- **Entity lifecycle** in Godot (spawn, destroy, update)
- **Physics queries** (raycast, point queries, collisions)
- **Input handling** (native bridge input, touch events)
- **Debug bridge** (inspector integration, testing APIs)
- **Godot GDScript** code in `godot_project/`
- **Build configuration** for different platforms

**Don't load for**: Game logic/rules (use `slopcade-game-engine`), asset generation (use `slopcade-asset-generation`), debugging tools (use `game-inspector`).

---

## Quick Reference Links

### Bridge Architecture
| Document | Purpose | Location |
|----------|---------|----------|
| **Input Event Flow** | How input flows through bridge | `INPUT_EVENT_FLOW.md` |
| **Coordinate System Guide** | Screen vs world coordinates | `docs/godot/COORDINATE_SYSTEM_GUIDE.md` |
| **Native Bridge TODO** | Bridge feature status | `docs/godot/NATIVE_BRIDGE_TODO.md` |
| **Web Input Handling** | Web-specific input | `docs/godot/WEB_INPUT_HANDLING.md` |
| **Debug Bridge Plan** | Inspector bridge architecture | `docs/game-inspector/unified-debug-bridge-plan.md` |

### Godot Project
| Document | Purpose | Location |
|----------|---------|----------|
| **Godot Project README** | Godot setup and exports | `godot_project/README.md` |
| **3D Rendering** | GLB/3D model rendering | `docs/godot/3d-rendering.md` |
| **VFX Implementation** | Visual effects TODO | `godot_project/docs/VFX_IMPLEMENTATION_TODO.md` |

### Troubleshooting
| Document | Purpose | Location |
|----------|---------|----------|
| **Debug Bridge Bugs** | Bug report and fixes | `docs/godot/debug-bridge-bug-report.md` |
| **All Bugs Fixed** | Complete fix log | `docs/godot/debug-bridge-all-bugs-fixed.md` |
| **Native Image Loading** | Image loading issues | `docs/godot/NATIVE_IMAGE_LOADING_ISSUE.md` |
| **Hover Bug Investigation** | Input debugging | `docs/game-inspector/hover-bug-investigation.md` |

---

## Architecture Overview

The bridge enables bidirectional communication between **React Native** (UI/Logic) and **Godot** (Physics/Rendering):

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Game Engine  │  │ Entity Mgr   │  │ Input Handler│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    GODOT BRIDGE                             │
│           (JSON message passing layer)                      │
└─────────┬─────────────────┬─────────────────┬───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────┴─────────────────┴─────────────────┴───────────────┐
│                       GODOT 4                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ PhysicsWorld │  │ Entity Nodes │  │ Input System │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Bridge APIs

### JavaScript → Godot (Outgoing)

From React Native/TypeScript:

```typescript
// Spawn entity
bridge.spawnEntity('ball', 5, 2);  // template, x, y

// Apply force
bridge.applyImpulse('ball-1', { x: 0, y: -10 });
bridge.setLinearVelocity('ball-1', { x: 5, y: 0 });

// Set entity properties
bridge.setEntityPosition('ball-1', 5, 2);
bridge.setEntityRotation('ball-1', 0.5);

// Set image (sprite)
bridge.setEntityImage('ball-1', imageUrl, 0.5, 0.5);  // entityId, url, width, height

// Destroy entity
bridge.destroyEntity('ball-1');

// Query physics
const entities = await bridge.queryPointEntity(x, y);
const hits = await bridge.raycast({ from: {x, y}, to: {x, y} });

// Get entity state
const pos = await bridge.getEntityPosition('ball-1');
const velocity = await bridge.getLinearVelocity('ball-1');
```

### Godot → JavaScript (Incoming)

From GDScript:

```gdscript
# Send input event to JS
_notify_js_input_event("tap", x, y, entity_id)

# Send collision event
_notify_js_collision(entity_a, entity_b, impulse)

# Send entity lifecycle events
_notify_js_entity_spawned(entity_id)
_notify_js_entity_destroyed(entity_id)
```

JavaScript receives via callbacks:

```typescript
// Subscribe to input
bridge.onInputEvent((type, x, y, entityId) => {
  console.log(`Input: ${type} at (${x}, ${y}), entity: ${entityId}`);
});

// Subscribe to collisions
bridge.onCollision((entityA, entityB, impulse) => {
  console.log(`Collision: ${entityA} hit ${entityB}`);
});
```

---

## Key Bridge Files

| Component | Location | Purpose |
|-----------|----------|---------|
| **GodotBridge** | `app/lib/godot/GodotBridge.ts` | Main TypeScript bridge class |
| **Native Runtime** | `app/lib/game-engine/GameRuntime.native.tsx` | Native game component |
| **Web Runtime** | `app/lib/game-engine/GameRuntime.web.tsx` | Web game component |
| **Input Manager** | `app/lib/game-engine/InputEntityManager.ts` | Input event handling |
| **Debug Bridge** | `app/lib/game-engine/debug/GodotDebugBridge.ts` | Inspector integration |
| **GameBridge GD** | `godot_project/scripts/bridge/GameBridge.gd` | Godot-side bridge |
| **Entity Manager** | `godot_project/scripts/entities/EntityManager.gd` | Godot entity lifecycle |
| **Input Handler** | `godot_project/scripts/input/InputManager.gd` | Godot input processing |

---

## Input Event Flow

How touch/mouse input flows through the system:

```
User touches screen
        ↓
┌──────────────────┐
│  Godot Input     │  _input(event) in InputManager.gd
│  System          │  - Converts screen to world coords
└────────┬─────────┘  - Performs physics raycast
         ↓
┌──────────────────┐
│  GameBridge.gd   │  _notify_js_input_event()
│                  │  - Sends JSON to JavaScript
└────────┬─────────┘
         ↓
┌──────────────────┐
│  GodotBridge.ts  │  onInputEvent callback
│                  │  - Dispatches to game engine
└────────┬─────────┘
         ↓
┌──────────────────┐
│  InputEntityMgr  │  Processes input for behaviors
│  RulesEvaluator  │  Triggers rules based on input
└──────────────────┘
```

See detailed flow: `INPUT_EVENT_FLOW.md`

---

## Coordinate System

Critical for correct entity positioning:

### Screen Coordinates (Pixels)
- Origin: Top-left (0, 0)
- X increases right
- Y increases down
- Used for: Touch input, UI positioning

### World Coordinates (Meters)
- Origin: Center of game world (0, 0)
- X increases right
- Y increases down (same as screen)
- Used for: Physics, entity positions, game logic

### Conversion

```typescript
// Screen → World
worldX = (screenX - screenWidth/2) / pixelsPerMeter;
worldY = (screenY - screenHeight/2) / pixelsPerMeter;

// World → Screen
screenX = worldX * pixelsPerMeter + screenWidth/2;
screenY = worldY * pixelsPerMeter + screenHeight/2;
```

See complete guide: `docs/godot/COORDINATE_SYSTEM_GUIDE.md`

---

## Debug Bridge (Inspector Integration)

The debug bridge enables the Game Inspector MCP to control games:

```typescript
// Available on window.__GAME_RUNTIME__ in web builds

// Query entities
__GAME_RUNTIME__.query('.peg')              // All pegs
__GAME_RUNTIME__.query('#ball-1')           // Specific entity
__GAME_RUNTIME__.query('[template=bluePeg]') // By template

// Get/Set properties
__GAME_RUNTIME__.getProps('ball-1', ['transform.position'])
__GAME_RUNTIME__.setProps('ball-1', { 'transform.position.x': 5 })

// Entity lifecycle
__GAME_RUNTIME__.spawn('bluePeg', { x: 0, y: 5 })
__GAME_RUNTIME__.destroy('ball-1')
__GAME_RUNTIME__.clone('bluePeg-0', { x: 1, y: 0 })

// Time control
__GAME_RUNTIME__.pause()
__GAME_RUNTIME__.step(1)  // Advance 1 frame
__GAME_RUNTIME__.resume()

// Physics queries
__GAME_RUNTIME__.raycast({ from: {x: 0, y: 8}, to: {x: 0, y: -8} })
__GAME_RUNTIME__.queryPoint({ x: 0, y: 0 })
```

See full API: `docs/godot/debug-bridge-all-bugs-fixed.md`

---

## Platform-Specific Notes

### iOS Native

- Bridge via native module (`RCTGodotModule`)
- Godot embedded as native view
- Full physics and rendering
- File: `app/ios/Slopcade/RCTGodotModule.m`

### Android Native

- Bridge via native module
- Godot embedded as native view
- Full physics and rendering
- File: `app/android/.../GodotModule.java`

### Web (HTML5)

- Godot compiled to WebAssembly
- Bridge via JavaScript interop
- Slightly different API surface
- File: `app/lib/game-engine/GameRuntime.web.tsx`

### Desktop (Dev)

- Godot runs standalone
- Bridge via WebSocket
- Used for rapid iteration

---

## Build Configuration

### Exporting Godot Projects

```bash
# Export for iOS
cd godot_project
godot --export-release "iOS" ../app/ios/godot_export.xcframework

# Export for Android
godot --export-release "Android" ../app/android/app/src/main/assets/godot_export.aar

# Export for Web
godot --export-release "Web" ../app/public/godot_export/
```

### Web Export Settings

In Godot Export settings:
- **Custom Release Template**: Use optimized build
- **Headless**: Disabled (we need rendering)
- **JavaScript**: Export as ES6 module
- **Threads**: Enabled (for physics)

---

## Common Issues

### Issue: Entities not appearing in native builds

**Solution**: Check coordinate conversion. Native uses different screen scale.

### Issue: Input not working on web

**Solution**: Ensure Godot canvas has `pointer-events: auto` in CSS.

### Issue: Images not loading on native

**Solution**: Use absolute URLs. Native can't resolve relative paths the same way as web.
See: `docs/godot/NATIVE_IMAGE_LOADING_ISSUE.md`

### Issue: Bridge messages not received

**Solution**: Check that bridge is initialized before sending messages:

```typescript
await bridge.waitForConnection();
bridge.spawnEntity('ball', 0, 0);
```

### Issue: Debug bridge APIs return null

**Solution**: Ensure running in web mode with `__GAME_RUNTIME__` exposed:

```typescript
// In GameRuntime.web.tsx
if (typeof window !== 'undefined') {
  (window as any).__GAME_RUNTIME__ = debugBridge;
}
```

---

## Performance Tips

1. **Batch entity spawns**: Spawn multiple entities in one frame when possible
2. **Use sensors for triggers**: `isSensor: true` for hit detection without physics response
3. **Limit raycasts**: Don't raycast every frame
4. **Pool entities**: Reuse destroyed entities instead of creating new ones
5. **Native vs Web**: Native has better physics performance

---

## Testing Bridge Code

```bash
# Run bridge unit tests
pnpm test bridge

# Test specific bridge component
pnpm test GodotBridge

# Run integration tests with Godot
pnpm test:integration
```

---

## Related Skills

| Skill | Use When Working On |
|-------|---------------------|
| `slopcade-game-engine` | Game logic, entities, physics, rules |
| `game-inspector` | Debugging via MCP bridge tools |
| `slopcade-asset-generation` | Image assets displayed in Godot |
| `slopcade-3d-assets` | 3D models rendered in Godot |

---

## Key GDScript Files

| File | Purpose |
|------|---------|
| `godot_project/scripts/bridge/GameBridge.gd` | Main bridge interface |
| `godot_project/scripts/entities/EntityManager.gd` | Entity lifecycle |
| `godot_project/scripts/input/InputManager.gd` | Input handling |
| `godot_project/scripts/physics/PhysicsWorld.gd` | Physics configuration |
| `godot_project/scenes/main.tscn` | Main game scene |

---

## Checklist for Bridge Work

- [ ] Bridge connection established before sending messages
- [ ] Entity IDs are unique and valid
- [ ] Coordinates properly converted (screen ↔ world)
- [ ] Error handling for missing entities
- [ ] Cleanup on component unmount
- [ ] Platform-specific code tested (iOS, Android, Web)
- [ ] Debug bridge APIs tested in web build
- [ ] Memory leaks checked (entity cleanup)

---

## Version

Last updated: 2026-01-29  
Skill version: 1.0.0
