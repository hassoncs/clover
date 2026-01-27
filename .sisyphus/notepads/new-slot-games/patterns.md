# Reusable Patterns & Helper Recommendations

## Patterns Identified Across 7 New Puzzle Games

After building Stack & Match, Ball Sort, Block Drop, Ice Slide, Drop & Pop, Tip the Scale, and Domino Chain, these patterns emerged:

---

## 1. Choice System Pattern
**Used by**: Stack & Match, Block Drop, Tip the Scale

**Structure**:
- N choices displayed (usually 3)
- Player taps to select one
- Selection stored in variable (`selectedChoiceIndex`)
- Player performs action with selected item
- Choices refresh after use

**State Machine**:
```
choosing → placing → [processing] → choosing
```

**Variables Needed**:
- `selectedChoiceIndex: -1` (none selected)
- `selectedValue: -1` (color, weight, etc.)

**Recommendation**: Create a **ChoiceSystem** helper or behavior that:
- Manages N choice entities
- Handles selection/deselection
- Refreshes choices after use
- Emits `choice_selected` and `choice_used` events

---

## 2. Pick & Place Pattern
**Used by**: Ball Sort, Stack & Match, Tip the Scale

**Structure**:
- Tap source to pick up item
- Tap destination to place item
- Validation on placement (can only place in valid spots)

**State Machine**:
```
idle → holding → idle
```

**Variables Needed**:
- `heldItemId: ""` (entity being held)
- `sourceIndex: -1` (where it came from)
- `heldValue: -1` (color, type, etc.)

**Recommendation**: Create a **PickPlaceSystem** helper that:
- Manages pickup/drop logic
- Validates placement rules
- Handles cancel (tap elsewhere)
- Emits `item_picked`, `item_placed`, `pickup_cancelled` events

---

## 3. Column Drop Pattern
**Used by**: Block Drop, Ball Sort, Connect4

**Structure**:
- Fixed columns
- Items drop to bottom (or stack on existing)
- Gravity-based stacking

**Variables Needed**:
- `col0_count`, `col1_count`, etc. (items per column)
- `col0_topValue`, etc. (top item value)

**Recommendation**: Create a **ColumnStack** helper that:
- Tracks items per column
- Calculates drop position
- Detects column full
- Emits `item_landed`, `column_full` events

---

## 4. Grid Slide Pattern
**Used by**: Ice Slide, 2048

**Structure**:
- Swipe input in 4 directions
- All pieces move in same direction
- Stop on collision with wall/piece

**State Machine**:
```
idle → sliding → checking → idle
```

**Recommendation**: Create a **GridSlide** behavior that:
- Handles swipe input
- Moves all tagged entities in direction
- Stops on collision
- Emits `slide_complete` event

---

## 5. Physics Drop Pattern
**Used by**: Drop & Pop, Domino Chain, Tip the Scale

**Structure**:
- Aim/position before drop
- Physics-based settling
- Wait for physics to stabilize

**State Machine**:
```
aiming → dropping → settling → [result]
```

**Variables Needed**:
- `aimX: 0` (horizontal position)
- `currentItemType: 0` (what's being dropped)

**Recommendation**: Create a **PhysicsDrop** helper that:
- Manages aim indicator
- Spawns physics entity on drop
- Detects settling (velocity < threshold)
- Emits `item_dropped`, `item_settled` events

---

## 6. Chain Reaction Pattern
**Used by**: Domino Chain, Drop & Pop (merges)

**Structure**:
- Setup phase (placing items)
- Trigger phase (start reaction)
- Reaction phase (physics/logic runs)
- Result phase (count/score)

**State Machine**:
```
placing → ready → running → scoring → placing
```

**Recommendation**: Create a **ChainReaction** helper that:
- Tracks reaction progress
- Counts affected items
- Detects reaction complete
- Emits `chain_started`, `chain_complete` events

---

## 7. Balance/Threshold Pattern
**Used by**: Tip the Scale, Ice Slide (win detection)

**Structure**:
- Accumulate values (torque, position)
- Check against threshold
- Win when within tolerance

**Variables Needed**:
- `leftValue`, `rightValue` (or similar)
- `threshold: 0.3` (tolerance)

**Recommendation**: Create **ThresholdCheck** expression functions:
- `isBalanced(leftVar, rightVar, threshold)` → boolean
- `isWithinRange(value, target, tolerance)` → boolean

---

## Common Boilerplate Identified

### 1. Coordinate Helpers (in EVERY game)
```typescript
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;
```

**Recommendation**: Export these from a shared module or make them part of the test game template.

### 2. Grid Generation (in 4 games)
```typescript
function generateGrid(rows, cols, startX, startY, cellSize, gap) {
  // ... same pattern every time
}
```

**Recommendation**: Create a `generateGridEntities()` helper function.

### 3. State Machine + Variable Sync
Games define state machines but also need variables to track state for rule conditions (since `state` condition type isn't in RuleCondition union).

**Recommendation**: Either:
- Add `state` condition type to RuleCondition
- Or auto-sync state machine state to a variable

---

## Priority Recommendations

### High Priority (Would Save Most Time)

1. **Add `state` condition type to RuleCondition**
   - Currently games duplicate state in variables
   - Should be: `{ type: 'state', machineId: 'gameFlow', state: 'choosing' }`

2. **Create `generateGridEntities()` helper**
   - Used by 4+ games
   - Takes: rows, cols, startX, startY, cellSize, gap, template
   - Returns: GameEntity[]

3. **Export coordinate helpers**
   - `cx()`, `cy()` used in every game
   - Should be importable from shared

### Medium Priority (Nice to Have)

4. **ChoiceSystem behavior**
   - Manages N choices with selection state
   - Auto-refreshes after use

5. **ColumnStack helper**
   - Tracks column heights
   - Calculates drop positions

6. **PhysicsSettling detection**
   - Expression function: `isSettled(tag)` → boolean
   - Checks if all entities with tag have velocity < threshold

### Lower Priority (Future)

7. **PickPlaceSystem behavior**
8. **ChainReaction helper**
9. **ThresholdCheck expressions**

---

## Test Games Created (Summary)

| Game | Pattern | State Machine States |
|------|---------|---------------------|
| Stack & Match | Choice + Grid | choosing → placing → checking → clearing → spawning |
| Ball Sort | Pick & Place | idle → holding |
| Block Drop | Choice + Column | choosing → dropping → merging → checking → spawning |
| Ice Slide | Grid Slide | idle → sliding → checking |
| Drop & Pop | Physics Drop | aiming → dropping → settling |
| Tip the Scale | Choice + Balance | choosing → placing → settling → checking |
| Domino Chain | Chain Reaction | placing → ready → running → scoring |

All games use the new `stateMachines` field in GameDefinition.
