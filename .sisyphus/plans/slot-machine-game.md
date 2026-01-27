# Slot Machine Game System for Slopcade

## Context

### Original Request
Build a slot machine game for the Slopcade game engine with:
1. Standard slot machine mechanics - grid of symbols, spin button, line/column/row matching for wins
2. Proper spin animation (rolling/spinning reels effect)
3. A system similar to other "slotted game templates" (like Match3, Tetris) to make it reusable
4. Customizable bonus games and gamified mechanics

### Interview Summary
**Key Discussions**:
- **Grid**: 3x5 video slots (5 reels, 3 visible rows) - modern standard
- **Animation**: Position-based cycling (symbols move vertically with wrap-around)
- **Win System**: All-Ways (243 ways) - any matching symbols left-to-right win, min 3 to match
- **Extensibility**: Full slot system with pluggable implementations like Match3
- **Bonuses**: Free spins (unlimited retriggers), wilds, cascading wins, pick bonus game
- **Currency**: Credits with betting, auto-refill when empty
- **Theme**: Classic fruits (Cherry, Lemon, Orange, Plum, Bell, BAR, 7, Wild, Scatter/Star)
- **Testing**: Manual QA with documented verification steps

**Research Findings**:
- Match3System uses state machine pattern with phases (idle, swapping, checking, clearing, falling, spawning)
- Slot system has `SlotContract` and `SlotImplementation` patterns in `shared/src/systems/slots/`
- GridMoveAction supports `animate: true` with `duration` for smooth transitions
- State machines support game-level (no owner) for managing game phases
- Spinning wheel example demonstrates physics-based rotation (not used, but informed animation approach)

### Guardrails (Must NOT)
- NO RTP calculation or gambling compliance features
- NO persistent credits across sessions (reset on restart)
- NO jackpots or progressive systems
- NO multiplayer
- NO real money integration
- Pick bonus outcomes are predetermined (picks are just visual reveal)
- NO auto-spin feature (keep manual spin only)

---

## Work Objectives

### Core Objective
Create a reusable SlotMachineConfig system with pluggable slot implementations, supporting 3x5 video slots with all-ways wins, credits/betting, and bonus features (free spins, wilds, cascading wins, pick bonus), demonstrated via a classic fruits themed sample game.

### Concrete Deliverables
1. `SlotMachineConfig` type definition in `shared/src/types/GameDefinition.ts`
2. `SlotMachineSystem` runtime class in `app/lib/game-engine/systems/slotMachine/`
3. Slot implementations in `app/lib/game-engine/systems/slotMachine/slots.ts`
4. Sample game at `app/lib/test-games/games/slotMachine/game.ts`
5. Asset config at `api/scripts/game-configs/slotMachine/assets.config.ts`

### Definition of Done
- [x] Slot machine spins with smooth position-based animation
- [x] All-ways win detection correctly identifies 3+ matching symbols left-to-right
- [x] Wild symbols substitute for any non-scatter symbol
- [x] Credits decrease on spin, increase on win
- [x] Free spins trigger from 3+ scatter symbols
- [x] Cascading wins remove matched symbols and drop new ones
- [x] Pick bonus triggers and awards prizes
- [x] Sample game runs without errors in browser

### Must Have
- SlotMachineConfig type with reels, symbols, payouts, bonuses
- State machine for game phases (idle, spinning, evaluating, cascading, bonus)
- Position-based reel animation with staggered stops
- All-ways (243 ways) win evaluation
- Wild symbol substitution
- Credits/betting system with variables
- Free spins with unlimited retriggers
- Cascading wins (remove matched, drop new)
- Pick bonus game
- 9 symbol templates (8 fruits + scatter)

### Must NOT Have (Guardrails)
- RTP/paytable balancing calculations
- Credit persistence between sessions
- Jackpots or progressive systems
- Auto-spin functionality
- Multiplayer support
- Real money/payment integration
- Complex pick bonus mini-games (keep simple item selection)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test available)
- **User wants tests**: Manual QA only
- **Framework**: N/A - manual verification

### Manual QA Approach
Each TODO includes detailed verification procedures using browser interaction. Evidence required:
- Screenshots saved to `.sisyphus/evidence/slot-machine/`
- Console logs for state transitions
- Visual confirmation of animations

---

## Task Flow

```
Task 1 (Types) → Task 2 (Slots) → Task 3 (System Core) → Task 4 (Animation)
                                                              ↓
Task 8 (Pick Bonus) ← Task 7 (Cascading) ← Task 6 (Free Spins) ← Task 5 (Wins/Wilds)
         ↓
    Task 9 (Sample Game) → Task 10 (Assets) → Task 11 (Integration Test)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2 | Type definitions can be written before/with slot contracts |

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1, 2 | System needs types and slot contracts |
| 4 | 3 | Animation needs system structure |
| 5 | 4 | Win detection needs reels to evaluate |
| 6 | 5 | Free spins triggers on scatter wins |
| 7 | 5 | Cascading needs win detection |
| 8 | 3 | Pick bonus is separate state, can parallel with 6-7 |
| 9 | 5, 6, 7, 8 | Sample game needs all features |
| 10 | 9 | Assets defined after game structure |
| 11 | 9, 10 | Integration needs everything |

---

## TODOs

### Phase 1: Foundation

- [x] 1. Define SlotMachineConfig type

  **What to do**:
  - Add `SlotMachineConfig` interface to `shared/src/types/GameDefinition.ts`
  - Add `slotMachine?: SlotMachineConfig` to `GameDefinition` interface
  - Define types for: reels, symbols, payouts, bonus triggers
  - Export types from shared package

  **Type structure**:
  ```typescript
  interface SlotMachineConfig {
    gridId: string;
    reels: number;           // 5
    rows: number;            // 3
    cellSize: number;        // Size of each symbol cell
    symbolTemplates: string[]; // Template IDs for symbols
    reelStrips: number[][];  // Symbol indices per reel [reel][position]
    wildSymbolIndex?: number;
    scatterSymbolIndex?: number;
    payouts: PayoutConfig[];
    freeSpins?: FreeSpinsConfig;
    cascading?: boolean;
    pickBonus?: PickBonusConfig;
    spinDuration?: number;
    reelStopDelay?: number;  // Stagger between reel stops
  }
  ```

  **Must NOT do**:
  - Add RTP or house edge fields
  - Add persistence/save fields
  - Add jackpot configuration

  **Parallelizable**: YES (with Task 2)

  **References**:
  
  **Pattern References**:
  - `shared/src/types/GameDefinition.ts:375-397` - Match3Config and TetrisConfig patterns to follow
  - `shared/src/types/GameDefinition.ts:399-433` - GameDefinition interface where to add slotMachine field

  **Type References**:
  - `shared/src/types/common.ts` - Vec2, Bounds types if needed
  - `shared/src/systems/grid/types.ts` - GridDefinition pattern for similar config

  **Acceptance Criteria**:
  - [ ] `SlotMachineConfig` interface exists in GameDefinition.ts
  - [ ] `GameDefinition.slotMachine` optional field exists
  - [ ] Types exported from `@slopcade/shared`
  - [ ] `tsc --noEmit` passes in shared package

  **Commit**: YES
  - Message: `feat(shared): add SlotMachineConfig type definition`
  - Files: `shared/src/types/GameDefinition.ts`
  - Pre-commit: `pnpm --filter @slopcade/shared build`

---

- [x] 2. Create slot contracts and implementations

  **What to do**:
  - Create `app/lib/game-engine/systems/slotMachine/slots.ts`
  - Define slot contracts: symbolWeighting, winDetection, payoutCalculation, bonusTrigger, feedback
  - Implement standard implementations for each
  - Register implementations in global slot registry

  **Slot contracts**:
  ```typescript
  const SLOT_MACHINE_CONTRACTS = {
    symbolWeighting: { name: 'symbolWeighting', kind: 'pure', description: 'Selects symbol for reel position' },
    winDetection: { name: 'winDetection', kind: 'pure', description: 'Finds all-ways wins on grid' },
    payoutCalculation: { name: 'payoutCalculation', kind: 'pure', description: 'Calculates payout for wins' },
    bonusTrigger: { name: 'bonusTrigger', kind: 'policy', description: 'Checks for bonus triggers' },
    feedback: { name: 'feedback', kind: 'hook', description: 'Visual/audio feedback via tags' },
  };
  ```

  **Must NOT do**:
  - Implement RTP-balanced weighting
  - Add real gambling logic

  **Parallelizable**: YES (with Task 1)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/systems/match3/slots.ts:1-343` - Complete slot pattern to follow (contracts, implementations, registration)
  - `shared/src/systems/slots/types.ts:7-34` - SlotContract and SlotImplementation interfaces

  **API References**:
  - `shared/src/systems/slots/SlotRegistry.ts` - How to register implementations
  - `shared/src/systems/slots/index.ts` - Exports to use

  **Acceptance Criteria**:
  - [ ] `slots.ts` file created with 5 slot contracts
  - [ ] Standard implementations for each contract
  - [ ] `registerSlotMachineSlotImplementations()` function exports
  - [ ] No TypeScript errors

  **Commit**: YES
  - Message: `feat(engine): add slot machine slot contracts and implementations`
  - Files: `app/lib/game-engine/systems/slotMachine/slots.ts`, `app/lib/game-engine/systems/slotMachine/index.ts`

---

- [x] 3. Create SlotMachineSystem core runtime

  **What to do**:
  - Create `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`
  - Implement state machine: idle, spinning, evaluating, awarding, cascading, bonus_free_spins, bonus_pick
  - Create ReelState tracking (symbols, positions, animation state)
  - Implement spin initiation (set reel targets, start animation)
  - Wire up to GameRuntime integration point

  **State machine phases**:
  - `idle`: Waiting for spin button
  - `spinning`: Reels animating
  - `evaluating`: Checking for wins after all reels stop
  - `awarding`: Showing win animations, adding credits
  - `cascading`: Removing wins, dropping new symbols (if enabled)
  - `bonus_free_spins`: Free spin mode active
  - `bonus_pick`: Pick bonus screen active

  **Must NOT do**:
  - Implement animation yet (Task 4)
  - Implement win detection yet (Task 5)
  - Add auto-spin

  **Parallelizable**: NO (depends on 1, 2)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/systems/Match3GameSystem.ts` - State machine pattern, update loop, bridge integration
  - `shared/src/systems/state-machine/types.ts:1-56` - StateMachineDefinition types

  **API References**:
  - `app/lib/test-games/games/gemCrush/game.ts:44` - createGridConfig usage
  - `shared/src/systems/grid/index.ts` - Grid utilities (gridCellToWorld, etc.)

  **Integration References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx` - Where systems get instantiated (search for Match3)

  **Acceptance Criteria**:
  - [ ] `SlotMachineSystem.ts` class created
  - [ ] State enum with all phases defined
  - [ ] `update(dt)` method handles state transitions
  - [ ] `startSpin()` public method initiates spin
  - [ ] Integrates with GodotBridge for entity position updates
  - [ ] Manual verification: Import system, instantiate, call startSpin() - logs state transitions

  **Commit**: YES
  - Message: `feat(engine): add SlotMachineSystem core with state machine`
  - Files: `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

### Phase 2: Animation

- [x] 4. Implement reel spinning animation

  **What to do**:
  - Add position-based symbol cycling in SlotMachineSystem
  - Implement vertical scrolling with wrap-around
  - Add staggered reel stopping (left-to-right with delay)
  - Use easing for start (accelerate) and stop (decelerate with bounce)
  - Sync positions to Godot via `bridge.setPosition()`

  **Animation approach**:
  - Each reel has a "virtual strip" of symbols (longer than visible)
  - During spin: continuously cycle positions downward
  - On stop: target a specific position, ease to it
  - Wrap symbols from bottom to top for seamless loop

  **Timing**:
  - Spin duration: ~2 seconds total
  - Reel stop stagger: ~0.3 seconds between reels
  - Stop easing: ease-out-back for slight bounce effect

  **Must NOT do**:
  - Use physics/revolute joints (decided against)
  - Pre-render blur frames (keep dynamic)

  **Parallelizable**: NO (depends on 3)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/systems/Match3GameSystem.ts` - `pendingAnimations` array pattern, `easeOutQuad` usage
  - `app/lib/game-engine/CameraSystem.ts` - `lerp` and easing functions

  **API References**:
  - `app/lib/godot/types.ts` - GodotBridge interface, setPosition method
  - `shared/src/systems/grid/types.ts:35-43` - GridMoveAction with animate flag

  **Animation References**:
  - `app/app/examples/spinning_wheel.tsx` - Angular velocity patterns (for reference, not direct use)

  **Acceptance Criteria**:
  - [ ] Symbols scroll vertically during spin
  - [ ] Reels stop one-by-one from left to right
  - [ ] Stop animation has smooth deceleration
  - [ ] No visual jumps or glitches at wrap-around
  - [ ] Manual verification in browser:
    - Open slot machine game
    - Click spin button
    - Screenshot: All 5 reels spinning
    - Screenshot: First 3 reels stopped, last 2 spinning
    - Screenshot: All reels stopped, symbols aligned

  **Commit**: YES
  - Message: `feat(engine): implement slot machine reel spinning animation`
  - Files: `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

### Phase 3: Game Logic

- [x] 5. Implement all-ways win detection and wild substitution

  **What to do**:
  - Implement `allWaysWinDetection` slot implementation
  - Check each symbol type for left-to-right chains
  - Wild symbols count as any non-scatter symbol
  - Return array of wins with: symbol, count, positions, payout multiplier
  - Add payout calculation based on symbol and count

  **Algorithm**:
  ```
  For each symbol type (excluding scatter):
    ways = 1
    positions = []
    For each reel (left to right):
      count matching symbols (including wilds) in this column
      if count == 0: break (chain ended)
      ways *= count
      add positions
    If chain length >= 3:
      Add to wins: { symbol, length, ways, positions }
  ```

  **Payout table** (example - configurable):
  - 3 of a kind: 0.5x - 2x bet
  - 4 of a kind: 2x - 10x bet
  - 5 of a kind: 5x - 50x bet
  - Wilds: highest multiplier

  **Must NOT do**:
  - Balance payouts for specific RTP
  - Add scatter to regular win detection

  **Parallelizable**: NO (depends on 4)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/systems/match3/slots.ts:61-112` - `findHorizontalAndVerticalMatches` algorithm pattern
  - `app/lib/game-engine/systems/match3/slots.ts:226-245` - `cascadeMultiplierScoring` pattern

  **Type References**:
  - `shared/src/types/rules.ts:238-242` - ScoreAction for adding points/credits

  **Acceptance Criteria**:
  - [ ] 3+ matching symbols from left detected as win
  - [ ] Wild substitutes for any symbol except scatter
  - [ ] Multiple simultaneous wins detected (e.g., cherries AND lemons)
  - [ ] Ways calculation correct (e.g., 2 cherries col1 * 1 cherry col2 * 3 cherries col3 = 6 ways)
  - [ ] Payout calculated based on symbol value and ways
  - [ ] Manual verification:
    - Spin until win occurs
    - Console log shows detected wins
    - Credits increase by expected payout

  **Commit**: YES
  - Message: `feat(engine): implement all-ways win detection with wild substitution`
  - Files: `app/lib/game-engine/systems/slotMachine/slots.ts`, `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

- [x] 6. Implement free spins bonus

  **What to do**:
  - Detect 3+ scatter symbols anywhere on reels
  - Transition to `bonus_free_spins` state
  - Track free spins remaining as game variable
  - Auto-spin during free spins (no bet deducted)
  - Re-trigger: 3+ scatters during free spins adds more spins
  - Return to idle when free spins exhausted

  **Free spins awards**:
  - 3 scatters: 10 free spins
  - 4 scatters: 15 free spins
  - 5 scatters: 20 free spins

  **State flow**:
  ```
  evaluating → (3+ scatters) → bonus_free_spins → spinning → evaluating → 
  (wins) → awarding → (more scatters?) → add spins → spinning → ...
  (no spins left) → idle
  ```

  **Must NOT do**:
  - Add multiplier increases during free spins (keep simple)
  - Add special wild behavior during free spins

  **Parallelizable**: NO (depends on 5)

  **References**:

  **Pattern References**:
  - `shared/src/systems/state-machine/types.ts:8-15` - StateDefinition with onEnter actions
  - `app/lib/test-games/games/game2048/game.ts:127-137` - Game variables pattern

  **API References**:
  - `shared/src/types/rules.ts:327-332` - SetVariableAction for tracking spins

  **Acceptance Criteria**:
  - [ ] 3 scatters triggers free spins
  - [ ] Free spin count shown in UI (use variableDisplays)
  - [ ] Spins auto-play without bet deduction
  - [ ] Re-trigger adds more spins
  - [ ] Returns to idle when spins exhausted
  - [ ] Manual verification:
    - Manually trigger 3+ scatters (or use debug)
    - Verify free spins count displays
    - Watch auto-spins play out
    - Verify no credits deducted during free spins

  **Commit**: YES
  - Message: `feat(engine): implement free spins bonus with unlimited retriggers`
  - Files: `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

- [x] 7. Implement cascading wins

  **What to do**:
  - After win detection, mark winning symbols for removal
  - Animate removal (fade/shrink effect)
  - Drop remaining symbols down (position-based animation)
  - Spawn new random symbols from top
  - Re-evaluate for additional wins
  - Repeat until no wins found

  **Cascade flow**:
  ```
  evaluating → (wins found) → awarding → cascading → 
    remove symbols → drop symbols → spawn new → evaluating → 
    (more wins) → awarding → cascading → ...
    (no wins) → idle (or bonus if triggered)
  ```

  **Animation timing**:
  - Remove: 0.3s fade out
  - Drop: 0.2s per row
  - Settle: 0.1s

  **Must NOT do**:
  - Add multiplier increases per cascade (keep simple)

  **Parallelizable**: YES (can be done alongside Task 6, both depend on Task 5)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/systems/Match3GameSystem.ts` - Cascading/falling logic in match3
  - `app/lib/test-games/games/gemCrush/game.ts:36-41` - `sys.match3:matched` tag for fade effect

  **API References**:
  - `shared/src/types/behavior.ts:39` - DestructionEffect types (fade, shrink)
  - `shared/src/systems/grid/types.ts:53-58` - GridClearAction with effect

  **Acceptance Criteria**:
  - [ ] Winning symbols removed with fade animation
  - [ ] Remaining symbols drop to fill gaps
  - [ ] New symbols spawn from top
  - [ ] Cascade continues if new wins form
  - [ ] Manual verification:
    - Get a win
    - Watch symbols fade
    - Watch symbols drop
    - Check for re-evaluation
    - Screenshot cascade sequence

  **Commit**: YES
  - Message: `feat(engine): implement cascading wins for slot machine`
  - Files: `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

- [x] 8. Implement pick bonus game

  **What to do**:
  - Add trigger condition (e.g., 3 bonus symbols - could be same as scatter or separate)
  - Create `bonus_pick` state in state machine
  - Display pick grid (3x3 items to choose from)
  - Pre-determine all prizes at trigger time (standard slot practice)
  - Player taps to reveal prizes
  - Award total and return to base game

  **Pick structure**:
  ```typescript
  interface PickBonusConfig {
    gridRows: number;      // 3
    gridCols: number;      // 3
    itemTemplate: string;  // Visual template for pick items
    prizes: number[];      // Pre-defined prize values
    endTrigger: 'collect' | 'reveal_all' | 'find_end'; // How bonus ends
  }
  ```

  **Implementation**:
  - For 'collect': Keep picking until "COLLECT" item found
  - Pre-shuffle prizes at trigger time
  - Store reveal state per item
  - Sum prizes and award when complete

  **Must NOT do**:
  - Make it a real mini-game (keep simple pick-and-reveal)
  - Add skill-based elements

  **Parallelizable**: YES (independent of 6, 7 - only depends on 3)

  **References**:

  **Pattern References**:
  - `app/lib/test-games/games/game2048/game.ts:198-208` - Entity grid generation pattern
  - `shared/src/types/rules.ts:62-69` - TapTrigger for item selection

  **API References**:
  - `shared/src/types/rules.ts:220-226` - SpawnAction for creating pick items
  - `shared/src/types/rules.ts:353-356` - ShuffleListAction for randomizing prizes

  **Acceptance Criteria**:
  - [ ] Bonus symbol triggers pick bonus
  - [ ] Pick grid displays 9 items
  - [ ] Tapping item reveals prize
  - [ ] Prizes predetermined (same picks = same reveals on replay)
  - [ ] Total awarded when "COLLECT" found
  - [ ] Returns to base game after bonus
  - [ ] Manual verification:
    - Trigger pick bonus
    - Screenshot pick grid
    - Tap items, verify reveals
    - Verify credit award at end

  **Commit**: YES
  - Message: `feat(engine): implement pick bonus game for slot machine`
  - Files: `app/lib/game-engine/systems/slotMachine/SlotMachineSystem.ts`

---

### Phase 4: Integration

- [x] 9. Create sample slot machine game

  **What to do**:
  - Create `app/lib/test-games/games/slotMachine/game.ts`
  - Define GameDefinition with slotMachine config
  - Create 9 symbol templates (Cherry, Lemon, Orange, Plum, Bell, BAR, 7, Wild, Scatter)
  - Define reel strips with symbol distribution
  - Configure payouts, free spins, cascading, pick bonus
  - Add UI button for spin
  - Add credits and bet display

  **Game configuration**:
  ```typescript
  slotMachine: {
    gridId: 'slot_grid',
    reels: 5,
    rows: 3,
    cellSize: 1.5,
    symbolTemplates: ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'wild', 'scatter'],
    reelStrips: [...], // 5 arrays of 20-30 symbol indices each
    wildSymbolIndex: 7,
    scatterSymbolIndex: 8,
    payouts: [...],
    freeSpins: { scatterCount: [10, 15, 20] },
    cascading: true,
    pickBonus: { trigger: 'bonus', gridRows: 3, gridCols: 3 },
    spinDuration: 2000,
    reelStopDelay: 300,
  }
  ```

  **UI elements**:
  - Spin button (tap trigger)
  - Credits display (variable)
  - Bet selector (1, 5, 10, 25)
  - Win display (shows last win)
  - Free spins counter (when active)

  **Must NOT do**:
  - Add auto-spin button
  - Add bet max button

  **Parallelizable**: NO (depends on 5, 6, 7, 8)

  **References**:

  **Pattern References**:
  - `app/lib/test-games/games/gemCrush/game.ts:1-280` - Full game definition pattern with match3
  - `app/lib/test-games/games/game2048/game.ts:1-339` - Game with variables and input

  **API References**:
  - `@/lib/registry/types` - TestGameMeta export
  - `shared/src/types/GameDefinition.ts:399-433` - Full GameDefinition interface

  **Asset References**:
  - `app/lib/test-games/games/gemCrush/game.ts:106-124` - Template definition pattern

  **Acceptance Criteria**:
  - [ ] Game file created and exports metadata + default
  - [ ] 9 symbol templates defined with distinct colors
  - [ ] Reel strips defined for all 5 reels
  - [ ] Spin button triggers spin
  - [ ] Credits display updates
  - [ ] Bet selector works
  - [ ] Manual verification:
    - Navigate to slot machine in app
    - Game loads without errors
    - All symbols visible
    - Spin button works
    - Credits update on win/loss

  **Commit**: YES
  - Message: `feat(games): add classic fruits slot machine sample game`
  - Files: `app/lib/test-games/games/slotMachine/game.ts`

---

- [x] 10. Create asset generation config

  **What to do**:
  - Create `api/scripts/game-configs/slotMachine/assets.config.ts`
  - Define 9 entity assets for symbols
  - Define background asset
  - Define title_hero asset
  - Register in game-configs/index.ts

  **Symbol assets**:
  - Cherry: Red cherries with stem
  - Lemon: Yellow lemon
  - Orange: Orange citrus
  - Plum: Purple plum
  - Bell: Golden liberty bell
  - BAR: Classic BAR text symbol
  - Seven: Lucky red 7
  - Wild: Golden WILD text with sparkles
  - Scatter: Golden star

  **Style**: Cartoon, glossy, slot machine aesthetic

  **Must NOT do**:
  - Generate assets in this task (just config)

  **Parallelizable**: YES (can parallel with Task 9)

  **References**:

  **Pattern References**:
  - `api/scripts/game-configs/gemCrush/assets.config.ts` - Asset config pattern
  - `api/scripts/game-configs/index.ts` - How to register configs

  **API References**:
  - `api/src/ai/pipeline/types.ts` - GameAssetConfig, AssetDefinition types

  **Acceptance Criteria**:
  - [ ] Asset config file created
  - [ ] 9 symbol assets defined
  - [ ] Background and title assets defined
  - [ ] Registered in index.ts
  - [ ] `npx tsx api/scripts/generate-game-assets.ts slotMachine --dry-run` succeeds

  **Commit**: YES
  - Message: `feat(assets): add slot machine asset generation config`
  - Files: `api/scripts/game-configs/slotMachine/assets.config.ts`, `api/scripts/game-configs/index.ts`

---

- [x] 11. Integration testing and polish

  **What to do**:
  - Run full integration test of all features
  - Test edge cases: zero credits, max bet, multiple cascades
  - Verify all state transitions work correctly
  - Test free spins with retriggers
  - Test pick bonus completion
  - Fix any bugs discovered
  - Add console logging for debugging

  **Test scenarios**:
  1. Basic spin with no win
  2. Basic spin with win
  3. Spin with wild substitution win
  4. Cascade chain (2+ cascades)
  5. Free spins trigger
  6. Free spins retrigger
  7. Pick bonus trigger and completion
  8. Zero credits → auto refill
  9. Bet change between spins

  **Must NOT do**:
  - Add features not in spec
  - Optimize performance (do in future)

  **Parallelizable**: NO (final task)

  **References**:

  **All previous task files** - Review for integration

  **Acceptance Criteria**:
  - [ ] All 9 test scenarios pass
  - [ ] No console errors during gameplay
  - [ ] State machine never gets stuck
  - [ ] Credits never go negative (refills at 0)
  - [ ] Manual verification:
    - Play 20+ spins covering all scenarios
    - Document any bugs found
    - Screenshot final working game

  **Commit**: YES
  - Message: `test(slotMachine): complete integration testing and bug fixes`
  - Files: Any files fixed during testing

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(shared): add SlotMachineConfig type definition` | GameDefinition.ts | `pnpm build` |
| 2 | `feat(engine): add slot machine slot contracts` | slots.ts, index.ts | tsc passes |
| 3 | `feat(engine): add SlotMachineSystem core` | SlotMachineSystem.ts | tsc passes |
| 4 | `feat(engine): implement reel spinning animation` | SlotMachineSystem.ts | visual test |
| 5 | `feat(engine): implement all-ways win detection` | slots.ts, System.ts | visual test |
| 6 | `feat(engine): implement free spins bonus` | SlotMachineSystem.ts | visual test |
| 7 | `feat(engine): implement cascading wins` | SlotMachineSystem.ts | visual test |
| 8 | `feat(engine): implement pick bonus game` | SlotMachineSystem.ts | visual test |
| 9 | `feat(games): add slot machine sample game` | game.ts | game loads |
| 10 | `feat(assets): add slot machine asset config` | assets.config.ts | dry-run |
| 11 | `test(slotMachine): integration testing` | various | full playtest |

---

## Success Criteria

### Verification Commands
```bash
# Type check
pnpm --filter @slopcade/shared build
pnpm tsc --noEmit

# Run dev server
pnpm dev

# Asset config validation
npx tsx api/scripts/generate-game-assets.ts slotMachine --dry-run
```

### Final Checklist
- [x] All "Must Have" features present
- [x] All "Must NOT Have" items absent
- [x] Sample game loads and plays without errors
- [x] All bonus features working (free spins, cascading, pick)
- [x] Credits system working with auto-refill
- [x] Slot system reusable (can make different themed slots)
