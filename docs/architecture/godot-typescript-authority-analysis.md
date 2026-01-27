# Godot + TypeScript Architecture Analysis

> **Purpose**: Evaluate and redesign the Slopcade architecture for clear data authority, future live-editing support, and optimal performance.
>
> **Created**: 2026-01-27
> **Updated**: 2026-01-27 (Oracle consultation - refined approach)
> **Status**: Analysis Complete - Ready for Implementation

---

## Executive Summary

The Slopcade architecture implements a **hybrid TypeScript + Godot** game engine. This document establishes a clear authority model and provides actionable refactoring recommendations.

### The Authority Model (Final Decision)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHORITY BOUNDARY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TypeScript = DEFINITION AUTHORITY                                          │
│   ────────────────────────────────                                           │
│   • GameDefinition JSON (what SHOULD exist)                                  │
│   • Templates, rules, behaviors (the "source code")                          │
│   • Game state: score, lives, variables                                      │
│   • AI authoring, validation, hot-reload triggers                            │
│                                                                              │
│                              ════════════════                                │
│                              ║ JSON LOAD   ║  ──► One-time or incremental    │
│                              ║ + PATCHES   ║      (for live editing)         │
│                              ════════════════                                │
│                                     │                                        │
│                                     ▼                                        │
│   Godot = RUNTIME AUTHORITY                                                  │
│   ─────────────────────────                                                  │
│   • Entity existence (what DOES exist right now)                             │
│   • Physics state (positions, velocities, collisions)                        │
│   • Rendering, input, audio                                                  │
│   • Deterministic simulation tick                                            │
│                                                                              │
│                              ════════════════                                │
│                              ║ EVENTS      ║  ◄── Sync back to TS            │
│                              ════════════════                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principle

> **Once JSON is loaded into Godot, Godot becomes the runtime authority.**
> TypeScript maintains a **derived cache** (not source of truth) that is updated via Godot events.

### Refined Approach (from Oracle Consultation)

**Don't delete the TypeScript registry - downgrade it from "source of truth" to "derived cache/proxy".**

The TS `EntityManager` stays, but:
1. **TS cannot create entities locally** - it can only **request** spawns from Godot
2. **Godot confirms entity existence** via `entity_spawned` event
3. **TS registry becomes event-driven** - updated only from Godot events
4. **TS keeps useful indices** (tags, hierarchy) for O(1) game logic lookups

This gives us:
- ✅ Clear authority (Godot decides what exists)
- ✅ No bridge roundtrips for gameplay queries (TS has cached indices)
- ✅ Backward compatibility (existing code still works)
- ✅ Pool safety via generation/version tokens

---

## 1. Current State Analysis

### 1.1 The Core Problem: Dual Authority

Today, **both sides maintain entity registries**:

| Location | Code | Problem |
|----------|------|---------|
| TypeScript | `EntityManager.entities = new Map<string, RuntimeEntity>()` | Duplicate state |
| Godot | `GameBridge.entities: Dictionary = {}` | Authoritative for physics |

This causes:
- State divergence risk (entity in one, not the other)
- Unclear debugging (which registry is "correct"?)
- Wasted memory (duplicate data structures)
- Complex synchronization logic

### 1.2 Current Data Flow

```
TODAY (problematic):

  TypeScript GameDefinition
       │
       │ JSON.stringify()
       ▼
  GodotBridge.loadGame()
       │
       │ loadGameJson()
       ▼
  Godot parses JSON, creates entities in Godot registry
       │
       │ (implicit sync)
       ▼
  TypeScript ALSO creates entities in TS registry    ◄── DUPLICATION
       │
       ▼
  Runtime: Both registries exist, must stay in sync  ◄── COMPLEXITY
```

### 1.3 Authority Analysis (Current vs Target)

| Data Type | Current | Target | Notes |
|-----------|---------|--------|-------|
| **GameDefinition** | TS ✓ | TS ✓ | Already correct |
| **Entity Registry** | ⚠️ BOTH | **Godot only** | Key fix |
| **Entity Metadata** | TS ✓ | TS ✓ | Behaviors, timers, rules state |
| **Physics State** | Godot ✓ | Godot ✓ | Already correct |
| **Score/Lives/Vars** | TS ✓ | TS ✓ | Already correct |
| **Collision Events** | Godot ✓ | Godot ✓ | Already correct |

---

## 2. Target Architecture

### 2.1 Authority Split (Clear Boundary)

| Layer | Authority | What It Owns | Can Modify? |
|-------|-----------|--------------|-------------|
| **Definition** | TypeScript | GameDefinition JSON, templates, rules | TS only |
| **Runtime Entities** | Godot | Which entities exist, their physics bodies | Godot creates, TS requests |
| **Runtime State** | Godot | Positions, velocities, collisions | Godot updates, TS observes |
| **Game Logic State** | TypeScript | Score, lives, variables, timers, cooldowns | TS only |
| **Rendering** | Godot | Sprites, effects, camera | Godot executes, TS commands |

### 2.2 Target Data Flow

```
TARGET (clean):

  TypeScript GameDefinition
       │
       │ JSON.stringify()
       ▼
  GodotBridge.loadGame()
       │
       │ Godot parses and creates entities
       ▼
  Godot is SOLE entity registry authority
       │
       │ onEntityCreated, onTransformSync events
       ▼
  TypeScript receives events, maintains ONLY:
  • Entity metadata (behaviors, tags for logic)
  • Game logic state (score, timers, cooldowns)
  • NO duplicate transform/physics data
```

### 2.3 Future: Live Editing Support

The architecture must support this future capability:

```
FUTURE LIVE EDITING:

  Web Editor (JSON view)
       │
       │ User edits JSON
       ▼
  TypeScript validates change
       │
       │ Creates PATCH message
       ▼
  GodotBridge.patchGame(patch)
       │
       │ Examples:
       │ • { type: 'UPDATE_ENTITY', id: 'player', changes: { transform: {...} } }
       │ • { type: 'ADD_ENTITY', entity: {...} }
       │ • { type: 'REMOVE_ENTITY', id: 'enemy_3' }
       │ • { type: 'UPDATE_TEMPLATE', id: 'ball', changes: {...} }
       ▼
  Godot applies patch incrementally (no full reload)
       │
       │ Emits confirmation event
       ▼
  Editor shows live result
```

**Design Implications**:
- Godot must support incremental updates, not just `loadGame()`
- TypeScript must be able to diff definitions
- Entity IDs must be stable across patches

---

## 3. Performance Considerations

### 3.1 What We Must NOT Do

| Anti-Pattern | Why It's Bad | Current Status |
|--------------|--------------|----------------|
| Sync all transforms every frame via JS bridge | Bridge calls are expensive | ⚠️ Currently doing this |
| Maintain duplicate registries | Memory + sync overhead | ⚠️ Currently doing this |
| Query Godot for data TS already has | Unnecessary bridge calls | ✓ Avoided (cached) |
| Process all collisions in TS | Cross-bridge for every collision | ⚠️ Partially doing this |

### 3.2 Performance-Safe Patterns

| Pattern | Description | Performance Impact |
|---------|-------------|-------------------|
| **Batch sync** | Godot sends all transforms in one message per frame | ✓ Good (current) |
| **Event-driven** | TS only receives what changed | Better than polling |
| **Godot-side filtering** | Only sync entities with `syncEnabled` tag | ✓ Reduces data volume |
| **Lazy metadata** | TS creates metadata only when needed | ✓ Reduces memory |

### 3.3 Recommended Sync Strategy

```typescript
// GOOD: Godot pushes, TS receives
bridge.onTransformSync((transforms) => {
  // Update cached transforms for entities we care about
  for (const [id, t] of Object.entries(transforms)) {
    this.entityTransforms.set(id, t);  // Simple cache, not full entity copy
  }
});

// GOOD: TS queries on-demand for rare data
const velocity = await bridge.getLinearVelocity(entityId);  // Only when needed

// BAD: TS maintains full entity copy
this.entities.set(id, {
  ...entityDefinition,        // ❌ Duplicates Godot data
  transform: {...},           // ❌ Duplicates Godot data
  physics: {...},             // ❌ Duplicates Godot data
  behaviors: [...],           // ✓ OK - TS-only state
  timers: {...},              // ✓ OK - TS-only state
});
```

---

## 4. Detailed Recommendations

### 4.1 Convert EntityManager to Event-Driven Cache (HIGH PRIORITY)

**Key Insight**: Don't delete the registry - make it a **derived cache** updated only from Godot events.

**Current Code** (`app/lib/game-engine/EntityManager.ts`):
```typescript
export class EntityManager {
  private entities = new Map<string, RuntimeEntity>();  // Currently: source of truth
  
  createEntity(definition: GameEntity): RuntimeEntity {
    // Currently: TS creates entity, then tells Godot
    const entity = this.createRuntimeEntity(id, resolved);
    this.entities.set(id, entity);  // TS decides existence ❌
    return entity;
  }
}
```

**Target Architecture**:
```typescript
export class EntityManager {
  private entities = new Map<string, RuntimeEntity>();  // Now: derived cache
  private entityGenerations = new Map<string, number>(); // Pool safety
  
  // NEW: Request-based spawn (TS requests, Godot confirms)
  requestSpawn(templateId: string, position: Vec2, options?: SpawnOptions): void {
    // Resolve template in TS (content assembly)
    const resolved = this.resolveTemplate(templateId);
    // Send to Godot - don't add to local registry yet
    this.bridge.spawnEntity(resolved, position, options);
    // Entity will be added when Godot emits entity_spawned
  }
  
  // NEW: Event handler for Godot confirmations
  onEntitySpawned(entityId: string, template: string, generation: number, snapshot: EntitySnapshot): void {
    // NOW we add to local registry (Godot confirmed existence)
    const entity = this.createRuntimeEntityFromSnapshot(entityId, template, snapshot);
    entity.generation = generation;
    this.entities.set(entityId, entity);
    this.entityGenerations.set(entityId, generation);
    this.updateTagIndex(entityId, snapshot.tags);
  }
  
  onEntityDestroyed(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      this.removeFromTagIndex(entityId, entity.tags);
      this.entities.delete(entityId);
      this.entityGenerations.delete(entityId);
    }
  }
  
  // Existing methods stay (they query the cache)
  getEntity(id: string): RuntimeEntity | undefined {
    return this.entities.get(id);  // Fast local lookup ✅
  }
  
  getEntitiesByTag(tag: string): RuntimeEntity[] {
    // O(1) lookup from local index ✅
    return this.entitiesByTagId.get(tagId) ?? [];
  }
}
```

**Benefits**:
- ✅ Tag lookups stay O(1) (no bridge calls)
- ✅ Hierarchy queries stay local
- ✅ Clear authority (Godot confirms existence)
- ✅ Pool safety via generation tokens
- ✅ Minimal code changes (same public API)

### 4.2 Clarify Behavior Execution Locations

**Decision Matrix**:

| Behavior | Execute In | Reason | Performance |
|----------|------------|--------|-------------|
| `destroy_on_collision` | **Godot** | Immediate physics response | ✓ No bridge latency |
| `draggable` | **Godot** | Input-driven, needs low latency | ✓ No bridge latency |
| `oscillate` | **Godot** | Pure transform animation | ✓ No bridge overhead |
| `rotate` | **Godot** | Pure transform animation | ✓ No bridge overhead |
| `maintain_speed` | **Godot** | Physics-driven, per-frame | ✓ No bridge overhead |
| `score_on_collision` | **TypeScript** | Involves game state | OK (event-driven) |
| `spawn_on_event` | **TypeScript** | Template resolution, conditions | OK (event-driven) |
| `timer` | **TypeScript** | Game logic, pauseable | OK (not per-frame) |
| `health` | **TypeScript** | Game state tracking | OK (event-driven) |

**Principle**:
- **Godot**: Stateless behaviors, physics-driven, per-frame updates
- **TypeScript**: Stateful behaviors, game logic, complex conditions

### 4.3 Implement Incremental Patching (for Live Editing)

**New Godot API**:
```gdscript
# GameBridge.gd

func patch_entity(entity_id: String, changes: Dictionary) -> bool:
    """Apply incremental changes to an existing entity."""
    if not entities.has(entity_id):
        return false
    
    var entity = entities[entity_id]
    
    if changes.has("transform"):
        var t = changes["transform"]
        entity.position = game_to_godot_pos(Vector2(t.x, t.y))
        if t.has("angle"):
            entity.rotation = -t.angle
    
    if changes.has("physics"):
        _update_physics_body(entity, changes["physics"])
    
    if changes.has("sprite"):
        _update_sprite(entity, changes["sprite"])
    
    entity_patched.emit(entity_id, changes)
    return true

func add_entity_live(entity_data: Dictionary) -> String:
    """Add a new entity without full game reload."""
    return _create_entity(entity_data)

func remove_entity_live(entity_id: String) -> bool:
    """Remove an entity without full game reload."""
    if entities.has(entity_id):
        destroy_entity(entity_id)
        return true
    return false
```

**TypeScript Bridge Extension**:
```typescript
interface GodotBridge {
  // Existing
  loadGame(definition: GameDefinition): Promise<void>;
  
  // New: Incremental patching
  patchEntity(entityId: string, changes: Partial<GameEntity>): Promise<boolean>;
  addEntityLive(entity: GameEntity): Promise<string>;
  removeEntityLive(entityId: string): Promise<boolean>;
  
  // Events for confirmation
  onEntityPatched(callback: (entityId: string, changes: object) => void): Unsubscribe;
}
```

### 4.4 Implement Capability Manifest

**Godot Side**:
```gdscript
func get_capabilities() -> Dictionary:
    return {
        "version": "1.0.0",
        "features": {
            "livePatching": true,
            "incrementalUpdates": true,
        },
        "physics": {
            "bodyTypes": ["static", "dynamic", "kinematic"],
            "shapes": ["box", "circle", "polygon"],
            "joints": ["revolute", "distance", "prismatic", "weld", "mouse"]
        },
        "behaviors": {
            "godotExecuted": [
                "destroy_on_collision",
                "draggable", 
                "oscillate",
                "rotate",
                "maintain_speed"
            ],
            "tsExecuted": [
                "score_on_collision",
                "spawn_on_event",
                "timer",
                "health"
            ]
        },
        "sync": {
            "transforms": true,
            "velocities": true,
            "properties": ["health", "score"]
        }
    }
```

---

## 5. Implementation TODOs

### Phase 1: Add Entity Lifecycle Events from Godot (Foundation)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 1.1 | Add `entity_spawned` event with full snapshot (id, template, tags, transform, generation) | `GameBridge.gd` | Small | High |
| 1.2 | Add `entity_destroyed` event (already exists, verify it fires correctly) | `GameBridge.gd` | Small | High |
| 1.3 | Add `entity_reparented` event | `GameBridge.gd` | Small | Medium |
| 1.4 | Add `entity_tags_changed` event | `GameBridge.gd` | Small | Medium |
| 1.5 | Add TypeScript event handlers in `GodotBridge` types | `types.ts` | Small | High |
| 1.6 | Wire up event handlers in `GodotBridge.web.ts` and `.native.ts` | Both files | Medium | High |

### Phase 2: Add Generation Tokens for Pool Safety

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 2.1 | Add `generation` field to Godot entity tracking | `GameBridge.gd` | Small | High |
| 2.2 | Include `generation` in all entity events | `GameBridge.gd` | Small | High |
| 2.3 | Add `entityGenerations` map to EntityManager | `EntityManager.ts` | Small | Medium |
| 2.4 | Validate generation on transform sync (ignore stale) | `GodotPhysicsAdapter.ts` | Small | Medium |

### Phase 3: Convert EntityManager to Event-Driven (Core Refactor)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 3.1 | Add `requestSpawn()` method (request pattern) | `EntityManager.ts` | Medium | High |
| 3.2 | Add `onEntitySpawned()` handler | `EntityManager.ts` | Medium | High |
| 3.3 | Add `onEntityDestroyed()` handler | `EntityManager.ts` | Small | High |
| 3.4 | Wire EntityManager to GodotBridge events | `GameLoader.ts` or new | Medium | High |
| 3.5 | Update `createEntity()` to use request pattern internally | `EntityManager.ts` | Medium | High |
| 3.6 | Keep existing query methods (they read from cache) | `EntityManager.ts` | None | N/A |

### Phase 4: Update Consumers (Gradual Migration)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 4.1 | Update `GameLoader` to wire up event handlers | `GameLoader.ts` | Medium | High |
| 4.2 | Verify `RulesEvaluator` works with new pattern | `RulesEvaluator.ts` | Small | Medium |
| 4.3 | Verify `BehaviorExecutor` works with new pattern | `BehaviorExecutor.ts` | Small | Medium |
| 4.4 | Update tests to reflect new spawn flow | `*.test.ts` | Medium | Medium |

### Phase 5: Live Editing Foundation (Future)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 5.1 | Implement `patch_entity()` in Godot | `GameBridge.gd` | Medium | High |
| 5.2 | Implement `add_entity_live()` in Godot | `GameBridge.gd` | Medium | High |
| 5.3 | Implement `remove_entity_live()` in Godot | `GameBridge.gd` | Small | High |
| 5.4 | Add patch methods to TypeScript bridge | `GodotBridge.*.ts` | Medium | High |
| 5.5 | Add `onEntityPatched` event | Both sides | Small | Medium |

### Phase 6: Performance Optimization (Future)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 5.1 | Add `syncEnabled` tag filtering in Godot | `GameBridge.gd` | Small | Medium |
| 5.2 | Batch property sync (not per-entity) | `GameBridge.gd` | Medium | Medium |
| 5.3 | Profile and optimize bridge call frequency | Multiple | Medium | Variable |

---

## 6. Migration Strategy

### Step-by-Step Approach

1. **Add new patterns alongside old** (no breaking changes)
2. **Migrate consumers incrementally** (one system at a time)
3. **Deprecate old patterns** (with warnings)
4. **Remove old code** (after full migration)

### Backward Compatibility

During migration, both patterns will coexist:
```typescript
// OLD (deprecated but working)
const entity = entityManager.getEntity(id);

// NEW (preferred)
const metadata = metadataManager.getBehaviorState(id);
const transform = metadataManager.getTransform(id); // From cache
```

---

## 7. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-27 | **Godot is runtime authority for entities** | Clear single source of truth |
| 2026-01-27 | **TypeScript maintains only metadata** | Avoid duplication, reduce sync complexity |
| 2026-01-27 | **Design for live editing from day 1** | Patch API vs reload-only |
| 2026-01-27 | **Stateless behaviors → Godot, stateful → TypeScript** | Performance + clarity |

---

## 8. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Should TS maintain an entity registry? | **No** - Query Godot or use event cache |
| Can we do live hot-reload of JSON? | **Yes** - Via incremental patch API |
| What about performance? | **Addressed** - Batch sync, Godot-side behaviors, no duplication |
| Who processes behaviors? | **Split** - See matrix in section 4.2 |

---

## Appendix A: File References

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/lib/game-engine/EntityManager.ts` | TS entity registry | **Major refactor** |
| `app/lib/game-engine/RulesEvaluator.ts` | Rule processing | Update entity queries |
| `app/lib/godot/GodotPhysicsAdapter.ts` | Physics abstraction | Minor updates |
| `app/lib/godot/types.ts` | Bridge interface | Add new methods |
| `godot_project/scripts/GameBridge.gd` | Godot bridge | Add patch API, capabilities |
| `shared/src/types/behavior.ts` | Behavior types | Add execution location comments |

## Appendix B: Message Protocol

### TypeScript → Godot (Commands)

```typescript
// Definition
type LoadGameMessage = { type: 'LOAD_GAME'; definition: GameDefinition };
type PatchEntityMessage = { type: 'PATCH_ENTITY'; entityId: string; changes: Partial<GameEntity> };
type AddEntityMessage = { type: 'ADD_ENTITY'; entity: GameEntity };
type RemoveEntityMessage = { type: 'REMOVE_ENTITY'; entityId: string };

// Physics
type ApplyImpulseMessage = { type: 'APPLY_IMPULSE'; entityId: string; impulse: Vec2 };
type SetVelocityMessage = { type: 'SET_VELOCITY'; entityId: string; velocity: Vec2 };
type SetTransformMessage = { type: 'SET_TRANSFORM'; entityId: string; transform: Transform };
```

### Godot → TypeScript (Events)

```typescript
type EntityCreatedEvent = { type: 'ENTITY_CREATED'; entityId: string; template: string };
type EntityDestroyedEvent = { type: 'ENTITY_DESTROYED'; entityId: string };
type EntityPatchedEvent = { type: 'ENTITY_PATCHED'; entityId: string; changes: object };
type CollisionEvent = { type: 'COLLISION'; entityA: string; entityB: string; contacts: Contact[] };
type TransformSyncEvent = { type: 'TRANSFORM_SYNC'; transforms: Record<string, Transform> };
```
