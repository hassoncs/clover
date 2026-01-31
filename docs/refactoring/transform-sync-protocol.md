# Transform Sync Protocol Design

**Created**: 2026-01-31
**Purpose**: Define event-driven + on-demand + tracked transform sync protocol

## Current Behavior (Baseline)

### Full Sync Every Frame
- `_physics_process` calls `_notify_transform_sync()` every tick
- Sends ALL entity transforms as JSON
- Frequency: ~60fps (every physics frame)
- Payload: `{entityId: {x, y, angle}, ...}` for ALL entities

### Problems
1. **Bandwidth**: Syncing 100+ entities at 60fps is wasteful
2. **Most transforms don't change**: Static entities, sleeping bodies
3. **Events already have context**: Collisions know which entities involved
4. **TypeScript often doesn't need transforms**: Behavior logic runs on Godot side

## New Protocol Design

### Three Sync Modes

| Mode | Trigger | Entities | Use Case |
|------|---------|----------|----------|
| **Event-Driven** | Collision/spawn/destroy | Involved entities only | Default, always on |
| **On-Demand** | TS requests | Specific entity IDs | Debug, UI updates |
| **Tracked** | Configurable interval | Watch list only | Camera follow, HUD |

### Mode 1: Event-Driven (Always On)

Events that already fire now include transforms of involved entities:

**Collision Event**:
```json
{
  "type": "collision",
  "entityA": "ball",
  "entityB": "wall",
  "impulse": 5.2,
  "transforms": {
    "ball": {"x": 3.0, "y": 2.5, "angle": 0.1},
    "wall": {"x": 0, "y": -5, "angle": 0}
  }
}
```

**Spawn Event**:
```json
{
  "type": "spawn",
  "entityId": "coin_1",
  "template": "coin",
  "transform": {"x": 5, "y": 3, "angle": 0}
}
```

**Destroy Event**:
```json
{
  "type": "destroy",
  "entityId": "coin_1",
  "lastTransform": {"x": 5.1, "y": 2.9, "angle": 0.2}
}
```

**Sensor Events**:
```json
{
  "type": "sensorBegin",
  "sensorId": "goal_zone",
  "entityId": "ball",
  "transforms": {
    "goal_zone": {"x": 0, "y": -10, "angle": 0},
    "ball": {"x": 0.5, "y": -9.5, "angle": 0.3}
  }
}
```

### Mode 2: On-Demand Queries

TypeScript can request transforms for specific entities:

**Single Entity**:
```typescript
// Request
bridge.getTransform("ball")

// Response
{"x": 3.0, "y": 2.5, "angle": 0.1, "scaleX": 1, "scaleY": 1}
```

**Multiple Entities**:
```typescript
// Request
bridge.getTransforms(["ball", "paddle", "score_display"])

// Response
{
  "ball": {"x": 3.0, "y": 2.5, "angle": 0.1},
  "paddle": {"x": 0, "y": -8, "angle": 0},
  "score_display": null  // Entity doesn't exist
}
```

### Mode 3: Tracked Sync (Opt-In)

TypeScript registers entities for periodic sync:

**Registration**:
```typescript
// Watch specific entities at custom interval
bridge.setTrackedEntities(["player", "camera_target"], {
  interval: 100  // ms, default: 16 (~60fps)
})

// Or use existing setWatchConfig
bridge.setWatchConfig({
  enabled: true,
  entityIds: ["player"],
  interval: 50
})
```

**Callback** (only for tracked entities):
```typescript
bridge.onTransformSync((data) => {
  // data only contains tracked entities
  // {"player": {"x": 1, "y": 2, "angle": 0}}
})
```

**Clear Tracking**:
```typescript
bridge.setTrackedEntities([])  // Stop tracked sync
```

## API Changes

### Godot Side (GameBridge.gd)

**New Handlers**:
```gdscript
# On-demand transform query
func getTransform(entity_id: String) -> Dictionary
func getTransforms(entity_ids: Array) -> Dictionary

# Tracked sync configuration
func setTrackedEntities(entity_ids: Array, config: Dictionary = {}) -> void
func getTrackedEntities() -> Array
```

**Modified Behavior**:
```gdscript
# _physics_process no longer calls full sync by default
func _physics_process(delta: float) -> void:
    # Only sync tracked entities (if any configured)
    if _tracked_entities.size() > 0:
        _sync_tracked_transforms()
```

**Event Emission Changes**:
```gdscript
# Include transforms in collision callback
func _emit_collision(entity_a: String, entity_b: String, impulse: float) -> void:
    var payload = {
        "entityA": entity_a,
        "entityB": entity_b,
        "impulse": impulse,
        "transforms": _get_transforms([entity_a, entity_b])
    }
    _js_collision_callback.call(JSON.stringify(payload))
```

### TypeScript Side (GodotBridge)

**New Methods**:
```typescript
interface GodotBridge {
  // On-demand
  getTransform(entityId: string): Promise<Transform | null>
  getTransforms(entityIds: string[]): Promise<Record<string, Transform | null>>
  
  // Tracked sync
  setTrackedEntities(entityIds: string[], config?: { interval?: number }): void
  getTrackedEntities(): string[]
}
```

**Modified Callbacks**:
```typescript
interface CollisionEvent {
  entityA: string
  entityB: string
  impulse: number
  transforms: Record<string, Transform>  // NEW
}

interface SpawnEvent {
  entityId: string
  template: string
  transform: Transform  // NEW
}
```

## Backward Compatibility

### Legacy Full Sync (Config Flag)

Keep old behavior available for rollback:

```gdscript
var _legacy_full_sync: bool = false

func enableLegacyFullSync(enabled: bool) -> void:
    _legacy_full_sync = enabled

func _physics_process(delta: float) -> void:
    if _legacy_full_sync:
        _notify_transform_sync()  # Old full sync
    elif _tracked_entities.size() > 0:
        _sync_tracked_transforms()  # New tracked sync
```

TypeScript can enable legacy mode:
```typescript
bridge.enableLegacyFullSync(true)  // Fallback if issues
```

### Deprecation Timeline

1. **Phase 1** (this PR): Add new APIs, keep legacy default OFF
2. **Phase 2** (after testing): Warn when `onTransformSync` receives full sync
3. **Phase 3** (future): Remove legacy full sync, require tracked or on-demand

## Implementation Plan

### Godot Changes (SyncSystem.gd)

```gdscript
class_name SyncSystem
extends RefCounted

var _bridge: Node
var _tracked_entities: Array = []
var _sync_interval_ms: int = 16
var _last_sync_time: int = 0

func set_tracked_entities(entity_ids: Array, config: Dictionary = {}) -> void:
    _tracked_entities = entity_ids.duplicate()
    _sync_interval_ms = config.get("interval", 16)

func should_sync() -> bool:
    if _tracked_entities.is_empty():
        return false
    var now = Time.get_ticks_msec()
    if now - _last_sync_time >= _sync_interval_ms:
        _last_sync_time = now
        return true
    return false

func get_tracked_transforms() -> Dictionary:
    var result = {}
    for entity_id in _tracked_entities:
        var node = _bridge.get_entity_node(entity_id)
        if node:
            result[entity_id] = _bridge.get_entity_transform_dict(node)
    return result
```

### TypeScript Changes (GodotBridge)

```typescript
// types.ts
interface TransformSyncConfig {
  entityIds: string[]
  interval?: number  // ms, default 16
}

// GodotBridge.web.ts
setTrackedEntities(entityIds: string[], config?: { interval?: number }): void {
  this.call("setTrackedEntities", entityIds, config ?? {})
}

async getTransform(entityId: string): Promise<Transform | null> {
  return this.call("getTransform", entityId)
}

async getTransforms(entityIds: string[]): Promise<Record<string, Transform | null>> {
  return this.call("getTransforms", entityIds)
}
```

## Migration Guide

### For Behavior Authors

**Before** (relying on full sync):
```typescript
// Had access to all transforms via onTransformSync
bridge.onTransformSync((transforms) => {
  const ballPos = transforms["ball"]
  // Update UI
})
```

**After** (use tracked sync or on-demand):
```typescript
// Option 1: Track specific entities
bridge.setTrackedEntities(["ball"])
bridge.onTransformSync((transforms) => {
  const ballPos = transforms["ball"]  // Only tracked entities
})

// Option 2: Query when needed
const ballTransform = await bridge.getTransform("ball")

// Option 3: Get from collision events
bridge.onCollision((event) => {
  const ballPos = event.transforms["ball"]  // Included in event
})
```

## Performance Expectations

| Scenario | Before (Full Sync) | After (New Protocol) |
|----------|-------------------|---------------------|
| 100 entities, idle | 100 transforms/frame | 0 transforms/frame |
| 100 entities, 5 collisions/sec | 100 transforms/frame | ~10 transforms/sec |
| 100 entities, tracking 3 | 100 transforms/frame | 3 transforms/frame |
| Single transform query | N/A | 1 transform on-demand |

**Expected reduction**: 90%+ for typical games

## Success Criteria

- [ ] Event payloads include transforms for involved entities
- [ ] On-demand `getTransform()`/`getTransforms()` work
- [ ] Tracked sync only syncs registered entities
- [ ] Legacy full sync can be re-enabled via config
- [ ] No regressions in existing functionality
- [ ] Performance improvement measurable in test games
