# Echo Echo

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3–8
> **Category**: Audio / Remix

## Concept
The local radio station's sound effects library has been deleted! Players must use their phones to record "Foley" (sound effects) and "Voice Lines" to fill in the gaps of a chaotic radio drama.

## Core Mechanic
Mic Recording → Clip Editing → Playback. Players record 3-second clips based on prompts. These clips are then "Remixed" by the game engine into a final animated scene. Between rounds, players play "Volume-as-Input" mini-games (e.g., "Scream to launch a rocket").

## Game Flow
1. **Lobby** → Mic check and "Voice Warm-up."
2. **Recording Phase** → Players get 3 prompts (e.g., "A wet slap," "A surprised ghost," "A robot dying").
3. **The Remix** → The engine takes Player A's "Slap," Player B's "Ghost," and Player C's "Robot" and puts them into a 30-second script.
4. **The Screening** → The scene plays back with the recorded audio. Players vote on the "Best Performance."
5. **Finale: The Mega-Mix** → All recordings from the game are mashed into a high-speed musical track.

## Scoring System
- **Performance Quality**: Audience votes (1-10).
- **Timing Bonus**: Points for clips that perfectly match the animation's "Hit-points."
- **Mini-game Points**: Points earned during the "Volume-as-Input" transitions.
- **Remix King**: Awarded to the player whose sounds were used the most in the final Mega-Mix.

## Content Requirements
- 200+ Sound Effect Prompts.
- 50+ Radio Drama Scripts (Short animations with "Audio Slots").

## Technical Implementation
### Template Changes
- `AudioClipEntity`: Stores `blobUrl` and `duration`.
- `AudioSlot`: A placeholder in a `Scene` that triggers a specific `AudioClip`.

### New Infrastructure
- **Mic-First Clip Editor**: A mobile UI that handles `MediaRecorder` API, basic trimming, and "Gain" adjustment.
- **Playback Pipeline**: A system to sync Godot animations with dynamic TypeScript-provided audio buffers.
- **Volume-as-Input Stack**: A real-time analyzer that converts mic decibel levels into `InputEvent` values (e.g., `0.0` to `1.0`).

### Input Types Used
- `AudioRecord`: 3-5 second PCM/AAC recording.
- `VolumeLevel`: Real-time amplitude tracking.

### Estimated Phases
- `LOBBY`
- `RECORDING_PHASE`
- `MINI_GAME_TRANSITION`
- `SCREENING_PHASE`
- `VOTING`
- `MEGA_MIX`
- `RESULTS`

## Dependencies
- `AudioRecordingSystem` (New)
- `AnimationSyncEngine` (New)

## Design Notes
- Hearing your friends' ridiculous noises in a "professional" radio drama is instant comedy.
- Pitfall: Background noise/Bad mics. Solution: "Noise Gate" filtering on the client-side and a "Re-record" button.
- Uniqueness: First game to use the microphone as a primary creative tool.
