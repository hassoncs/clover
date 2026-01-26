# Learnings - Slot Machine Game

## Conventions and Patterns Discovered

### SlotMachineSystem Architecture (Task 3)

**Key patterns from Match3GameSystem:**

1. **Constructor signature**: `(config, entityManager, callbacks, eventBus?)`
   - Config: Game-specific configuration from GameDefinition
   - entityManager: Standard EntityManager for entity operations
   - callbacks: Object with optional hooks for UI feedback
   - eventBus: Optional EventBus for cross-system communication

2. **Required methods**:
   - `setBridge(bridge)`: Integration point for GodotBridge
   - `initialize()`: Board/reel setup, sets initial phase to "idle"
   - `update(dt)`: State machine driver, handles phase transitions
   - `getPhase()`: Public getter for current phase
   - `destroy()`: Cleanup when system is torn down

3. **State machine pattern**:
   - Phase enum defines all possible states
   - `update(dt)` uses switch statement on phase
   - Private methods handle each phase's logic
   - Callbacks notify UI of important events

4. **Entity management**:
   - Use `entityManager.getEntity(id)` to get entity reference
   - Modify `entity.transform` directly for position updates
   - Use bridge `setPosition()` for Godot synchronization
   - Use `entityManager.createEntity()` and `destroyEntity()` for lifecycle

5. **Slot implementations**:
   - Register implementations in constructor via `registerXSlotImplementations()`
   - Look up via `getGlobalSlotRegistry().get(slotId)`
   - Call via `impl.run(context, input)` for pure/policy/hook slots

**Common pitfalls:**

1. **Import paths**: From `systems/slotMachine/`, use:
   - `../../EntityManager` (2 levels up to game-engine, then to EntityManager)
   - `../../../godot/types` (2 levels up to lib, then to godot/types)

2. **EntityManager API**: No `updateEntity()` method - modify `entity.transform` directly

3. **Config properties**: SlotMachineConfig doesn't have `symbolWeighting`, `winDetection`, `payoutCalculation` properties - these are looked up by fixed slot IDs

4. **FreeSpinsConfig**: Has `scatterCount: number[]` not `count`

 5. **PickBonusConfig**: Has `gridRows`, `gridCols` not `picks`, `rewards`

---

### Reel Spinning Animation Implementation (Task 4)

**Key changes made to SlotMachineSystem.ts:**

1. **Added easing functions** (lines 4-15):
   - `easeOutQuad(t)`: Standard ease-out for smooth acceleration
   - `easeOutBack(t)`: Back-ease with overshoot for bounce effect on stop

2. **Enhanced ReelState interface** (lines 16-32):
   - `virtualPosition: number`: Continuous offset for scrolling (replaces `position`)
   - `spinPhase: 'accelerating' | 'full_speed' | 'decelerating' | 'stopped'`: Current animation state
   - `spinStartTime: number`: When spin began (for acceleration calculation)
   - `decelerationStartTime: number`: When to start slowing down
   - `targetPosition: number`: Final target for snapping
   - `fullSpeedTime: number`: Track time at full speed

3. **Animation phases** (in `updateSpinning()`, lines 305-380):
   - **Accelerating (0.2s)**: Velocity ramps from 0 to SPIN_VELOCITY using easeOutQuad
   - **Full Speed**: Constant velocity (25 symbols/second) until deceleration time
   - **Decelerating (0.5s)**: Ease toward target position using easeOutBack for bounce

4. **Staggered stopping** (in `startReelAnimations()`, lines 228-243):
   - Each reel stops `REEL_STOP_DELAY` seconds after the previous (0.3s default)
   - Reels 0, 1, 2 stop sequentially for visual effect

5. **Wrap-around positioning** (in `updateReelPositions()`, lines 384-410):
   - Symbols positioned using: `(row - virtualPosition) * cellSize`
   - Smooth wrap-around as virtualPosition increases beyond visible rows
   - No visual jumps when symbols scroll off bottom and reappear at top

**Key formulas:**
- Velocity during acceleration: `easeOutQuad(t) * SPIN_VELOCITY` where `t = elapsed / ACCEL_DURATION`
- Position during spin: `yOffset = (row - virtualPosition) * cellSize`
- Deceleration easing: `easeOutBack(t)` provides the bounce effect


