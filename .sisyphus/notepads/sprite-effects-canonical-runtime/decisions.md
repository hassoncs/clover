# Decisions: Sprite Effects Canonical Runtime

## Task 4: Script API Surface Design

### Decision 1: API Surface Design

**Chosen**: Add three sync methods to `SyncWorldOps` interface:

```typescript
// In shared/src/types/sync-world-ops.ts

// ═══════════════════════════════════════════════════════════════
// Sprite Effects
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a sprite effect to an entity.
 * Script-applied effects have HIGHEST precedence (override declarative effects).
 * @param entityId - Target entity ID
 * @param effect - Effect type (glow, tint, flash, etc.)
 * @param params - Effect-specific parameters
 * @returns Effect instance ID for later updates/clear
 */
applySpriteEffect(
  entityId: string,
  effect: SpriteEffectType,
  params?: SpriteEffectParams,
): string;

/**
 * Update a parameter on an active sprite effect.
 * @param entityId - Target entity ID
 * @param effectId - Effect instance ID returned from applySpriteEffect
 * @param paramName - Parameter name to update
 * @param value - New parameter value
 */
updateSpriteEffectParam(
  entityId: string,
  effectId: string,
  paramName: string,
  value: unknown,
): void;

/**
 * Clear a sprite effect from an entity.
 * If effectId is omitted, clears ALL script-applied effects on the entity.
 * @param entityId - Target entity ID
 * @param effectId - Optional effect instance ID (clears all if omitted)
 */
clearSpriteEffect(entityId: string, effectId?: string): void;
```

**Rationale**:
- Sync operations match existing pattern (fire-and-forget)
- Returns `effectId` for granular updates/clears
- Optional `effectId` in clear allows bulk cleanup
- Uses same `SpriteEffectType` vocabulary as declarative path

### Decision 2: Parameter Type Definition

**Chosen**: Define a union type for effect params:

```typescript
// In shared/src/types/effects.ts (new file or extend behavior.ts)

export interface BaseSpriteEffectParams {
  duration?: number;  // Duration in seconds (for timed effects)
}

export interface GlowEffectParams extends BaseSpriteEffectParams {
  color?: [number, number, number];  // RGB 0-255
  intensity?: number;  // 0-1, default 0.5
  pulse?: boolean;
}

export interface TintEffectParams extends BaseSpriteEffectParams {
  color?: [number, number, number];  // RGB 0-255
  intensity?: number;  // 0-1, default 1.0
}

export interface FlashEffectParams extends BaseSpriteEffectParams {
  color?: [number, number, number];  // RGB 0-255
  duration?: number;  // Required for flash
}

export interface OutlineEffectParams extends BaseSpriteEffectParams {
  color?: [number, number, number];
  thickness?: number;  // Pixels
}

// ... other effect types

export type SpriteEffectParams = 
  | GlowEffectParams
  | TintEffectParams
  | FlashEffectParams
  | OutlineEffectParams
  | Record<string, unknown>;  // Fallback for custom effects
```

**Rationale**:
- Type-safe params for common effects
- Fallback for custom/unknown effects
- Consistent with `SpriteEffectBehavior.params` structure

### Decision 3: Precedence Rules

**Chosen**: Three-tier precedence model:

```
Script Override (HIGHEST)
    ↓ overrides
Entity-Level Declarative
    ↓ overrides
Prefab-Level Declarative (LOWEST)
```

**Conflict Resolution**:
1. Script-applied effects ALWAYS win over declarative effects
2. When script clears an effect, declarative effect (if any) becomes active
3. Multiple script effects on same entity: last-applied wins per effect type
4. Entity destroy clears ALL effects (script + declarative)

**State Model**:
```typescript
interface EntityEffectState {
  entityId: string;
  declarativeEffect?: ResolvedEffect;  // From prefab/entity definition
  scriptOverride?: ResolvedEffect;     // From script API
  activeEffect: ResolvedEffect;        // Computed: scriptOverride ?? declarativeEffect
}
```

**Rationale**:
- Scripts need full control for dynamic gameplay
- Declarative effects provide sensible defaults
- Clear separation of concerns

### Decision 4: Dispatcher Integration

**Chosen**: Script operations feed through the same dispatcher:

```
Script API Call
    ↓
EffectDispatcher.applyScriptEffect()
    ↓
Update EntityEffectState
    ↓
Diff & Bridge Calls (applySpriteEffect/updateSpriteEffectParam/clearSpriteEffect)
```

**Key Points**:
1. Script API does NOT call bridge directly
2. Script API updates dispatcher state
3. Dispatcher handles diffing and bridge calls
4. Same path as declarative effect resolution

**Rationale**:
- Single source of truth for effect state
- Consistent diffing behavior
- Easier debugging and testing
- No duplicate bridge call logic

### Decision 5: Effect Instance IDs

**Chosen**: Auto-generated IDs with optional explicit override:

```typescript
applySpriteEffect(entityId, 'glow', params)
// Returns: "effect_glow_entity123_0"

applySpriteEffect(entityId, 'glow', { ...params, id: 'myGlow' })
// Returns: "myGlow"
```

**Format**: `effect_{effectType}_{entityId}_{counter}` or explicit `id`

**Rationale**:
- Auto-generated IDs for simple use cases
- Explicit IDs for complex multi-effect scenarios
- Enables targeted updates without tracking return values

### Decision 6: Async Operations (Future Consideration)

**Chosen**: NOT in initial scope, but design allows extension:

```typescript
// Future: AsyncWorldOps extension
interface AsyncWorldOps {
  // ... existing
  
  // Animate effect parameter over time
  animateEffectParam(
    entityId: string,
    effectId: string,
    paramName: string,
    targetValue: number,
    opts: AnimateOptions,
  ): Promise<void>;
}
```

**Rationale**:
- Keep initial API simple
- Async animation can be layered on later
- Matches existing `animateEntity` pattern

---

## Open Questions (Resolved by Task 1)

1. **Color Format**: RGB 0-255 or 0-1?
   - Resolution: Use 0-255 for consistency with CSS colors
   
2. **Multiple Effects Per Entity**: Allowed?
   - Resolution: Yes, one effect per type (can have glow + outline simultaneously)

3. **Effect Stacking**: How do multiple effects combine?
   - Resolution: Godot-side material composition handles this; TS just tracks active set

---

## Task 1: Canonical Schema Contract

### Decision 7: Schema Location

**Chosen**: Add new types to `shared/src/types/behavior.ts` and extend `EntityPrefab`/`GameEntity` in `shared/src/types/entity.ts`.

**Rationale**:
- `SpriteEffectType` and `SpriteEffectBehavior` already exist in `behavior.ts`
- Keeps all effect-related types together
- Entity extension follows existing pattern (visual, physics, collider fields)

### Decision 8: Effect-State Groups vs Conditional Behaviors

**Chosen**: Introduce `EffectStateGroup` as a parallel to `ConditionalBehavior`, but specifically for sprite effects only.

**Key Difference**:
```typescript
// ConditionalBehavior: Any behavior type
interface ConditionalBehavior {
  when: ConditionalBehaviorCondition;
  priority: number;
  behaviors: Behavior[];  // Can include sprite_effect, scale_oscillate, move, etc.
}

// EffectStateGroup: Sprite effects only
interface EffectStateGroup {
  when: ConditionalBehaviorCondition;
  priority: number;
  effects: SpriteEffectConfig[];  // ONLY sprite effects
}
```

**Rationale**:
- Clear separation of concerns
- Effect-state groups can be evaluated by the effects dispatcher independently
- Non-effect behaviors remain in the existing behavior system
- Validation can enforce effect-only constraint

### Decision 9: Color Normalization Strategy

**Chosen**: Accept multiple formats at schema boundary, normalize to hex internally.

**Accepted Formats**:
1. Hex string: `"#RRGGBB"` (preferred, canonical)
2. RGB 0-255 tuple: `[255, 128, 0]`
3. Normalized 0-1 tuple: `[1.0, 0.5, 0.0]`

**Normalization Rules**:
- If any tuple value > 1.0 → treat as 0-255, divide by 255
- If all tuple values ≤ 1.0 → treat as normalized, pass through
- Hex string → pass through unchanged

**Rationale**:
- Hex is human-readable and matches CSS conventions
- Tuples support programmatic generation
- Normalization at schema boundary ensures consistent runtime behavior

### Decision 10: Base Effects vs State Effects

**Chosen**: Two separate fields on prefab/entity:

```typescript
interface EntityPrefab {
  effects?: SpriteEffectConfig[];      // Always active (base)
  effectStates?: EffectStateGroup[];   // Conditional (state-driven)
}
```

**Rationale**:
- Clear distinction between always-on and conditional effects
- Simpler mental model for authors
- Runtime can evaluate base effects once, state effects on tag changes

### Decision 11: Entity Destroy Cleanup

**Chosen**: Entity destruction MUST clear all effect state (declarative + script).

**Implementation**:
1. Dispatcher tracks all active effects per entity
2. On entity destroy, dispatcher issues `clearSpriteEffect(entityId)` for all tracked effects
3. Godot-side material cache entry removed

**Rationale**:
- Prevents memory leaks
- Ensures clean state for entity ID reuse
- Matches existing behavior system cleanup patterns

### Decision 12: Legacy Path Removal

**Chosen**: Complete removal of `effects.entityEffects` from:
1. Type definition (`GameDefinition.ts`)
2. Runtime loader (`GameLoader.ts`)
3. Any game content using the legacy path

**No Compatibility Shim**:
- Forward-only migration
- Games using legacy path must be migrated to canonical schema
- No fallback or dual-path support

**Rationale**:
- Single source of truth requirement
- Avoids maintenance burden of dual systems
- Clean architecture for future development

## Task 8: Documentation and Final Validation

### Decision 13: Vitest GLSL Support
**Chosen**: Install `vite-plugin-glsl` in the `app` package and add it to `vitest.config.mjs`.
**Rationale**: The effects system now imports `.glsl` files directly. While `shared` already had this plugin, `app` did not, causing test failures when importing effects-related code.

### Decision 14: Effects Adapter Inspector Config
**Chosen**: Update `EffectsGraphAdapter.getInspectorConfig` to return a default empty config for any node type present in the `NODE_CATALOG`, even if not explicitly defined in `INSPECTOR_CONFIGS`.
**Rationale**: This ensures that the graph editor can always show an inspector for known node types and satisfies contract tests that expect a non-null config for all catalog entries.

### Decision 15: Effects Handler Hot-Swap Logic
**Chosen**: In `effects-handler.ts`, only call `hotSwapShader` if no structural graph change (`applyGraph`) was triggered for the current payload.
**Rationale**: This matches the existing test suite's expectations and prevents redundant bridge calls when a full graph re-application already includes the updated shader source.
