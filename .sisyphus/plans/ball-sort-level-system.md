# Ball Sort Level System Enhancement

## TL;DR

> **Quick Summary**: Implement a complete level progression system for Ball Sort with persistence, generic dialog component, tube image generation, and improved level 1 difficulty.
> 
> **Deliverables**:
> - GameProgressManager class + useGameProgress hook
> - GameDialog component (reusable across games)
> - Updated puzzle generator (easier level 1, smart extra tubes)
> - Generated tube/bottle images
> - Level complete screen with stats and "Next Level" button
> - Reset Level / Previous Level buttons in pause menu
> - Persistent progress across sessions
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 6 → Task 8

---

## Context

### Original Request
User requested comprehensive improvements to Ball Sort:
1. Remove level 1 hack and make generator produce easier first levels
2. Smart extra tubes (only add if needed, not always)
3. Generate tube/bottle images to replace black boxes
4. Implement real level system with persistence
5. Show "next level" dialog on win with stats
6. Add reset/previous level buttons
7. Track and persist highest level reached

### Interview Summary
**Key Decisions**:
- Tube style: Colorful bottles (cartoon aesthetic)
- UI system: Build generic GameDialog now (future-proof)
- Button placement: Pause menu only (keep game screen clean)
- Level 1: Use generator with 2 colors, difficulty 1 (~3-5 moves)
- Extra tubes: Start with 1 extra for levels 1-3, 2 for levels 4+
- Persistence: Full GameProgressManager system (reusable)
- Testing: Tests after implementation

**Research Findings**:
- Level 1 hack at `game.ts:178-179` bypasses puzzle generator
- `BallSortProgressSchema` exists in `shared/src/types/progress.ts`
- Progress runtime code does NOT exist - `app/lib/game-engine/progress/` is empty
- Storage utility exists at `app/lib/utils/storage.ts`
- Win overlay at `GameRuntime.godot.tsx:1743-1761`
- Pause overlay at `GameRuntime.godot.tsx:1707-1727`

### Metis Review
**Identified Gaps** (addressed):
- Reset button scope clarified: "Reset Level" restarts current level, separate "Reset Progress" for full reset
- Previous level disabled on level 1 (not hidden)
- Smart extra tubes: Simple heuristic (1 extra for 1-3, 2 for 4+), no forward solver
- Tube images: Single generic bottle style, not per-color variants
- Stats display: Time + Moves + Best Time/Moves

---

## Work Objectives

### Core Objective
Enable Ball Sort to have true level progression with persistent save/load, level advancement on win, and level navigation controls.

### Concrete Deliverables
- `app/lib/game-engine/progress/GameProgressManager.ts` - Core persistence class
- `app/lib/game-engine/progress/useGameProgress.ts` - React hook
- `app/lib/game-engine/progress/index.ts` - Exports
- `app/components/game/GameDialog.tsx` - Generic dialog component
- Updated `app/lib/test-games/games/ballSort/game.ts` - Level system integration
- Updated `app/lib/test-games/games/ballSort/puzzleGenerator.ts` - Smart extra tubes
- Updated `api/scripts/game-configs/ballSort/assets.config.ts` - Tube asset definition
- Generated tube image at `generated/ballSort/tube.png`
- Updated `GameRuntime.godot.tsx` - Dialog integration and pause menu buttons

### Definition of Done
- [ ] `bun test` passes with new progress tests
- [ ] Player can complete level 1, see win dialog with stats, click "Next Level"
- [ ] Player on level 5 can refresh page and start on level 5
- [ ] Pause menu shows "Reset Level" and "Previous Level" (disabled on level 1)
- [ ] Tubes render as colorful bottles (not black boxes)
- [ ] Level 1 uses 2 colors, ~3-5 moves to solve
- [ ] `tsc --noEmit` passes

### Must Have
- Persistence saves currentLevel and highestLevelCompleted
- Win dialog shows time and move count
- "Next Level" button advances level and regenerates puzzle
- "Reset Level" button in pause menu restarts current level
- Previous level disabled (not hidden) on level 1
- Tube images generated via asset pipeline

### Must NOT Have (Guardrails)
- Level select screen/grid
- Star ratings or scoring beyond time/moves
- Forward solver for "smart" extra tubes
- Per-color tube image variants
- Cloud sync / multi-device
- Achievements / unlockables
- Sound effects or haptic feedback
- Complex animations (beyond simple fade)
- Analytics tracking

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **User wants tests**: YES (Tests after implementation)
- **Framework**: bun test / vitest

### Test Strategy
Tests will be added after each component is implemented:
- GameProgressManager: load/save/validate/migrate tests
- useGameProgress: hook behavior tests
- Puzzle generator: level config tests

### Manual Verification (Critical)
Each task includes specific commands and expected outputs.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Build GameProgressManager class
├── Task 2: Build GameDialog component
└── Task 3: Generate tube images

Wave 2 (After Wave 1):
├── Task 4: Build useGameProgress hook [depends: 1]
├── Task 5: Update puzzle generator (level 1, extra tubes)
└── Task 6: Integrate tube images into Ball Sort [depends: 3]

Wave 3 (After Wave 2):
├── Task 7: Integrate persistence into Ball Sort [depends: 4]
├── Task 8: Add win dialog with "Next Level" [depends: 2, 7]
└── Task 9: Add pause menu buttons [depends: 7]

Wave 4 (Final):
└── Task 10: Add tests and verify [depends: 8, 9]

Critical Path: Task 1 → Task 4 → Task 7 → Task 8
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 7 | 2, 3 |
| 2 | None | 8 | 1, 3 |
| 3 | None | 6 | 1, 2 |
| 4 | 1 | 7 | 5, 6 |
| 5 | None | 7 | 4, 6 |
| 6 | 3 | None | 4, 5 |
| 7 | 4, 5 | 8, 9 | None |
| 8 | 2, 7 | 10 | 9 |
| 9 | 7 | 10 | 8 |
| 10 | 8, 9 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | delegate_task(category="unspecified-high", ..., run_in_background=true) for each |
| 2 | 4, 5, 6 | dispatch parallel after Wave 1 completes |
| 3 | 7, 8, 9 | dispatch after dependencies complete |
| 4 | 10 | final verification task |

---

## TODOs

- [ ] 1. Build GameProgressManager Class

  **What to do**:
  - Create `app/lib/game-engine/progress/` directory
  - Implement `GameProgressManager.ts` with:
    - Constructor accepting `PersistenceConfig<T>`
    - `loadProgress(): Promise<LoadProgressResult<T>>` - Load from storage, validate, migrate
    - `saveProgress(progress?: Partial<T>): Promise<boolean>` - Merge and save
    - `resetProgress(): Promise<void>` - Reset to defaults
    - `getProgress(): T` - Get current in-memory progress
  - Use `app/lib/utils/storage.ts` for storage operations
  - Validate against schema, handle corrupted data (reset to defaults)
  - Create `index.ts` with exports

  **Must NOT do**:
  - Add encryption or compression
  - Add cloud sync hooks
  - Add version migration beyond schema version check

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: System infrastructure component requiring careful implementation
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understands game engine patterns and storage utilities

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4, Task 7
  - **Blocked By**: None (can start immediately)

  **References**:
  - `shared/src/types/progress.ts:85-100` - `PersistenceConfig` interface definition
  - `shared/src/types/progress.ts:109-121` - `LoadProgressResult` interface
  - `app/lib/utils/storage.ts:1-51` - Storage utility with getStorageItem/setStorageItem
  - `docs/persistence-implementation-summary.md:133-141` - Documented GameProgressManager spec
  - `docs/game-progress-persistence-system.md:266-410` - Detailed implementation spec

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/game-engine/progress/GameProgressManager.ts`
  - [ ] File created: `app/lib/game-engine/progress/index.ts`
  - [ ] `tsc --noEmit` → PASS (no type errors)
  - [ ] Manual verification: Import works from `@/lib/game-engine/progress`

  **Commit**: YES
  - Message: `feat(game-engine): add GameProgressManager for game progress persistence`
  - Files: `app/lib/game-engine/progress/*.ts`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 2. Build GameDialog Component

  **What to do**:
  - Create `app/components/game/GameDialog.tsx`
  - Props interface:
    ```typescript
    interface GameDialogProps {
      visible: boolean;
      title: string;
      message?: string;
      stats?: Array<{ label: string; value: string }>;
      buttons: Array<{
        label: string;
        onPress: () => void;
        variant?: 'primary' | 'secondary';
      }>;
      onClose?: () => void;
    }
    ```
  - Use React Native Modal or overlay pattern
  - Simple fade-in animation using Animated API
  - Match existing button styles from `GameRuntime.godot.tsx:1849-1863`
  - Export from `app/components/game/index.ts`

  **Must NOT do**:
  - Add theming support (will add later with 9-patch)
  - Add complex animations (slide, bounce)
  - Add backdrop press to dismiss (explicit buttons only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with animations
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React Native UI patterns and styling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 8
  - **Blocked By**: None (can start immediately)

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:1707-1761` - Existing overlay patterns
  - `app/lib/game-engine/GameRuntime.godot.tsx:1824-1863` - Overlay and button styles
  - `app/components/game/index.ts` - Export pattern for game components

  **Acceptance Criteria**:
  - [ ] File created: `app/components/game/GameDialog.tsx`
  - [ ] Updated: `app/components/game/index.ts` with GameDialog export
  - [ ] `tsc --noEmit` → PASS
  - [ ] Using Playwright: Navigate to a test page, render dialog, verify title/buttons visible, click works

  **Commit**: YES
  - Message: `feat(components): add generic GameDialog component`
  - Files: `app/components/game/GameDialog.tsx`, `app/components/game/index.ts`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 3. Generate Tube Images

  **What to do**:
  - Update `api/scripts/game-configs/ballSort/assets.config.ts`:
    - Add `tube` entity spec with colorful bottle style
    - Shape: tall vertical container (box: width ~1.4, height ~5.0)
    - Description: "colorful glass bottle or test tube container, cartoon style, fun casual game aesthetic"
  - Run asset generation: `npx tsx api/scripts/generate-game-assets.ts ballSort --asset=tube`
  - Verify image at `generated/ballSort/tube.png`

  **Must NOT do**:
  - Generate per-color tube variants
  - Generate separate wall/bottom pieces (single unified bottle)

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: Creative asset generation task
  - **Skills**: [`slopcade-asset-generation`]
    - `slopcade-asset-generation`: Asset pipeline knowledge

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `api/scripts/game-configs/ballSort/assets.config.ts:1-50` - Existing ball sort asset config
  - `api/scripts/game-configs/physicsStacker/assets.config.ts:1-80` - Example entity specs
  - `.opencode/skills/slopcade-asset-generation.md` - Asset generation patterns

  **Acceptance Criteria**:
  - [ ] Config updated: `assets.config.ts` has `tube` entity spec
  - [ ] Command: `npx tsx api/scripts/generate-game-assets.ts ballSort --asset=tube` → completes
  - [ ] File exists: `api/debug-output/ballSort/tube/` contains generated files
  - [ ] Image visible at CDN URL (after R2 upload)

  **Commit**: YES
  - Message: `feat(assets): add tube bottle asset config for Ball Sort`
  - Files: `api/scripts/game-configs/ballSort/assets.config.ts`
  - Pre-commit: None (asset generation is separate)

---

- [ ] 4. Build useGameProgress Hook

  **What to do**:
  - Create `app/lib/game-engine/progress/useGameProgress.ts`
  - Interface:
    ```typescript
    interface UseGameProgressResult<T> {
      progress: T;
      isLoading: boolean;
      error: Error | null;
      saveProgress: (updates?: Partial<T>) => Promise<boolean>;
      resetProgress: () => Promise<void>;
      reloadProgress: () => Promise<void>;
    }
    
    function useGameProgress<T>(config: PersistenceConfig<T>): UseGameProgressResult<T>
    function useGameProgressFromDefinition<T>(definition: GameDefinition): UseGameProgressResult<T> | null
    ```
  - Use GameProgressManager internally
  - Handle loading state and errors
  - Auto-load on mount
  - Export from index.ts

  **Must NOT do**:
  - Add optimistic updates
  - Add conflict resolution
  - Add debouncing (let caller control save timing)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: React hook with async state management
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understands game engine hooks

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `app/lib/game-engine/progress/GameProgressManager.ts` - Manager class (Task 1)
  - `docs/game-progress-persistence-system.md:460-575` - Hook specification
  - `shared/src/types/progress.ts:85-100` - PersistenceConfig type

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/game-engine/progress/useGameProgress.ts`
  - [ ] Updated: `index.ts` exports both functions
  - [ ] `tsc --noEmit` → PASS
  - [ ] Manual verification: Hook can be used in test component

  **Commit**: YES
  - Message: `feat(game-engine): add useGameProgress hook for React integration`
  - Files: `app/lib/game-engine/progress/useGameProgress.ts`, `app/lib/game-engine/progress/index.ts`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 5. Update Puzzle Generator for Level 1 and Extra Tubes

  **What to do**:
  - Update `getPuzzleConfigForLevel()` in `game.ts`:
    - Level 1: `numColors: 2, difficulty: 1`
    - Levels 2-3: `numColors: 3, difficulty: 1`
    - Levels 4+: Current formula (numColors scales with level)
  - Update extra tubes logic:
    - Levels 1-3: `extraTubes: 1`
    - Levels 4+: `extraTubes: 2`
  - Remove level 1 hack (lines 178-179 in game.ts)
  - Verify puzzles are solvable with new configs

  **Must NOT do**:
  - Implement forward solver
  - Add adaptive difficulty beyond simple heuristics

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Game logic changes requiring verification
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understands puzzle generation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None (can start in Wave 2)

  **References**:
  - `app/lib/test-games/games/ballSort/game.ts:49-63` - `getPuzzleConfigForLevel` function
  - `app/lib/test-games/games/ballSort/game.ts:175-184` - Level 1 hack to remove
  - `app/lib/test-games/games/ballSort/puzzleGenerator.ts:172-261` - Puzzle generation algorithm

  **Acceptance Criteria**:
  - [ ] Level 1 hack removed (no hardcoded tubeLayout)
  - [ ] Level 1 config: numColors=2, extraTubes=1, difficulty=1
  - [ ] Level 4 config: extraTubes=2
  - [ ] `bun test` → existing tests still pass
  - [ ] Manual: Load level 1, puzzle is solvable in ~3-5 moves

  **Commit**: YES
  - Message: `feat(ballSort): improve level 1 difficulty and smart extra tubes`
  - Files: `app/lib/test-games/games/ballSort/game.ts`
  - Pre-commit: `bun test`

---

- [ ] 6. Integrate Tube Images into Ball Sort

  **What to do**:
  - Update tube template in `game.ts`:
    - Change `visual.type` from `rect` to `image`
    - Set `imageUrl` to generated tube asset URL
    - Keep dimensions consistent with current TUBE_WIDTH/TUBE_HEIGHT
  - Add fallback for image load failure (keep rect as backup)
  - Test rendering with new images

  **Must NOT do**:
  - Change tube physics/collision behavior
  - Add animation to tubes

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual asset integration
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Game entity visual config

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 3)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `app/lib/test-games/games/ballSort/game.ts:268-284` - Current tube template
  - `app/lib/test-games/games/slopeggle/game.ts:85-95` - Example image visual usage
  - `shared/src/types/visual.ts:ImageVisualComponent` - Image visual type

  **Acceptance Criteria**:
  - [ ] Tube template uses `type: 'image'` with generated URL
  - [ ] `tsc --noEmit` → PASS
  - [ ] Using Playwright: Open Ball Sort, verify tubes render as bottles (not black boxes)

  **Commit**: YES
  - Message: `feat(ballSort): use generated tube bottle images`
  - Files: `app/lib/test-games/games/ballSort/game.ts`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 7. Integrate Persistence into Ball Sort

  **What to do**:
  - Update `app/app/test-games/[id].tsx` to use persistence for Ball Sort:
    - Use `useGameProgressFromDefinition` hook
    - On game load, regenerate for `progress.currentLevel`
    - Pass `onLevelComplete` callback to game runtime
  - Create `createBallSortGame(progress.currentLevel)` when loading
  - Handle progress.isLoading state

  **Must NOT do**:
  - Change persistence config in game.ts (already correct)
  - Add loading screen beyond existing pattern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration of multiple systems
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Game runtime patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (after Wave 2)
  - **Parallel Group**: Wave 3 (sequential with 8, 9)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `app/app/test-games/[id].tsx:1-197` - Test game runner page
  - `app/lib/test-games/games/ballSort/game.ts:149-169` - Persistence config
  - `app/lib/game-engine/progress/useGameProgress.ts` - Hook (Task 4)

  **Acceptance Criteria**:
  - [ ] Ball Sort loads at `progress.currentLevel` on page load
  - [ ] `tsc --noEmit` → PASS
  - [ ] Manual: Complete level 1, refresh page, should start at level 2

  **Commit**: YES
  - Message: `feat(ballSort): integrate game progress persistence`
  - Files: `app/app/test-games/[id].tsx`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 8. Add Win Dialog with "Next Level" and Stats

  **What to do**:
  - Modify `GameRuntime.godot.tsx` to show GameDialog on win (for games with persistence):
    - Title: "Level Complete!" or "🎉 Level X Complete!"
    - Stats: Time (formatted), Moves
    - Buttons: "Next Level" (primary), "Replay Level" (secondary)
  - "Next Level" handler:
    - Save progress with currentLevel + 1, update highestLevelCompleted
    - Trigger game regeneration via callback
  - "Replay Level" handler:
    - Trigger restart without advancing level
  - Calculate elapsed time from game variables

  **Must NOT do**:
  - Show dialog for games without persistence
  - Add star ratings or complex scoring

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI integration with game flow
  - **Skills**: [`slopcade-game-engine`, `frontend-ui-ux`]
    - Both needed for game + UI integration

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9, after Task 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 2, 7

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:1743-1761` - Current win overlay
  - `app/components/game/GameDialog.tsx` - Dialog component (Task 2)
  - `app/lib/test-games/games/ballSort/game.ts:210-215` - Game variables (moveCount, startTime)

  **Acceptance Criteria**:
  - [ ] Win state shows GameDialog (not old overlay)
  - [ ] Stats show time and move count
  - [ ] "Next Level" advances currentLevel and saves progress
  - [ ] "Replay Level" restarts without advancing
  - [ ] `tsc --noEmit` → PASS
  - [ ] Using Playwright: Win level 1, see dialog, click "Next Level", verify level 2 loads

  **Commit**: YES
  - Message: `feat(game-engine): add level complete dialog with stats and next level`
  - Files: `app/lib/game-engine/GameRuntime.godot.tsx`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 9. Add Pause Menu Buttons (Reset Level, Previous Level)

  **What to do**:
  - Update pause overlay in `GameRuntime.godot.tsx`:
    - Add "Reset Level" button (restarts current level)
    - Add "Previous Level" button (goes to currentLevel - 1)
    - Disable "Previous Level" when currentLevel === 1
  - "Reset Level" handler: Call handleRestart
  - "Previous Level" handler:
    - Update progress with currentLevel - 1
    - Regenerate game for new level
  - Only show level buttons for games with persistence config

  **Must NOT do**:
  - Add level select grid
  - Add "Reset All Progress" in pause menu (too destructive for quick access)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI additions to existing overlay
  - **Skills**: [`slopcade-game-engine`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8, after Task 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Task 7

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:1707-1727` - Pause overlay
  - `app/lib/game-engine/GameRuntime.godot.tsx:1327-1373` - handleRestart function

  **Acceptance Criteria**:
  - [ ] Pause menu shows "Reset Level" and "Previous Level" buttons
  - [ ] "Previous Level" disabled on level 1
  - [ ] "Reset Level" restarts current level
  - [ ] "Previous Level" goes back one level
  - [ ] `tsc --noEmit` → PASS
  - [ ] Using Playwright: On level 3, pause, click "Previous Level", verify level 2 loads

  **Commit**: YES
  - Message: `feat(game-engine): add level navigation to pause menu`
  - Files: `app/lib/game-engine/GameRuntime.godot.tsx`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 10. Add Tests and Final Verification

  **What to do**:
  - Add tests for GameProgressManager:
    - `app/lib/game-engine/progress/__tests__/GameProgressManager.test.ts`
    - Test: load returns defaults when no data
    - Test: save persists and load retrieves
    - Test: corrupted data resets to defaults
  - Add tests for puzzle generator changes:
    - Level 1 config is numColors=2, extraTubes=1
  - Run full verification:
    - `tsc --noEmit` passes
    - `bun test` passes
    - Manual playthrough of levels 1-5

  **Must NOT do**:
  - Add integration tests for full game flow (manual verification sufficient)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Testing and verification
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Test writing patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Parallel Group**: Wave 4
  - **Blocks**: None (final)
  - **Blocked By**: Tasks 8, 9

  **References**:
  - `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts` - Existing test patterns
  - `app/lib/game-engine/progress/GameProgressManager.ts` - Class to test

  **Acceptance Criteria**:
  - [ ] Test file created: `GameProgressManager.test.ts`
  - [ ] `bun test` → ALL PASS
  - [ ] `tsc --noEmit` → PASS
  - [ ] Manual playthrough: Complete levels 1-5, refresh, resume at level 6

  **Commit**: YES
  - Message: `test(game-engine): add GameProgressManager tests`
  - Files: `app/lib/game-engine/progress/__tests__/GameProgressManager.test.ts`
  - Pre-commit: `bun test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(game-engine): add GameProgressManager` | progress/*.ts | `tsc --noEmit` |
| 2 | `feat(components): add GameDialog component` | GameDialog.tsx | `tsc --noEmit` |
| 3 | `feat(assets): add tube bottle asset config` | assets.config.ts | N/A |
| 4 | `feat(game-engine): add useGameProgress hook` | useGameProgress.ts | `tsc --noEmit` |
| 5 | `feat(ballSort): improve level 1 difficulty` | game.ts | `bun test` |
| 6 | `feat(ballSort): use tube bottle images` | game.ts | `tsc --noEmit` |
| 7 | `feat(ballSort): integrate persistence` | [id].tsx | `tsc --noEmit` |
| 8 | `feat(game-engine): add level complete dialog` | GameRuntime.godot.tsx | `tsc --noEmit` |
| 9 | `feat(game-engine): add pause menu level nav` | GameRuntime.godot.tsx | `tsc --noEmit` |
| 10 | `test(game-engine): add progress tests` | *.test.ts | `bun test` |

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit                    # Expected: no errors
bun test                        # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Level 1 uses 2 colors, ~3-5 moves
- [ ] Extra tubes: 1 for levels 1-3, 2 for 4+
- [ ] Tubes render as colorful bottles
- [ ] Win shows dialog with stats
- [ ] "Next Level" advances and saves
- [ ] Pause has "Reset Level" / "Previous Level"
- [ ] Progress persists across refresh
- [ ] All tests pass
