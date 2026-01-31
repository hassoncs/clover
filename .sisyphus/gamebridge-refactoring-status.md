# GameBridge Refactoring Status

**Date**: 2026-01-31
**Status**: Phase 4 Failed - Reverted to Working State

## Summary

Attempted "BIG BANG" refactoring of the 4740-line `GameBridge.gd` monolith failed during verification phase. The working original has been restored.

## What Was Completed

### Phase 1: Foundation
- [x] Handler inventory script created (78 handlers identified)
- [x] Contract tests with Vitest mocks (107 tests passing)
- [x] Baseline verification protocol documented

### Phase 2: Module Implementation
All modules were implemented/enhanced:
- [x] `PhysicsController.gd` - velocity, force, impulse, torque handlers
- [x] `EntityManager.gd` - spawn, destroy, transform, properties handlers  
- [x] `TransformSystem.gd` - position, rotation, scale handlers
- [x] `VisualRenderer.gd` - image, atlas, opacity, debug handlers
- [x] `JointManager.gd` - all joint types handlers (already existed)
- [x] `EventEmitter.gd` - callback setters, emit methods
- [x] `SyncSystem.gd` - tracked entities, watch config
- [x] `CameraController.gd` - target, position, zoom handlers
- [x] `UIManager.gd` - buttons, sound, particles

### Phase 3: New Orchestrator
- [x] First attempt: `GameBridge.gd.new_failed` (deleted)
- [x] Second attempt: `GameBridge.gd.new_v2` (kept for reference)

### Phase 4: Swap & Verify - FAILED
- The new orchestrator delegated to module methods that didn't exist
- Example: `_ui_manager.load_game()` - UIManager has no `load_game()` method
- Core game loading logic (~2000+ lines) was not transferred to modules
- Reverted to original `GameBridge.gd`

## Why It Failed

The "BIG BANG" approach incorrectly assumed:
1. All handler logic could be moved into specialized modules
2. The orchestrator would only need thin delegation

Reality:
1. Core functions like `load_game_json`, `_create_entity`, `_setup_world` require coordination across multiple modules
2. These functions contain ~2000+ lines of complex logic
3. Moving all this at once was too risky

## Current State

```
godot_project/scripts/
├── GameBridge.gd           # Original 4740-line working monolith
├── GameBridge.gd.new_v2    # Reference: corrected orchestrator structure (has stubs)
├── bridge/
│   ├── CameraController.gd  # Working module
│   ├── EventEmitter.gd      # Working module  
│   ├── SyncSystem.gd        # Working module
│   ├── UIManager.gd         # Working module (partial)
│   └── VisualRenderer.gd    # Working module
├── entity/
│   ├── EntityManager.gd     # Working module
│   └── TransformSystem.gd   # Working module
└── physics/
    ├── JointManager.gd      # Working module
    ├── PhysicsController.gd # Working module
    └── PhysicsQueries.gd    # Working module
```

## Recommended Path Forward

### Incremental Refactoring (Safer)

Instead of replacing the entire GameBridge, modify it to USE modules internally:

1. **Phase A**: Have `GameBridge.gd` instantiate and use `PhysicsController`
   - Replace inline `set_linear_velocity`, `apply_impulse`, etc. with module calls
   - Test thoroughly

2. **Phase B**: Have `GameBridge.gd` use `JointManager`
   - Already has a working JointManager, just needs connection
   - Test thoroughly

3. **Phase C**: Continue with other modules one at a time

This approach:
- Keeps the game working at all times
- Allows testing after each change
- Reduces risk of breaking everything

### Files to Keep

- `GameBridge.gd.new_v2` - Reference for correct orchestrator structure
- All module files - They're working and tested
- `.sisyphus/handler-inventory.json` - Reference for handler mapping

### Files Created/Modified

- `scripts/inventory-bridge-handlers.ts` - Handler discovery script
- `.sisyphus/handler-inventory.json` - Handler categorization
- `app/lib/godot/__tests__/mock-godot-bridge.ts` - Mock for testing
- `app/lib/godot/__tests__/bridge-contracts.test.ts` - 107 contract tests
- `.sisyphus/baseline-behavior.md` - Verification protocol

## Lessons Learned

1. **Don't do "BIG BANG" refactors** on 4700+ line files
2. **Verify module APIs exist** before writing delegation code
3. **Core coordination logic** should stay in orchestrator, not be split across modules
4. **Incremental refactoring** with tests after each step is safer
5. **Contract tests** caught the issue, but verification phase was needed
