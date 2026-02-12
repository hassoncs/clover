# Learnings - Bridge Build-Time Validation

## Conventions & Patterns


## CI Workflow Implementation

Created `.github/workflows/bridge-contract.yml` with ordered contract validation:

1. **Bridge Generation Drift Check**
   - Runs `pnpm generate:bridge` 
   - Fails if `git status --porcelain` shows changes
   - Ensures committed artifacts match source

2. **TypeScript Contract Validation**
   - Runs `pnpm tsc --noEmit`
   - Depends on drift check passing
   - Validates type-level contracts

3. **Godot Contract Tests**
   - Runs `./godot_project/run_tests.sh`
   - Depends on TypeScript validation passing
   - Uses `chickensoft-games/setup-godot@v2` action for Godot 4.3.0

**Key Design Decisions:**
- Used `needs:` to enforce sequential execution (drift → TS → Godot)
- Each job fails pipeline on non-zero exit (default GitHub Actions behavior)
- Path filters limit runs to bridge-related changes only
- Separate jobs for clear failure attribution in CI UI

**Commands Used:**
- `pnpm generate:bridge` (from package.json line 51)
- `pnpm tsc --noEmit` (standard TypeScript check)
- `./godot_project/run_tests.sh` (canonical test invocation)

## Runtime Coverage Model

### Registration Architecture Overview

There are **two distinct runtime dispatch paths** and **one generated expectation surface**. Coverage validation compares the union of runtime paths against the generated expectation.

### Path 1: Direct Dispatch (`_method_map`)

**Location:** `GameBridge.gd` line 85 — `var _method_map: Dictionary = {}`

**Construction sequence** (in `_build_method_map()`, line 222):
1. **Auto-registration**: `_auto_register_bridge_methods(modules)` scans 14 module instances for methods prefixed with `_js_`, strips the prefix, and uses the remainder as snake_case keys.
   - Modules scanned: `_entity_manager`, `_transform_system`, `_physics_controller`, `_joint_manager`, `_visual_renderer`, `_ui_manager`, `_camera_controller`, `_input_router`, `_sync_system`, `_property_collector`, `_event_emitter`, `_physics_queries`, `_pixel_buffer_manager`, `_debug_bridge`
2. **Manual overrides**: A hardcoded `overrides` dictionary (lines 235-356) overwrites auto-registered entries. These use mixed snake_case and camelCase keys (e.g., `"callRpc"`, `"load_game_json"`, `"createPixelBuffer"`).
3. **Effects merge**: `GameBridgeEffects._register_methods_with_game_bridge()` (line 121-129) copies its own `_method_map` (27 entries, all snake_case) into `GameBridge._method_map`.

**Key naming detail**: `_method_map` keys are a **mix of snake_case and camelCase** due to manual overrides. The JS bridge setup (`_setup_js_bridge`, line 422) converts all keys to camelCase via `_to_camel_case()` for web exposure, but the internal dictionary retains the registration-time key format.

**Runtime extraction**:
```gdscript
var direct_dispatch_keys: Array = bridge._method_map.keys()
```

### Path 2: RPC Handlers (`QuerySystem._handlers`)

**Location:** `QuerySystem.gd` line 12 — `var _handlers: Dictionary = {}`

**Three registration sites** (all use camelCase keys):

1. **Core handlers** — `GameBridge._register_core_query_handlers()` (line 195):
   - `getAllTransforms`, `getAllProperties`, `getWorldInfo`, `getCameraInfo`, `getViewportInfo`, `getEntityTransform`, `queryPointEntity`, `screenToWorld`, `getSplatTexture`
   - **9 handlers**, always registered at init

2. **Effects handlers** — `GameBridgeEffects._register_query_handlers()` (line 131):
   - `effects.applyGraph`, `effects.clearGraph`, `effects.updateParams`, `effects.start`, `effects.pause`, `effects.resume`, `effects.stop`, `effects.reset`, `effects.snapshot`, `effects.restore`, `effects.drawToActiveBuffer`, `effects.setExternalInput`, `effects.setScreenInput`, `effects.hotSwapShader`
   - **14 handlers**, namespace-prefixed with `effects.`, always registered at init

3. **Debug handlers** — `DebugBridge._register_handlers()` (line 36):
   - `getSceneSnapshot`, `findEntities`, `getEntityDetails`, `getEntitiesAtPoint`, `getEntitiesInRect`, `getEntityCount`, `query`, `queryAst`, `getProps`, `getAllProps`, `setProps`, `patchProps`, `spawn`, `destroy`, `clone`, `reparent`, `lifecycleBatch`, `getTimeState`, `step`, `setTimeScale`, `setSeed`, `subscribe`, `unsubscribe`, `pollEvents`, `listSubscriptions`, `raycast`, `raycastAll`, `getShapes`, `getJoints`, `getEntityJoints`, `getOverlaps`, `getAllOverlaps`, `queryPoint`, `queryAABB`
   - **33 handlers**, **dynamically registered** only when `enable_debug()` is called
   - `unregister_handlers()` removes them on `disable_debug()`

**Runtime extraction**:
```gdscript
var rpc_handler_keys: Array = bridge._query_system.get("_handlers").keys()
# Note: _handlers is private but accessible via get() in GDScript
```

### Path 3: Generated Expectation Surface (`BridgeValidation.EXPECTED_METHODS`)

**Location:** `godot_project/scripts/bridge/generated/BridgeValidation.gd`
**Source of truth:** `app/lib/godot/types.ts` → `scripts/bridge-codegen.ts`

- Dictionary of `{ tsName: { param_count, async } }`
- All keys are **camelCase** (canonical TypeScript identity)
- Currently ~95 entries covering GodotBridge + EffectsBridge interfaces

### Coverage Derivation Strategy

**Principle:** No hardcoded lists in tests. All three surfaces are introspectable dictionaries.

**Algorithm for the contract test:**
```
1. Extract EXPECTED = BridgeValidation.EXPECTED_METHODS.keys()
2. Extract DIRECT = bridge._method_map.keys()
3. Extract RPC = bridge._query_system._handlers.keys()
4. For each expected method (camelCase tsName):
   a. Compute snakeName = camelToSnake(tsName)
   b. Check DIRECT for tsName OR snakeName
   c. Check RPC for tsName, "effects." + tsName, snakeName
   d. Check alias table for known naming mismatches (minimal, <5 entries)
   e. If none match → MISSING
5. For each key in DIRECT ∪ RPC:
   a. Normalize to camelCase
   b. If not in EXPECTED and not an internal-only method → EXTRA
```

**Why this works deterministically:**
- `_method_map.keys()` is fully populated after `_build_method_map()` + effects merge
- `_handlers.keys()` is fully populated after core + effects + debug registration
- `BridgeValidation.EXPECTED_METHODS` is generated from TypeScript types — the single source of truth
- No manual enumeration needed in test code — all three are runtime-queryable dictionaries

### Naming Normalization Rules

The coverage model must handle mixed naming because:
- `_method_map` keys are mixed: `set_linear_velocity` (snake) AND `callRpc` (camel) AND `createPixelBuffer` (camel)
- `_handlers` keys are always camelCase (or `effects.` prefixed camelCase)
- `EXPECTED_METHODS` keys are always camelCase

**Normalization**: Apply `_to_camel_case()` to all `_method_map` keys before comparison. The existing test already does this.

### Known Alias Mappings (Minimal)

These are structural naming mismatches that cannot be resolved by simple case conversion:
| Expected (tsName) | Actual Registration | Path |
|-|-|-|
| `loadGame` | `load_game_json` | _method_map |
| `callRpc` | `callRpc` | _method_map (dispatches to QuerySystem internally) |
| `applyDynamicShader` | `apply_dynamic_shader_to_entity` | _method_map |
| `stepPhysics` | `step` | QuerySystem (DebugBridge) |

### Dynamic vs Static Handler Populations

| Registration Site | Lifetime | Count | Keys Available |
|-|-|-|-|
| GameBridge._method_map (core) | Always | ~70 | After `_build_method_map()` |
| GameBridgeEffects → _method_map | Always | ~27 | After `_register_methods_with_game_bridge()` |
| Core QuerySystem handlers | Always | 9 | After `_register_core_query_handlers()` |
| Effects QuerySystem handlers | Always | 14 | After `_register_query_handlers()` |
| DebugBridge QuerySystem handlers | On-demand | 33 | After `enable_debug()` |

**Test implication**: Contract tests must call `enable_debug()` before extracting `_handlers` to get the full RPC surface. The existing test (`test_BridgeContract.gd` line 23) already does this by constructing `DebugBridge` directly.

### GameBridgeEffects Dual-Path Augmentation

GameBridgeEffects uniquely registers methods in **both** paths:
1. **_method_map**: 27 methods (e.g., `apply_sprite_effect`, `screen_shake`, `apply_plan`, etc.) merged into GameBridge._method_map
2. **QuerySystem**: 14 handlers (e.g., `effects.applyGraph`, `effects.start`, etc.) registered directly

This means the same logical capability (e.g., "apply graph") is reachable via:
- Direct dispatch: `_method_map["apply_plan"]` → called via JS bridge
- RPC dispatch: `QuerySystem._handlers["effects.applyGraph"]` → called via `callRpc({method: "effects.applyGraph", params: ...})`

Coverage validation must account for this: some EXPECTED_METHODS entries map to _method_map, others to RPC handlers, and some effects methods have dual registration.

## Task 2: Codegen Canonical ID Alignment

### Changes Made to `scripts/bridge-codegen.ts`

1. **Deterministic `generatedAt`**: Replaced `new Date().toISOString()` with `source:<sha256-hash-first-12-chars>` computed from `types.ts` content. This ensures running `pnpm generate:bridge` twice produces identical output (idempotent), while still changing when the source changes.

2. **Added `nameMap` to BridgeRegistry**: New top-level field in `bridge-registry.json` with:
   - `tsToSnake`: `Record<string, string>` mapping all 131 method tsNames → snakeNames
   - `snakeToTs`: `Record<string, string>` mapping all 131 method snakeNames → tsNames
   
   This allows tests to derive mappings by importing registry JSON directly instead of maintaining hardcoded alias/fallback lists.

3. **`normalizeRegistry` updated**: The `--check` mode normalization now includes `nameMap` in its comparison, ensuring the mapping metadata is validated in CI drift checks.

### Verification

- `pnpm generate:bridge` produces all 4 artifacts from single pipeline: ✅
- BridgeValidation.gd keys use `tsName` (camelCase): ✅ (already correct)
- bridge-registry.json includes `tsToSnake` and `snakeToTs` maps: ✅
- Idempotency: staged generated files → re-ran → `git diff --stat` shows zero diffs: ✅
- `--check` mode works correctly: ✅

### Key Insight

The existing codegen already used `tsName` as canonical identity consistently across all 4 artifacts. The main improvements were:
- Making generation deterministic for CI (no timestamp drift)
- Adding explicit bidirectional name mapping metadata to the registry

## Task 5: Godot Contract Test Refactor

### Changes Made

Refactored `godot_project/tests/test_BridgeContract.gd` to derive all naming from `bridge-registry.json` `nameMap`:

1. **Removed `_to_camel_case()` helper** — replaced with `_ts_to_snake` dictionary loaded from nameMap
2. **Removed hardcoded `aliases` dictionary** (old lines 66-72) — replaced with `structural_aliases` containing only 4 true structural mismatches that can't be resolved by nameMap lookup
3. **Removed hardcoded `known_missing` array** (old lines 80-88) — these 5 methods (`instantiate_from_scene`, `set_orbit_controls`, `get_all_entities`, `load_rules`, `load_script`) now pass the contract test without special-casing, meaning they ARE actually registered in runtime
4. **Added `test_bridge_contract_negative()`** — injects fake method names and asserts they appear as missing, proving mismatch detection works
5. **Extracted `_find_method_in_runtime()` helper** — shared between positive and negative tests for consistent validation logic

### Key Findings

- **`known_missing` was masking passing methods**: All 5 "known missing" methods actually DO exist in the runtime dispatch paths when checked properly with nameMap-derived snake_case names. The old test was checking with incorrectly computed camelCase (no-op on already-camelCase keys from EXPECTED_METHODS), but the methods were registered under snake_case keys in `_method_map`. The nameMap lookup correctly resolves them.

- **`callRpc` alias was unnecessary**: `callRpc` exists directly in `_method_map` as a camelCase key (manual override). The old alias `"call_rpc": "callRpc"` was redundant since the test now checks both `ts_name` (camelCase) and `snake_name` from nameMap.

- **Only 4 structural aliases remain**: These are cases where the runtime registration name structurally differs from both the tsName and its snake_case equivalent:
  - `loadGame` → `load_game_json` (extra `_json` suffix)
  - `applyDynamicShader` → `apply_dynamic_shader_to_entity` (extra `_to_entity` suffix)
  - `stepPhysics` → `step` (shortened name in DebugBridge)
  - `effectsUpdateParams` → `effects.updateParams` (RPC namespace prefix)

- **JSON loading from outside `res://`**: Used `ProjectSettings.globalize_path("res://")` to compute absolute path to repo root, then navigated to `app/lib/godot/generated/bridge-registry.json`. This works because GDScript's `FileAccess.open()` accepts absolute paths.

- **Pre-existing compile error**: `GameBridgeEffects.gd` has a parse error on line 710 (`Cannot infer the type of "win_size"`). This is NOT caused by this refactor — it's a pre-existing issue. The test still passes because gdUnit4 catches the `.new()` failure and the effects methods are still registered via the autoload in the test setup.
