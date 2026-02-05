# JS↔Godot Communication Patterns & Responsibilities

> Research document generated 2026-02-04. Complete analysis of current communication architecture, entity lifecycles, and identified issues.

---

## Table of Contents

1. [Responsibility Split: Who Owns What](#1-responsibility-split-who-owns-what)
2. [Communication Patterns (As-Is)](#2-communication-patterns-as-is)
3. [Entity Spawn Lifecycle](#3-entity-spawn-lifecycle)
4. [Entity Destroy Lifecycle](#4-entity-destroy-lifecycle)
5. [Property Sync Lifecycle (Per Frame)](#5-property-sync-lifecycle-per-frame)
6. [Script→Entity Interaction](#6-scriptentity-interaction)
7. [Game Inspector (MCP) Communication](#7-game-inspector-mcp-communication)
8. [Problems & Inconsistencies](#8-problems--inconsistencies)
9. [Ideal Architecture](#9-ideal-architecture)

---

## 1. Responsibility Split: Who Owns What

### TypeScript Side (Game Logic)

| Domain | Owned By | Files |
|--------|----------|-------|
| **Game rules** | `RulesSystem` | `wrappers/RulesSystem.ts` |
| **Entity registry** | `EntityManager` | `EntityManager.ts` |
| **Game state** | `GameState` (variables, score, lives) | `GameStateHelpers.ts` |
| **Behaviors** | `BehaviorExecutor`, `ConditionalBehaviors` | `wrappers/BehaviorExecutorRuntimeSystem.ts` |
| **Scripts** | `ScriptSandboxRuntimeSystem`, `RunScriptActionExecutor` | `wrappers/ScriptSandboxRuntimeSystem.ts` |
| **Frame orchestration** | `stepGame()`, `GameLoopController` | `GameRuntime.godot.tsx`, `GameLoopController.ts` |
| **Event processing** | Various refs → `stepGame()` drains | `GameRuntime.godot.tsx` |
| **Game lifecycle** | `game_loaded`, `game_started`, win/lose | `GameRuntime.godot.tsx` |

### Godot Side (Physics & Rendering)

| Domain | Owned By | Files |
|--------|----------|-------|
| **Physics simulation** | Rapier (Godot's physics engine) | `CollisionSystem.gd`, `PhysicsController.gd` |
| **Entity nodes** | `EntityFactory` creates Godot nodes | `EntityFactory.gd` |
| **Collision detection** | `CollisionSystem` → callbacks | `CollisionSystem.gd` |
| **Visual rendering** | `VisualRenderer` (sprites, backgrounds) | `VisualRenderer.gd` |
| **Texture management** | `TextureLoader`, `VisualRenderer` | `TextureLoader.gd` |
| **Camera** | `CameraController` | `CameraController.gd` |
| **Input detection** | `InputRouter` (mouse/touch hit testing) | `InputRouter.gd` |
| **Transform authority** | Godot physics bodies own position/rotation | Godot engine internals |

### Shared Concerns

| Concern | TS Responsibility | Godot Responsibility |
|---------|-------------------|----------------------|
| **Entity existence** | Registry (RuntimeEntity) | Scene tree (Node2D) |
| **Position** | Reads from Godot each frame | Computes via physics |
| **Spawning** | Decides when/what to spawn | Creates the actual node |
| **Destruction** | Decides when to destroy | Removes node from tree |

---

## 2. Communication Patterns (As-Is)

### Pattern 1: TS→Godot Command (Fire-and-Forget)

```
TS calls bridge.method(args)
    → GodotBridge.web.ts calls godotBridge.method(args) on iframe
    → GameBridge.gd receives via JavaScriptBridge callback
    → Godot executes immediately
    → No return value
```

**~72 methods** use this pattern. Examples:
- `bridge.spawnEntity(templateId, x, y, velocity)`
- `bridge.destroyEntity(entityId)`
- `bridge.setPosition(entityId, x, y)`
- `bridge.applyImpulse(entityId, impulse)`
- `bridge.setEntityImage(entityId, url, w, h)`

**No confirmation, no error handling, no retry.**

### Pattern 2: TS→Godot Query (Async Request/Response)

```
TS calls bridge.queryAsync<T>(method, args)
    → Generates unique requestId
    → Sends to Godot via bridge.query(requestId, method, argsJson)
    → Godot's QuerySystem.gd routes to handler
    → Handler returns result
    → Godot calls _godotQueryResolve(requestId, resultJson)
    → TS Promise resolves with parsed result
```

**~17 methods** use this pattern. Examples:
- `bridge.getAllTransforms()` → `Record<string, EntityTransform>`
- `bridge.getLinearVelocity(entityId)` → `Vec2 | null`
- `bridge.queryPoint(point)` → `string | null`
- `bridge.screenToWorld(screenX, screenY)` → `Vec2`
- `bridge.stepPhysics(frames)` → `{ ok, framesAdvanced, endFrame }`

### Pattern 3: Godot→TS Event Callback

```
Godot detects event (collision, sensor, etc.)
    → EventEmitter.gd calls JS callback directly
    → GodotBridge.web.ts receives callback
    → Pushes to React ref or calls registered handler
```

**~10 callback types** registered:
- `onCollision(callback)` → collision events
- `onSensorBegin(callback)` / `onSensorEnd(callback)` → sensor overlaps
- `onEntitySpawned(callback)` → entity created in Godot
- `onEntityDestroyed(callback)` → entity removed in Godot
- `onTransformSync(callback)` → batch transform updates
- `onPropertySync(callback)` → property change notifications
- `onInputEvent(callback)` → Godot-detected input
- `onUIButtonEvent(callback)` → UI button interactions

### Pattern 4: TS→TS Lifecycle (Internal)

```
GameRuntime.godot.tsx pushes event to pendingLifecycleEventsRef
    → stepGame() drains ref, injects into UpdateContext.frame.inputEvents
    → RulesSystem.convertFrameInputEvents() processes
```

Events: `game_loaded`, `game_started`

### Pattern 5: Input State (Continuous Polling)

```
User interaction → useGameInput hook → inputRef.current.tap/drag/buttons
    → stepGame() passes inputRef.current as UpdateContext.input
    → InputRuntimeSystem reads ctx.input, converts discrete events (tap) to frame events
```

This is NOT event-based — it's continuous state read each frame.

---

## 3. Entity Spawn Lifecycle

### Path A: Rule-Triggered Spawn (Godot-Authoritative)

This is the **primary** spawn path. Godot creates the entity and notifies TS.

```
1. RulesSystem evaluates trigger → fires SpawnAction
   File: RulesSystem.ts
   
2. SpawnActionExecutor.execute()
   File: rules/actions/SpawnActionExecutor.ts
   - Resolves position (fixed/random/at_entity/at_collision)
   - Resolves template (single or random from array)
   - Calculates launch velocity if needed
   
3. bridge.spawnEntity(templateId, x, y, initialVelocity)
   File: SpawnActionExecutor.ts:59
   ⚠️ Does NOT call entityManager.createEntity() — relies on callback!
   
4. GodotBridge sends to Godot
   File: GodotBridge.web.ts:~490
   → getGodotBridge()?.spawnEntity(templateId, x, y, entityId, velocityJson)
   
5. Godot EntityFactory.create_entity()
   File: EntityFactory.gd
   - Creates RigidBody2D/StaticBody2D/Area2D/Node2D
   - Sets position (game_to_godot_pos flips Y)
   - Adds visual (Sprite2D)
   - Adds collision shape
   - Adds to scene tree (_game_root.add_child)
   
6. Godot fires onEntitySpawned callback
   File: EntityFactory.gd / EventEmitter.gd
   → JS callback with { entityId, template, generation, tags, transform, colliderId }
   
7. TS handleEntitySpawned(snapshot)
   File: EntityManager.ts:128-175
   - Creates RuntimeEntity with behaviors, tags, transform
   - Registers in entities Map
   - Indexes by tags
```

**Key characteristic**: Entity does NOT exist in TS EntityManager until Godot confirms creation. There's a brief window where TS has told Godot to spawn but hasn't received confirmation.

### Path B: Script-Triggered Spawn (TS-Optimistic)

Scripts need the entityId immediately (to set properties, etc.), so they use an **optimistic** pattern:

```
1. Script calls ctx.spawnEntity(templateId, position, opts)
   File: RunScriptActionExecutor.ts:84-105
   
2. IMMEDIATE: entityManager.createEntity() — TS creates entity locally
   File: RunScriptActionExecutor.ts:97-103
   - Generates entityId = `spawned_${Date.now()}_${random}`
   - Creates RuntimeEntity in EntityManager
   - Returns entityId to script immediately
   
3. DEFERRED: deferredSpawns.push({ entityId, templateId, x, y, velocity })
   File: RunScriptActionExecutor.ts:88-95
   - Queued, not sent yet
   
4. Script continues execution with entityId...
   (can call setPosition, addTag, etc.)
   
5. After script completes: bridge.spawnEntity() for each deferred spawn
   File: RunScriptActionExecutor.ts:37-41
   
6. Godot creates entity → fires onEntitySpawned
   
7. handleEntitySpawned sees entity already exists → returns existing
   File: EntityManager.ts:129-131
   if (this.entities.has(snapshot.entityId)) return existing
```

**Key characteristic**: Entity exists in TS BEFORE Godot knows about it. Script gets immediate access. Godot confirmation is a no-op.

### Path C: Initial Load (Both Created Independently)

At game load time, entities are created in **both** places from the same definition:

```
1. Godot: GameBridge.gd:252-254
   for entity_data in game_data.entities:
       _entity_factory.create_entity(entity_data)
   
2. TypeScript: GameLoader.ts:38-40
   for (const entity of definition.entities):
       entityManager.createEntity(entity)
```

They're linked by the same `entity.id` from the game definition.

---

## 4. Entity Destroy Lifecycle

### Path A: TS-Initiated Destroy (Rule/Script)

```
1. DestroyActionExecutor.execute() or script calls destroyEntity()
   File: rules/actions/DestroyActionExecutor.ts
   
2. entityManager.destroyEntity(entityId)
   File: EntityManager.ts:364-389
   - If recursive: destroys all descendants first
   - Detaches from parent
   - Calls destroyEntityInternal()
   
3. destroyEntityInternal()
   File: EntityManager.ts:391-406
   - physics.destroyBody(entityId) ← THIS IS THE KEY STEP
   - Removes from tag indexes
   - Resets entity for pooling
   - Removes from entities Map
   
4. GodotPhysicsAdapter.destroyBody()
   File: GodotPhysicsAdapter.ts:169-176
   - bridge.destroyEntity(entityId) ← Tells Godot to destroy
   - Cleans up local caches
   
5. GodotBridge sends destroy to Godot
   File: GodotBridge.web.ts:498-499
   → getGodotBridge()?.destroyEntity(entityId)
   
6. Godot removes node
   - Disables collision shapes
   - Removes from groups
   - queue_free() (deferred deletion at end of frame)
```

**⚠️ CRITICAL**: The destroy command reaches Godot **only through the Physics2D adapter** (`physics.destroyBody`). This means **entities without a physics component** may not get destroyed in Godot!

### Path B: Godot-Initiated Destroy

```
1. Godot destroys entity (e.g., fell out of world, physics cleanup)
   
2. Godot fires onEntityDestroyed callback
   File: EventEmitter.gd → JS callback
   
3. TS handler in GameRuntime.godot.tsx:232-235
   - cancelTweensForEntity(entityId)
   - entityManager.handleEntityDestroyed(entityId)
   
4. EntityManager.handleEntityDestroyed()
   File: EntityManager.ts:177-187
   - Removes from tag indexes
   - Removes from entities Map
   - Removes from godotGenerations
```

---

## 5. Property Sync Lifecycle (Per Frame)

### Frame Execution Order (System Phases)

```
PRE_UPDATE (early)
  ├── ViewportRuntimeSystem (priority 100)
  ├── PropertySyncRuntimeSystem (priority 90) — event-driven, no per-frame work
  ├── EntityManagerRuntimeSystem (priority 70) — syncTransformsFromPhysics()
  ├── InputRuntimeSystem (priority 60) — converts input state to events
  └── ComputedValuesSystem (priority 50)

GAME_LOGIC
  ├── BehaviorExecutorRuntimeSystem (priority 50)
  ├── ScriptSandboxRuntimeSystem (priority 40)
  └── RulesSystem (priority 30) — evaluates triggers, executes actions

POST_UPDATE (late)
  ├── TweenRuntimeSystem
  ├── TargetPositionRuntimeSystem
  └── CameraRuntimeSystem
```

### Transform Sync: Godot → TS (Every Frame)

```
EntityManagerRuntimeSystem.update() [PRE_UPDATE, priority 70]
    ↓
entityManager.syncTransformsFromPhysics()
    ↓
For each entity with physics + active:
    physics.getTransform(entityId)
    → GodotPhysicsAdapter reads from cached state
    → Updates entity.transform.{x, y, angle}
    ↓
    Hierarchy: worldTransform, localTransform recalculated
```

**Note**: Transforms are read from a **cache** that was populated by `getAllTransforms()` or `onTransformSync()` callbacks — NOT by querying Godot per-entity per-frame.

### Property Sync: Godot → TS (Event-Driven)

```
PropertySyncManager subscribes to bridge.onPropertySync()
    ↓
When Godot pushes property changes (configurable via setWatchConfig):
    callback fires with PropertySyncPayload
    ↓
propertyCache.update(payload) stores in cache
    ↓
Available for game logic to read via cache
```

### Mutations: TS → Godot (Action-Driven)

When game rules/scripts change entity properties:

| Mutation | TS Call | Bridge Method | Timing |
|----------|---------|---------------|--------|
| Set position | `entity.transform.x = N` | Not auto-synced! | TS-only until bridge call |
| Teleport | `bridge.setPosition(id, x, y)` | Fire-and-forget | Immediate |
| Set velocity | `bridge.setLinearVelocity(id, vel)` | Fire-and-forget | Immediate |
| Apply impulse | `bridge.applyImpulse(id, impulse)` | Fire-and-forget | Immediate |
| Change image | `bridge.setEntityImage(id, url, w, h)` | Fire-and-forget | Immediate |
| Change visibility | `bridge.setVisible(id, bool)` | Fire-and-forget | Immediate |

**⚠️ GAP**: When `RunScriptActionExecutor` calls `entity.transform.x = position.x` (line 114), this only updates the TS-side entity. No bridge call is made. The next `syncTransformsFromPhysics()` will **overwrite** this with Godot's position. The script's position change is effectively lost unless it also calls `bridge.setPosition()`.

---

## 6. Script→Entity Interaction

### API Surface Available to Scripts

Scripts run in QuickJS WASM sandbox with a `SandboxRuntimeContext`:

```
entityManager:
  ├── spawnEntity(templateId, position, opts?) → entityId | null
  ├── destroyEntity(entityId)
  ├── getEntityPosition(entityId) → {x, y} | null
  ├── setEntityPosition(entityId, {x, y})      ⚠️ TS-only, not synced to Godot
  ├── getEntityVelocity(entityId) → {x, y} | null
  ├── setEntityVelocity(entityId, {x, y})      ✅ Goes through physics adapter → Godot
  ├── applyImpulse(entityId, {x, y})            ✅ Goes through physics adapter → Godot
  ├── getEntityTags / addTag / removeTag / hasTag
  ├── queryEntities(query?) → entityId[]
  ├── getEntityData(entityId) → EntityData | null
  ├── queryEntitiesWithData(query?) → EntityData[]
  └── getEntityTemplate(entityId) → string | undefined

rulesEvaluator:
  ├── getVariable(name) / setVariable(name, value)
  ├── getConstant(name)
  ├── emitEvent(eventName, data?)
  ├── win() / lose()

animateEntity(entityId, config)   ← uses TargetPosition system
inputSnapshot, mousePosition, dragState
frameInfo: { frameId, elapsed, dt }
random(), randomInt(), clamp(), lerp(), distance()
```

### What Goes to Godot vs What Stays in TS

| Script API Call | Reaches Godot? | How? |
|-----------------|----------------|------|
| `spawnEntity()` | ✅ Yes (deferred) | bridge.spawnEntity after script completes |
| `destroyEntity()` | ✅ Yes | entityManager → physics.destroyBody → bridge |
| `setEntityPosition()` | ❌ No | Only sets `entity.transform.{x,y}` in TS |
| `setEntityVelocity()` | ✅ Yes | physics.setLinearVelocity → GodotPhysicsAdapter → bridge |
| `applyImpulse()` | ✅ Yes | physics.applyImpulseToCenter → GodotPhysicsAdapter → bridge |
| `addTag() / removeTag()` | ❌ No | TS-only (tags aren't in Godot) |
| `setVariable()` | ❌ No | TS-only game state |
| `animateEntity()` | ✅ Yes | TargetPositionSystem → bridge.setPosition per frame |

---

## 7. Game Inspector (MCP) Communication

### Current Flow for simulate_input

```
1. MCP tool simulate_input(tap, worldX, worldY)
   File: packages/game-inspector-mcp/src/tools/interaction.ts
   
2. Evaluates in browser:
   window.__GAME_RUNTIME__.setInput("tap", { x, y, worldX, worldY, targetEntityId })
   
3. Sets inputRef.current.tap = { ... }
   
4. Game is paused → nothing happens
   
5. MCP tool step(1)
   → manualStep(1)
   → bridge.stepPhysics(1) — advances Godot physics
   → stepGame(FIXED_DT) — runs TS game logic
   → Input consumed
```

### Current Flow for step(N)

```
1. MCP tool step({ frames: N })
   
2. SlopcadeDebugBridge.step(N)
   → manualStep(N)
   
3. manualStep:
   → bridge.stepPhysics(N) — advances Godot physics N frames
   → for i in 0..N: stepGame(FIXED_DT) — runs TS game logic N times
   
4. Returns { ok, framesAdvanced, startFrame, endFrame }
```

### How Bridge Calls Work in Inspector Mode

When game is paused, Godot physics is frozen (`Engine.time_scale = 0`). Bridge calls like `spawnEntity` still execute immediately — Godot creates the node, but it won't move until physics resumes or `stepPhysics` is called.

---

## 8. Problems & Inconsistencies

### 8.1 Two Spawn Patterns (Inconsistent Authority)

| Spawner | Creates in TS First? | Creates in Godot First? | Pattern |
|---------|----------------------|-------------------------|---------|
| SpawnActionExecutor (rules) | ❌ | ✅ Godot-authoritative | bridge → Godot → callback → TS |
| RunScriptActionExecutor (scripts) | ✅ Optimistic | Deferred | TS → entityManager → then bridge → Godot |
| Game load (initial) | Both independently | Both independently | Parallel, linked by entity ID |

**Problem**: Different code paths for the same operation. The script path creates an entity that briefly exists in TS but not Godot. If the script immediately reads the entity's position, it gets the TS-side value (which is correct). But if it reads velocity from Godot, it might get null because Godot hasn't created the entity yet.

### 8.2 Destroy Only Works Through Physics Adapter

The **only** path from TS-initiated destroy to Godot is:

```
entityManager.destroyEntity() → destroyEntityInternal() → physics.destroyBody() → bridge.destroyEntity()
```

**Problem**: `physics.destroyBody()` is only called for entities that **have a physics component** (line 395: `if (entity.physics)`). Visual-only entities, sensor-only entities, or any entity without `physics` set on the RuntimeEntity will **never** be destroyed in Godot.

```typescript
// EntityManager.ts:391-406
private destroyEntityInternal(id: string): void {
  const entity = this.entities.get(id);
  if (!entity) return;

  if (entity.physics) {          // ← GATE: Only physics entities reach Godot
    this.physics.destroyBody(entity.id);
  }

  // ... cleanup
  this.entities.delete(id);
}
```

### 8.3 Script setEntityPosition Doesn't Reach Godot

```typescript
// RunScriptActionExecutor.ts:111-116
setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
  const entity = entityManager.getEntity(entityId);
  if (entity) {
    entity.transform.x = position.x;    // TS-only!
    entity.transform.y = position.y;    // TS-only!
  }
},
```

Next frame's `syncTransformsFromPhysics()` will overwrite these values with Godot's physics-computed position. The script's position change is effectively ignored for physics entities.

### 8.4 No Error Handling on Bridge Commands

All fire-and-forget bridge calls have **zero** error handling:
- No acknowledgment that Godot received the command
- No retry mechanism
- No error callback
- If Godot silently fails to create/destroy an entity, TS and Godot diverge permanently

### 8.5 Two Transform Caches

The `GodotPhysicsAdapter` maintains its own `cachedStates` map of entity transforms. The `EntityManager` also has `entity.transform`. These are synchronized in `syncTransformsFromPhysics()`, but there's a window each frame where they may disagree.

Additionally, there's a `PropertySyncManager` that receives `onTransformSync` callbacks — potentially a third copy of transform data.

### 8.6 Entity ID Generation Split

| Path | ID Format | Generated Where |
|------|-----------|-----------------|
| Game definition entities | User-defined (e.g., `"ball"`, `"wall-left"`) | Game JSON |
| SpawnActionExecutor | Generated by Godot bridge | GodotBridge.web.ts (or native) |
| RunScriptActionExecutor | `spawned_${Date.now()}_${random}` | RunScriptActionExecutor.ts:85 |
| EntityManager pool | `pooled_${slotIndex}_${generation}` | EntityManager.ts:204 |

Four different ID formats. The script executor's IDs are sent to Godot via `bridge.spawnEntity(..., entityId, ...)` so both sides agree. But the format inconsistency makes debugging harder.

---

## 9. Ideal Architecture

### 9.1 Principles

1. **Single source of truth per property** — no ambiguity about which side "owns" a value
2. **One spawn path, one destroy path** — eliminate the dual-pattern inconsistency
3. **All TS→Godot mutations go through the bridge** — no TS-only changes to physics properties
4. **All Godot→TS state goes through callbacks** — no polling, no cache divergence
5. **Errors are observable** — bridge operations should report failures

### 9.2 Ideal Spawn Flow (Godot-Authoritative, Always)

```
TS decides to spawn
    → bridge.spawnEntity(templateId, x, y, opts) — returns entityId immediately (generated client-side)
    → Godot creates node
    → Godot fires onEntitySpawned callback
    → EntityManager.handleEntitySpawned(snapshot) creates RuntimeEntity
```

**For scripts that need immediate access**: Pre-generate the entityId, pass it to the bridge, and return it to the script immediately. The RuntimeEntity creation happens async via callback, but the entityId is known synchronously.

```typescript
// Ideal pattern:
spawnEntity(templateId, position, opts) {
  const entityId = generateId();
  bridge.spawnEntity(templateId, position.x, position.y, { entityId, ...opts });
  return entityId;  // Script can use this ID immediately
  // RuntimeEntity created when onEntitySpawned callback fires
}
```

### 9.3 Ideal Destroy Flow (Direct Bridge Call, Always)

```
TS decides to destroy
    → bridge.destroyEntity(entityId) — tells Godot directly (not through physics adapter)
    → Godot removes node → fires onEntityDestroyed callback
    → EntityManager.handleEntityDestroyed(entityId) cleans up TS side
```

**Problem this solves**: All entities get destroyed in Godot, not just physics entities.

### 9.4 Ideal Property Mutation Flow

Every mutation to a physics-relevant property should go through the bridge:

```typescript
// Instead of:
entity.transform.x = newX;  // TS-only, lost next frame

// Should be:
bridge.setPosition(entityId, newX, newY);  // Tells Godot
// Then callback or next sync updates entity.transform
```

| Property | Mutation Path | Authority |
|----------|--------------|-----------|
| Position | `bridge.setPosition()` | Godot reads, TS reconciles |
| Rotation | `bridge.setRotation()` | Godot reads, TS reconciles |
| Velocity | `bridge.setLinearVelocity()` | Godot reads, TS reconciles |
| Scale | `bridge.setScale()` | TS authoritative (design property) |
| Visible | `bridge.setVisible()` | TS authoritative |
| Tags | TS-only (not in Godot) | TS authoritative |
| Game variables | TS-only | TS authoritative |
| Visual URL | `bridge.setEntityImage()` | TS decides, Godot renders |

### 9.5 Ideal Communication Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     IDEAL COMMUNICATION PATTERNS                         │
└─────────────────────────────────────────────────────────────────────────┘

  TYPESCRIPT (Logic)                         GODOT (Physics/Render)
  ──────────────────                         ─────────────────────

  ┌──────────────────┐                       ┌──────────────────┐
  │ Rules/Scripts     │ ── spawn ──────────→ │ EntityFactory    │
  │ decide WHAT       │                       │ creates HOW      │
  │ to spawn          │ ← onEntitySpawned ── │                  │
  └──────────────────┘                       └──────────────────┘

  ┌──────────────────┐                       ┌──────────────────┐
  │ Rules/Scripts     │ ── destroy ────────→ │ Scene tree       │
  │ decide WHEN       │                       │ removes node     │
  │ to destroy        │ ← onEntityDestroyed ─│                  │
  └──────────────────┘                       └──────────────────┘

  ┌──────────────────┐                       ┌──────────────────┐
  │ Rules/Scripts     │ ── setPosition ────→ │ Physics engine   │
  │ set desired       │ ── setVelocity ────→ │ applies forces   │
  │ properties        │ ── applyImpulse ──→ │                  │
  │                   │ ← syncTransforms ──  │ computes result  │
  └──────────────────┘                       └──────────────────┘

  ┌──────────────────┐                       ┌──────────────────┐
  │ Game logic        │                       │ Collision detect │
  │ evaluates         │ ← onCollision ────── │ reports contacts │
  │ collision rules   │ ← onSensorBegin ──── │                  │
  └──────────────────┘                       └──────────────────┘

  ┌──────────────────┐                       ┌──────────────────┐
  │ Input handling    │ ← onInputEvent ────  │ Input detection  │
  │ routes to rules   │                       │ hit testing      │
  └──────────────────┘                       └──────────────────┘

  NO other communication patterns should exist.
```

### 9.6 Bridge Method Categories (Ideal)

| Category | Count | Direction | Pattern |
|----------|-------|-----------|---------|
| **Entity lifecycle** (spawn, destroy) | 2 | TS→Godot + callback | Command + Confirm |
| **Transform control** (setPosition, setRotation, setScale) | 4 | TS→Godot | Fire-and-forget |
| **Physics control** (velocity, impulse, force, torque) | 6 | TS→Godot | Fire-and-forget |
| **Physics queries** (queryPoint, raycast, AABB) | 5 | TS→Godot→TS | Async query |
| **Visual control** (image, opacity, visibility) | 4 | TS→Godot | Fire-and-forget |
| **Camera control** (target, position, zoom) | 3 | TS→Godot | Fire-and-forget |
| **Joints** (create, destroy, configure) | 10 | TS→Godot | Fire-and-forget |
| **Effects** (particles, sound, shake, shaders) | 12 | TS→Godot | Fire-and-forget |
| **Debug** (inspect mode, step, log level) | 5 | TS→Godot | Fire-and-forget |
| **Sync callbacks** (transforms, properties) | 2 | Godot→TS | Event-driven |
| **Event callbacks** (collision, sensor, input) | 5 | Godot→TS | Event-driven |
| **Lifecycle callbacks** (spawned, destroyed) | 2 | Godot→TS | Event-driven |

---

## Appendix: Complete Bridge Method Inventory

### TS → Godot (89 methods total)

<details>
<summary>Entity Management (12)</summary>

| Method | Params | Returns | Async? |
|--------|--------|---------|--------|
| `spawnEntity` | templateId, x, y, velocity? | entityId | No |
| `destroyEntity` | entityId | void | No |
| `setTransform` | entityId, x, y, angle | void | No |
| `setPosition` | entityId, x, y | void | No |
| `setRotation` | entityId, angle | void | No |
| `setScale` | entityId, scaleX, scaleY | void | No |
| `setOpacity` | entityId, opacity | void | No |
| `setVisible` | entityId, visible | void | No |
| `setUserData` | entityId, data | void | No |
| `getUserData` | entityId | unknown | Yes |
| `getEntityTransform` | entityId | EntityTransform | Yes |
| `getAllTransforms` | — | Record | Yes |

</details>

<details>
<summary>Physics (11)</summary>

| Method | Params | Returns | Async? |
|--------|--------|---------|--------|
| `getLinearVelocity` | entityId | Vec2 | Yes |
| `setLinearVelocity` | entityId, velocity | void | No |
| `getAngularVelocity` | entityId | number | Yes |
| `setAngularVelocity` | entityId, velocity | void | No |
| `applyImpulse` | entityId, impulse | void | No |
| `applyForce` | entityId, force | void | No |
| `applyTorque` | entityId, torque | void | No |
| `pausePhysics` | — | void | No |
| `resumePhysics` | — | void | No |
| `stepPhysics` | frames | StepResult | Yes |
| `callRpc` | method, params | unknown | Yes |

</details>

<details>
<summary>Physics Queries (5)</summary>

| Method | Params | Returns | Async? |
|--------|--------|---------|--------|
| `screenToWorld` | screenX, screenY | Vec2 | Yes |
| `queryPoint` | point | number | Yes |
| `queryPointEntity` | point | string | Yes |
| `queryAABB` | min, max | number[] | Yes |
| `raycast` | origin, direction, maxDistance | RaycastHit | Yes |

</details>

<details>
<summary>Joints (10)</summary>

| Method | Params | Returns | Async? |
|--------|--------|---------|--------|
| `createRevoluteJoint` | def | jointId | No |
| `createDistanceJoint` | def | jointId | No |
| `createPrismaticJoint` | def | jointId | No |
| `createWeldJoint` | def | jointId | No |
| `createMouseJoint` | def | jointId | No |
| `createMouseJointAsync` | def | jointId | Yes |
| `destroyJoint` | jointId | void | No |
| `destroyMouseJointForEntity` | entityId | void | No |
| `setMotorSpeed` | jointId, speed | void | No |
| `setMouseTarget` | jointId, target | void | No |

</details>

<details>
<summary>Rendering (5), Camera (3), Debug (3), Effects (13+), UI (5), 3D (7), Data (2)</summary>

See bridge inventory in explore agent output (bg_74f95ae3) for complete listing.

</details>

### Godot → TS (10 callback types)

| Callback | Payload | Registered In |
|----------|---------|---------------|
| `onCollision` | CollisionEvent | GameRuntime.godot.tsx:238 |
| `onSensorBegin` | SensorEvent | GodotBridge |
| `onSensorEnd` | SensorEvent | GodotBridge |
| `onEntitySpawned` | EntitySpawnedSnapshot | GameRuntime.godot.tsx:227 |
| `onEntityDestroyed` | entityId: string | GameRuntime.godot.tsx:232 |
| `onTransformSync` | Record<string, EntityTransform> | GodotPhysicsAdapter |
| `onPropertySync` | PropertySyncPayload | PropertySyncManager |
| `onInputEvent` | type, x, y, entityId | GodotBridge |
| `onUIButtonEvent` | buttonId, eventType | GodotBridge |
| `onScore` | points, entityId | GodotBridge |

---

## Key File Reference

| File | Role | Lines |
|------|------|-------|
| `app/lib/game-engine/GameRuntime.godot.tsx` | Main orchestrator, stepGame, bridge wiring | ~2000 |
| `app/lib/game-engine/EntityManager.ts` | TS entity registry, spawn/destroy/sync | 875 |
| `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` | Rule-based spawn (Godot-authoritative) | 151 |
| `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` | Script-based spawn (TS-optimistic) | 214 |
| `app/lib/game-engine/rules/actions/DestroyActionExecutor.ts` | Rule-based destroy | 53 |
| `app/lib/godot/GodotPhysicsAdapter.ts` | Physics2D adapter → bridge calls | ~400 |
| `app/lib/godot/GodotBridge.web.ts` | Web bridge (iframe/WASM) | ~1250 |
| `app/lib/godot/GodotBridge.native.ts` | Native bridge (JSI) | ~600 |
| `app/lib/godot/types.ts` | GodotBridge interface | ~300 |
| `app/lib/godot/PropertySyncManager.ts` | Property sync subscriber | 34 |
| `app/lib/game-engine/systems/runner/wrappers/EntityManagerRuntimeSystem.ts` | Transform sync per frame | 50 |
| `app/lib/game-engine/systems/runner/wrappers/PropertySyncRuntimeSystem.ts` | Property sync system wrapper | 71 |
| `app/lib/scripting/GameScriptAPI.ts` | Script context factory | ~100 |
| `app/lib/scripting/types.ts` | SandboxRuntimeContext types | ~100 |
| `godot_project/scripts/GameBridge.gd` | Godot bridge + callback registry | ~300 |
| `godot_project/scripts/entity/EntityFactory.gd` | Godot entity creation | ~200 |
| `godot_project/scripts/bridge/EventEmitter.gd` | Godot→JS callback system | 177 |
| `godot_project/scripts/bridge/QuerySystem.gd` | Async query/response | ~100 |
