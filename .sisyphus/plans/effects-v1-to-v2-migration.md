# Effects V1 → V2 Migration Plan

## Goal
Fully migrate from v1 effects system to v2, delete all v1 code, rename v2 to be the standard (no version suffix).

## Constraints (verbatim from user)
- "remove all legacy and deprecated code paths"
- "none of the old V1 of the effects code should be around anymore"
- "rename it so there is no V2 anymore and it's just the standard non-version naming"
- "the example on the labs page would have either drop downs or radio buttons"
- "manually test things and confirm that every effect is working"

---

## Wave 1: Make V2 Self-Contained (TypeScript)

### Task 1.1: Inline v1 types into effects-v2/types.ts
**Files**: `shared/src/effects-v2/types.ts`
**Action**: Copy these type definitions directly into `effects-v2/types.ts`:
- `ShaderSource` (from `effect-pipeline.ts` L19-21) — discriminated union `{type:'builtin', effectType} | {type:'custom', glsl}`
- `UniformDeclaration` (from `effect-pipeline.ts` L9-13) — `{name, type, defaultValue?}`
- `UniformType` (from `effect-pipeline.ts` L7) — `'float'|'int'|'vec2'|'vec3'|'vec4'|'color'|'bool'`
- `QualityTier` (from `effect-pipeline.ts` L29) — `'low'|'medium'|'high'`
- `PersistenceMode` (from `effect-pipeline.ts` L27) — `'none'|'pingPong'`
- `PlatformTier` (from `effect-budget.ts` L7) — `'web-high'|'web-low'|'mobile-high'|'mobile-low'`
- `BudgetTierPolicy` (from `effect-budget.ts` L13-17) — `{maxPasses, maxResolutionScale, minCadence}`

**Note**: `ShaderSource` references `EffectType` from `effects.ts`. We need to also inline `EffectType` (the 28-member union) into v2/types.ts so v2 has zero v1 imports.

**Verification**: `tsc --noEmit` in shared package

### Task 1.2: Move BUDGET_TIER_PRESETS into effects-v2/budget.ts
**Files**: `shared/src/effects-v2/budget.ts`
**Action**: Copy the `BUDGET_TIER_PRESETS` constant from `effect-budget.ts` into `budget.ts`. Remove the import of `BUDGET_TIER_PRESETS` from `../types/effect-budget`.
**Verification**: `tsc --noEmit` in shared package

### Task 1.3: Update all v2 internal imports
**Files**: `effects-v2/types.ts`, `effects-v2/registry.ts`, `effects-v2/validator.ts`, `effects-v2/budget.ts`, `effects-v2/compiler.ts`
**Action**: Replace ALL imports from `../types/effect-pipeline` and `../types/effect-budget` with imports from `./types` and `./budget`.
**Verification**: `tsc --noEmit` — zero imports from `../types/effect-*` in any file under `effects-v2/`

### Task 1.4: Update v2 barrel exports
**Files**: `shared/src/effects-v2/index.ts`
**Action**: Ensure all re-exported types (`ShaderSource`, `UniformDeclaration`, `QualityTier`, `PersistenceMode`, `PlatformTier`, `BudgetTierPolicy`, `EffectType`) come from `./types` not from v1. Add `BudgetTierPolicy`, `BUDGET_TIER_PRESETS`, `EffectType` exports.
**Verification**: `tsc --noEmit`, grep confirms zero `../types/effect-` imports in `effects-v2/`

---

## Wave 2: Port Godot V2 Executor Shader Gaps

### Task 2.1: Sync missing shaders into GraphExecutor.gd
**Files**: `godot_project/scripts/effects_v2/GraphExecutor.gd`
**Action**: Add missing entries to the v2 `SPRITE_SHADER_PATHS` and `POST_SHADER_PATHS` dictionaries:
- Missing from SPRITE: `flash`, `silhouette`, `rainbow`
- Missing from POST: `crt`, `color_grading`/`color_grade`, `glitch`, `pixelate_screen`, `shimmer`
**Verification**: Every key in v1's `EffectsManager.gd` dictionaries has a corresponding key in v2's `GraphExecutor.gd`

### Task 2.2: Move EFFECT_METADATA into v2
**Files**: `shared/src/effects-v2/types.ts` (or new `shared/src/effects-v2/metadata.ts`)
**Action**: Move the `EFFECT_METADATA` constant and its associated types (`EffectMetadata`, `EffectParam`, `EffectCategory`) from `shared/src/types/effects.ts` into the v2 module. This metadata drives the test page UI (parameter sliders, dropdowns, defaults).
**Verification**: `tsc --noEmit`

---

## Wave 3: Port ALL V1 Consumers to V2

**IMPORTANT**: All consumer ports MUST complete before v1 bridge methods are removed. Tasks 3.1-3.5 port consumers. Task 3.6-3.7 remove v1 methods. Verification (`tsc --noEmit`) only runs after ALL tasks in this wave.

### Task 3.1: Port BehaviorContext sprite effects to v2
**Files**: `app/lib/game-engine/BehaviorContext.ts`, `app/lib/game-engine/behaviors/VisualBehaviors.ts`
**Action**: Replace `applySpriteEffect(entityId, effectType, params)` calls with v2 graph-based approach. Create a helper that wraps a single sprite effect as a minimal EffectGraphSpec with one node.

### Task 3.2: Port BehaviorExecutorRuntimeSystem to v2
**Files**: `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts`
**Action**: Replace any v1 effect method references with v2 equivalents.

### Task 3.3: Port example pages to v2
**Files**: `app/app/examples/paint.tsx`, `app/app/examples/multipass_test.tsx`, `app/app/examples/vfx_showcase.tsx`, `app/app/examples/shader_test.tsx`
**Action**: Replace `MultiPassEffectSpec` with `EffectGraphSpec`, replace `applySpriteEffect`/`setPostEffect`/`applyMultiPassEffect` with v2 bridge calls.

### Task 3.4: Update mock bridge for tests
**Files**: `app/lib/godot/__tests__/mock-godot-bridge.ts`
**Action**: Remove v1 method mocks, add v2 method mocks to match updated `GodotBridge` interface.

### Task 3.5: Sweep for remaining v1 references
**Action**: Run `grep -r "applySpriteEffect\|applyPipeline\|applyMultiPassEffect\|MultiPassEffectSpec\|EffectPipelineSpec\|setPostEffect\|stopMultiPassEffect\|clearMultiPassEffect\|startMultiPassEffect\|setMultiPassInput\|updatePipelinePassParam" app/ --include="*.ts" --include="*.tsx"` — must return zero hits before proceeding.

### Task 3.6: Remove v1 bridge methods from types
**Files**: `app/lib/godot/types.ts`
**Action**: Remove v1 effect methods from the `GodotBridge` interface:
- `applyPipeline`, `applyMultiPassEffect`, `captureSnapshot`, `restoreSnapshot`
- `applySpriteEffect`, `stopMultiPassEffect`, `clearMultiPassEffect`
- `startMultiPassEffect`, `setMultiPassInput`, `updatePipelinePassParam`
Keep only v2 `EffectsV2Bridge` methods.

### Task 3.7: Remove v1 bridge implementations
**Files**: `app/lib/godot/GodotBridge.web.ts`, `app/lib/godot/GodotBridge.native.ts`
**Action**: Remove v1 method implementations. Keep v2 implementations.

**Wave 3 Verification**: `tsc --noEmit` across entire monorepo after ALL tasks complete

---

## Wave 4: Port Godot Scripts

### Task 4.1: Move non-effects scripts out of effects/
**Files**: 
- `godot_project/scripts/effects/CameraEffects.gd` → `godot_project/scripts/camera/CameraEffects.gd`
- `godot_project/scripts/effects/ParticleFactory.gd` → `godot_project/scripts/systems/ParticleFactory.gd`
- `godot_project/scripts/effects/SplatMapSystem.gd` → `godot_project/scripts/systems/SplatMapSystem.gd`
**Action**: Move files, update all references in `CameraController.gd`, `GameBridge.gd`, `VFXShowcase.gd`, `project.godot`.
**Verification**: grep for old paths returns zero hits

### Task 4.2: Refactor GameBridgeEffects.gd to use v2
**Files**: `godot_project/scripts/effects/GameBridgeEffects.gd`
**Action**: Replace `PipelineExecutor` and `MultiPassExecutor` instances with `GraphExecutor`. Update all JS callback registrations to call `GraphExecutor.apply_plan()`, `GraphExecutor.update_params()`, etc. Keep `ParticleFactory` reference (update path to new location from 4.1).
**Verification**: Manual — Godot loads without errors

### Task 4.3: Move GameBridgeEffects.gd to bridge directory
**Files**: `godot_project/scripts/effects/GameBridgeEffects.gd` → `godot_project/scripts/bridge/GameBridgeEffects.gd`
**Action**: Move the refactored file out of `scripts/effects/` (which will be deleted in Wave 6). Update `project.godot` autoload path from `res://scripts/effects/GameBridgeEffects.gd` to `res://scripts/bridge/GameBridgeEffects.gd`.
**Verification**: grep for `scripts/effects/GameBridgeEffects` in `project.godot` returns zero hits

---

## Wave 5: Build Comprehensive Test Page

### Task 5.1: Create effects test example
**Files**: `app/app/examples/effects_test.tsx` (new)
**Action**: Build a comprehensive example page with:
- Two sections: "Sprite Effects" (15 effects) and "Post-Process Effects" (21 effects)
- Radio buttons or segmented control to select one effect at a time per section
- Parameter sliders auto-generated from EFFECT_METADATA for the selected effect
- A preview area showing the effect applied to a test sprite (entity scope) or the whole scene (screen scope)
- Uses v2 bridge methods exclusively
**Verification**: Page renders, all effects selectable, parameters adjustable

**Note**: Example ports (paint.tsx, multipass_test.tsx, vfx_showcase.tsx, shader_test.tsx) were already done in Wave 3 Task 3.3.

---

## Wave 6: Delete V1

### Task 6.1: Delete v1 TypeScript type files
**Files to delete**:
- `shared/src/types/effects.ts`
- `shared/src/types/effect-pipeline.ts`
- `shared/src/types/multi-pass-effect.ts`
- `shared/src/types/effect-snapshot.ts`
- `shared/src/types/effect-budget.ts`
**Action**: Delete files. Update `shared/src/types/index.ts` barrel to remove these exports.
**Verification**: `tsc --noEmit` across entire monorepo

### Task 6.2: Delete v1 effects module
**Files to delete**: Entire `shared/src/effects/` directory:
- `pipeline-validator.ts`
- `multi-pass-validator.ts`
- `budget-resolver.ts`
- `preset-library.ts`
- `snapshot-manager.ts`
- `pipeline-serialization.ts`
- `legacy-adapter.ts`
- `rollout-gate.ts`
- `index.ts`
- `__tests__/` (all test files)
**Action**: Delete directory. Update `shared/src/index.ts` barrel.
**Verification**: `tsc --noEmit`

### Task 6.3: Delete v1 Godot scripts
**Files to delete**:
- `godot_project/scripts/effects/PipelineExecutor.gd`
- `godot_project/scripts/effects/MultiPassExecutor.gd`
- `godot_project/scripts/effects/EffectsManager.gd`
- `godot_project/scripts/effects/` directory (should be empty after moves in Wave 4)
**Action**: Delete files. Verify `GameBridgeEffects.gd` no longer references them.
**Verification**: grep for deleted filenames returns zero hits

---

## Wave 7: Rename V2 → Standard

### Task 7.1: Rename TypeScript directory and update imports
**Action**:
1. Rename `shared/src/effects-v2/` → `shared/src/effects/`
2. Update ALL imports across monorepo from `effects-v2` → `effects`
3. Update `shared/src/index.ts` barrel
**Verification**: `tsc --noEmit`, grep for `effects-v2` returns zero hits

### Task 7.2: Rename Godot directory
**Action**:
1. Rename `godot_project/scripts/effects_v2/` → `godot_project/scripts/effects/`
2. Update references in `GameBridgeEffects.gd` and `project.godot`
**Verification**: grep for `effects_v2` returns zero hits in `.gd` and `.tscn` files

### Task 7.3: Rename type names (remove v2 suffix)
**Action**: Across entire codebase:
- `EffectsV2Bridge` → `EffectsBridge`
- `EffectsV2Snapshot` → `EffectsSnapshot`
- `EffectsV2GraphExecutor` → `GraphExecutor` (GDScript class)
- Any other `V2` or `v2` in type/variable names related to effects
**Verification**: `tsc --noEmit`, grep for `V2` or `v2` in effects-related files returns zero hits

### Task 7.4: Update documentation
**Files**: `docs/effects-v2/architecture.md`, `docs/effects-v2/ai-authoring-playbook.md`
**Action**: 
1. Rename `docs/effects-v2/` → `docs/effects/`
2. Update all internal references from "effects-v2" to "effects"
**Verification**: No `v2` references in docs/effects/

---

## Execution Order

Waves MUST execute in order (1→2→3→4→5→6→7). Within each wave, tasks can run in parallel where they don't share files.

**Parallel opportunities**:
- Wave 1: Tasks 1.1 + 1.2 in parallel, then 1.3 + 1.4 after
- Wave 2: Tasks 2.1 + 2.2 in parallel
- Wave 3: Tasks 3.1 + 3.2 + 3.3 + 3.4 in parallel, then 3.5 (sweep), then 3.6 + 3.7 in parallel
- Wave 4: Task 4.1 first, then 4.2, then 4.3 (sequential — each depends on prior)
- Wave 5: Single task (5.1)
- Wave 6: Tasks 6.1 + 6.2 + 6.3 in parallel
- Wave 7: Task 7.1 first, then 7.2 + 7.3 + 7.4 in parallel

**Total**: 7 waves, 21 tasks
