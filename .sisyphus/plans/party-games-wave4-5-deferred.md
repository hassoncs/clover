# Party Games Wave 4+5 (Deferred - Infrastructure Required)

## TL;DR

> **Status**: DEFERRED - Requires infrastructure development
> 
> These games require new infrastructure components before implementation can proceed.

---

## Blocked Games Summary

### Wave 3 Games (6 games - BLOCKED)

| Game | Blocker | Infrastructure Needed |
|------|---------|----------------------|
| fortune-wheel | Wheel physics | Wheel component with slice mapping, deterministic spin |
| oddity-appraiser | AI image pipeline | Scenario.com integration for "surreal junk" images |
| clue-builder | Real-time guess stream | WebSocket-based real-time message relay |
| matchmaker-grid | Matching UI | Drag-drop grid assignment component |
| drawful-animate | Onion skinning | 2-frame drawing with ghost overlay |
| sound-slam | Audio input | MicInput component for audio recording |

### Wave 4 Games (23 games - BLOCKED)

All Wave 4 games require one or more of:
- **MicInput**: pitch-factory, punchline-ferry, sound-remix-show, defuse-hotline
- **Investment UI**: pitch-factory, auction-arena, bracket-bet
- **Token Composer**: borrowed-words, chaos-edit
- **Screw Mechanic**: snark-quiz-show
- **Survey Engine**: survey-sleuth
- **Hidden Role System**: persona-outlier, alien-audit
- **High-Concurrency Input**: truth-swarm

### Wave 5 Games (5 games - BLOCKED)

All Wave 5 games require major infrastructure:
- **RPG Framework**: trivia-quest (persistent run state, class/ability system)
- **Concurrent Task Scheduler**: family-frenzy (multi-lane async tasks)
- **Real-time Physics Board**: drop-sort (shared physics, low-latency input)

---

## Infrastructure Build Order

### Priority 1: MicInput Component (HIGHEST VALUE)
**Unlocks**: sound-slam, pitch-factory, punchline-ferry, family-frenzy, sound-remix-show, defuse-hotline

**Implementation**:
- `MicInput.tsx` component (React Native)
- Audio recording with visual feedback
- Upload to R2 for storage
- Integration with `PartyInputType` as `"mic"`
- Server-side audio retrieval and playback sync

### Priority 2: Wheel Component
**Unlocks**: fortune-wheel

**Implementation**:
- Godot-based wheel with physics
- Slice mapping to player IDs
- Deterministic spin seed for sync
- Visual spin animation

### Priority 3: Token Composer
**Unlocks**: borrowed-words, clue-builder (partial)

**Implementation**:
- Drag-drop word selection UI
- Word pool + sentence area
- Attribution tracking

### Priority 4: Investment/Budget UI
**Unlocks**: pitch-factory, auction-arena, bracket-bet

**Implementation**:
- Slider-based budget allocation
- Fixed total, distribute across options
- Real-time total display

### Priority 5: Matching/Grid UI
**Unlocks**: matchmaker-grid, persona-outlier

**Implementation**:
- Drag-drop player-to-role assignment
- Consensus calculation
- Group formation logic

---

## TODOs

- [ ] Build MicInput component (Priority 1)
- [ ] Build Wheel component (Priority 2)
- [ ] Build Token Composer (Priority 3)
- [ ] Build Investment UI (Priority 4)
- [ ] Build Matching/Grid UI (Priority 5)
- [ ] Implement remaining Wave 3 games after infra
- [ ] Implement Wave 4 games after infra
- [ ] Implement Wave 5 games after infra

---

## Dependencies

- This plan depends on infrastructure being built first
- See individual game specs in `.sisyphus/plans/party-games/04-*.md` and `05-*.md`
