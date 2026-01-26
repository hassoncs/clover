# Godot Migration Plan

## Overview

This document outlines the complete plan to migrate Slopcade's physics rendering from **Skia + Box2D** to **Godot 4** while keeping all game logic in TypeScript.

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│  (TypeScript game logic, AI generation, UI)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ GameDefinition JSON
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    GodotBridge                               │
│  Platform-specific: Native (JSI) or Web (iframe/postMessage)│
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Godot 4 Runtime                           │
│  - GameBridge.gd (JSON parser, entity factory)              │
│  - Physics (RigidBody2D, StaticBody2D)                      │
│  - Rendering (Polygon2D, Sprite2D)                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Insight

Godot is **just a runtime** - no game-specific code lives in Godot. The ~15KB PCK file contains only:
- GameBridge.gd (JSON → physics nodes factory)
- Main scene with camera and UI layer

All game definitions, behaviors, and rules are generated/processed in TypeScript and sent as JSON.

### Automation

Godot exports are automatically handled during development:
- **Automatic Rebuilds**: The `scripts/export-godot.mjs` script watches the `godot_project/` directory and automatically rebuilds the Web (WASM) and Native (.pck) exports whenever `.gd`, `.tscn`, `.tres`, or `.gdshader` files are modified.
- **DevMux Integration**: This watcher is managed as a background service via `devmux`. It starts automatically when you run `pnpm dev`.
- **Manual Export**: If needed, you can trigger a manual export with `pnpm godot:export`.

---

## Phase 1: Core Rendering Primitives

**Goal:** Render all basic shapes that exist in the current Skia renderer.

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `godot_project/scripts/GameBridge.gd` | Modify | Add support for all sprite types |
| `app/lib/godot/types.ts` | Modify | Add all sprite/entity type definitions |

### Sprite Types to Support

| Type | Current (Skia) | Godot Implementation |
|------|---------------|---------------------|
| `rect` | `drawRect()` | `Polygon2D` with 4 vertices |
| `circle` | `drawCircle()` | `Polygon2D` with 32 vertices |
| `polygon` | `drawPath()` | `Polygon2D` with custom vertices |
| `image` | `drawImage()` | `Sprite2D` with texture |
| `text` | `drawText()` | `Label` node |

### Implementation Details

#### 1.1 Rectangle (Complete ✅)
```gdscript
# Already implemented in _add_sprite
var polygon = Polygon2D.new()
polygon.polygon = PackedVector2Array([
    Vector2(-hw, -hh), Vector2(hw, -hh),
    Vector2(hw, hh), Vector2(-hw, hh)
])
polygon.color = color
```

#### 1.2 Circle (Complete ✅)
```gdscript
# Already implemented
var points: PackedVector2Array = []
for i in range(32):
    var angle = i * TAU / 32
    points.append(Vector2(cos(angle), sin(angle)) * radius)
polygon.polygon = points
```

#### 1.3 Polygon (Needs Implementation)
```gdscript
# Convert vertices array from JSON
var points: PackedVector2Array = []
for v in sprite_data.get("vertices", []):
    points.append(Vector2(v.x, v.y) * pixels_per_meter)
polygon.polygon = points
```

#### 1.4 Image/Texture (Needs Implementation)
```gdscript
func _add_image_sprite(node: Node2D, sprite_data: Dictionary) -> void:
    var sprite = Sprite2D.new()
    var url = sprite_data.get("url", "")
    # For bundled assets, use res://
    # For remote URLs, use HTTPRequest to download
    if url.begins_with("res://"):
        sprite.texture = load(url)
    else:
        # Queue async download
        _queue_texture_download(sprite, url)
    sprite.scale = Vector2(
        sprite_data.get("width", 1.0) / sprite.texture.get_width(),
        sprite_data.get("height", 1.0) / sprite.texture.get_height()
    )
    node.add_child(sprite)
```

#### 1.5 Text (Needs Implementation)
```gdscript
func _add_text_sprite(node: Node2D, sprite_data: Dictionary) -> void:
    var label = Label.new()
    label.text = sprite_data.get("text", "")
    label.add_theme_font_size_override("font_size", sprite_data.get("fontSize", 16))
    label.add_theme_color_override("font_color", Color.from_string(sprite_data.get("color", "#FFFFFF"), Color.WHITE))
    label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    node.add_child(label)
```

---

## Phase 2: Physics Body Types

**Goal:** Support all Box2D body types and properties.

### Body Type Mapping

| Box2D | Godot | Notes |
|-------|-------|-------|
| `dynamic` | `RigidBody2D` | Full physics simulation |
| `static` | `StaticBody2D` | Immovable colliders |
| `kinematic` | `CharacterBody2D` or `AnimatableBody2D` | Script-controlled movement |

### Physics Properties Mapping

| Property | Box2D | Godot |
|----------|-------|-------|
| `density` | fixture.density | mass = density * area |
| `friction` | fixture.friction | PhysicsMaterial.friction |
| `restitution` | fixture.restitution | PhysicsMaterial.bounce |
| `linearDamping` | body.linearDamping | RigidBody2D.linear_damp |
| `angularDamping` | body.angularDamping | RigidBody2D.angular_damp |
| `fixedRotation` | body.fixedRotation | RigidBody2D.lock_rotation |
| `bullet` | body.bullet | RigidBody2D.continuous_cd |
| `isSensor` | fixture.isSensor | Area2D instead of body |
| `gravityScale` | body.gravityScale | RigidBody2D.gravity_scale |

### Shape Type Mapping

| Shape | Box2D | Godot |
|-------|-------|-------|
| `box` | b2PolygonShape (rect) | RectangleShape2D |
| `circle` | b2CircleShape | CircleShape2D |
| `polygon` | b2PolygonShape | ConvexPolygonShape2D |
| `edge` | b2EdgeShape | SegmentShape2D |
| `chain` | b2ChainShape | ConcavePolygonShape2D |

### Collision Filtering

| Box2D | Godot |
|-------|-------|
| `categoryBits` | collision_layer |
| `maskBits` | collision_mask |
| `groupIndex` | (custom implementation) |

---

## Phase 3: Behaviors System

**Goal:** Implement game behaviors that modify entity state each frame.

### Approach

Behaviors run in TypeScript and send commands to Godot via the bridge. Godot is stateless - it just applies transforms/forces.

### Behaviors to Migrate

| Behavior | Implementation |
|----------|---------------|
| `oscillate` | TS calculates position, sends `setPosition(entityId, x, y)` |
| `rotate` | TS calculates angle, sends `setRotation(entityId, angle)` |
| `follow` | TS calculates velocity, sends `setLinearVelocity(entityId, vx, vy)` |
| `spawn` | TS calls `spawnEntity(templateId, x, y)` |
| `destroy` | TS calls `destroyEntity(entityId)` |
| `applyForce` | TS calls `applyForce(entityId, fx, fy)` |
| `applyImpulse` | TS calls `applyImpulse(entityId, ix, iy)` |

### New Bridge Methods Needed

```typescript
interface GodotBridge {
  // Existing
  loadGame(definition: GameDefinition): Promise<void>;
  spawnEntity(templateId: string, x: number, y: number): string;
  destroyEntity(entityId: string): void;
  
  // Transform control
  setPosition(entityId: string, x: number, y: number): void;
  setRotation(entityId: string, angle: number): void;
  setTransform(entityId: string, x: number, y: number, angle: number): void;
  
  // Physics control
  setLinearVelocity(entityId: string, vx: number, vy: number): void;
  setAngularVelocity(entityId: string, omega: number): void;
  applyForce(entityId: string, fx: number, fy: number): void;
  applyImpulse(entityId: string, ix: number, iy: number): void;
  
  // State queries
  getTransform(entityId: string): { x: number, y: number, angle: number } | null;
  getAllTransforms(): Record<string, { x: number, y: number, angle: number }>;
  
  // Events
  onCollision(callback: (a: string, b: string, impulse: number) => void): () => void;
  onEntityDestroyed(callback: (entityId: string) => void): () => void;
}
```

---

## Phase 4: Input Handling

**Goal:** Forward touch/mouse events from React Native to Godot.

### Input Types

| Input | React Native | Godot |
|-------|--------------|-------|
| Touch start | `onTouchStart` | Custom event via bridge |
| Touch move | `onTouchMove` | Custom event via bridge |
| Touch end | `onTouchEnd` | Custom event via bridge |
| Mouse click | `onClick` | Custom event via bridge |

### Implementation

React Native captures input events on the GodotView and forwards them:

```typescript
// In GodotView
<View 
  onTouchStart={(e) => bridge.sendInput('touch_start', { x, y })}
  onTouchMove={(e) => bridge.sendInput('touch_move', { x, y })}
  onTouchEnd={(e) => bridge.sendInput('touch_end', { x, y })}
>
```

Godot receives and processes:

```gdscript
func _js_send_input(args: Array) -> void:
    var type = str(args[0])
    var x = float(args[1])
    var y = float(args[2])
    match type:
        "touch_start":
            # Emit signal or call game logic
            input_received.emit(type, Vector2(x, y))
```

---

## Phase 5: Joints and Constraints

**Goal:** Support physics joints for complex interactions.

### Joint Type Mapping

| Box2D | Godot |
|-------|-------|
| `RevoluteJoint` | PinJoint2D |
| `DistanceJoint` | DampedSpringJoint2D |
| `PrismaticJoint` | SliderJoint (via script) |
| `WeldJoint` | (merge nodes or use very stiff spring) |
| `RopeJoint` | DampedSpringJoint2D (max length only) |
| `PulleyJoint` | (custom implementation) |
| `GearJoint` | (custom implementation) |
| `WheelJoint` | PinJoint2D + SliderJoint |
| `MotorJoint` | PinJoint2D with motor |
| `MouseJoint` | (custom - apply forces to target) |

### Joint Definition in GameDefinition

```typescript
interface JointDefinition {
  type: 'revolute' | 'distance' | 'prismatic' | 'weld' | 'rope';
  entityA: string;
  entityB: string;
  anchorA?: Vec2;
  anchorB?: Vec2;
  // Type-specific properties
  lowerAngle?: number;
  upperAngle?: number;
  enableLimit?: boolean;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
  length?: number;
  dampingRatio?: number;
  frequencyHz?: number;
}
```

---

## Phase 6: Visual Effects

**Goal:** Support visual enhancements beyond basic shapes.

### Effects to Support

| Effect | Implementation |
|--------|---------------|
| Shadows | `CanvasModulate` or shader |
| Glow | `Light2D` with texture |
| Trail | `Line2D` updated each frame |
| Particles | `GPUParticles2D` |
| Parallax | `ParallaxBackground` + `ParallaxLayer` |

### Parallax Implementation

```gdscript
func _setup_parallax(layers: Array) -> void:
    var bg = ParallaxBackground.new()
    for layer_data in layers:
        var layer = ParallaxLayer.new()
        layer.motion_scale = Vector2(layer_data.speed, layer_data.speed)
        var sprite = Sprite2D.new()
        sprite.texture = load(layer_data.texture)
        layer.add_child(sprite)
        bg.add_child(layer)
    add_child(bg)
```

---

## Phase 7: Audio

**Goal:** Play sound effects and music.

### Audio System

```gdscript
var audio_players: Dictionary = {}

func play_sound(sound_id: String, volume: float = 1.0) -> void:
    if not audio_players.has(sound_id):
        var player = AudioStreamPlayer.new()
        player.stream = load("res://sounds/" + sound_id + ".ogg")
        add_child(player)
        audio_players[sound_id] = player
    var player = audio_players[sound_id]
    player.volume_db = linear_to_db(volume)
    player.play()

func _js_play_sound(args: Array) -> void:
    play_sound(str(args[0]), float(args[1]) if args.size() > 1 else 1.0)
```

---

## File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `godot_project/scripts/JointFactory.gd` | Create physics joints |
| `godot_project/scripts/EffectsManager.gd` | Visual effects (particles, trails) |
| `godot_project/scripts/AudioManager.gd` | Sound playback |
| `godot_project/scripts/TextureCache.gd` | Async texture loading |
| `app/lib/godot/behaviors/` | TS behavior implementations |

### Files to Modify

| File | Changes |
|------|---------|
| `godot_project/scripts/GameBridge.gd` | Add all sprite types, joints, effects |
| `godot_project/project.godot` | Add audio bus, rendering settings |
| `app/lib/godot/types.ts` | Full type definitions |
| `app/lib/godot/GodotBridge.web.ts` | New methods |
| `app/lib/godot/GodotBridge.native.ts` | New methods |
| `app/lib/game-engine/GameRuntime.tsx` | Switch to Godot renderer |

### Files to Remove (After Migration)

| File | Reason |
|------|--------|
| `app/lib/physics/` | Replaced by Godot physics |
| `app/lib/physics2d/` | Replaced by Godot physics |
| `packages/physics/` | Replaced by Godot physics |
| `app/lib/game-engine/rendering/SkiaRenderer.tsx` | Replaced by Godot |
| `react-native-box2d` dependency | No longer needed |
| `box2d-wasm` dependency | No longer needed |

---

## Migration Checklist

### Phase 1: Core Rendering ✅
- [x] Rectangle primitives
- [x] Circle primitives
- [x] Polygon primitives
- [x] Image/texture sprites (with async HTTP loading)
- [x] Text rendering (Label nodes)
- [x] Opacity/alpha support
- [x] Z-ordering

### Phase 2: Physics Bodies ⏳
- [x] Dynamic bodies (RigidBody2D)
- [x] Static bodies (StaticBody2D)
- [x] Kinematic bodies (CharacterBody2D)
- [x] Box shapes
- [x] Circle shapes
- [ ] Polygon shapes
- [ ] Edge/chain shapes
- [ ] Collision filtering
- [ ] Sensors (Area2D)

### Phase 3: Behaviors ⏳
- [x] spawnEntity
- [x] destroyEntity
- [x] setLinearVelocity
- [x] setAngularVelocity
- [x] applyForce
- [x] applyImpulse
- [ ] setPosition (kinematic)
- [ ] setRotation (kinematic)
- [ ] getTransform (state query)
- [ ] getAllTransforms (bulk state)

### Phase 4: Input
- [ ] Touch forwarding
- [ ] Touch-to-world coordinate conversion
- [ ] Entity hit testing

### Phase 5: Joints
- [ ] RevoluteJoint (PinJoint2D)
- [ ] DistanceJoint (DampedSpringJoint2D)
- [ ] PrismaticJoint
- [ ] WeldJoint
- [ ] RopeJoint

### Phase 6: Effects
- [ ] Particle systems
- [ ] Trails
- [ ] Parallax backgrounds
- [ ] Camera shake

### Phase 7: Audio
- [ ] Sound effect playback
- [ ] Music playback
- [ ] Volume control

### Phase 8: Integration
- [ ] Replace GameRuntime renderer
- [ ] Migrate all existing games
- [ ] Performance benchmarking
- [ ] Remove old physics code

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Entity count | 200+ | Stable 60fps |
| Physics bodies | 100+ | Active simulation |
| Draw calls | < 50 | Batched rendering |
| Memory (WASM) | < 50MB | Web bundle |
| Load time | < 2s | Initial game load |
| PCK size | < 50KB | Godot game pack |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Godot WASM size (38MB) | Lazy load, show loading state |
| iOS native integration issues | Keep Skia fallback during transition |
| Performance regression | Benchmark against Box2D before removing |
| Missing Box2D features | Document gaps, implement workarounds |

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 (Rendering) | 2-3 days | None |
| Phase 2 (Physics) | 2-3 days | Phase 1 |
| Phase 3 (Behaviors) | 2-3 days | Phase 2 |
| Phase 4 (Input) | 1 day | Phase 3 |
| Phase 5 (Joints) | 2-3 days | Phase 2 |
| Phase 6 (Effects) | 2-3 days | Phase 1 |
| Phase 7 (Audio) | 1 day | None |
| Phase 8 (Integration) | 3-5 days | All |
| **Total** | **15-21 days** | |

---

## Next Steps

1. Complete Phase 1 remaining items (polygon, image, text)
2. Test with existing game definitions
3. Benchmark physics performance
4. Begin Phase 2 collision filtering
5. Implement behavior bridge methods
