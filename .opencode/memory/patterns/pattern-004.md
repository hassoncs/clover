# Pattern 004: Game System Implementation Patterns

**Source**: Slot Machine Game Implementation (January 2026)
**Applicability**: All game systems (Match3, Tetris, Ball Sort, Candy Crush, etc.)

---

## 1. Reactive UI Updates: setVariable vs Direct Mutation

### The Problem

When implementing game callbacks (score changes, state updates, etc.), directly mutating refs does NOT trigger React re-renders:

```typescript
// WRONG - UI won't update
onWinDetected: (result) => {
  gameVariablesRef.current.credits = newValue;  // Direct mutation
  gameVariablesRef.current.lastWin = result.totalWin;
}
```

### The Solution

Use `game.rulesEvaluator.setVariable()` which triggers the `onVariablesChange` callback → `setGameState()` → React re-render:

```typescript
// CORRECT - UI updates reactively
onWinDetected: (result) => {
  game.rulesEvaluator.setVariable('credits', newCredits);
  game.rulesEvaluator.setVariable('lastWin', result.totalWin);
}
```

### Why This Works

```
setVariable('credits', 100)
    ↓
RulesEvaluator.variables['credits'] = 100
    ↓
onVariablesChange callback fires
    ↓
setGameState({ ...state, variables: newVariables })
    ↓
React re-render
    ↓
UI displays new value
```

### Applies To

- **Match3**: Score updates, combo counters, moves remaining
- **Tetris**: Score, level, lines cleared
- **Ball Sort**: Move counter, tube states
- **Any game**: Credits, lives, timers, progress indicators

### IMPORTANT: addScore() vs setVariable()

The `RulesEvaluator` has TWO separate callback systems that BOTH trigger UI updates:

| Method | Use Case | Callback Triggered |
|--------|----------|-------------------|
| `addScore(points)` | Built-in score counter | `onScoreChange` |
| `setScore(value)` | Reset/set score directly | `onScoreChange` |
| `addLives(count)` | Built-in lives system | `onLivesChange` |
| `setLives(value)` | Reset/set lives directly | `onLivesChange` |
| `setVariable(name, value)` | Custom game variables | `onVariablesChange` |

**When to use which:**

```typescript
// Use addScore() for the built-in score counter
// - Displayed in the default UI header
// - Used by win conditions (type: "score", score: 1000)
onMatchFound: () => game.rulesEvaluator.addScore(100);

// Use setVariable() for custom game state
// - Game-specific variables (credits, lastWin, freeSpins)
// - UI accesses via gameState.variables['credits']
// - Not tied to built-in win/lose conditions
onSpinComplete: (wins, payout) => {
  game.rulesEvaluator.setVariable('credits', currentCredits + payout);
  game.rulesEvaluator.setVariable('lastWin', payout);
};
```

**Both patterns are correct!** The slot machine uses `setVariable` because it tracks custom variables (`credits`, `lastWin`, `freeSpins`), not the built-in `score`.

---

## 2. System Callback Architecture

### Pattern: Typed Callback Configuration

Define clear callback contracts in your system config:

```typescript
interface SlotMachineConfig {
  // ... other config
  
  callbacks?: {
    onSpinStart?: () => void;
    onReelStopped?: (reelIndex: number, symbols: string[]) => void;
    onSpinComplete?: (result: SpinResult) => void;
    onWinDetected?: (result: WinResult) => void;
    onCascadeComplete?: (cascadeLevel: number) => void;
    onBonusTriggered?: (bonusType: string, data: unknown) => void;
    onFreeSpinsAwarded?: (count: number) => void;
  };
}
```

### Pattern: Safe Callback Invocation

Always use optional chaining when invoking callbacks:

```typescript
// In system code
private notifyWin(result: WinResult): void {
  this.config.callbacks?.onWinDetected?.(result);
}
```

### Pattern: Callback Timing

Invoke callbacks at the RIGHT moment in the game loop:

```typescript
// Match3 example
private async processMatches(): Promise<void> {
  const matches = this.findMatches();
  
  // BEFORE destruction - UI can show "about to clear"
  this.config.callbacks?.onMatchFound?.(matches);
  
  await this.animateDestruction(matches);
  
  // AFTER destruction - update score
  this.config.callbacks?.onMatchCleared?.(matches, this.calculateScore(matches));
  
  await this.dropPieces();
  
  // AFTER cascade settles - check for chain reactions
  this.config.callbacks?.onCascadeComplete?.(this.cascadeLevel);
}
```

---

## 3. State Machine Integration

### Pattern: Implicit vs Explicit States

**Implicit** (simpler, good for linear flows):
```typescript
// Slot machine uses implicit states via flags
private isSpinning = false;
private isEvaluating = false;
private isCascading = false;

spin(): void {
  if (this.isSpinning) return;  // Guard
  this.isSpinning = true;
  // ...
}
```

**Explicit** (better for complex flows):
```typescript
// Use game-level state machines for complex games
type GameState = 'idle' | 'spinning' | 'stopping' | 'evaluating' | 'cascading' | 'bonus';

// In GameDefinition.stateMachines
{
  id: 'gameFlow',
  initialState: 'idle',
  states: [
    { id: 'idle', onEnter: [{ type: 'set_variable', name: 'canSpin', value: 1 }] },
    { id: 'spinning', timeout: 3.0, timeoutTransition: 'stopping' },
    // ...
  ]
}
```

### When to Use Which

| Game Type | Recommended | Reason |
|-----------|-------------|--------|
| Slot Machine | Implicit | Linear flow, few states |
| Match3 | Explicit | Cascades, combos, special moves |
| Ball Sort | Explicit | Pick/drop with visual feedback |
| Memory Match | Explicit | Card flipping, match checking, timeouts |
| Connect 4 | Explicit | Turn-based, game over detection |
| Tetris | Explicit | Falling, locking, clearing phases |
| Card Games | Explicit | Turn phases, player actions |

### Refactored Games (January 2026)

These games were refactored from implicit to explicit state machines:

**memoryMatch**: `idle` → `firstCardFlipped` → `secondCardFlipped` → `checkingMatch` (with 1s timeout)
- Replaced `canFlip` and `flippedCount` variables with state machine
- Timeout transition handles automatic card flip-back

**connect4**: `player1Turn` ↔ `player2Turn` → `gameOver`
- Replaced `gameOver` and `currentPlayer` variables with state machine
- Turn switching now automatic via state machine transitions

---

## 4. Animation & Timing Patterns

### Pattern: Promise-Based Animation Chains

```typescript
async spinReels(): Promise<SpinResult> {
  // Start all reels
  await Promise.all(this.reels.map((reel, i) => 
    this.spinReel(i, this.baseSpinDuration + i * this.reelStopDelay)
  ));
  
  // Evaluate after all stopped
  const result = this.evaluateWins();
  
  // Animate wins
  if (result.wins.length > 0) {
    await this.animateWins(result.wins);
  }
  
  return result;
}
```

### Pattern: Easing for Natural Feel

```typescript
// Slot machine reel stopping uses easeOutBack for bounce
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Match3 piece falling uses easeOutBounce
const easeOutBounce = (t: number): number => {
  // ... bounce easing
};
```

### Pattern: Configurable Timing

```typescript
interface TimingConfig {
  spinDuration: number;      // Base spin time
  reelStopDelay: number;     // Stagger between reels
  winCelebrationTime: number; // How long to show win
  cascadeDelay: number;      // Time between cascades
}

// Allow tuning without code changes
const DEFAULT_TIMING: TimingConfig = {
  spinDuration: 2.0,
  reelStopDelay: 0.3,
  winCelebrationTime: 1.5,
  cascadeDelay: 0.5,
};
```

---

## 5. Win Detection Patterns

### Pattern: Pluggable Win Evaluators

```typescript
// Slot: All-ways evaluation
interface WinEvaluator {
  evaluate(grid: Symbol[][]): WinResult[];
}

class AllWaysEvaluator implements WinEvaluator {
  evaluate(grid: Symbol[][]): WinResult[] {
    // Check all possible paths from left to right
  }
}

class PaylineEvaluator implements WinEvaluator {
  constructor(private paylines: number[][]) {}
  evaluate(grid: Symbol[][]): WinResult[] {
    // Check specific payline patterns
  }
}

// Match3: Connected groups
class Match3Evaluator implements WinEvaluator {
  evaluate(grid: Symbol[][]): WinResult[] {
    // Find groups of 3+ connected same-color
  }
}
```

### Pattern: Wild/Special Symbol Handling

```typescript
interface Symbol {
  id: string;
  isWild?: boolean;
  multiplier?: number;
  substitutesFor?: string[];  // Empty = substitutes for all
  triggersBonus?: string;     // Bonus ID if special
}

// During evaluation
function matchesSymbol(symbol: Symbol, target: Symbol): boolean {
  if (symbol.isWild) {
    return !symbol.substitutesFor || symbol.substitutesFor.includes(target.id);
  }
  return symbol.id === target.id;
}
```

---

## 6. Balance & Economy Patterns

### Pattern: Debit Before Action

```typescript
async spin(): Promise<SpinResult> {
  const betAmount = this.config.betAmount;
  const currentCredits = this.getCredits();
  
  // CHECK before spinning
  if (currentCredits < betAmount) {
    // Auto-refill for casual games, or throw for real gambling
    if (this.config.autoRefill) {
      this.setCredits(this.config.startingCredits);
    } else {
      throw new InsufficientCreditsError();
    }
  }
  
  // DEBIT before action
  this.setCredits(currentCredits - betAmount);
  
  // Perform action
  const result = await this.performSpin();
  
  // CREDIT wins after
  if (result.totalWin > 0) {
    this.setCredits(this.getCredits() + result.totalWin);
  }
  
  return result;
}
```

### Pattern: Win Multiplier Chains

```typescript
interface WinCalculation {
  baseWin: number;
  multipliers: { source: string; value: number }[];
  finalWin: number;
}

function calculateWin(matches: Match[], config: GameConfig): WinCalculation {
  let baseWin = matches.reduce((sum, m) => sum + m.payout, 0);
  
  const multipliers: { source: string; value: number }[] = [];
  
  // Cascade multiplier (Match3, Slots)
  if (config.cascadeLevel > 1) {
    multipliers.push({ source: 'cascade', value: 1 + (config.cascadeLevel - 1) * 0.5 });
  }
  
  // Free spins multiplier (Slots)
  if (config.isFreeSpin && config.freeSpinMultiplier) {
    multipliers.push({ source: 'freeSpin', value: config.freeSpinMultiplier });
  }
  
  // Wild multiplier (if wild was part of win)
  const wildMultiplier = matches.flatMap(m => m.symbols)
    .filter(s => s.isWild && s.multiplier)
    .reduce((max, s) => Math.max(max, s.multiplier!), 1);
  if (wildMultiplier > 1) {
    multipliers.push({ source: 'wild', value: wildMultiplier });
  }
  
  const finalMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  
  return {
    baseWin,
    multipliers,
    finalWin: Math.floor(baseWin * finalMultiplier),
  };
}
```

---

## 7. Testing & QA Patterns

### Pattern: Game Inspector Integration

Use the game-inspector MCP tools for QA:

```typescript
// 1. Open the game
await game_inspector_open({ name: 'slotMachine' });

// 2. Take initial screenshot
await game_inspector_screenshot({ filename: 'initial-state.png' });

// 3. Simulate input
await simulate_input({ type: 'tap', worldX: 0, worldY: -3 }); // Spin button

// 4. Wait for animation
await new Promise(r => setTimeout(r, 3000));

// 5. Get game state
const snapshot = await game_snapshot({ detail: 'high' });

// 6. Verify state
expect(snapshot.variables.credits).toBeLessThan(1000);
```

### Pattern: Deterministic Testing

```typescript
// Set seed for reproducible results
await set_seed({ seed: 12345, enableDeterministic: true });

// Now spins will always produce same results
// Useful for testing specific scenarios:
// - "Test 3-scatter bonus trigger"
// - "Test jackpot win"
// - "Test cascade chain"
```

---

## 8. Common Pitfalls & Solutions

### Pitfall: Callback Scope Issues

```typescript
// WRONG - 'this' is undefined
callbacks: {
  onWinDetected: function(result) {
    this.updateUI(result);  // 'this' is wrong
  }
}

// CORRECT - Arrow function preserves scope
callbacks: {
  onWinDetected: (result) => {
    this.updateUI(result);  // 'this' is component
  }
}
```

### Pitfall: Race Conditions in Cascades

```typescript
// WRONG - Can trigger multiple cascades
async processCascade() {
  const matches = this.findMatches();
  if (matches.length > 0) {
    this.processCascade();  // Recursive without await
  }
}

// CORRECT - Sequential cascade processing
async processCascade() {
  while (true) {
    const matches = this.findMatches();
    if (matches.length === 0) break;
    
    await this.clearMatches(matches);
    await this.dropPieces();
    this.cascadeLevel++;
  }
}
```

### Pitfall: Animation State Desync

```typescript
// WRONG - Animation continues after game reset
startWinAnimation() {
  this.animationInterval = setInterval(() => {
    this.pulseWinningSymbols();
  }, 100);
}

// CORRECT - Track and cleanup animations
startWinAnimation() {
  this.stopAllAnimations();  // Clear previous
  this.animationInterval = setInterval(() => {
    this.pulseWinningSymbols();
  }, 100);
}

dispose() {
  this.stopAllAnimations();
}
```

---

## 9. File Organization Pattern

```
app/lib/game-engine/systems/{gameName}/
├── {GameName}System.ts       # Core game logic
├── slots.ts                  # Slot implementations (if using slot architecture)
├── types.ts                  # TypeScript interfaces
├── constants.ts              # Magic numbers, payouts, timing
└── __tests__/
    └── {GameName}System.test.ts

app/lib/test-games/games/{gameName}/
├── game.ts                   # GameDefinition + TestGameMeta
└── assets/                   # Game-specific assets (if any)
```

---

## 10. Checklist for New Game Systems

- [ ] Define typed config interface with callbacks
- [ ] Use `setVariable()` for all reactive state updates
- [ ] Implement promise-based animation chains
- [ ] Add easing functions for natural feel
- [ ] Create pluggable win evaluators
- [ ] Handle special symbols (wilds, multipliers, bonuses)
- [ ] Implement debit-before-action pattern for economy
- [ ] Add deterministic mode for testing
- [ ] Clean up animations on dispose
- [ ] Write game-inspector based QA tests
- [ ] Document timing configuration
- [ ] Add to test-games registry

---

## 11. System Architecture Notes

### Current System Implementations

| System | Implementation | Location |
|--------|---------------|----------|
| **Match3** | Full system class | `systems/Match3GameSystem.ts` |
| **SlotMachine** | Full system class | `systems/slotMachine/SlotMachineSystem.ts` |
| **Tetris** | Slots only (no system class) | `systems/tetris/slots.ts` |
| **Connect4** | Slots only | `systems/connect4/slots.ts` |
| **Bubble** | Slots only | `systems/bubble/slots.ts` |
| **Memory** | Slots only | `systems/memory/slots.ts` |
| **Flappy** | Slots only | `systems/flappy/slots.ts` |
| **Slide** | Slots only | `systems/slide/slots.ts` |
| **Puyo** | Slots only | `systems/puyo/slots.ts` |

**Full System Class**: Has imperative logic, manages internal state, receives callbacks from GameRuntime, handles animations.

**Slots Only**: Pure functions for game logic (win detection, scoring, etc.). Game behavior is declarative via GameDefinition rules.

### Tetris Integration Gap

Tetris is documented in AI templates (`docs/game-maker/ai-generation/tier-1-templates.md`) but NOT integrated into `GameRuntime.godot.tsx`. Options:

1. **Leave as-is**: Tetris games use declarative rules + behaviors (no system class needed)
2. **Future**: Create `TetrisGameSystem` class if complex animation/state management needed

---

## 12. Animation System Recommendations

### Current State (January 2026)

Animation logic is duplicated between systems:

| System | Animation Pattern |
|--------|-------------------|
| **Match3** | `updateAnimations(dt)` method, `pendingAnimations` array, custom easing |
| **SlotMachine** | Reel animation loop, custom easing, win celebration timers |

### Future Improvement: Shared TweenSystem

Consider extracting common animation logic into a shared system:

```typescript
interface Tween {
  entityId: string;
  property: 'x' | 'y' | 'scaleX' | 'scaleY' | 'angle' | 'alpha';
  from: number;
  to: number;
  duration: number;
  easing: EasingFunction;
  onComplete?: () => void;
}

class TweenSystem {
  private activeTweens: Tween[] = [];
  
  tween(config: Tween): void { /* ... */ }
  update(dt: number): void { /* ... */ }
  cancelAll(entityId?: string): void { /* ... */ }
}
```

**Priority**: LOW - Current approach works, duplication is minimal (2 systems).

---

## References

- Slot Machine Implementation: `app/lib/game-engine/systems/slotMachine/`
- Match3 System: `app/lib/game-engine/systems/Match3GameSystem.ts`
- GameRuntime Integration: `app/lib/game-engine/GameRuntime.godot.tsx`
- Game Inspector Tools: `mcp_game-inspector_*`
- State Machine Examples: `app/lib/test-games/games/ballSort/game.ts`, `dominoChain/game.ts`
- Refactored Games: `memoryMatch/game.ts`, `connect4/game.ts`
