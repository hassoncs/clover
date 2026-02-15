# The Foley Artist

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 3-8
> **Category**: Sound, Comedy, Judging

## Concept
You are a sound designer for a low-budget movie studio. The director (the Judge) gives you a scene, and you have to find the perfect two-sound sequence to bring it to life. Expect a lot of farts and slide whistles.

## Core Mechanic
A judge picks a prompt (e.g., "A graceful swan landing in a dumpster"). Players are given a random list of 6 sound effects. They must pick two sounds and arrange them in a sequence (Sound A then Sound B). The judge listens to all sequences and picks a winner.

## Game Flow
1. **Lobby** → Players test their "Microphone" (avatar).
2. **The Prompt**: The Judge picks one of three prompts.
3. **The Mix**: Players preview sounds on their phone and pick two.
4. **The Screening**: The game plays the sequences one by one on the main screen using `ElevenLabs` or a local SFX library.
5. **The Verdict**: The Judge picks their favorite.

## Scoring System
- **Judge's Choice**: +1000 points.
- **First to 3 Wins**: The game ends when someone reaches a win threshold.
- **Audience Choice**: +200 points for the "funniest" (voted by non-judges).

## Content Requirements
- Content type: `SoundPrompt` (New schema: `{ prompt: string }`).
- Volume needed: 200+ prompts.
- Generation approach: AI-generated scenarios.
- **SFX Library**: A curated list of 100+ short, funny sound effects.

## Technical Implementation
### Template Changes
Needs to handle audio playback sequencing. The `reveal` phase needs to trigger `AudioManager.play()` for two sounds in a row with a slight delay.

### New Infrastructure
- **Audio Preview**: Ability for players to hear sounds on their *phone* before submitting (requires low-latency audio streaming or pre-loading).
- **ElevenLabs Integration**: Use `api/src/services/ElevenLabsService.ts` for dynamic SFX if needed, but a static library is safer for latency.

### Input Types Used
- `choice`: For prompt selection and sound picking.

### Estimated Phases
`lobby` → `prompt_selection` → `sound_mixing` → `screening` → `judging` → `winner`

## Dependencies
- `ElevenLabsService.ts` or a robust local `AudioManager`.
- Low-latency audio playback on mobile.

## Design Notes
Sound is an underutilized medium in party games. The juxtaposition of a serious prompt with a ridiculous sound (like a "boing" followed by a "chainsaw") is inherently funny.
