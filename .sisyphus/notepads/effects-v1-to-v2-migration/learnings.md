
## Wave 5 Task 5.1: Effects Test Example
- Created `app/app/examples/effects_test.tsx` as a comprehensive testbed for V2 effects.
- Implemented auto-generation of UI controls based on `EFFECT_METADATA`.
- Used `GodotBridge` V2 methods: `applySpriteEffect`, `setPostEffect`, `clearSpriteEffect`, `clearPostEffect`.
- Note: The bridge implementation files (`GodotBridge.web.ts`, `GodotBridge.native.ts`) are currently missing the implementation of these V2 methods, which causes LSP errors in those files, but the test example itself is type-correct against the interface.

## Wave 6 Task 6.2: Delete v1 Effects Module

**Deleted**: `shared/src/effects/` directory (entire v1 effects system)

**Additional cleanup required**:
- `shared/src/types/visual.ts` had orphaned reference to `EffectChain` type
- Removed `effects?: EffectChain` field from `BaseVisualComponent`
- Removed `import type { EffectChain } from './effects'`

**Verification**: TypeScript compilation passes after cleanup.

**Pattern**: When deleting modules, always check type files for orphaned imports/references.

## Wave 6 Task 6.1: Delete V1 Type Files
- Deleted 5 v1 type files: `effects.ts`, `effect-pipeline.ts`, `multi-pass-effect.ts`, `effect-snapshot.ts`, `effect-budget.ts`
- Removed corresponding exports from `shared/src/types/index.ts`
- Found `visual.ts` had a stale import of `EffectChain` from deleted `effects.ts`
- `EffectChain` was just `EffectSpec[]` — a v1 type for chaining effects on visual components
- Removed the `effects?: EffectChain` field from `BaseVisualComponent` (unused after Wave 3 consumer migration)
- TypeScript compilation passes cleanly after cleanup

## Wave 6 Task 6.3: Remove EffectsManager from GameBridgeEffects.gd

**File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**Changes**:
- Removed `effects_manager` variable and instantiation from `_ready()`
- Kept `particle_factory` and `graph_executor` (v2) working
- Refactored all v1 EffectsManager methods to either:
  - Return stub implementations with warnings (sprite effects, post effects, dynamic shaders)
  - Remove EffectsManager fallback (camera effects like `screen_shake`, `zoom_punch`)
  - Warn about v2 alternatives (shockwave, flash_screen)

**Methods refactored**:
- `apply_sprite_effect` → stub with warning to use `graph_executor.apply_plan()`
- `update_sprite_effect_param` → stub with warning to use `graph_executor.update_params()`
- `clear_sprite_effect` → stub with warning to use `graph_executor.clear_plan()`
- `set_post_effect` → stub with warning to use `graph_executor.apply_plan()`
- `update_post_effect_param` → stub with warning to use `graph_executor.update_params()`
- `clear_post_effect` → stub with warning to use `graph_executor.clear_plan()`
- `screen_shake` → removed EffectsManager fallback, kept camera methods
- `zoom_punch` → removed EffectsManager fallback, kept camera methods
- `trigger_shockwave` → stub with warning to use graph_executor
- `flash_screen` → stub with warning to use graph_executor
- `create_dynamic_shader` → stub with warning to use graph_executor with custom shader
- `apply_dynamic_shader_to_entity` → stub with warning
- `apply_dynamic_post_shader` → stub with warning
- `_js_get_available_effects` → hardcoded effect lists from v2 GraphExecutor constants
- `_get_camera` → removed `effects_manager.set_camera()` call

**Verification**: Godot syntax check passes cleanly

**Pattern**: When removing v1 dependencies, provide clear migration warnings pointing to v2 alternatives

## Wave 6 Task 6.4: VFXShowcase.gd Cleanup

**Status**: File already deleted (not found in codebase)

**Verification**:
- Searched for `VFXShowcase.gd` - file does not exist
- Searched for `EffectsManager` references in all `.gd` files - no matches found
- Scene file `godot_project/scenes/VFXShowcase.tscn` references missing script `res://scripts/VFXShowcase.gd`

**Conclusion**: VFXShowcase.gd was already removed during earlier cleanup. No EffectsManager references remain in Godot codebase.

**Note**: The scene file `VFXShowcase.tscn` still references the deleted script, but this is a demo scene and doesn't affect the migration.

## Wave 7 Task 7.1: Rename effects-v2 Directory to effects

**Renamed**: `shared/src/effects-v2/` → `shared/src/effects/`

**Import updates** (8 files, 13 occurrences):
- `app/app/examples/effects_test.tsx` — 2 import paths + game ID/title/description strings
- `app/app/examples/multipass_test.tsx` — 1 import path
- `app/app/examples/paint.tsx` — 1 import path
- `app/lib/godot/types.ts` — 1 import path
- `app/lib/game-engine/BehaviorContext.ts` — 1 import path
- `app/lib/game-engine/behaviors/VisualBehaviors.ts` — 1 import path + 1 local file import

**File renames**:
- `app/lib/game-engine/effects-v2-helpers.ts` → `effects-helpers.ts`
- `app/lib/godot/__tests__/effects-v2-bridge.test.ts` → `effects-bridge.test.ts`

**Barrel**: `shared/src/index.ts` did not reference effects-v2 (effects accessed via deep imports). No changes needed.

**Verification**: `pnpm tsc --noEmit` passes, grep for `effects-v2` returns zero hits across monorepo.
## Wave 7 Task 7.3: Type Name Cleanup (2026-02-08)

**Objective**: Remove V2 suffix from all type names

**Changes Made**:
- `EffectsV2Snapshot` → `EffectsSnapshot` (TypeScript)
- `EffectsV2Bridge` → `EffectsBridge` (TypeScript)
- `EffectsV2GraphExecutor` → `EffectsGraphExecutor` (GDScript)
- `EffectsV2ResourceGraph` → `EffectsResourceGraph` (GDScript)
- `EffectsV2PingPongManager` → `EffectsPingPongManager` (GDScript)

**Files Updated**:
- `shared/src/effects/snapshot.ts` - Interface and class references
- `shared/src/effects/index.ts` - Export statement
- `shared/src/effects/__tests__/snapshot.test.ts` - Test type assertions
- `app/lib/godot/types.ts` - Bridge interface
- `app/lib/godot/__tests__/effects-bridge.test.ts` - Test expectations
- `godot_project/scripts/effects_v2/GraphExecutor.gd` - Class name and error messages
- `godot_project/scripts/bridge/GameBridgeEffects.gd` - Type declarations and instantiation

**Verification**:
- ✅ TypeScript compilation passes (`pnpm tsc --noEmit` in shared)
- ✅ No remaining V2 type names found (grep verification)
- ✅ LSP rename successfully updated all TypeScript references
- ✅ Manual edits for GDScript files completed

**Notes**:
- RPC method names like `"effectsV2.applyGraph"` remain unchanged (protocol strings)
- Pre-existing TypeScript errors in GodotBridge.{native,web}.ts are unrelated to this task

## Paint Example Graph Wiring Fix (2026-02-08)

- `app/app/examples/paint.tsx` needed explicit graph compilation + bridge application in three places: init, shader switch, and clear.
- `compileGraph()` currently compiles custom passes with empty `shaderSource.glsl`, so custom shader text must be patched into compiled pass payloads before `bridge.applyGraph(plan)`.
- For custom graph nodes, carrying `shader` on the node object (local extension type) provides a reliable source of GLSL for plan patching.
- Start/stop behavior remains controlled by `lifecycle.autoStart: false`; graph should be applied first, then `bridge.start()`/`bridge.stop()` only toggles execution.
- Ping-pong feedback is preserved by the existing feedback edge policy (`swapPolicy: pingPong`) when the compiled plan is re-applied after clear/shader change.

## Effects v1->v2 Cleanup Completion (2026-02-08)

- Final migration cleanup required coordinated renames across bridge types, bridge helpers, bridge protocol strings, behavior context APIs, and tests; partial rename passes leave compile-safe but runtime-broken call paths.
- Godot bridge has two valid effects paths that must coexist: query/RPC (`effects.*`) for graph operations and direct callbacks/native dispatch for convenience methods (`applySpriteEffect`, `setPostEffect`, etc.).
- `GodotBridge.web.ts` must include convenience methods in both the runtime bridge object and the `Window.GodotBridge` interface declaration, otherwise examples compile but fail at runtime due to missing callback typings.
- `BehaviorContext` is now graph-first for sprite effects (`applySpriteEffect(entityId, plan)` + async clear/update methods), with old v1-style sprite effect signatures removed to prevent accidental fallback usage.
- Verification that mattered for this migration: `pnpm tsc --noEmit` clean, grep zero `EffectsV2` in `.ts`, grep zero `effectsV2` in `.ts`/`.gd`, and updated budget test imports to `../budget` + `../types` after v1 type-file deletion.
