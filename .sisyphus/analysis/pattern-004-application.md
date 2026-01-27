# Pattern 004 Application Analysis

**Date**: 2026-01-27
**Purpose**: Analyze all existing games against the patterns learned from slot machine implementation

---

## Executive Summary

After analyzing 27 test games and 10 game systems, I found:

| Finding | Count | Priority |
|---------|-------|----------|
| **Match3 uses `addScore()` instead of `setVariable()`** | 1 | HIGH |
| **Games using implicit state machines** | 3 | MEDIUM |
| **Systems missing typed callbacks** | 6 | LOW |
| **Animation code duplication** | 2 | LOW |

**Key Insight**: The `addScore()` vs `setVariable()` issue is NOT a bug - both trigger UI updates via separate callbacks (`onScoreChange` vs `onVariablesChange`). However, the pattern is inconsistent and could cause confusion.

---

## Detailed Findings

### 1. State Update Patterns (Pattern 004 Section 1)

#### Current Architecture

The `RulesEvaluator` has TWO separate callback systems:

```typescript
// Callback 1: Score/Lives/GameState (dedicated callbacks)
addScore(points: number): void {
  this.score += points;
  this.onScoreChange?.(this.score);  // ✅ Triggers UI update
}

// Callback 2: Variables (generic callback)
setVariable(name: string, value: number | string | boolean): void {
  this.variables.set(name, value);
  this.onVariablesChange?.(this.getVariables());  // ✅ Triggers UI update
}
```

Both are wired in `GameRuntime.godot.tsx`:
```typescript
game.rulesEvaluator.setCallbacks({
  onScoreChange: (score) => setGameState((s) => ({ ...s, score })),
  onVariablesChange: (variables) => setGameState((s) => ({ ...s, variables })),
});
```

#### Analysis

| System | Method Used | UI Updates? | Notes |
|--------|-------------|-------------|-------|
| **Match3** | `addScore(points)` | ✅ Yes | Uses dedicated score callback |
| **SlotMachine** | `setVariable('credits', x)` | ✅ Yes | Uses variables callback |
| **Declarative Games** | Rules with `add_score` action | ✅ Yes | Goes through `addScore()` |

**Verdict**: Both patterns work correctly. The slot machine uses `setVariable` because it tracks `credits` (a custom variable), not `score` (the built-in field).

#### Recommendation

**No immediate fix needed**, but consider:
1. Document when to use `addScore()` vs `setVariable()`:
   - `addScore()` for the built-in score counter
   - `setVariable()` for custom game state (credits, lives, combos, etc.)
2. Consider adding `setCredits()` helper if credits become a common pattern

---

### 2. State Machine Patterns (Pattern 004 Section 3)

#### Games Using Explicit State Machines ✅

| Game | States | Benefit |
|------|--------|---------|
| **dominoChain** | `placing` → `ready` → `running` → `scoring` | Clean phase management |
| **ballSort** | `idle` ↔ `holding` | Prevents illegal moves |
| **dropPop** | `aiming` → `dropping` → `settling` → `merging` | Suika-style flow |
| **iceSlide** | `idle` → `sliding` → `checking_win` | Sokoban-style |
| **blockDrop** | `choosing` → `dropping` → `merging` → `checking` | Tetris-like |
| **tipScale** | `choosing_weight` → `placing` → `settling` → `checking` | Balance puzzle |
| **stackMatch** | `choosing` → `placing` → `checking` → `clearing` | Match-3 variant |

#### Games Using Implicit State (Candidates for Refactoring) ⚠️

| Game | Current Pattern | Proposed State Machine | Priority |
|------|-----------------|------------------------|----------|
| **memoryMatch** | `canFlip` + `flippedCount` variables | `idle` → `firstCard` → `secondCard` → `checking` → `matched/reset` | MEDIUM |
| **connect4** | `gameOver` + `currentPlayer` variables | `player1Turn` → `player2Turn` → `checkingWin` → `gameOver` | MEDIUM |
| **slopeggle** | `entity_count` checks | `aiming` → `ballInPlay` → `scoring` → `gameOver` | LOW |

#### Recommendation

Create a task to refactor `memoryMatch` and `connect4` to use explicit state machines. This will:
- Simplify rule conditions (replace `canFlip == 1` with `stateIs("gameFlow", "idle")`)
- Enable timeout transitions (auto-flip back after delay)
- Make the game logic more readable

---

### 3. Callback Architecture (Pattern 004 Section 2)

#### Systems with Typed Callbacks ✅

| System | Callbacks | Notes |
|--------|-----------|-------|
| **Match3GameSystem** | `onScoreAdd`, `onMatchFound`, `onBoardReady`, `onNoMoves` | Well-typed |
| **SlotMachineSystem** | 11 callbacks (spin, win, bonus, etc.) | Comprehensive |

#### Systems Without Callbacks (Slot-Based) ⚠️

These systems use the "Slot" pattern (pure functions) instead of callbacks:

| System | Pattern | Notes |
|--------|---------|-------|
| **tetris/slots.ts** | Pure functions | `rotationRule`, `lineClearing` |
| **bubble/slots.ts** | Pure functions | `aimingRule`, `shootRule` |
| **connect4/slots.ts** | Pure functions | `dropRule`, `winDetection` |
| **memory/slots.ts** | Pure functions | `flipRule`, `matchDetection` |
| **flappy/slots.ts** | Pure functions | `flapRule`, `obstacleSpawner` |
| **slide/slots.ts** | Pure functions | `slideRule`, `winDetection` |

**Verdict**: The Slot pattern is intentionally different - it's for pluggable algorithms, not event notification. No change needed.

---

### 4. Animation Patterns (Pattern 004 Section 4)

#### Current State

| System | Animation Approach | Easing |
|--------|-------------------|--------|
| **Match3GameSystem** | Manual `pendingAnimations` array | Custom `easeOutQuad` |
| **SlotMachineSystem** | Manual reel animation loop | Custom `easeOutBack` |

#### Duplication Found

Both systems implement:
- `updateAnimations(dt)` method
- Custom easing functions
- Animation completion callbacks

#### Recommendation

**LOW PRIORITY**: Consider creating a shared `AnimationManager` or `TweenSystem` to reduce duplication. However, the current approach works and the duplication is minimal (2 systems).

---

### 5. Win Detection Patterns (Pattern 004 Section 5)

#### Current State

| System | Win Evaluator | Pluggable? |
|--------|---------------|------------|
| **Match3** | `findMatches()` method | No (hardcoded) |
| **SlotMachine** | `evaluateWins()` method | No (hardcoded) |
| **Tetris** | `lineClearing` slot | ✅ Yes |
| **Connect4** | `winDetection` slot | ✅ Yes |

#### Recommendation

**LOW PRIORITY**: Match3 and SlotMachine could benefit from pluggable win evaluators (e.g., diagonal match, different payline patterns), but this is a future enhancement.

---

## Action Items

### High Priority

None - the codebase is in good shape!

### Medium Priority

1. **Refactor memoryMatch to use explicit state machine**
   - Replace `canFlip`/`flippedCount` with `stateMachines` definition
   - Add timeout transition for auto-flip-back
   - Estimated: 1-2 hours

2. **Refactor connect4 to use explicit state machine**
   - Replace `gameOver`/`currentPlayer` with `stateMachines` definition
   - Centralize turn-switching logic
   - Estimated: 1-2 hours

### Low Priority

3. **Document addScore vs setVariable pattern**
   - Add to pattern-004.md or create separate doc
   - Clarify when to use each

4. **Consider shared AnimationManager**
   - Extract common animation logic from Match3 and SlotMachine
   - Only if more systems need animations

---

## Conclusion

The codebase is **well-architected** and already follows most patterns from pattern-004. The slot machine implementation was done correctly - it uses `setVariable()` because it tracks custom variables (`credits`, `lastWin`, `freeSpins`), not the built-in `score`.

The main opportunities for improvement are:
1. Converting 2-3 games from implicit to explicit state machines
2. Minor documentation improvements

No critical bugs or anti-patterns were found.
