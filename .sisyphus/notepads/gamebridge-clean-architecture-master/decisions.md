
## Task 14: InputRouter Module Design

### Decision: Wrapper Function for _hit_test
**Rationale**: Keep `_hit_test()` as a public method in GameBridge that delegates to InputRouter
- Maintains backward compatibility with existing callers (JSBridge, send_input)
- Avoids exposing InputRouter module to external callers
- Single point of delegation for hit testing

### Decision: Structured Return Values
**Rationale**: InputRouter returns dictionaries instead of mutating GameBridge state
- Cleaner separation of concerns
- GameBridge decides what to do with input events
- Easier to test InputRouter in isolation

### Decision: GameBridge Handles Devtools Overlay
**Rationale**: Keep devtools overlay updates in GameBridge's _input() function
- Devtools is a UI/debugging concern, not core input logic
- InputRouter focuses on input processing, not visualization
- Avoids coupling InputRouter to debugging infrastructure

### Decision: Coordinate Conversion Stays in GameBridge
**Rationale**: Don't move game_to_godot_pos/godot_to_game_pos to InputRouter
- These are shared utilities used by many modules
- InputRouter calls them via _game_bridge reference
- Avoids duplicating coordinate conversion logic


## Removal of bodyId and zone from EntityManager.query
- **Decision**: Removed `bodyId` and `zone` from `EntityManager.query` tests.
- **Rationale**: `bodyId` was removed from `RuntimeEntity` in favor of using `id` for physics lookups. `zone` component is deprecated in favor of `collider` with `isSensor: true`. The `EntityManager.query` implementation was updated to only support `visual`, `physics`, and `collider`.

## Future Work: Type-Safe Bridge (2026-02-01)

**Problem:** Current JS-Godot bridge has no compile-time type checking. 
Method names and args can mismatch, causing runtime errors.

**Proposed Solutions:**
1. **Schema-based code-gen**: Define bridge API in shared schema (JSON/YAML), generate TS types + GDScript stubs
2. **Single typed entry point**: `bridge.call(method, args)` with discriminated unions
3. **Zod validation**: Validate at TS boundary before bridge calls

**Priority:** LOW - current direct delegation works, fix after cleanup complete
**Effort:** Medium (2-3 days for code-gen approach)
