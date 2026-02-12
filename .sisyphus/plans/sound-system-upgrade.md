# Sound System Upgrade & 11Labs Integration

## TL;DR

> **Quick Summary**: Upgrade the Godot Bridge and Game Engine to support runtime pitch shifting (for combo escalations) and background music looping. Add a build-time asset generation script for 11Labs sound effects.
> 
> **Deliverables**:
> - Updated `GodotBridge` protocol (Web & Native) supporting `pitch` and `music`
> - Updated `UIManager.gd` (Godot) implementing pitch scaling and music player
> - Updated `SoundAction` in Game Engine to support `pitch` property
> - New `api/scripts/generate-sound.ts` for 11Labs asset generation
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Bridge Protocol → Godot Implementation → Game Engine

---

## Context

### Original Request
Investigate current sound capabilities and plan for:
1.  **Escalating pitch** (e.g., for combo systems like in Peggle).
2.  **Background music** support.
3.  **11Labs integration** for generating sound assets.

### Interview Summary
**Key Discussions**:
- **Current Architecture**: React Native controls Godot via a Bridge. Godot (`UIManager.gd`) handles actual audio playback using `AudioStreamPlayer`.
- **Pitch Control**: Currently missing. Will be implemented as a runtime `pitch` parameter passed to `playSound`, allowing rules to calculate it (e.g., `base_pitch + (combo * 0.1)`).
- **Music**: Currently missing. Will be implemented as a dedicated `playMusic` method with looping support.
- **11Labs**: Currently missing. Will be implemented as a build-time CLI script (`generate-sound.ts`) mirroring the existing image generation pipeline.
- **Native Audio**: The native `AudioManager` is incomplete/unused. We will rely entirely on the Godot Bridge for cross-platform audio, which is the correct architectural choice.

### Metis Review
**Identified Gaps** (addressed):
- **Pitch Semantics**: Confirmed `pitch` parameter in `SoundAction` allows both authored and runtime-calculated pitch.
- **Music Scope**: MVP is simple looping track (global), not dynamic mixing.
- **Backward Compatibility**: `playSound` updates must be additive (optional pitch param) to not break existing games.
- **Edge Cases**: Concurrent sound limits (Godot handles well, but we'll monitor), 11Labs API failures (retry logic).

---

## Work Objectives

### Core Objective
Enable rich audio experiences (pitch-shifting combos, background music) and streamline sound asset creation via 11Labs.

### Concrete Deliverables
- [ ] `shared/src/types/rules.ts`: Updated `SoundAction` interface
- [ ] `app/lib/godot/types.ts`: Updated `GodotBridge` interface
- [ ] `app/lib/godot/GodotBridge.web.ts` & `.native.ts`: Implemented new methods
- [ ] `godot_project/scripts/bridge/UIManager.gd`: Updated `_js_play_sound` and added `_js_play_music`
- [ ] `api/scripts/generate-sound.ts`: CLI script for 11Labs generation
- [ ] `app/lib/game-engine/rules/actions/SoundActionExecutor.ts`: Pass pitch to bridge

### Definition of Done
- [ ] `playSound` accepts and applies pitch at runtime in Godot
- [ ] `playMusic` starts looping music and handles cross-fading/switching
- [ ] `generate-sound` script creates valid `.mp3` files in `godot_project/sounds/` or `app/assets/`
- [ ] Existing `playSound` calls work without modification

### Must Have
- Runtime pitch shifting (0.5x to 2.0x range)
- Background music looping
- Build-time 11Labs generation
- Cross-platform support (Web + Native)

### Must NOT Have (Guardrails)
- **Runtime 11Labs Generation**: Build-time only for now.
- **Dynamic Music Mixing**: No stems or vertical layering.
- **3D/Positional Audio**: Global audio only for MVP (though Godot supports 2D, we aren't exposing it yet).
- **Native AudioManager Fixes**: Ignore the broken native manager; use Bridge.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL tasks must be verifiable via agent tools (Playwright, Bash, etc.).

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES (TDD for logic, Agent-QA for Bridge/Godot)
- **Framework**: Vitest

### Agent-Executed QA Scenarios

**Scenario: Pitch Shifting Verification**
  Tool: `interactive_bash` (tmux) + Godot Debug Logs
  Preconditions: Godot running in dev mode
  Steps:
    1.  Call `GodotBridge.playSound("thud", 1.0, 1.5)` (pitch 1.5)
    2.  Check Godot logs (stdout) for `[UIManager] Playing sound 'thud' with pitch 1.5`
    3.  Call `GodotBridge.playSound("thud", 1.0, 0.5)` (pitch 0.5)
    4.  Check Godot logs for `pitch 0.5`
  Expected Result: Logs confirm pitch parameter is received and applied.

**Scenario: Music Loop Verification**
  Tool: `interactive_bash` (tmux) + Godot Debug Logs
  Preconditions: Godot running
  Steps:
    1.  Call `GodotBridge.playMusic("music_track", 0.5, true)`
    2.  Check logs for `[UIManager] Starting music 'music_track'`
    3.  Wait 5s
    4.  Call `GodotBridge.playMusic("other_track")`
    5.  Check logs for `[UIManager] Stopping music 'music_track'`, `Starting music 'other_track'`
  Expected Result: Music state transitions logged correctly.

**Scenario: 11Labs Generation**
  Tool: `bash`
  Preconditions: Valid `ELEVENLABS_API_KEY` in env (via `hush`)
  Steps:
    1.  Run `hush run -- npx tsx api/scripts/generate-sound.ts --text "Test sound" --output "test.mp3" --dry-run`
    2.  Assert stdout contains "Would generate..."
  Expected Result: Script runs and parses arguments correctly.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Update Shared Types & Bridge Interfaces (TS)
├── Task 2: Update Godot UIManager (GDScript)
└── Task 4: Create 11Labs Generation Script (TS)

Wave 2 (Integration):
└── Task 3: Implement Bridge Logic (Web/Native) & Game Engine Executor
```

### Dependency Matrix
| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Types) | None | 3 | 2, 4 |
| 2 (Godot) | None | 3 | 1, 4 |
| 3 (Bridge) | 1, 2 | None | 4 |
| 4 (11Labs) | None | None | 1, 2, 3 |

---

## TODOs

- [x] 1. Update Shared Types and Godot Bridge Interface

  **What to do**:
  - Update `SoundAction` in `shared/src/types/rules.ts` to add `pitch?: number`.
  - Update `GodotBridge` interface in `app/lib/godot/types.ts`:
    - `playSound(resource: string, volume?: number, pitch?: number): void`
    - `playMusic(resource: string, volume?: number, loop?: boolean): void`
    - `stopMusic(): void`
  - Update `ActionExecutor` types if needed.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3

  **References**:
  - `app/lib/game-engine/rules/types.ts` - Action definitions
  - `app/lib/godot/types.ts` - Bridge definition

  **Acceptance Criteria**:
  - [ ] `SoundAction` has optional `pitch` property
  - [ ] `GodotBridge` interface includes `playMusic`, `stopMusic`, and updated `playSound`
  - [ ] `pnpm tsc --noEmit` passes (might fail on implementers until Task 3)

- [x] 2. Update Godot UIManager (GDScript)

  **What to do**:
  - Modify `godot_project/scripts/bridge/UIManager.gd`:
    - Update `_js_play_sound` to accept 3rd arg (pitch).
    - Update `play_sound` to accept pitch and set `pitch_scale` on player.
    - Implement `_js_play_music(args)` -> `play_music`.
    - Implement `_js_stop_music(args)` -> `stop_music`.
    - Implement `play_music`: handle `_current_music_player`, stop existing, create new `AudioStreamPlayer`, set loop, play.
    - Implement `stop_music`: fade out or stop current player.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` (Godot expert)
  - **Skills**: [`godot`]

  **Parallelization**:
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3

  **References**:
  - `godot_project/scripts/bridge/UIManager.gd` - Existing implementation

  **Acceptance Criteria**:
  - [ ] `_js_play_sound` parses 3 arguments
  - [ ] `play_sound` applies `pitch_scale`
  - [ ] `play_music` manages a persistent `AudioStreamPlayer` instance
  - [ ] `stop_music` correctly stops the music
  - [ ] Log messages added for verification

- [x] 3. Implement Bridge Logic & Game Engine Executor

  **What to do**:
  - Update `app/lib/godot/GodotBridge.web.ts`:
    - Implement `playMusic`, `stopMusic`.
    - Update `playSound` to pass pitch.
  - Update `app/lib/godot/GodotBridge.native.ts`:
    - Same updates (ensure native bridge call signature matches).
  - Update `app/lib/game-engine/rules/actions/SoundActionExecutor.ts`:
    - Extract `pitch` from action and pass to `context.playSound`.
  - Update `app/lib/game-engine/BehaviorContext.ts` (RuleContext) definition of `playSound`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`, `react-native`]

  **Parallelization**:
  - **Parallel Group**: Wave 2
  - **Depends On**: Task 1, 2

  **References**:
  - `app/lib/godot/GodotBridge.web.ts`
  - `app/lib/game-engine/rules/actions/SoundActionExecutor.ts`

  **Acceptance Criteria**:
  - [ ] `GodotBridge.web.ts` calls `getGodotBridge().playMusic(...)`
  - [ ] `SoundActionExecutor` passes pitch from action to context
  - [ ] TDD: Create test for `SoundActionExecutor` verifying pitch passing

- [x] 4. Create 11Labs Generation Script

  **What to do**:
  - Create `api/scripts/generate-sound.ts`.
  - Use `elevenlabs` API (via fetch or SDK).
  - Inputs: `--text` (prompt), `--output` (filename), `--game` (game ID).
  - Logic: Fetch sound, save to `godot_project/sounds/` (or asset path).
  - Use `hush` for API key `ELEVENLABS_API_KEY`.

  **Recommended Agent Profile**:
  - **Category**: `scripting`
  - **Skills**: [`typescript`, `node`]

  **Parallelization**:
  - **Parallel Group**: Wave 1 (Independent)

  **References**:
  - `api/scripts/generate-assets.ts` (Follow this pattern!)
  - `api/src/ai/pipeline/` (Asset pipeline types)

  **Acceptance Criteria**:
  - [ ] Script runs via `hush run -- npx tsx ...`
  - [ ] Fetches from 11Labs API
  - [ ] Saves file to correct location
  - [ ] Handles errors gracefully

---

## Commit Strategy
- `feat(audio): update bridge interfaces for pitch and music`
- `feat(godot): update UIManager for pitch and music`
- `feat(engine): implement sound action pitch support`
- `feat(tools): add 11labs sound generation script`

## Success Criteria
- [ ] `pnpm tsc` passes
- [ ] Godot logs show correct pitch and music calls
- [ ] `generate-sound.ts` produces files
