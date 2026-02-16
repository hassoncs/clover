# Learnings: Sprite Effects Canonical Runtime

## Task 4: Script API Design

### Existing Patterns Observed

1. **ScriptContext extends SyncWorldOps** (`script-authoring-types.ts:27`)
   - All sync operations are directly available on `ctx`
   - Async operations via `ctx.worldAsync`
   - Pattern: sync ops return immediately, async ops return Promises

2. **Bridge Methods Already Exist** (`types.ts:538-548`)
   - `applySpriteEffect(entityId, effectName, params?)`
   - `updateSpriteEffectParam(entityId, paramName, value)`
   - `clearSpriteEffect(entityId)`
   - These are fire-and-forget (sync, no return value)

3. **SpriteEffectType Vocabulary** (`behavior.ts:274-285`)
   - `'outline' | 'glow' | 'tint' | 'flash' | 'pixelate' | 'posterize' | 'rim_light' | 'color_matrix' | 'inner_glow' | 'drop_shadow' | 'fade_out'`
   - Params vary by effect type (color, intensity, duration, pulse)

4. **ScriptSandboxRuntimeSystem Pattern** (`ScriptSandboxRuntimeSystem.ts:995-1612`)
   - ScriptContext is built in `createScriptContext()`
   - Bridge methods are wrapped with entity validation
   - Operations go through `this.systemContext.bridge`

5. **Legacy Path** (`GameLoader.ts:274-286`)
   - `definition.effects.entityEffects` is the legacy path being removed
   - Direct bridge calls without dispatcher/state management

### Key Design Insight

The bridge already has the low-level operations. The script API needs to:
1. Expose these operations through ScriptContext
2. Feed through the canonical dispatcher (Task 3) for state management
3. Participate in precedence/merge rules with declarative effects

### Effect Parameter Conventions

From `SpriteEffectBehavior.params`:
- `color?: [number, number, number]` - RGB tuple (0-255 or 0-1? Need to verify)
- `intensity?: number` - Effect strength
- `duration?: number` - Duration in seconds (for timed effects like flash)
- `pulse?: boolean` - Whether effect pulses

### Script Context Integration Point

The script context is created in `ScriptSandboxRuntimeSystem.createScriptContext()`. Effect operations would be added alongside other visual operations like `cameraShake`, `cameraZoom`, `animateEntity`.

---

## Task 1: Canonical Schema Definition

### Current State Analysis

**Existing Sprite Effect Vocabulary** (`shared/src/types/behavior.ts:274-296`):
```typescript
export type SpriteEffectType = 
  | 'outline'
  | 'glow'
  | 'tint'
  | 'flash'
  | 'pixelate'
  | 'posterize'
  | 'rim_light'
  | 'color_matrix'
  | 'inner_glow'
  | 'drop_shadow'
  | 'fade_out';

export interface SpriteEffectBehavior extends BaseBehavior {
  type: 'sprite_effect';
  effect: SpriteEffectType;
  params?: {
    color?: [number, number, number];  // RGB tuple 0-255
    intensity?: number;
    duration?: number;
    pulse?: boolean;
  };
}
```

**Existing Conditional Behavior System** (`shared/src/types/behavior.ts:421-459`):
- `ConditionalBehavior` already exists for tag-driven behavior groups
- Games (ballSort, gemCrush) already use `conditionalBehaviors` with `sprite_effect` behaviors
- Pattern: `when: { hasTag: "held" }` → `behaviors: [{ type: "sprite_effect", effect: "glow", params: {...} }]`

**Legacy Path to Remove** (`shared/src/types/GameDefinition.ts:570-579`):
```typescript
effects?: {
  graph?: unknown;
  graphs?: unknown[];
  shaders?: Record<string, { filename: string; glsl: string }>;
  entityEffects?: Array<{...}>;  // ← LEGACY, to be de-scoped
};
```

### Key Insight: Sprite Effects Already Use Conditional Behaviors

The canonical pathway already exists in practice:
- Prefabs define `conditionalBehaviors` with `sprite_effect` behaviors
- Tag conditions drive effect activation
- This is the **single pathway** — no new API needed, just formalization

---

## Canonical Schema Shape

### Per-Prefab/Per-Entity Sprite Effects

**Location**: `EntityPrefab.effects` and `GameEntity.effects` (new fields)

```typescript
// NEW: Canonical sprite effect configuration
export interface SpriteEffectConfig {
  /** Effect type from the approved vocabulary */
  effect: SpriteEffectType;
  /** Effect parameters (normalized at schema boundary) */
  params?: SpriteEffectParams;
}

export interface SpriteEffectParams {
  /** Color as hex string "#RRGGBB" or normalized RGB tuple [0-1, 0-1, 0-1] */
  color?: string | [number, number, number];
  /** Effect intensity 0.0-1.0 */
  intensity?: number;
  /** Duration for transient effects (seconds) */
  duration?: number;
  /** Enable pulsing animation */
  pulse?: boolean;
  /** Additional effect-specific parameters */
  [key: string]: unknown;
}

// NEW: Effect-state groups for conditional effects
export interface EffectStateGroup {
  /** Condition that activates this effect group */
  when: ConditionalBehaviorCondition;
  /** Priority for exclusive evaluation (higher wins) */
  priority: number;
  /** Sprite effects to apply when active */
  effects: SpriteEffectConfig[];
}
```

### Prefab/Entity Extension

```typescript
// Extend EntityPrefab
export interface EntityPrefab {
  // ... existing fields ...
  
  /** Base sprite effects always active on this prefab */
  effects?: SpriteEffectConfig[];
  
  /** Conditional effect groups (tag/expr driven) */
  effectStates?: EffectStateGroup[];
}

// Extend GameEntity
export interface GameEntity {
  // ... existing fields ...
  
  /** Entity-level effect overrides (merge with prefab) */
  effects?: SpriteEffectConfig[];
  
  /** Entity-level effect state overrides */
  effectStates?: EffectStateGroup[];
}
```

---

## Precedence and Merge Rules

### Three-Layer Precedence (Low to High)

1. **Prefab Defaults** (`prefab.effects` + `prefab.effectStates`)
   - Base effects always active
   - Conditional groups evaluated first

2. **Entity Overrides** (`entity.effects` + `entity.effectStates`)
   - Merge with prefab effects (entity wins on conflict)
   - Entity effect states replace prefab states with matching conditions

3. **Script Overrides** (runtime, highest priority)
   - `ctx.applySpriteEffect(entityId, effect, params)` 
   - Script-applied effects override all declarative effects
   - Script-cleared effects fall back to declarative state

### Merge Semantics

```
Final Active Effects = 
  Script Overrides (if any)
  ?? Entity Effects (if defined)
  ?? Merged(Prefab Base + Active Prefab State Effects)
```

**Conflict Resolution**:
- Same effect type at same layer: later definition wins
- Different layers: higher layer wins completely (no partial merge)
- Script override: completely replaces declarative for that effect type

---

## Boundary: Sprite Effects vs Graph Effects

### Sprite Effects (Per-Entity, This Contract)

| Aspect | Definition |
|--------|------------|
| **Scope** | Single entity's visual sprite |
| **Authoring** | `EntityPrefab.effects`, `GameEntity.effects`, `EffectStateGroup` |
| **Runtime** | `applySpriteEffect`, `updateSpriteEffectParam`, `clearSpriteEffect` bridge calls |
| **Execution** | Godot per-entity ShaderMaterial on Sprite2D |
| **Examples** | glow, outline, tint, flash, drop_shadow |

**Key Characteristic**: Each entity has its own effect state, independently controllable.

### Graph Effects (Post-Process, Separate System)

| Aspect | Definition |
|--------|------------|
| **Scope** | Full screen or named buffers |
| **Authoring** | `GameDefinition.effects.graph`, `EffectGraphSpec` |
| **Runtime** | `GraphExecutor`, `ResourceGraph`, `PingPongManager` |
| **Execution** | Godot SubViewport chain with multi-pass shaders |
| **Examples** | bloom, blur, chromatic aberration, fluid simulation |

**Key Characteristic**: Operates on rendered output, not individual entities.

### Boundary Statement

> **Sprite effects** are per-entity visual modifications applied via `ShaderMaterial` on individual sprites. They are authored at prefab/entity level and executed through the `applySpriteEffect` bridge family.
>
> **Graph effects** are post-process shader pipelines that operate on screen buffers or intermediate textures. They are authored as `EffectGraphSpec` and executed through the `GraphExecutor` runtime.
>
> These are **separate systems** with no overlap. Sprite effects never route through graph executor; graph effects never target individual entities.

---

## Parameter Conventions

### Color Representation

**Canonical Form at Schema Boundary**: Hex string `"#RRGGBB"`

```typescript
// ACCEPTABLE at schema boundary:
color: "#FF5500"           // Hex string (preferred)
color: [255, 85, 0]        // RGB tuple 0-255 (legacy, normalized on read)
color: [1.0, 0.33, 0.0]    // Normalized tuple 0-1 (normalized on read)

// INTERNAL representation after normalization:
// All colors converted to Godot-compatible format at runtime
```

**Normalization Rules**:
1. Hex string `"#RRGGBB"` → pass through as-is
2. RGB tuple `[R, G, B]` where any value > 1 → divide by 255
3. RGB tuple `[R, G, B]` where all values ≤ 1 → pass through
4. Invalid values → validation error at schema boundary

**Why Hex Preferred**:
- Human-readable in game definitions
- Matches CSS/web conventions
- No ambiguity about range

### Intensity

- Range: `0.0` to `1.0`
- Default: `0.5` (effect-specific defaults may vary)
- Clamped at runtime if out of range

### Duration

- Units: seconds
- `undefined` → effect is persistent until cleared
- `0` → instant (one frame)
- Positive value → transient effect with auto-clear

### Pulse

- Boolean: `true` enables pulsing animation
- Animation: sine wave modulation of intensity
- Frequency: effect-specific default (typically 2-4 Hz)

---

## Validation Rules

### Effect-State Groups Must Contain Only Sprite Effects

```typescript
// VALID: EffectStateGroup with sprite effects only
{
  when: { hasTag: "held" },
  priority: 1,
  effects: [
    { effect: "glow", params: { pulse: true } },
    { effect: "outline", params: { color: "#FFFFFF" } }
  ]
}

// INVALID: EffectStateGroup with non-effect behaviors
{
  when: { hasTag: "held" },
  priority: 1,
  effects: [
    { effect: "glow", params: { pulse: true } },
    { type: "scale_oscillate", min: 0.9, max: 1.1, speed: 5 }  // ❌ WRONG
  ]
}
```

**Validation Rule**:
- `EffectStateGroup.effects` array must contain ONLY `SpriteEffectConfig` objects
- Non-effect behaviors (scale_oscillate, move, etc.) belong in `ConditionalBehavior.behaviors`
- Validator rejects effect-state groups containing non-sprite-effect entries

### Rationale

Effect-state groups are specifically for visual effect activation. Non-effect behaviors have their own systems:
- Animation behaviors → `ConditionalBehavior.behaviors`
- Physics behaviors → `ConditionalBehavior.behaviors`
- Game logic → scripts

This separation ensures:
1. Clear ownership: effects system owns effect-state groups
2. No cross-system coupling in validation
3. Runtime can optimize effect-only evaluation

---

## TypeScript Type Targets

### Files to Modify (Task 2)

| File | Changes |
|------|---------|
| `shared/src/types/behavior.ts` | Add `SpriteEffectConfig`, `SpriteEffectParams`, `EffectStateGroup` types |
| `shared/src/types/entity.ts` | Add `effects` and `effectStates` fields to `EntityPrefab` and `GameEntity` |
| `shared/src/types/GameDefinition.ts` | Remove `effects.entityEffects` from type definition |
| `shared/src/scripting/script-authoring-types.ts` | Add script API types for effect operations |

### Files to Remove Legacy References (Task 6)

| File | Changes |
|------|---------|
| `app/lib/game-engine/GameLoader.ts` | Remove `applyEffects` legacy path |
| `shared/src/types/GameDefinition.ts` | Remove `entityEffects` from effects envelope |

---

## Evidence

See `.sisyphus/evidence/task-1-schema-consistency.txt` for grep output confirming:
1. Single canonical schema path (conditionalBehaviors pattern already in use)
2. No competing parallel schema names
3. Legacy `entityEffects` isolated to GameDefinition.ts only

---

## Task 2: Shared Canonical Type/Schema Migration

- Added canonical sprite effect contracts in shared types:
  - `SpriteEffectParams`
  - `SpriteEffectConfig`
  - `EffectStateGroup`
  - Location: `shared/src/types/behavior.ts`
- Added `effects` and `effectStates` to entity contracts by extending:
  - `GameEntity`
  - `BaseEntityPrefab` (and therefore `EntityPrefab`)
  - Location: `shared/src/types/entity.ts`
- Removed legacy `effects.entityEffects` from `GameDefinition.effects` contract in `shared/src/types/GameDefinition.ts`.
- Added canonical effects type entrypoint `shared/src/types/effects.ts` and exported it via `shared/src/types/index.ts`.
- Updated script-facing type surface:
  - Added sprite effect operations to `SyncWorldOps` (`applySpriteEffect`, `updateSpriteEffectParam`, `clearSpriteEffect`)
  - Re-exported sprite effect contracts from `script-authoring-types.ts`
- Removed validation usage of the legacy contract from shader linter extraction/tests so shared compiles against canonical contracts only.
- Verification:
  - `pnpm tsc --noEmit` passed (exit code 0)
  - `entityEffects` grep in `shared/src/types` and `shared/src/scripting` returned no matches

---

## Task 5: Godot Metadata/Lifecycle Cleanup for Canonical Sprite Effects

- `EntityFactory` now persists canonical effect metadata directly onto nodes at creation time:
  - `meta.effects`
  - `meta.effectStates`
  - Applied for both root entities and child entities via `_set_canonical_effect_metadata`.
- `GameBridgeEffects` now hooks entity lifecycle cleanup through `GameBridge.entity_destroyed`:
  - On destroy signal, `clear_sprite_effect(entityId)` is called for that entity.
  - If the destroyed canvas item was the active graph-display sprite reference, `_entity_sprite` and original texture refs are nulled to avoid stale references.
- Added a fallback cleanup hook using `CanvasItem.tree_exited` in `apply_sprite_effect`:
  - Ensures effect registry/cache cleanup still runs even if an entity exits tree through non-standard paths.
- Added diagnostics query handler `effects.getSpriteEffectDiagnostics` to expose:
  - tracked entity IDs/count in `_entity_effects`
  - material cache size and per-key refcounts in `_material_cache`
- `GameBridge.clear_game()` now explicitly calls `GameBridgeEffects.clear_all_sprite_effects()` before graph clear/reset to guarantee reset-path cleanup.
- No second material cache path was introduced; all cleanup routes continue using the existing `_entity_effects` + `_material_cache` data structures.

---

## Task 3: Runtime Sprite-Effect Dispatcher

- Added `EffectDispatcher` (`app/lib/game-engine/EffectDispatcher.ts`) as the canonical per-entity sprite-effect state engine.
- Dispatcher state model now tracks per-entity:
  - `declarativeEffect` (prefab/entity/effect-state resolution)
  - `scriptOverrides` (effectId-indexed runtime overrides)
  - `activeEffect` (what is currently applied in Godot)
- Conditions are evaluated tags-first and support expression fallback:
  - `hasTag`, `hasAnyTag`, `hasAllTags`, `lacksTag`
  - `expr` compiled via shared expression engine with cached compilation
- Diff strategy is event/state-driven only (no per-frame brute-force reapply):
  - apply on activate/effect change
  - update changed params via `updateSpriteEffectParam`
  - clear on deactivate/entity destroy
  - reapply only when params are removed or effect identity changes
- Color normalization now happens at dispatcher boundary:
  - hex `#RRGGBB` normalized to `[0-1, 0-1, 0-1]`
  - numeric arrays normalized/clamped to `0..1`
- Added entity lifecycle/tag change listeners in `EntityManager` (`onEntitySpawned`, `onEntityDestroyed`, `onEntityTagsChanged`) so all tag mutations funnel through one effect reconciliation path.
- Added `SpriteEffectsRuntimeSystem` wrapper to initialize/share dispatcher in runner context and ensure script API + declarative path use the same dispatcher instance.
- Script sandbox world API methods (`applySpriteEffect`, `updateSpriteEffectParam`, `clearSpriteEffect`) now feed dispatcher instead of calling bridge directly.
- Added regression test scaffold: `app/lib/game-engine/__tests__/EffectDispatcher.test.ts` covering tag-driven apply/clear and param diff updates.

- 2026-02-16: Added `effectDispatcher?: EffectDispatcher` to `SystemContext` so sprite-effects and script-sandbox wrappers share one canonical dispatcher instance without type casts.

---

## Task 6: Legacy Path Removal

### Removed Legacy entityEffects Path

The legacy `definition.effects.entityEffects` path was removed from `GameLoader.ts`. This path:
- Applied raw GLSL shaders directly to entities via `bridge.applySpriteEffect(entityId, glsl, params)`
- Bypassed the canonical sprite effect dispatcher
- Had no state management or lifecycle tracking

### Migration Approach

Games using `entityEffects` (shaderMulti, shaderRainbow, shaderCRT) had their `entityEffects` arrays removed. The custom GLSL effects in these games don't map to the canonical `SpriteEffectType` vocabulary (glow, outline, tint, etc.) — they were demo shaders for testing.

These games retain:
- `shaders` — hot-swappable shader library (still valid)
- `graph` — post-process screen effects (separate system)

### Key Distinction

- **entityEffects** (removed): Per-entity custom GLSL, no lifecycle management
- **canonical sprite effects**: Predefined types, proper lifecycle via EntityFactory/GameBridgeEffects
- **graph effects**: Post-process screen shaders, separate system entirely

---

## Task 7: Automated Tests for Canonical Effect System

### Test Coverage Added

Expanded `EffectDispatcher.test.ts` from 2 to 25 tests covering:

1. **Tag-driven effect activation** (6 tests)
   - `hasTag` condition
   - `hasAnyTag` condition (any of multiple tags)
   - `hasAllTags` condition (all of multiple tags)
   - `lacksTag` condition
   - `expr` condition (falsy and truthy cases)

2. **Script API effect operations** (7 tests)
   - Diff-based param updates
   - Script overrides declarative effects
   - Fallback to declarative after script clear
   - Multiple script effects with precedence
   - Clear all script effects
   - Non-existent entity handling
   - Custom effect ID support

3. **Entity lifecycle** (3 tests)
   - Effect cleared on entity destroy
   - Tracked entity count accuracy
   - Dispatcher cleanup on destroy

4. **Color normalization** (3 tests)
   - Hex to RGB tuple conversion
   - 0-255 to 0-1 normalization
   - Already-normalized tuple preservation

5. **Precedence rules** (3 tests)
   - Entity effects override prefab effects
   - Higher priority effect state wins
   - Script effects have highest precedence

6. **Diffing behavior** (3 tests)
   - Reapply on effect type change
   - Reapply on param removal
   - Update individual params on value change

### Pre-existing Tests Fixed

- `callback-registry.test.ts`: Updated for new `collisionEnter` and `collisionExit` callback types (12 total)

### Pre-existing Issues Noted

- `PrefabInstantiator.test.ts`: Test for velocity in spawnEntity fails because `SpawnEntityRequest` type doesn't include velocity. Non-trivial fix requiring bridge type updates.

### No Legacy Tests Found

Grep search for `entityEffects` in test files returned no matches. No legacy tests needed removal.

## Task 8: Documentation and Final Validation

### Documentation Strategy
- Updated `EFFECTS_ARCHITECTURE.md` to include a dedicated section for Canonical Sprite Effects, clarifying the authoring (declarative vs scripting) and precedence rules.
- Updated `effects-system.md` skill to provide quick reference and examples for the new API.
- Created `MIGRATION_GUIDE.md` to help contributors transition from the legacy `entityEffects` path.

### Test Infrastructure Improvements
- Discovered that Vitest in the `app` package was failing to parse `.glsl` files imported by the effects system. Fixed by installing and configuring `vite-plugin-glsl` in `app/vitest.config.mjs`.
- Fixed a pre-existing failure in `EffectsGraphAdapter.test.ts` where `getInspectorConfig` returned `null` for nodes in the catalog but not in the hardcoded config map. Updated the adapter to return a default config for catalog entries.

### Logic Refinement
- Refined `effects-handler.ts` to match test expectations: if a structural graph change occurs (calling `applyGraph`), we skip individual `hotSwapShader` calls for that payload to avoid redundancy and match the "either-or" logic expected by the tests.
