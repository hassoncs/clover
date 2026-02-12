# Godot Bridge Initialization Cleanup - Learnings

## Baseline Verification (2026-02-11)

### Current State

**Good news**: Most cleanup already done!

- ✅ GameBridge._ready() already uses `call_deferred("_finalize_js_bridge")`
- ✅ _finalize_js_bridge wrapper exists and calls _setup_js_bridge()
- ✅ _effectsReady flag **already removed** (comment at line 377 explains why)
- ✅ waitForEffectsReady **does not exist** in GodotBridge.web.ts
- ✅ Effects methods registered via `_register_methods_with_game_bridge()` (line 121-129)

### Only Remaining Issue

**_setup_js_effects_bridge() polling logic** (lines 237-375):

```gdscript
var bridge = window.GodotBridge
if bridge == null:
	# Wait for GameBridge to set up first
	await get_tree().create_timer(0.1).timeout
	_setup_js_effects_bridge()
	return
```

**Why it's wrong**:
- GameBridge already defers window.GodotBridge exposure
- GameBridgeEffects._ready() runs BEFORE GameBridge._finalize_js_bridge()
- Polling is unnecessary - effects methods already in GameBridge._method_map
- GameBridge._setup_js_bridge() exposes ALL methods from _method_map

**Solution**: Remove entire `_setup_js_effects_bridge()` function (Task 3)

### Key Discovery

Effects methods are **already exposed** via GameBridge:

1. GameBridgeEffects._ready() calls `_register_methods_with_game_bridge()` (line 46)
2. This adds effects methods to `_game_bridge._method_map` (line 127)
3. GameBridge._setup_js_bridge() exposes ALL methods from _method_map (lines 436-442)
4. No separate JS bridge setup needed!

### Verification Commands

```bash
# Confirm _effectsReady removed
grep "_effectsReady" godot_project/scripts/bridge/GameBridgeEffects.gd
# Result: Only comment at line 377

# Confirm waitForEffectsReady removed
grep "waitForEffectsReady" app/lib/godot/GodotBridge.web.ts
# Result: No matches

# Confirm call_deferred pattern
grep "call_deferred.*_finalize_js_bridge" godot_project/scripts/GameBridge.gd
# Result: Line 105
```

### Evidence

Full baseline report: `.sisyphus/evidence/bridge-init/baseline.md`

---

## Completion Summary (2026-02-11)

### All Tasks Completed ✅

| Task | Description | Status |
|------|-------------|--------|
| 1 | Verify baseline and lock exact delta | ✅ Complete |
| 2 | Codify single readiness contract | ✅ Complete |
| 3 | Normalize Godot-side bridge exposure timing | ✅ Complete |
| 4 | Remove JS module-specific readiness polling | ✅ Complete |
| 5 | Remove stale effects readiness plumbing | ✅ Complete |
| 6 | Preserve type-safe codegen invariants | ✅ Complete |
| 7 | Add regression tests for initialization contract | ✅ Complete |
| 8 | Enforce and evidence in CI | ✅ Complete |

### Key Changes Made

1. **Removed `_setup_js_effects_bridge()` function** from GameBridgeEffects.gd (147 lines)
   - Eliminated redundant polling logic that waited for `window.GodotBridge`
   - Effects methods now exposed exclusively through GameBridge._method_map

2. **Added 3 regression tests** to test_BridgeContract.gd:
   - `test_bridge_initialization_deferred_pattern()` - Verifies deferred pattern
   - `test_bridge_no_effects_polling()` - Verifies no polling method exists
   - `test_bridge_single_readiness_signal()` - Verifies no module-specific flags

### Test Results

```
5/5 tests passed, 0 errors, 0 failures, exit code 0
```

### Evidence Files

- `.sisyphus/evidence/bridge-init/baseline.md` - Initial state documentation
- `.sisyphus/evidence/bridge-init/generate-and-tsc.txt` - Codegen validation (47 lines)
- `.sisyphus/evidence/bridge-init/godot-tests.txt` - Test results (227 lines)
- `.sisyphus/evidence/bridge-init/legacy-readiness-grep.txt` - Flag verification (20 lines)

### Architecture Improvements

- **Single readiness signal**: Only `window.GodotBridge` existence is used
- **No module-specific polling**: Removed `_effectsReady` style flags
- **Deferred exposure**: GameBridge uses `call_deferred("_finalize_js_bridge")`
- **Type-safe codegen**: Preserved and validated

The bridge initialization is now clean, deterministic, and fully tested.
