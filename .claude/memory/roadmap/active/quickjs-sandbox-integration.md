# QuickJS Sandbox Integration Plan

## Status: In Progress

## Goal
Replace the unsafe eval-based script sandbox with QuickJS WASM for production-ready user script execution.

## Current State

### Architecture
```
app/lib/scripting/
├── IScriptSandbox.ts           # Unified interface
├── UnsafeScriptSandbox.ts      # Eval-based (temporary, NO SECURITY)
├── QuickJSScriptSandbox.ts     # QuickJS WASM (secure, ready for testing)
├── createScriptSandbox.ts      # Factory with USE_SAFE_SANDBOX flag
├── engine/
│   └── QuickJSEngine.ts        # Low-level QuickJS WASM wrapper
└── types.ts                    # Type definitions
```

### Switching Mechanism
```typescript
// In createScriptSandbox.ts
export const USE_SAFE_SANDBOX = false; // Set to true to enable QuickJS

// Usage: import { createScriptSandbox } from '@/lib/scripting';
const sandbox = createScriptSandbox(config); // Returns appropriate implementation
```

## Implementation Tasks

### Phase 1: Unit Test QuickJSScriptSandbox
Create `QuickJSScriptSandbox.test.ts` mirroring existing `UnsafeScriptSandbox.test.ts`:

1. **Basic evaluation**
   - [ ] Initialize with valid script
   - [ ] Detect exported hooks (onStart, onUpdate, onInput, onCollision)
   - [ ] Report missing hooks correctly
   - [ ] Report syntax errors

2. **Lifecycle hooks**
   - [ ] runStart calls onStart hook
   - [ ] runUpdate passes dt correctly
   - [ ] runInput passes event data
   - [ ] runCollision passes collision data

3. **Context API**
   - [ ] Script can access ctx.getVariable / ctx.setVariable
   - [ ] Script can call ctx.spawnEntity / ctx.destroyEntity
   - [ ] Script can access ctx.queryEntities
   - [ ] Script can call ctx.emit / ctx.win / ctx.lose

4. **Hot reload**
   - [ ] Reload with new script code
   - [ ] Track reload count
   - [ ] Return error on invalid reload
   - [ ] Return current script code

5. **Console logging**
   - [ ] console.log captured in getLogs()
   - [ ] console.warn captured
   - [ ] console.error captured

6. **Resource management**
   - [ ] dispose() releases resources
   - [ ] Execution fails after dispose

7. **Security features (QuickJS-specific)**
   - [ ] Infinite loop terminates (timeout)
   - [ ] Memory limit enforced
   - [ ] No access to host globals (window, process, etc.)

### Phase 2: Integration Testing
Test within the actual game engine:

1. [ ] Enable USE_SAFE_SANDBOX = true in dev environment
2. [ ] Load a game with script (e.g., slopeggle)
3. [ ] Verify onStart fires
4. [ ] Verify onUpdate fires each frame
5. [ ] Verify input/collision hooks fire
6. [ ] Verify console.log output appears
7. [ ] Verify hot reload works in development

### Phase 3: Performance Benchmarking
Compare UnsafeScriptSandbox vs QuickJSScriptSandbox:

1. [ ] Measure initialization time (WASM load)
2. [ ] Measure per-frame onUpdate overhead
3. [ ] Measure memory usage
4. [ ] Document acceptable performance thresholds

### Phase 4: Production Rollout

1. [ ] Set USE_SAFE_SANDBOX = true as default
2. [ ] Remove UnsafeScriptSandbox (or keep as debug fallback)
3. [ ] Update documentation

## Known Issues / Risks

1. **WASM initialization is async** - QuickJSScriptSandbox.initialize() must be awaited. Already handled in current code.

2. **Context serialization** - Current QuickJSScriptSandbox passes context via JSON.stringify. This works but:
   - Functions cannot be passed (ctx.spawnEntity etc. are JSON'd then re-evaluated)
   - May need optimization if context is large

3. **Handle retention** - QuickJS requires manual memory management. Handles must be disposed properly to avoid memory leaks.

## Dependencies

- `quickjs-emscripten-core` - QuickJS WASM bindings
- `@jitl/quickjs-singlefile-cjs-release-sync` - Synchronous WASM variant

## Success Criteria

- [ ] All UnsafeScriptSandbox tests pass with QuickJSScriptSandbox
- [ ] Games with scripts work identically with either sandbox
- [ ] Infinite loops are terminated (security)
- [ ] No access to host runtime (security)
- [ ] Performance is acceptable (< 1ms per-frame overhead)
