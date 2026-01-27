# New Slot Games - Implementation Checklist

## Quick Reference

### Commands
```bash
# Run tests
bun test shared/src/validation    # Validation tests
bun test shared/src/systems       # System/slot tests
bun test app/lib/game-engine      # Game engine tests

# TypeScript check
cd shared && npx tsc --noEmit
cd api && npx tsc --noEmit

# Start dev servers
pnpm dev                          # Starts all services
```

### Key Reference Files
```
# Slot architecture
app/lib/game-engine/systems/match3/slots.ts    # Match3 pattern
app/lib/game-engine/systems/tetris/slots.ts    # Tetris pattern
shared/src/systems/slots/types.ts              # SlotContract, SlotImplementation

# Validation
shared/src/validation/playable.ts              # validatePlayable()

# AI integration
api/src/ai/classifier.ts                       # GAME_TYPE_KEYWORDS
api/src/ai/generator.ts                        # buildGenerationPrompt()
api/src/ai/templates/match3.ts                 # Template pattern
api/src/ai/templates/tetris.ts                 # Template pattern

# Types
shared/src/types/GameDefinition.ts             # Config interfaces
```

---

## Phase 1: Quick Wins

### Game 1: Flappy Bird
- [ ] Create `app/lib/game-engine/systems/flappy/slots.ts`
  - [ ] Define `FLAPPY_SLOT_CONTRACTS` (jumpForce, obstacleSpawner, scoring, difficultyScaling)
  - [ ] Implement `standard_jump`, `floaty_jump`
  - [ ] Implement `random_pipes`, `progressive_pipes`
  - [ ] Implement `point_per_pipe`
  - [ ] Implement `linear_difficulty`, `stepped_difficulty`
  - [ ] Create `registerFlappySlotImplementations()`
- [ ] Create `app/lib/game-engine/systems/flappy/index.ts`
- [ ] Add `FlappyConfig` to `shared/src/types/GameDefinition.ts`
- [ ] Add `validateFlappyPlayability()` to `shared/src/validation/playable.ts`
- [ ] Add Flappy keywords to `api/src/ai/classifier.ts`
- [ ] Add Flappy instructions to `api/src/ai/generator.ts`
- [ ] Create `api/src/ai/templates/flappy.ts`
- [ ] Create test game `app/lib/test-games/games/flappyBird/game.ts`
- [ ] Verify: `bun test` passes, `tsc --noEmit` passes

### Game 2: Memory Match
- [ ] Create `app/lib/game-engine/systems/memory/slots.ts`
  - [ ] Define `MEMORY_SLOT_CONTRACTS` (cardFlipping, matchLogic, cardShuffler, timerRule)
  - [ ] Implement `two_card_flip`
  - [ ] Implement `pair_match`, `triple_match`
  - [ ] Implement `fisher_yates_shuffle`
  - [ ] Implement `no_timer`, `countdown_timer`, `penalty_timer`
  - [ ] Create `registerMemorySlotImplementations()`
- [ ] Create `app/lib/game-engine/systems/memory/index.ts`
- [ ] Add `MemoryConfig` to `shared/src/types/GameDefinition.ts`
- [ ] Add `validateMemoryPlayability()` to `shared/src/validation/playable.ts`
- [ ] Add Memory keywords to `api/src/ai/classifier.ts`
- [ ] Add Memory instructions to `api/src/ai/generator.ts`
- [ ] Create `api/src/ai/templates/memory.ts`
- [ ] Create test game `app/lib/test-games/games/memoryMatch/game.ts`
- [ ] Verify: `bun test` passes, `tsc --noEmit` passes

### Game 3: 2048
- [ ] Create `app/lib/game-engine/systems/slide/slots.ts`
  - [ ] Define `SLIDE_SLOT_CONTRACTS` (slideRule, mergeLogic, tileSpawner, scoring)
  - [ ] Implement `four_direction_slide`
  - [ ] Implement `standard_2048_merge`, `threes_merge`
  - [ ] Implement `random_2_or_4`, `always_2`
  - [ ] Implement `merge_value_scoring`
  - [ ] Create `registerSlideSlotImplementations()`
- [ ] Create `app/lib/game-engine/systems/slide/index.ts`
- [ ] Add `SlideConfig` to `shared/src/types/GameDefinition.ts`
- [ ] Add `validateSlidePlayability()` to `shared/src/validation/playable.ts`
- [ ] Add 2048 keywords to `api/src/ai/classifier.ts`
- [ ] Add 2048 instructions to `api/src/ai/generator.ts`
- [ ] Create `api/src/ai/templates/slide.ts`
- [ ] Create test game `app/lib/test-games/games/slide2048/game.ts`
- [ ] Verify: `bun test` passes, `tsc --noEmit` passes

---

## Phase 2: Match3 Reuse

### Game 4: Bubble Shooter
- [ ] Create `app/lib/game-engine/systems/bubble/slots.ts`
  - [ ] Define `BUBBLE_SLOT_CONTRACTS` (aimingRule, bubbleAttachment, matchDetection, popAnimation, ceilingDescent)
  - [ ] **REUSE** Match3 matchDetection logic (flood-fill variant)
  - [ ] Implement aiming, attachment, ceiling mechanics
  - [ ] Create `registerBubbleSlotImplementations()`
- [ ] Add `BubbleConfig` to `shared/src/types/GameDefinition.ts`
- [ ] Add validation, classifier, generator, template
- [ ] Create test game
- [ ] Verify tests pass

### Game 5: Connect 4
- [ ] Create `app/lib/game-engine/systems/connect4/slots.ts`
  - [ ] Define `CONNECT4_SLOT_CONTRACTS` (dropRule, winDetection, turnManager, aiOpponent)
  - [ ] **REUSE** Match3 matchDetection for 4-in-a-row check
  - [ ] Implement drop, turn, basic AI
  - [ ] Create `registerConnect4SlotImplementations()`
- [ ] Add `Connect4Config` to `shared/src/types/GameDefinition.ts`
- [ ] Add validation, classifier, generator, template
- [ ] Create test game
- [ ] Verify tests pass

---

## Phase 3: System Combination

### Game 6: Puyo Puyo
- [ ] Create `app/lib/game-engine/systems/puyo/slots.ts`
  - [ ] Define `PUYO_SLOT_CONTRACTS` (pairRotation, dropSpeed, matchDetection, chainScoring, garbageSystem)
  - [ ] **REUSE** Tetris rotationRule for pair rotation
  - [ ] **REUSE** Tetris dropSpeed
  - [ ] **REUSE** Match3 matchDetection (4+ connected flood-fill)
  - [ ] Implement chain scoring
  - [ ] Create `registerPuyoSlotImplementations()`
- [ ] Add `PuyoConfig` to `shared/src/types/GameDefinition.ts`
- [ ] Add validation, classifier, generator, template
- [ ] Create test game
- [ ] Verify tests pass
- [ ] **Validate**: Puyo proves Tetris + Match3 can combine!

---

## Validation Constraints Quick Reference

| Game | Key Constraints |
|------|-----------------|
| **Flappy** | jumpForce: 5-15, gravity: 10-30, pipeGap: 2-5, pipeSpeed: 2-8 |
| **Memory** | pairs: 4-20, flipDuration: 0.1-1.0 |
| **2048** | gridSize: 3-6, targetTile: power of 2 (128-8192) |
| **Bubble** | rows: 8-20, cols: 6-12, minMatch: 3-5 |
| **Connect4** | rows: 5-8, cols: 6-9, winLength: 3-5 |
| **Puyo** | rows: 10-16, cols: 5-8, colors: 3-5, minMatch: 4-6 |

---

## Classifier Keywords Quick Reference

| Game | Keywords (weight 10) | Keywords (weight 15) |
|------|---------------------|---------------------|
| **Flappy** | flap, tap to fly, flying game, pipe game | flappy bird, flappy clone |
| **Memory** | memory game, card matching, flip cards, concentration | memory match, pairs game |
| **2048** | sliding tiles, number puzzle, merge tiles | 2048, slide puzzle |
| **Bubble** | bubble game, shoot bubbles, pop bubbles | bubble shooter, puzzle bobble |
| **Connect4** | connect four, four in a row, drop discs | connect 4, tic tac toe variant |
| **Puyo** | falling blobs, chain combos, puzzle battle | puyo puyo, dr mario |

---

## Done When

- [ ] 6 game systems implemented with slots
- [ ] All tests pass: `bun test`
- [ ] TypeScript compiles: `tsc --noEmit`
- [ ] Each game has: slots.ts, index.ts, config type, validation, classifier keywords, generator prompt, AI template, test game
- [ ] Puyo Puyo successfully combines Tetris + Match3 slots
