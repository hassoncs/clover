# Zero-Manual RN-Godot Bridge: Fully Generated, Type-Safe, Performance-Optimized

## TL;DR

> **What**: Extend `scripts/bridge-codegen.ts` to generate ALL runtime bridge code from `app/lib/godot/types.ts` — the web adapter, the `Window.GodotBridge` type declaration, the Godot dispatch map, and the naming contract. No manual per-method wiring anywhere.
>
> **Performance**: The generator analyzes parameter types via `ts-morph` and emits **optimal wire encoding per-method** — direct primitive args for flat types, automatic struct flattening for `Vec2`/joint defs, JSON only for dynamic blobs. No unnecessary serialization.
>
> **Safety**: Work happens in a **git worktree** (`bridge-codegen-v2`). Nothing touches main until all tests pass in the worktree. The worktree IS the rollback — if it doesn't work, don't merge.
>
> **Deliverables**:
> - Generated `GodotBridge.web.generated.ts` (replaces 1500-line hand-written adapter)
> - Generated `Window.GodotBridge` type declaration (replaces 260-line hand-maintained shape)
> - Generated `BridgeMethodMap.gd` (replaces 120-line manual override dictionary)
> - Generated name-map with zero structural aliases
> - CI gates that block on any drift
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: 0 → 1 → 3 → 5 → 7 → 9

---

## Isolation Strategy

**All work happens in a git worktree.** This is non-negotiable.

```bash
# Task 0 creates the worktree
git worktree add ../slopcade-bridge-codegen-v2 -b bridge-codegen-v2

# All subsequent tasks execute in that worktree
# Main branch is untouched until final merge
```

**Rollback**: Don't merge the branch. Delete the worktree. Zero risk to main.

**Merge criteria**: ALL of the following pass in the worktree:
1. `pnpm generate:bridge` — exits 0, produces deterministic output
2. `pnpm tsc --noEmit` — exits 0, no type errors
3. `./godot_project/run_tests.sh` — all contract tests pass
4. `pnpm test` — existing test suite passes
5. Manual seam grep returns zero hits

---

## Context

### The Problem Today
`types.ts` is the canonical schema, but modifying it requires hand-updating 4 separate files:
1. `GodotBridge.web.ts` — 1577 lines, hand-written adapter with per-method `getGodotBridge()?.methodName(...)` calls
2. `Window.GodotBridge` declaration — 260 lines of hand-maintained type shape inside the same file
3. `GameBridge.gd _build_method_map()` — 120-line manual override dictionary (lines 242-363)
4. `test_BridgeContract.gd structural_aliases` — 4-entry escape hatch for name mismatches

The codegen already generates 4 artifacts (registry JSON, BridgeValidation.gd, TypedBridgeClient.ts, MockGodotBridge.ts). We extend it to generate the runtime code too.

### Performance Architecture

Two platforms, two dispatch mechanisms:

**Web (fast path — already good)**:
```
TS → window.GodotBridge.setPosition(id, x, y)
   → JavaScriptBridge.create_callback → dispatch_raw → _method_map[name].call(args)
```
Direct function calls with primitive args. No JSON. The generated code must preserve this.

**Native (JSI worklet boundary — JSON required)**:
```
TS → callGameBridge("set_position", id, x, y)
   → JSON.stringify([id, x, y]) → runOnGodotThread worklet
   → native_dispatch(name, argsJson) → JSON.parse → _method_map[name].call(args)
```
JSON serialization at the JSI boundary is a hard constraint of the worklet architecture. But the generator can minimize payload size by flattening structs before serialization.

### Type-Aware Wire Encoding (The Performance Win)

The generator resolves each parameter's type via `ts-morph` and classifies it:

| Type Category | Example | Wire Encoding | Why |
|--------------|---------|--------------|-----|
| **Primitive** | `string`, `number`, `boolean` | Pass directly | Already optimal |
| **Known struct** | `Vec2`, `RevoluteJointDef` | Flatten to primitives: `impulse.x, impulse.y` | Avoids object overhead, matches what Godot expects |
| **Enum/literal** | `"dynamic" \| "static"` | Pass as string | Already primitive |
| **Dynamic blob** | `Record<string, unknown>`, `GameDefinition` | `JSON.stringify(value)` | Can't flatten — shape unknown at codegen time |
| **Callback** | `(transforms: string) => void` | TS-only (not sent to Godot) | Event registration, handled separately |

**This is what the hand-written code already does.** We're just having the machine do it from the type definitions instead of a human.

---

## Work Objectives

### Core Objective
Extend `scripts/bridge-codegen.ts` so that `pnpm generate:bridge` produces ALL runtime bridge artifacts. Adding a new bridge method = add to `types.ts` + add GDScript implementation + run generate. No other manual steps.

### The Developer Workflow After This Plan

```
1. Add method to types.ts:     applyGravity(entityId: string, force: Vec2): void
2. Add GDScript implementation: func _js_apply_gravity(args: Array) -> void: ...
3. Run:                         pnpm generate:bridge
4. Done. TS adapter, Window type, Godot dispatch, name map, tests — all updated.
```

### Definition of Done
- [ ] `types.ts` is the single source. No other file requires per-method manual edits for bridge wiring.
- [ ] Generated web adapter passes all existing runtime behavior tests.
- [ ] Generated Godot dispatch replaces manual override dictionary.
- [ ] `structural_aliases` removed from contract tests — names are deterministic.
- [ ] CI blocks drift on generated artifacts.
- [ ] Zero performance regression on hot paths (transform sync, event polling).

### Must Have
- Preserve `window.GodotBridge` single-readiness-signal contract.
- Preserve direct-primitive-arg calling convention on web (no unnecessary JSON).
- Preserve worklet dispatch pattern on native.
- Preserve all existing method behavior exactly.

### Must NOT Have (Guardrails)
- **No override dictionaries** — every method is auto-discovered via `_js_` prefix convention. Zero manual wiring.
- **No structural aliases** — naming is deterministic from codegen, with explicit overrides only in the generator config (not in test code).
- **No abstract "middleware hook architecture"** — just concrete marshaling functions.
- No feature flags or canary toggles — worktree IS the isolation.
- No QuerySystem redesign.
- No gameplay refactors.
- No new annotation syntax in types.ts — use existing TypeScript types + a small config map for the ~4 methods with non-derivable names.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — every criterion is command-verifiable.

### Global Verification Commands (run after every wave)
```bash
pnpm generate:bridge                    # Generation succeeds
pnpm tsc --noEmit                       # Types compile
./godot_project/run_tests.sh            # Godot contract tests pass
pnpm test                               # Existing TS tests pass
git diff --stat main                    # See what changed
```

### Legacy Seam Detection (run at end)
```bash
grep -rn "structural_aliases" godot_project/tests/ --include="*.gd"
# Expected: 0 results

grep -rn "var overrides = {" godot_project/scripts/GameBridge.gd
# Expected: 0 results (manual override dict removed)
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Setup):
└── Task 0: Create git worktree

Wave 1 (Generator expansion — all parallel):
├── Task 1: Type resolver + wire encoding classifier
├── Task 2: Generate Window.GodotBridge type declaration
├── Task 3: Generate web transport adapter
├── Task 4: Generate Godot dispatch manifest (BridgeMethodMap.gd)
└── Task 5: Deterministic naming — kill structural aliases

Wave 2 (Runtime cutover — sequential):
├── Task 6: Replace GodotBridge.web.ts with generated adapter
├── Task 7: Replace GameBridge.gd manual overrides with generated manifest
└── Task 8: Unify effects routing to single dispatch path

Wave 3 (Cleanup + enforcement):
├── Task 9: Remove all legacy seams + update contract tests
└── Task 10: CI gates + evidence bundle + merge criteria
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1-10 | None |
| 1 | 0 | 2, 3, 4 | None |
| 2 | 1 | 6 | 3, 4, 5 |
| 3 | 1 | 6 | 2, 4, 5 |
| 4 | 1 | 7 | 2, 3, 5 |
| 5 | 0 | 7, 9 | 2, 3, 4 |
| 6 | 2, 3 | 8 | 7 |
| 7 | 4, 5 | 8 | 6 |
| 8 | 6, 7 | 9 | None |
| 9 | 8 | 10 | None |
| 10 | 9 | None | None |

---

## TODOs

- [ ] 0. Create git worktree for isolated development

  **What to do**:
  - Create worktree: `git worktree add ../slopcade-bridge-codegen-v2 -b bridge-codegen-v2`
  - Install dependencies in worktree: `pnpm install`
  - Verify baseline: `pnpm generate:bridge && pnpm tsc --noEmit && ./godot_project/run_tests.sh`
  - Record baseline method count and test results as evidence

  **Must NOT do**:
  - Do not make any code changes in main branch

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Blocked By**: None
  - **Blocks**: Everything else

  **Acceptance Criteria**:
  - [ ] Worktree exists at `../slopcade-bridge-codegen-v2`
  - [ ] `pnpm generate:bridge` passes in worktree
  - [ ] `pnpm tsc --noEmit` passes in worktree
  - [ ] `./godot_project/run_tests.sh` passes in worktree
  - [ ] Baseline evidence captured in `.sisyphus/evidence/bridge-automation/baseline.txt`

  **Commit**: YES
  - Message: `chore(bridge): create worktree for codegen v2`

---

- [ ] 1. Build type resolver and wire encoding classifier in the generator

  **What to do**:
  This is the core engine that makes everything else work. Extend `scripts/bridge-codegen.ts` to resolve parameter types and classify their wire encoding.

  For each method parameter, the resolver must:
  1. Check if the type is a primitive (`string`, `number`, `boolean`) → `WireKind.Primitive`
  2. Check if the type is a known flattenable struct defined in `types.ts` (e.g., `Vec2 = { x: number, y: number }`) → `WireKind.FlatStruct` with flattening recipe
  3. Check if the type is a callback/function → `WireKind.Callback` (TS-only, not sent to Godot)
  4. Everything else (`Record<string, unknown>`, `GameDefinition`, arrays of complex types) → `WireKind.JsonBlob`

  The flattening recipe for a struct is its property list in declaration order. For `Vec2`: `[{name: "x", type: "number"}, {name: "y", type: "number"}]`. For nested structs like `RevoluteJointDef`, recursively flatten: `bodyA, bodyB, anchor.x, anchor.y, enableLimit, ...`

  Use `ts-morph`'s `Type.getProperties()` and `Symbol.getValueDeclaration()` to walk interface definitions. The machinery is already used in `extractMethod()` — this extends it to resolve type references.

  Add the wire classification to `MethodEntry` in the registry:
  ```typescript
  interface WireParam {
    sourceName: string;      // original param name
    wireArgs: WireArg[];     // flattened primitive args for the wire
  }
  interface WireArg {
    name: string;            // wire-level arg name (e.g., "impulse_x")
    type: "string" | "number" | "boolean" | "json";
    accessor: string;        // e.g., "impulse.x" or "JSON.stringify(definition)"
  }
  ```

  **Must NOT do**:
  - Do not generate any runtime code yet — this task only builds the classifier
  - Do not modify `types.ts` — work with existing type definitions as-is

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 0
  - **Blocks**: 2, 3, 4

  **References**:
  - `scripts/bridge-codegen.ts:186-225` — existing `extractMethod()` that reads param types as strings
  - `scripts/bridge-codegen.ts:284-326` — `generateRegistry()` using `ts-morph` Project
  - `app/lib/godot/types.ts:10` — `Vec2 = { x: number, y: number }`
  - `app/lib/godot/types.ts:162-235` — Joint definition interfaces (complex nested structs)
  - `app/lib/godot/GodotBridge.web.ts:813-828` — manual `createRevoluteJoint` flattening (10 args from struct)

  **Acceptance Criteria**:
  - [ ] `pnpm generate:bridge` produces registry with `wireParams` for each method
  - [ ] `Vec2` params classified as `FlatStruct` with `[x, y]` recipe
  - [ ] `RevoluteJointDef` classified as `FlatStruct` with correct 10-arg recipe
  - [ ] `Record<string, unknown>` params classified as `JsonBlob`
  - [ ] `string`, `number`, `boolean` params classified as `Primitive`
  - [ ] Callback params classified as `Callback` (TS-only)
  - [ ] Unit test: classifier produces correct wire encoding for every existing method

  **Commit**: YES
  - Message: `feat(bridge): add type-aware wire encoding classifier to codegen`

---

- [ ] 2. Generate `Window.GodotBridge` type declaration

  **What to do**:
  Generate the `declare global { interface Window { GodotBridge?: { ... } } }` block that currently lives as 260 hand-maintained lines in `GodotBridge.web.ts` (lines 60-321).

  For each bridge method (non-tsOnly, non-callback), emit the **flattened** function signature using wire params from Task 1. This is what Godot's `_setup_js_bridge()` actually exposes — camelCase method names with primitive args.

  Example: `applyImpulse(entityId: string, impulse: Vec2)` in `types.ts` becomes `applyImpulse(entityId: string, impulse_x: number, impulse_y: number): void` in the Window declaration.

  Output: `app/lib/godot/generated/window-godot-bridge.d.ts`

  **Must NOT do**:
  - Do not modify the existing hand-written declaration yet (that's Task 6)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 1
  - **Blocks**: 6
  - **Can Parallelize With**: 3, 4, 5

  **References**:
  - `app/lib/godot/GodotBridge.web.ts:60-321` — current hand-maintained Window.GodotBridge declaration
  - `godot_project/scripts/GameBridge.gd:437-444` — `_setup_js_bridge()` loop that creates the actual JS methods
  - `godot_project/scripts/GameBridge.gd:447-462` — `_to_camel_case()` naming logic

  **Acceptance Criteria**:
  - [ ] Generated `.d.ts` file contains all bridge methods with flattened primitive signatures
  - [ ] `pnpm tsc --noEmit` passes when the generated declaration is imported
  - [ ] Method count matches existing declaration (no methods lost or added)
  - [ ] Naming matches Godot's `_to_camel_case()` output exactly

  **Commit**: YES
  - Message: `feat(bridge): generate Window.GodotBridge type declaration`

---

- [ ] 3. Generate web transport adapter

  **What to do**:
  Generate the method bodies that bridge from the high-level `GodotBridge` interface (which uses `Vec2`, `RevoluteJointDef`, etc.) to the low-level `window.GodotBridge` calls (which use flattened primitives).

  For each method, emit a function body that:
  1. Gets the bridge: `const gb = getGodotBridge()`
  2. Flattens struct params using the wire encoding from Task 1
  3. Calls the bridge with flattened args: `gb?.applyImpulse(entityId, impulse.x, impulse.y)`
  4. For async/query methods, routes through `queryAsync<T>(method, args)`
  5. For JSON blob params, calls `JSON.stringify(param)` before passing

  The generated code does NOT include:
  - `initialize()` / `dispose()` lifecycle (these stay hand-written — they contain one-time setup logic)
  - Callback registration (`onCollision`, `onTransformSync`, etc.) — these stay in `callback-registry.ts`
  - The `createWebGodotBridge()` factory function shell — just the method implementations

  Output: `app/lib/godot/generated/web-bridge-methods.ts` — a map of method name → implementation function

  **Must NOT do**:
  - Do not generate lifecycle/callback code — only method dispatch
  - Do not touch `GodotBridge.native.ts` — native generation is out of scope for this plan

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 1
  - **Blocks**: 6
  - **Can Parallelize With**: 2, 4, 5

  **References**:
  - `app/lib/godot/GodotBridge.web.ts:437-920` — existing hand-written method implementations
  - `app/lib/godot/GodotBridge.web.ts:452-462` — `queryAsync` helper pattern
  - `app/lib/godot/GodotBridge.web.ts:464-475` — `executeEffects` helper pattern
  - `app/lib/godot/GodotBridgeBase.ts` — `normalizeEffectsResult`, `normalizeEffectsSnapshot` helpers

  **Acceptance Criteria**:
  - [ ] Generated methods compile with `pnpm tsc --noEmit`
  - [ ] Generated method count matches hand-written method count
  - [ ] Flattening logic matches existing hand-written behavior exactly (verified by diff)
  - [ ] Query-routed methods correctly use `queryAsync`
  - [ ] Effects methods correctly use `executeEffects` pattern

  **Commit**: YES
  - Message: `feat(bridge): generate web transport method implementations`

---

- [ ] 4. Generate Godot dispatch manifest (`BridgeMethodMap.gd`)

  **What to do**:
  Generate a GDScript file that replaces the manual override dictionary in `GameBridge.gd _build_method_map()` (lines 242-363).

  The generated manifest maps bridge names (snake_case) to the module + method that handles them. It uses the existing `_auto_register_bridge_methods()` convention: methods prefixed with `_js_` on modules are auto-discovered.

  The generated file should:
  1. Declare expected method→module mappings based on `types.ts`
  2. Include a `validate_registration(method_map: Dictionary) -> Array[String]` function
  3. Report any methods that are in the contract but missing from runtime

  The key insight: Godot modules already have `_js_` prefixed methods that `_auto_register_bridge_methods()` discovers. The problem is that ~40 methods use manual lambda wrappers instead. The generated manifest identifies which methods SHOULD be auto-discoverable and which need the wrapper pattern, so `_build_method_map()` can be simplified.

  Output: `godot_project/scripts/bridge/generated/BridgeMethodMap.gd`

  **Must NOT do**:
  - Do not rewrite Godot module implementations
  - Do not remove methods that legitimately need custom arg handling

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`game-authoring/scripting-api-reference`, `systematic-debugging`]

  **Parallelization**:
  - **Blocked By**: 1
  - **Blocks**: 7
  - **Can Parallelize With**: 2, 3, 5

  **References**:
  - `godot_project/scripts/GameBridge.gd:213-227` — `_auto_register_bridge_methods()` auto-discovery logic
  - `godot_project/scripts/GameBridge.gd:229-367` — `_build_method_map()` with manual overrides
  - `godot_project/scripts/bridge/generated/BridgeValidation.gd` — existing generated GDScript pattern

  **Acceptance Criteria**:
  - [ ] Generated manifest covers all 131 bridge methods
  - [ ] `validate_registration()` returns empty array when all methods registered
  - [ ] `validate_registration()` returns specific errors for missing methods
  - [ ] `./godot_project/run_tests.sh` passes with manifest loaded

  **Commit**: YES
  - Message: `feat(bridge): generate Godot dispatch registration manifest`

---

- [ ] 5. Make naming fully deterministic — kill structural aliases

  **What to do**:
  The `structural_aliases` dictionary in `test_BridgeContract.gd` exists because 4 methods have names that don't mechanically derive:
  ```
  loadGame → load_game_json
  applyDynamicShader → apply_dynamic_shader_to_entity
  stepPhysics → step
  effectsUpdateParams → effects.updateParams
  ```

  Fix this by adding a small explicit name override map to the codegen (NOT to types.ts). In `bridge-codegen.ts`, add:
  ```typescript
  const BRIDGE_NAME_OVERRIDES: Record<string, string> = {
    loadGame: "load_game_json",
    applyDynamicShader: "apply_dynamic_shader_to_entity",
    stepPhysics: "step",
    effectsUpdateParams: "effects.updateParams",
  };
  ```

  The generator uses this map when emitting the registry, and the generated `BridgeValidation.gd` includes the correct resolved names. The contract test no longer needs `structural_aliases` because the names in the validation artifact already match the runtime names.

  Also: verify the `camelToSnake` function handles all edge cases (`3d`→`_3d`, `2d`→`_2d`, `AABB`→`aabb`) by adding test cases.

  **Must NOT do**:
  - Do not rename GDScript methods (that would break the Godot side)
  - Do not add annotation syntax to types.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 0
  - **Blocks**: 7, 9
  - **Can Parallelize With**: 2, 3, 4

  **References**:
  - `godot_project/tests/test_BridgeContract.gd:57-67` — current structural aliases
  - `scripts/bridge-codegen.ts:70-80` — `camelToSnake()` function
  - `godot_project/scripts/GameBridge.gd:447-462` — `_to_camel_case()` inverse function

  **Acceptance Criteria**:
  - [ ] All 4 override names are in generator config, not in test code
  - [ ] `camelToSnake()` unit tests cover `3d`, `2d`, `AABB`, `UI` edge cases
  - [ ] Generator fails if an override references a method not in `types.ts`

  **Commit**: YES
  - Message: `fix(bridge): make naming deterministic, move aliases to codegen config`

---

- [ ] 6. Cut over web runtime to generated adapter

  **What to do**:
  Replace the ~80 hand-written method implementations in `createWebGodotBridge()` (GodotBridge.web.ts lines 477-920+) with imports from the generated web transport (Task 3).

  The `createWebGodotBridge()` function keeps its structure:
  - `initialize()` stays hand-written (one-time setup, callback wiring, readiness polling)
  - `dispose()` stays hand-written (cleanup)
  - Callback registrations (`onCollision`, `onTransformSync`, etc.) stay hand-written (in `callback-registry.ts`)
  - All ~80 dispatch methods are replaced with generated implementations

  Replace the hand-maintained `Window.GodotBridge` declaration (lines 60-321) with an import of the generated `.d.ts` from Task 2.

  **Must NOT do**:
  - Do not change the `GodotBridge` interface in `types.ts`
  - Do not touch `GodotBridge.native.ts`
  - Do not change callback registration behavior

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 2, 3
  - **Blocks**: 8
  - **Can Parallelize With**: 7

  **References**:
  - `app/lib/godot/GodotBridge.web.ts:60-321` — Window declaration to replace
  - `app/lib/godot/GodotBridge.web.ts:477-630` — lifecycle code to KEEP
  - `app/lib/godot/GodotBridge.web.ts:639-920+` — method implementations to REPLACE
  - `app/lib/godot/callback-registry.ts` — callback system (unchanged)

  **Acceptance Criteria**:
  - [ ] `GodotBridge.web.ts` is under 300 lines (down from 1577)
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm test` passes — all existing bridge tests green
  - [ ] No hand-written per-method `getGodotBridge()?.methodName(...)` calls remain
  - [ ] `Window.GodotBridge` declaration imported from generated file

  **Commit**: YES
  - Message: `refactor(bridge): replace hand-written web adapter with generated transport`

---

- [ ] 7. Eliminate the override dictionary entirely

  **What to do**:
  Delete the entire manual override dictionary in `GameBridge.gd _build_method_map()` (lines 242-367). Replace it with pure auto-discovery. This requires two sub-steps:

  **Sub-step 7a: Add missing `_js_` wrapper methods (~30 one-liners)**

  Every entry in the current override dict exists for one of three reasons:
  1. **Redundant duplicate** (~50 entries): Already auto-discovered via `_js_` prefix on the module. The override dict entry is copy-paste. Just delete.
  2. **Missing wrapper on GameBridge itself** (~15 entries): Methods like `load_game_json()`, `pause_physics()`, `clear_game()` live on GameBridge but lack `_js_` wrappers. Fix: add `_js_` methods. Example:
     ```gdscript
     # Already exists at line 464:
     func _js_load_game(args: Array) -> bool: return load_game_json(str(args[0])) if args.size() > 0 else false
     # These need to be added:
     func _js_clear_game(_args: Array) -> void: clear_game()
     func _js_enable_debug(_args: Array) -> Dictionary: return enable_debug()
     ```
  3. **Missing wrapper on a module** (~15 entries): Methods like `set_entity_image_from_file()`, `create_themed_ui_component()`, 3D viewport methods lack `_js_` wrappers on their respective modules. Fix: add `_js_` wrapper methods to `VisualRenderer`, `UIManager`, `Viewport3D` etc. Example:
     ```gdscript
     # On VisualRenderer:
     func _js_set_entity_image_from_file(args: Array) -> void:
         if args.size() >= 4: set_entity_image_from_file(str(args[0]), str(args[1]), float(args[2]), float(args[3]))
     ```

  **Sub-step 7b: Simplify `_build_method_map()` to pure auto-discovery**

  The new function becomes:
  ```gdscript
  func _build_method_map() -> void:
      var modules = [
          self,  # GameBridge itself (for lifecycle _js_ methods)
          _entity_manager, _transform_system, _physics_controller, _joint_manager,
          _visual_renderer, _ui_manager, _camera_controller, _input_router,
          _sync_system, _property_collector, _event_emitter, _physics_queries,
          _pixel_buffer_manager, _debug_bridge, _viewport_3d
      ]
      _method_map = _auto_register_bridge_methods(modules)
      # Validate against generated manifest
      var errors = BridgeMethodMap.validate_registration(_method_map)
      if errors.size() > 0:
          for e in errors: push_error("[GameBridge] " + e)
  ```

  **Zero overrides. Zero manual entries. Pure auto-discovery + generated validation.**

  **Critical**: Preserve `call_deferred("_finalize_js_bridge")` readiness contract exactly.

  **Must NOT do**:
  - Do not change module business logic — only add `_js_` wrapper methods
  - Do not change `_setup_js_bridge()` or `_finalize_js_bridge()`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`game-authoring/scripting-api-reference`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 4, 5
  - **Blocks**: 8
  - **Can Parallelize With**: 6

  **References**:
  - `godot_project/scripts/GameBridge.gd:229-367` — current `_build_method_map()` to delete
  - `godot_project/scripts/GameBridge.gd:464-469` — existing `_js_` wrappers on GameBridge (pattern to follow)
  - `godot_project/scripts/GameBridge.gd:100-112` — readiness contract (must not change)
  - `godot_project/scripts/GameBridge.gd:213-227` — `_auto_register_bridge_methods()` (keep as-is, add `self` to module list)

  **Acceptance Criteria**:
  - [ ] `var overrides` dictionary is completely gone from `GameBridge.gd`
  - [ ] `_build_method_map()` is <15 lines (auto-discover + validate)
  - [ ] All ~30 new `_js_` wrapper methods are one-liners following existing pattern
  - [ ] `./godot_project/run_tests.sh` passes — all contract tests green
  - [ ] Bridge method count unchanged (131 methods)
  - [ ] Readiness contract preserved (deferred pattern, single signal)
  - [ ] `grep -n "var overrides" godot_project/scripts/GameBridge.gd` returns 0 results

  **Commit**: YES
  - Message: `refactor(bridge): eliminate override dictionary — pure auto-discovery`

---

- [ ] 8. Unify effects routing to single dispatch path

  **What to do**:
  Currently effects methods are registered in TWO places in `GameBridgeEffects.gd`:
  1. `_register_methods_with_game_bridge()` — copies to `GameBridge._method_map` (direct dispatch)
  2. `_register_query_handlers()` — registers with `QuerySystem` under `effects.*` namespace (RPC dispatch)

  And the TS side routes some effects calls through `queryAsync("effects.applyGraph")` and others through direct `getGodotBridge()?.applySpriteEffect()`.

  Unify: pick ONE routing path per method. The generated code should declare which path each effects method uses, and both sides must agree. The simplest approach: all effects methods go through `_method_map` (direct dispatch) since they're already registered there. The `_register_query_handlers()` entries become redundant and can be removed if the TS side is updated to call directly instead of through `queryAsync("effects.*")`.

  **Must NOT do**:
  - Do not change effect graph semantics
  - Do not remove effects methods — only consolidate their routing

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 6, 7
  - **Blocks**: 9
  - **Can Parallelize With**: None (requires both sides cut over first)

  **References**:
  - `godot_project/scripts/bridge/GameBridgeEffects.gd:120-128` — `_register_methods_with_game_bridge()`
  - `godot_project/scripts/bridge/GameBridgeEffects.gd:130-223` — `_register_query_handlers()` (duplicate)
  - `app/lib/godot/GodotBridge.web.ts:464-475` — `executeEffects` routing through `queryAsync`

  **Acceptance Criteria**:
  - [ ] Each effects method has exactly ONE dispatch path (not two)
  - [ ] `./godot_project/run_tests.sh` passes
  - [ ] `pnpm test` passes — effects tests green
  - [ ] No `effects.*` query handler duplicates a `_method_map` entry

  **Commit**: YES
  - Message: `refactor(bridge): unify effects to single dispatch path`

---

- [ ] 9. Zero-legacy cleanup — remove every manual seam, alias, and deprecated pattern

  **What to do**:
  This is the final cleanup sweep. After Tasks 6-8, the generated code is running. This task removes every trace of the old manual wiring so there's ONE way to do everything.

  **9a: Remove structural aliases from contract tests**
  - Delete `structural_aliases` dictionary from `test_BridgeContract.gd`
  - Delete `_find_method_in_runtime()` multi-strategy resolution function
  - Replace with direct generated-name matching: `BridgeValidation.EXPECTED_METHODS` keys now match `_method_map` keys exactly (because the codegen resolves names via the override config, and Godot uses pure auto-discovery)
  - The contract test becomes trivially simple: `for name in EXPECTED_METHODS: assert(_method_map.has(name))`

  **9b: Remove the `native_dispatch` on GameBridgeEffects**
  - `GameBridgeEffects.gd` has its own `native_dispatch()` method (line 225). This was used by the native bridge to call effects methods directly. With unified routing through `GameBridge._method_map`, this is dead code.
  - Delete `GameBridgeEffects.native_dispatch()`

  **9c: Remove duplicate query handlers from GameBridgeEffects**
  - After Task 8 unified effects routing, `_register_query_handlers()` is dead code
  - Delete the entire function and its call from `_ready()`

  **9d: Remove all hand-maintained Window.GodotBridge declaration**
  - The old `declare global { interface Window { GodotBridge?: { ... } } }` block (260 lines in GodotBridge.web.ts) was replaced by the generated `.d.ts` in Task 6
  - Verify it's actually gone (not commented out)

  **9e: Full legacy seam grep — zero tolerance**
  Run and assert zero results for ALL of these:
  ```bash
  grep -rn "structural_aliases" godot_project/ tests/ --include="*.gd" --include="*.ts"
  grep -rn "var overrides = {" godot_project/scripts/GameBridge.gd
  grep -rn "_find_method_in_runtime" godot_project/tests/
  grep -rn "native_dispatch" godot_project/scripts/bridge/GameBridgeEffects.gd
  grep -rn "_register_query_handlers" godot_project/scripts/bridge/GameBridgeEffects.gd
  grep -rn "declare global" app/lib/godot/GodotBridge.web.ts
  grep -rn "callEffectsBridge" app/lib/godot/GodotBridge.native.ts
  ```
  If ANY of these return results, the cleanup is incomplete.

  **9f: Verify ONE way to do everything**
  Document and verify the single canonical path for each operation:
  - **Adding a bridge method**: Edit `types.ts` → add `_js_` GDScript method → `pnpm generate:bridge` → done
  - **TS → Godot call (web)**: `GodotBridge.method()` → generated adapter → `window.GodotBridge.camelCase()` → `_method_map[snake_case].call(args)`
  - **TS → Godot call (native)**: same pattern through `callGameBridge` → `native_dispatch` → `_method_map`
  - **Godot method registration**: `_auto_register_bridge_methods()` scans `_js_` prefix → done
  - **Contract enforcement**: `BridgeValidation.gd` generated from `types.ts` → Godot tests compare to `_method_map`
  - **Name resolution**: `camelToSnake()` in codegen + `BRIDGE_NAME_OVERRIDES` for the 4 exceptions → deterministic

  **Must NOT do**:
  - Do not remove test coverage — simplify matching logic, keep all assertions
  - Do not leave ANY commented-out legacy code (delete it, git has history)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`verification-before-completion`, `systematic-debugging`]

  **Parallelization**:
  - **Blocked By**: 8
  - **Blocks**: 10
  - **Can Parallelize With**: None

  **References**:
  - `godot_project/tests/test_BridgeContract.gd:30-68` — alias resolution to delete
  - `godot_project/scripts/bridge/GameBridgeEffects.gd:130-223` — query handlers to delete
  - `godot_project/scripts/bridge/GameBridgeEffects.gd:225-234` — native_dispatch to delete
  - `app/lib/godot/GodotBridge.web.ts:60-321` — old Window declaration to verify gone
  - `app/lib/godot/GodotBridge.native.ts:160-177` — `callEffectsBridge` to verify gone

  **Acceptance Criteria**:
  - [ ] ALL seven grep commands above return 0 results
  - [ ] Contract test is <50 lines (down from 171) — direct matching, no resolution
  - [ ] Negative contract test still catches missing methods
  - [ ] `./godot_project/run_tests.sh` passes
  - [ ] `pnpm test` passes
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] Zero commented-out legacy code in bridge files
  - [ ] "One way to do everything" list verified with actual code paths

  **Commit**: YES
  - Message: `chore(bridge): zero-legacy cleanup — one way to do everything`

---

- [ ] 10. CI gates, evidence bundle, and merge

  **What to do**:
  - Update `.github/workflows/bridge-contract.yml` to include:
    - Generation drift check: `pnpm generate:bridge --check`
    - TypeScript compilation: `pnpm tsc --noEmit`
    - Legacy seam grep: fail if any `structural_aliases` or manual override dict patterns found
  - Capture evidence for all verification commands
  - Run full test suite one final time
  - Document the new developer workflow: "How to add a bridge method"
  - If all green: merge worktree branch to main

  **Must NOT do**:
  - Do not merge if any verification command fails
  - Do not broaden CI to unrelated domains

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`, `verification-before-completion`]

  **Parallelization**:
  - **Blocked By**: 9
  - **Blocks**: None

  **References**:
  - `.github/workflows/bridge-contract.yml` — existing CI workflow to extend
  - `docs/godot-migration/bridge-initialization.md` — existing bridge docs to update

  **Acceptance Criteria**:
  - [ ] CI workflow passes in worktree
  - [ ] Evidence captured in `.sisyphus/evidence/bridge-automation/`:
    - `baseline.txt` — pre-migration state
    - `generation-drift.txt` — generation determinism proof
    - `tsc.txt` — type compilation proof
    - `godot-contract.txt` — Godot test results
    - `legacy-seams.txt` — grep showing zero manual seams
  - [ ] Developer workflow documented: add to types.ts → add GDScript impl → generate → done
  - [ ] Branch merged to main (or PR created for review)

  **Commit**: YES
  - Message: `ci(bridge): enforce zero-manual contract gates`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 0 | `chore(bridge): create worktree for codegen v2` | baseline passes |
| 1 | `feat(bridge): add type-aware wire encoding classifier` | `pnpm generate:bridge` |
| 2-5 | `feat(bridge): generate all bridge artifacts` | `pnpm generate:bridge && pnpm tsc --noEmit` |
| 6-7 | `refactor(bridge): cut over runtime to generated contract` | full test suite |
| 8 | `refactor(bridge): unify effects dispatch` | full test suite |
| 9 | `chore(bridge): remove legacy seams` | seam grep clean |
| 10 | `ci(bridge): enforce zero-manual contract gates` | CI green, merge |

---

## Scope Exclusions (Explicit)

- **Native bridge generation** (`GodotBridge.native.ts`): Out of scope. Native uses JSI worklets with `runOnGodotThread` — a fundamentally different dispatch pattern. The native bridge can be generated in a follow-up plan using the same type resolver (Task 1 output), but the runtime cutover is separate work.
- **QuerySystem redesign**: The query system stays as-is. We only unify effects routing in Task 8.
- **New method additions**: This plan migrates existing methods. Adding new methods is the payoff AFTER this plan.
- **Performance benchmarking**: The generated code uses the same dispatch patterns as the hand-written code (direct primitive args on web, JSON on native). No performance regression is expected, but formal benchmarking is a follow-up.

---

## Success Criteria

### Verification Commands (all must pass in worktree before merge)
```bash
pnpm generate:bridge                    # Exit 0, deterministic output
pnpm generate:bridge --check            # Exit 0, no drift
pnpm tsc --noEmit                       # Exit 0, no type errors
./godot_project/run_tests.sh            # All tests pass
pnpm test                               # All tests pass

# Legacy seam detection (must return 0 results each)
grep -rn "structural_aliases" godot_project/tests/ --include="*.gd"
grep -rn "var overrides = {" godot_project/scripts/GameBridge.gd
```

### Final Checklist
- [ ] `types.ts` is the single source — no other file needs per-method edits for bridge wiring
- [ ] Generator produces all runtime artifacts deterministically
- [ ] Web adapter is ~300 lines (down from 1577) with generated method dispatch
- [ ] **Zero** override dictionaries in Godot — `_build_method_map()` is pure auto-discovery
- [ ] **Zero** structural aliases in test code — names match directly
- [ ] **Zero** duplicate dispatch paths — effects use one route
- [ ] **Zero** hand-maintained type declarations — Window.GodotBridge is generated
- [ ] **Zero** legacy seam patterns found by grep sweep (7 patterns checked)
- [ ] **One** way to add a method: `types.ts` → GDScript `_js_` method → `pnpm generate:bridge`
- [ ] **One** way to call Godot from TS: generated adapter → `window.GodotBridge` (web) / `native_dispatch` (native)
- [ ] **One** way to register on Godot side: `_js_` prefix → auto-discovery
- [ ] CI blocks any drift between `types.ts` and generated artifacts
- [ ] All work isolated in worktree — main untouched until merge
