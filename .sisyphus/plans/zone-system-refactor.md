# Zone System Architecture Refactor (Slopcade)

## TL;DR

Refactor `physics.isSensor` into a first-class **Zone** concept so detection-only objects (buttons, triggers, grid cells, collectibles, portals) stop being an awkward “physics-body-but-not-really” flag. This will unify runtime lookups, eliminate sensor-only storage/velocity hacks, and make **enter/exit** events a first-class input to rules.

**Recommendation:** Adopt **Option B** — declare `type: "zone"` at the template/entity level — because it matches how major engines model triggers (type-level separation), and it lets the engine enforce the correct semantics (no impulses/joints, overlap-only events) rather than relying on a leaky boolean on `physics`.

---

## 1) Problem Analysis (Current `isSensor` Approach)

### What exists today

Sensors are expressed as physics bodies with a boolean:

```ts
physics: {
  bodyType: "kinematic",
  isSensor: true,
  shape: "box",
  width: 1.2,
  height: 0.35,
}
```

On the Godot side, sensors are represented as `Area2D` (not a physics body), and require extra management:

- Separate sensor tracking exists: `sensors: Dictionary` and `sensor_velocities: Dictionary` in `godot_project/scripts/GameBridge.gd`.
- For sensors, `_create_physics_body` creates an `Area2D` and wires `body_shape_entered/exited`.
- Area2D does not have built-in velocity; the bridge emulates it with `sensor_velocities` and manual movement in `_physics_process`.
- There are split code paths for velocity:
  - `_js_set_linear_velocity` only handles `RigidBody2D` / `CharacterBody2D` (no `Area2D`).
  - `set_linear_velocity` *does* handle `Area2D` via `sensor_velocities`.

### Why this is architecturally painful

1. **Leaky abstraction:** a “sensor” isn’t a physics body; it’s an overlap region. Putting `isSensor` on `physics` implies it behaves like physics, but it doesn’t.
2. **Split storage and control paths:** sensors require additional dictionaries and bespoke cleanup (`sensors`, `sensor_velocities`).
3. **Inconsistent API behavior:** some bridge entrypoints treat sensors as first-class and others silently no-op (notably `_js_set_linear_velocity`). This is exactly the kind of “works on native but not web” footgun.
4. **Rules/events are not truly first-class:** sensor begin/end exist in the bridge surface (`onSensorBegin`/`onSensorEnd`) and runtime subscribes (`GameRuntime.godot.tsx`), but they’re “shoehorned” into collision handling instead of being explicit Zone events.
5. **Ongoing special-casing pressure:** behaviors and systems that assume bodies (impulses, joints, contact impulses, velocity) keep needing exceptions.

### Impact / usage (from repo analysis and provided stats)

Sensors are heavily used (93 instances across 23 games):
- ~67% static zones (buttons, fixed triggers, collectibles)
- ~28% kinematic zones (moving grid cells, rotating elements)
- ~5% dynamic-like cases (rare)

This means any sensor abstraction leak becomes a chronic source of edge cases.

---

## 2) Proposed Zone Architecture (Recommend Option B)

### Goals

- Make “zone-ness” explicit and enforceable at the type level.
- Provide a unified runtime entity/zone registry and stable lookup behavior.
- Make **zone enter/exit** events first-class and easy to consume in rules.
- Keep the common authoring experience simple (AI templates + human-written games).

### Non-goals / guardrails

- Do **not** redesign the entire physics subsystem (density, friction, restitution, joints) beyond what’s required to decouple zones.
- Do **not** change gameplay semantics: zones should keep behaving like today’s sensors (no physical response, overlap-only signals).
- Avoid new heavyweight dependencies.

### Why Option B (template-level `type: "zone"`) is preferred

**Option A** (`zone: { ... }` alongside `physics`) still encourages thinking “this is an entity with physics plus a zone flag” and forces you to maintain two parallel configuration trees.

**Option B** (discriminated `type`) gives:

- A hard separation the engine can enforce (e.g., zones can’t have impulses, can’t be used for joints, and don’t generate contact impulse data).
- Clear migration and deprecation rules (“if `physics.isSensor` is present, it becomes a `zone`”).
- Better alignment with engine patterns (Unity triggers, Godot `Area2D`, Unreal Trigger Volumes) where trigger-ness is not “just a physics flag”.

### Conceptual model

Introduce a new discriminant in template/entity definitions:

- `type: "body"` (existing physics body-based entity)
- `type: "zone"` (overlap region; maps to `Area2D`)

Zones may still be visible and may still have behaviors. Movement is allowed, but it is “kinematic-like” (position updates) rather than “dynamic physics”.

---

## 3) Type Definitions (New API)

> These are design-level TypeScript snippets to define the public API shape.

### New Zone component

```ts
export type ZoneMovementType = "static" | "kinematic";
export type ZoneShape =
  | { type: "box"; width: number; height: number }
  | { type: "circle"; radius: number }
  | { type: "polygon"; vertices: Vec2[] };

export interface ZoneComponent {
  movement?: ZoneMovementType; // default: "static"
  shape: ZoneShape;
  categoryBits?: number; // collision layer
  maskBits?: number;     // collision mask
}
```

### Discriminated entity/template definitions

```ts
export type EntityKind = "body" | "zone";

export interface BaseEntityDefinition {
  id: string;
  name?: string;
  tags?: string[];
  transform: Transform;
  sprite?: SpriteComponent;
  behaviors?: BehaviorDefinition[];
  // ... children/localTransform/etc as today
}

export interface BodyEntityDefinition extends BaseEntityDefinition {
  type?: "body";          // default when omitted
  physics: PhysicsComponent; // isSensor REMOVED from this type
}

export interface ZoneEntityDefinition extends BaseEntityDefinition {
  type: "zone";
  zone: ZoneComponent;
  // Note: zones do NOT accept PhysicsComponent
}

export type GameEntityDefinition = BodyEntityDefinition | ZoneEntityDefinition;
```

### Engine/runtime representation

```ts
export type RuntimeEntityKind = "body" | "zone";

export interface RuntimeZone {
  kind: "zone";
  id: string;
  colliderId: ColliderId; // maps to Area2D collision shape
  // optional: last known velocity for kinematic zones
}

export interface RuntimeBody {
  kind: "body";
  id: string;
  bodyId: BodyId;
  colliderId: ColliderId;
}

export type RuntimeActor = RuntimeZone | RuntimeBody;
```

### Rules-facing events

Prefer explicit zone events rather than treating them as “collisions with 0 impulse”:

```ts
export interface ZoneEnterEvent {
  zone: RuntimeZone;
  other: RuntimeActor; // body or zone (zone-zone optional)
}

export interface ZoneExitEvent {
  zone: RuntimeZone;
  other: RuntimeActor;
}
```

---

## 4) Migration Strategy: Big Bang (No Deprecation)

### Strategy: Complete migration in one shot

**Decision:** No deprecation window. No legacy support. Migrate everything at once.

1. **Remove `physics.isSensor`** from types and schemas entirely.
2. **Add `type: "zone"` + `zone: {...}`** as the only way to define zones.
3. **Migrate all 23 games** (93 instances) in a single PR.
4. **Update AI templates** to output `type: "zone"` syntax.
5. **Update all documentation** simultaneously.

### Why big bang over deprecation

- **Cleaner codebase:** No legacy code paths to maintain.
- **No confusion:** One way to do things, not two.
- **Faster:** No ongoing maintenance of compatibility shims.
- **Atomic:** Everything works or nothing works - easier to verify.

### Migration execution plan

1. **Create AST-based codemod** to transform all `physics.isSensor` → `type: "zone"` + `zone: {...}`
2. **Run codemod** across all 23 game files
3. **Manual review** of edge cases (kinematic sensors with behaviors)
4. **Update engine** to only accept new format
5. **Verify all games** load and run correctly
6. **Single commit** with all changes

---

## 5) High-level Task Breakdown (with dependencies)

> This is a planning breakdown; implementation details belong to execution tasks.

### Wave 1 — Types + Schemas (foundation)

1. **Add Zone types to shared types**
   - Add `ZoneComponent`, `ZoneShape`, `ZoneMovementType` to `shared/src/types/`
   - Add `ZoneEntityDefinition` with discriminant `type: "zone"`
   - Update `GameEntityDefinition` union type
   - **Remove** `isSensor` from `PhysicsComponent`

2. **Update Zod schemas**
   - Add zone schemas to `shared/src/types/schemas.ts`
   - Remove `isSensor` from physics schema
   - Update game definition schema to accept discriminated union

### Wave 2 — Engine Implementation

3. **Update EntityManager for zones**
   - Handle `type: "zone"` entities separately from bodies
   - Create zones as Area2D in Godot (unified storage, not separate dict)
   - Ensure zone lookup works via entity ID

4. **Unify Godot bridge storage**
   - Merge `sensors` dict into `entities` dict (with type tag)
   - Remove `sensor_velocities` - handle velocity uniformly
   - Fix all functions that only checked `entities` dict

5. **Zone movement support**
   - Ensure `setPosition`, `setVelocity` work for zones
   - Behaviors like `oscillate` work without special casing

### Wave 3 — Rules + Events

6. **Add zone_enter/zone_exit triggers**
   - New trigger types: `{ type: "zone_enter", zoneTag: "...", entityTag: "..." }`
   - Wire `onSensorBegin`/`onSensorEnd` to rule evaluation
   - Keep collision triggers working for zones (backward compat for rule patterns)

### Wave 4 — Migration (Big Bang)

7. **Create and run migration codemod**
   - AST-based transform: `physics.isSensor` → `type: "zone"` + `zone: {...}`
   - Run on all 23 games (93 instances)
   - Manual review of kinematic zones with behaviors

8. **Update AI templates**
   - Update game generator prompts to use `type: "zone"` syntax
   - Update example games in prompts

9. **Update documentation**
   - Replace all `isSensor` guidance with Zone guidance
   - Add examples: UI buttons, collectibles, portals, moving zones

### Wave 5 — Verification

10. **QA all migrated games**
    - Verify each game loads and runs
    - Test zone interactions: enter/exit, moving zones, UI buttons
    - Fix any regressions

11. **Add zone-specific tests**
    - Unit tests for zone creation, lookup, events
    - Integration tests for zone triggers in rules

---

## 6) Risk Assessment

### Key risks

1. **Behavior regressions for moving zones**
   - Moving zones currently rely on `sensor_velocities` + `_physics_process` updates.
   - Risk: zones stop moving or move inconsistently across platforms.
   - **Mitigation:** Unified velocity handling in bridge; test oscillating bucket in Slopeggle.

2. **Platform divergence (native vs web)**
   - `_js_set_linear_velocity` differs from `set_linear_velocity` today.
   - Risk: a fix must ensure both the JS callback path and direct method path behave the same.
   - **Mitigation:** Single code path for zone position/velocity updates.

3. **Rules semantics mismatch**
   - Today sensor begin is mapped into `collisionsRef` as a collision with zero impulse.
   - Risk: switching to explicit zone events changes which rules fire (or their ordering).
   - **Mitigation:** Keep collision triggers working for zones; zone_enter/zone_exit are additive.

4. **Big bang migration scope**
   - 93 sensor instances across 23 games + AI templates.
   - Risk: one mistake breaks many games.
   - **Mitigation:** Automated codemod + manual review + QA each game.

### QA Checklist (must pass before merge)

- [x] Static zone enter/exit (drain in Slopeggle)
- [x] Moving zone enter/exit (bucket in Slopeggle)
- [x] Zone used as UI button hit region (slotMachine buttons)
- [x] Zone used as collectible trigger (coins in platformer)
- [x] Zone used as portal (Slopeggle portals)
- [x] Zone+body collision rules still fire
- [x] All 23 games load without errors
- [x] All 23 games play correctly (spot check)

---

## Success Criteria

- [x] `physics.isSensor` is **completely removed** from types and schemas.
- [x] Zones are represented as a first-class entity kind (`type: "zone"`) with a `zone` component.
- [x] No engine/bridge API silently fails for zones (velocity, transform, lookup, cleanup).
- [x] Rules can consume zone enter/exit via new trigger types.
- [x] Collision triggers continue to work for zone interactions (backward compat).
- [x] All 23 games are migrated and working.
- [x] AI templates output `type: "zone"` syntax.
- [x] Documentation uses Zone concept exclusively (no mention of `isSensor`).

---

## References (Code Evidence)

- `godot_project/scripts/GameBridge.gd`
  - sensor dictionaries: `sensors`, `sensor_velocities`
  - sensor creation: `_create_physics_body` creates `Area2D` for `isSensor`
  - velocity gap: `_js_set_linear_velocity` lacks `Area2D` handling; `set_linear_velocity` handles `Area2D`
  - manual movement: `_physics_process` iterates `sensor_velocities`
- `godot_project/scripts/physics/PhysicsController.gd`
  - reads/writes `bridge.sensor_velocities` for `Area2D`
- `app/lib/game-engine/EntityManager.ts`
  - forwards `physicsConfig.isSensor` into fixture definitions
- `app/lib/game-engine/GameRuntime.godot.tsx`
  - subscribes to `physics.onSensorBegin` and treats it as a collision-like event
- `shared/src/types/physics.ts` and `shared/src/types/schemas.ts`
  - `isSensor?: boolean` exists in types and zod schemas
