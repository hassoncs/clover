

## Task 3: GameEventQueue Implementation - Completed

### Files Created/Modified

#### New Files
- `app/lib/game-engine/GameEventQueue.ts` - Unified event queue with GameEvent union type and GameEventQueue class

#### Modified Files
- `app/lib/game-engine/GameRuntime.godot.tsx` - Migrated lifecycle events from `pendingLifecycleEventsRef` to `eventQueueRef`

### Implementation Details

#### GameEvent Union Type
Includes all event types organized by category:
- **Lifecycle**: `game_loaded`, `game_started`
- **Input**: `tap`, `drag_start`, `drag_end`, `mouse_move`, `mouse_leave`, `button_pressed`, `button_released`
- **Physics**: `collision`, `sensor_begin`, `sensor_end`

#### GameEventQueue Class
- `push(event)` - Add event to queue, triggers onEventQueued callback
- `drain()` - O(1) array swap to retrieve and clear all events
- `peek()` - Readonly view of queued events without draining
- `length` - Current queue size
- `setOnEventQueued(callback)` - For auto-advance in inspector mode (future use)

#### Migration from pendingLifecycleEventsRef
Changed 3 locations in GameRuntime.godot.tsx:
1. Line ~843: `pendingLifecycleEventsRef.current.push('game_loaded')` -> `eventQueueRef.current.push({ type: 'game_loaded' })`
2. Line ~1446: `pendingLifecycleEventsRef.current.push('game_started')` -> `eventQueueRef.current.push({ type: 'game_started' })`
3. Line ~1515: `pendingLifecycleEventsRef.current.push('game_loaded')` -> `eventQueueRef.current.push({ type: 'game_loaded' })`

#### stepGame() Changes
- Replaced: `pendingLifecycleEventsRef.current.map(type => ({ type }))`
- With: `eventQueueRef.current.drain().filter(isLifecycleEvent)`
- Maintains same output shape for `UpdateContext.frame.inputEvents`
- `collisionsRef` and `inputRef` remain untouched (migrated in Task 4)

#### Type Guards
- `isLifecycleEvent(event)` - Filter for lifecycle events
- `isInputEvent(event)` - Filter for input events
- `isPhysicsEvent(event)` - Filter for physics events

### Design Decisions

1. **Array Swap for Drain**: Uses `const events = this.queue; this.queue = []; return events;` for O(1) operation instead of copying.

2. **Event Shape Alignment**: GameEvent type aligns with existing `InputEvent` union in `systems/runner/types.ts` to ensure compatibility with `RulesSystem.convertFrameInputEvents()`.

3. **Incremental Migration**: Only lifecycle events migrated now. Input and collision events stay in their existing refs until Task 4.

4. **Logger Integration**: Used `logger.debug('lifecycle', ...)` for event queue logging as specified.

### Verification
- `pnpm tsc --noEmit` passes with no errors
- LSP diagnostics clean on modified files
- Test failures in @slopcade/shared are pre-existing (expression evaluator) - not related to this change
- No tests exist for the migrated lifecycle event functionality (integration test was deleted in Task 2)

### Next Steps (Task 4)
- Migrate collision events from `collisionsRef` to `eventQueueRef`
- Migrate discrete input events (tap, drag_end) from `inputRef` to `eventQueueRef`
- Keep continuous state (buttons, drag position, mouse, tilt) in `inputRef`
