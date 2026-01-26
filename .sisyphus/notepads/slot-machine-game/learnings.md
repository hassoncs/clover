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


---

### All-Ways Win Detection Implementation (Task 5)

**Key changes made:**

1. **Updated WinDetectionInput interface** (`slots.ts`, line 60-68):
   - Added `wildSymbolIndex?: number` - allows wild symbols to substitute
   - Added `scatterSymbolIndex?: number` - excludes scatter from regular wins
   - Added `payouts: PayoutConfig[]` - symbol-specific payout multipliers

2. **Enhanced Win interface** (`slots.ts`, line 69-76):
   - Added `ways: number` - total ways to win (product of matches per column)
   - Used for calculating payout: `multiplier * ways`

3. **Implemented allWaysWinDetection algorithm** (`slots.ts`, lines 89-144):
   - Iterates through each symbol type (excluding scatter)
   - For each symbol, checks reels left-to-right
   - Counts matching symbols per column (including wild substitution)
   - Multiplies ways across columns: e.g., 2×1×3 = 6 ways
   - Requires minimum 3 consecutive reels for a win
   - Calculates payout using `PayoutConfig.counts[count] * ways`

4. **Updated SlotMachineSystem.detectWins()** (`SlotMachineSystem.ts`, lines 465-482):
   - Passes `wildSymbolIndex`, `scatterSymbolIndex`, and `payouts` to implementation
   - Maps `ways` field from implementation output to SlotWin

**Algorithm logic:**
```
For each symbol (excluding scatter):
  ways = 1
  positions = []
  consecutiveReels = 0

  For each column from left to right:
    count = number of matching symbols in this column (including wilds)
    if count === 0: break
    ways *= count
    positions += column positions
    consecutiveReels++

  if consecutiveReels >= 3:
    payout = payouts[symbol].counts[consecutiveReels] * ways
    add win {symbol, count, ways, positions, payout}
```

**Example:**
- Grid has 2 cherries in column 0, 1 cherry in column 1, 3 cherries in column 2
- Ways = 2 × 1 × 3 = 6 ways
- If payout config has {cherry: {3: 10}}, payout = 10 × 6 = 60


---

### Free Spins Bonus Implementation (Task 6)

**Key changes made:**

1. **Added callbacks** (`SlotMachineSystem.ts`, lines 56-57):
   - `onFreeSpinStart?: (remaining: number) => void` - Called when a free spin begins
   - `onFreeSpinsComplete?: () => void` - Called when all free spins are exhausted

2. **Added `countScatters()` method** (lines 604-618):
   - Reusable helper that counts scatter symbols anywhere on the grid
   - Returns 0 if `scatterSymbolIndex` is undefined
   - Iterates through all rows and columns to count matches

3. **Added `triggerFreeSpins()` method** (lines 620-630):
   - For retriggers during free spins - INCREMENTS spins (doesn't reset)
   - Calculates spins to award based on scatter count: `scatterCount - 3` indexes into `scatterCount[]` array
   - 3 scatters = index 0 → first value, 4 scatters = index 1 → second value, etc.
   - Calls `onFreeSpinStart` callback with updated remaining count

4. **Completed `updateFreeSpins()` method** (lines 786-803):
   - Checks for retrigger first via `shouldTriggerBonus()`
   - If free spins remain: decrements counter, generates new targets, starts spin animation
   - If no spins remain: transitions to idle, calls `onFreeSpinsComplete` callback

5. **Modified `evaluateSpin()` method** (lines 473-506):
   - Added handling for `bonus_free_spins` phase in the no-wins branch
   - If retrigger detected during free spins: calls `triggerFreeSpins()` then `enterBonusMode()`
   - If no retrigger but spins remain: continues free spinning (auto-spin)
   - If no spins remaining: transitions to idle, calls `onFreeSpinsComplete`

6. **Modified `finishAwarding()` method** (lines 745-778):
   - Same logic as `evaluateSpin()` but for wins with awarding phase
   - Handles retriggers and auto-continuation during free spins

**State flow:**
```
Normal spin → (no wins + 3+ scatters) → enterBonusMode() → bonus_free_spins
bonus_free_spins → updateFreeSpins() → (spins remain?) → spinning → evaluating
evaluating → (no wins + no retrigger + spins remain) → spinning (auto)
evaluating → (wins + no retrigger + spins remain) → awarding → spinning (auto)
evaluating/awarding → (retrigger) → triggerFreeSpins() → continue bonus_free_spins
evaluating/awarding → (no spins remaining) → idle → onFreeSpinsComplete()
```

**Key formulas:**
- Spins to award: `config.freeSpins.scatterCount[scatterCount - 3] ?? 10`
  - 3 scatters → index 0
  - 4 scatters → index 1
  - 5 scatters → index 2

**Retrigger behavior:**
- Unlimited retriggers allowed during free spins
- Each retrigger ADDS spins (cumulative)
- `triggerFreeSpins()` uses `+=` not `=` to accumulate


