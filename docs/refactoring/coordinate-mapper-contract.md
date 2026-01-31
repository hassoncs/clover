# Coordinate Mapper Contract

**Created**: 2026-01-31
**Purpose**: Define authoritative coordinate conversion contract for Godot ↔ TypeScript communication

## Coordinate Spaces

### 1. Game Space (TypeScript)
- **Origin**: Center of world (0, 0)
- **X-axis**: Right is positive
- **Y-axis**: Up is positive
- **Units**: Meters (physics units)
- **Used by**: EntityManager, behaviors, game definitions, physics calculations

### 2. Godot Space (GDScript)
- **Origin**: Top-left (0, 0) relative to camera
- **X-axis**: Right is positive
- **Y-axis**: Down is positive
- **Units**: Pixels
- **Used by**: Node2D positions, physics queries, rendering

### 3. Screen Space (TypeScript)
- **Origin**: Top-left of viewport (0, 0)
- **X-axis**: Right is positive
- **Y-axis**: Down is positive
- **Units**: Pixels
- **Used by**: Input handling, UI positioning, camera calculations

## Conversion Parameters

| Parameter | Default | Source |
|-----------|---------|--------|
| `pixelsPerMeter` | 50 | `world.pixelsPerMeter` in GameDefinition |

## Conversion Formulas

### Game ↔ Godot Position

```
gameToGodot(pos, ppm):
  x_godot = pos.x * ppm
  y_godot = -pos.y * ppm   // Y flip

godotToGame(pos, ppm):
  x_game = pos.x / ppm
  y_game = -pos.y / ppm    // Y flip
```

### Game ↔ Godot Vector (velocity, impulse, force)

```
gameToGodotVec(vec, ppm):
  x_godot = vec.x * ppm
  y_godot = -vec.y * ppm   // Y flip

godotToGameVec(vec, ppm):
  x_game = vec.x / ppm
  y_game = -vec.y / ppm    // Y flip
```

**Note**: Vector conversion uses the same formula as position conversion because both scale by `ppm` and flip Y.

### Screen ↔ World (via Camera)

```
worldToScreen(worldPos, camera, viewport, ppm):
  screenX = (worldPos.x - camera.x) * ppm * zoom + viewport.width / 2
  screenY = (-worldPos.y + camera.y) * ppm * zoom + viewport.height / 2

screenToWorld(screenPos, camera, viewport, ppm):
  worldX = (screenPos.x - viewport.width / 2) / (ppm * zoom) + camera.x
  worldY = -(screenPos.y - viewport.height / 2) / (ppm * zoom) + camera.y
```

## Numeric Examples

### Position Conversion (ppm = 50)

| Game Pos | Godot Pos | Notes |
|----------|-----------|-------|
| (0, 0) | (0, 0) | Origin |
| (5, 10) | (250, -500) | Positive quadrant |
| (-3, -7) | (-150, 350) | Negative quadrant |
| (1.5, 2.5) | (75, -125) | Fractional values |

### Position Conversion (ppm = 100)

| Game Pos | Godot Pos | Notes |
|----------|-----------|-------|
| (0, 0) | (0, 0) | Origin |
| (5, 10) | (500, -1000) | Double scale |
| (-3, -7) | (-300, 700) | Double scale |

### Vector Conversion (ppm = 50)

| Game Vec | Godot Vec | Notes |
|----------|-----------|-------|
| (10, 0) | (500, 0) | Horizontal velocity |
| (0, 10) | (0, -500) | Upward velocity |
| (-5, -5) | (-250, 250) | Diagonal |

### Round-Trip Verification

```
// Must hold for all values within tolerance
godotToGame(gameToGodot(pos, ppm), ppm) ≈ pos
gameToGodot(godotToGame(pos, ppm), ppm) ≈ pos
```

## Precision and Tolerance

| Context | Tolerance | Rationale |
|---------|-----------|-----------|
| Position | 1e-6 | Float precision after division |
| Velocity | 1e-6 | Same as position |
| Tests | 1e-6 | Epsilon for assertions |

**Note**: Conversion is mathematically exact (no rounding), but floating-point representation may introduce tiny errors.

## Current Implementation Locations

### Godot (Authoritative)

| File | Status |
|------|--------|
| `scripts/bridge/CoordinateUtils.gd` | **Authoritative static helpers** |
| `scripts/GameBridge.gd` | Instance wrappers calling CoordinateUtils |
| `scripts/gamebridge/GB_Coords.gd` | Duplicate - TO BE REMOVED |

**Problem**: Multiple files have instance wrappers that just call `CoordinateUtils`. This adds overhead and confusion.

### TypeScript (Scattered)

| File | Functions | Status |
|------|-----------|--------|
| `lib/godot/debug/GodotDebugBridge.ts` | `worldToScreen`, `screenToWorld` | Inline implementation |
| `lib/game-engine/CameraSystem.ts` | `screenToWorld`, `worldToScreen` | Camera-relative |
| `lib/game-engine/ViewportSystem.ts` | `screenToWorld`, `worldToScreen` | Viewport-relative |
| `lib/godot/GodotBridge.web.ts` | `screenToWorld` | Calls Godot |
| `lib/godot/GodotBridge.native.ts` | `screenToWorld` | Calls Godot |

**Problem**: No centralized `gameToGodot`/`godotToGame` helpers in TypeScript. Conversions are embedded in different systems.

## Migration Plan

### Phase 1: Create Centralized Helpers

**Godot** (minimal change - already centralized):
- Keep `CoordinateUtils.gd` as authoritative
- Verify all callers use it (some already do, some use GameBridge wrappers)

**TypeScript** (new file):
- Create `lib/godot/coordinateUtils.ts`:
  ```typescript
  export function gameToGodot(pos: Vec2, ppm: number): Vec2
  export function godotToGame(pos: Vec2, ppm: number): Vec2
  export function gameToGodotVec(vec: Vec2, ppm: number): Vec2
  export function godotToGameVec(vec: Vec2, ppm: number): Vec2
  ```

### Phase 2: Add Round-Trip Tests

Create `lib/godot/__tests__/coordinateUtils.test.ts`:
- Test all conversion functions
- Include edge cases: zero, negative, large values, fractional ppm
- Verify round-trip within tolerance

### Phase 3: Migrate Call Sites

TypeScript files to update:
1. `lib/godot/debug/GodotDebugBridge.ts` - Replace inline conversions
2. `lib/game-engine/CameraSystem.ts` - Use shared helpers
3. `lib/game-engine/ViewportSystem.ts` - Use shared helpers

Godot files already using `CoordinateUtils`:
- `PhysicsController.gd`
- `PhysicsQueries.gd`
- `JointManager.gd`
- `ParticleManager.gd`
- `AudioManager.gd`
- `CameraController.gd`
- `EntityManager.gd`
- Debug modules

Godot files to migrate (using GameBridge wrappers):
- `CollisionSystem.gd` - uses `_game_bridge.godot_to_game_pos`
- `InputSystem.gd` - uses `_game_bridge.godot_to_game_pos`
- `JSBridge.gd` - uses `_game_bridge.game_to_godot_*`
- `PropertyCollector.gd` - uses `game_bridge.godot_to_game_*`

### Phase 4: Cleanup

- Remove duplicate instance wrappers from `GameBridge.gd` (after all callers migrated)
- Remove `GB_Coords.gd` if unused
- Update documentation

## Backward Compatibility

During migration:
- Keep `GameBridge.game_to_godot_pos()` etc. wrappers working
- They delegate to `CoordinateUtils.*` (already do)
- Mark as deprecated once direct `CoordinateUtils` usage is preferred

After migration:
- Remove GameBridge wrapper methods
- All code calls `CoordinateUtils.*` directly

## Success Criteria

- [ ] All coordinate conversions in both codebases use centralized helpers
- [ ] Round-trip tests pass for all conversion functions
- [ ] No duplicate conversion logic
- [ ] Documentation updated with authoritative reference
- [ ] Zero regression in existing behavior
