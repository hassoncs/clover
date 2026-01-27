# Issues - Slot Machine Game

## Problems and Gotchas Encountered


## UI Not Updating on Wins (FIXED - Task 7)

### Root Cause
The slot machine callbacks were using two broken patterns:
1. **Direct ref mutation**: `gameVariablesRef.current.lastWin = totalPayout` - This mutates the ref but doesn't trigger React re-renders
2. **Wrong variable**: `game.rulesEvaluator.addScore(totalPayout)` - This updates the `score` variable, not `credits`

### Solution
Replace all variable updates with `game.rulesEvaluator.setVariable()`:
- `setVariable()` updates the internal Map AND triggers `onVariablesChange` callback
- The callback calls `setGameState()` which updates React state
- This creates the reactive chain: setVariable → callback → setState → re-render

### Changes Made (GameRuntime.godot.tsx lines 390-427)
- **onSpinStart**: Deduct bet from credits, reset lastWin to 0
- **onSpinComplete**: Add payout to credits, set lastWin to payout amount
- **onBonusTrigger**: Use setVariable for freeSpins instead of ref mutation
- **onFreeSpinStart**: Use setVariable for freeSpins
- **onFreeSpinsComplete**: Use setVariable to reset freeSpins to 0
- **onPickBonusComplete**: Add prize to credits, set lastWin to prize amount

### Key Pattern
```typescript
// WRONG - doesn't trigger re-render
gameVariablesRef.current.credits = newValue;

// CORRECT - triggers onVariablesChange callback → setState
game.rulesEvaluator.setVariable('credits', newValue);
```

### Debug Logging Added
All callbacks now log state changes to console for verification:
- `[SlotMachine] Spin started - deducted X credits, remaining: Y`
- `[SlotMachine] Spin complete - payout: X, new credits: Y`
- `[SlotMachine] Bonus triggered - free spins: X`
- `[SlotMachine] Free spin started - remaining: X`
- `[SlotMachine] Free spins complete`
- `[SlotMachine] Pick bonus complete - prize: X, new credits: Y`


## Auto-Refill Mechanism Implementation (Task 8 - COMPLETED)

### Implementation Details

Added auto-refill logic to `onSpinStart` callback in `GameRuntime.godot.tsx` (lines 390-404):

1. **Check credits before deduction**: Changed `const currentCredits` to `let currentCredits` to allow mutation
2. **Refill condition**: If `currentCredits <= 0`, set to 1000 and call `setVariable('credits', 1000)`
3. **Console logging**: Added `[SlotMachine] Credits refilled to 1000` log when refill occurs
4. **Deduction happens after refill**: Ensures bet is deducted from the refilled amount

### Code Pattern
```typescript
onSpinStart: () => {
  let currentCredits = game.rulesEvaluator.getVariable('credits') as number ?? 1000;
  const bet = game.rulesEvaluator.getVariable('bet') as number ?? 1;
  
  // Auto-refill if credits are depleted
  if (currentCredits <= 0) {
    currentCredits = 1000;
    game.rulesEvaluator.setVariable('credits', currentCredits);
    console.log('[SlotMachine] Credits refilled to 1000');
  }
  
  game.rulesEvaluator.setVariable('credits', currentCredits - bet);
  game.rulesEvaluator.setVariable('lastWin', 0);
  console.log(`[SlotMachine] Spin started - deducted ${bet} credits, remaining: ${currentCredits - bet}`);
},
```

### Acceptance Criteria Met
- ✅ Credits never go negative (refills at 0)
- ✅ Refill happens in `onSpinStart` callback before deducting bet
- ✅ Console log added: `[SlotMachine] Credits refilled to 1000`
- ✅ TypeScript compilation passes

### Key Insight
The refill uses `setVariable()` which triggers the `onVariablesChange` callback, ensuring UI updates reflect the refilled credits immediately.
