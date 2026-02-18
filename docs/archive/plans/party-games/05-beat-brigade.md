# Beat Brigade

> **Wave**: 5 | **Tier**: 5 | **Effort**: XL | **Players**: 1-8
> **Category**: Rhythm / Music

## Concept
A cooperative rhythm game where players form a "Galactic Marching Band." Each player uses their phone as a unique instrument (Drums, Synth, Bass, Horn) to perform catchy, synth-wave tracks. The goal isn't just individual perfection, but "Harmonic Resonance"—hitting notes together to power the band's spaceship.

## Core Mechanic
Synchronized Rhythm Input. Notes flow down the main screen in lanes corresponding to each player's instrument. Players must tap, hold, or flick on their device in time with the music. The game uses a "Hit Window" system (Perfect, Great, Good, Miss) to judge accuracy.

## Game Flow
1. **Lobby** → Players join and select their instrument. Each instrument has a different difficulty level (e.g., Drums = 4 lanes, Horn = 1 lane).
2. **Calibration** → A quick 5-second "Sync Check" where players tap to a beat to measure and compensate for network/audio latency.
3. **The Performance** → 
    - **Verse**: Standard rhythm gameplay.
    - **Chorus**: "Unison Notes" appear where multiple players must hit the same beat to trigger a visual explosion on the main screen.
    - **Solo**: One player's lane expands, and they must perform a complex sequence while others "vamp" (simple steady beats).
4. **The Encore** → If the band reaches a "Hype Threshold," a final, faster section of the song is unlocked.
5. **Results** → Individual accuracy stats and a "Band Grade" (S, A, B, C, F).

## Scoring System
- **Accuracy Points**: 100 for Perfect, 50 for Great, 20 for Good.
- **Combo Multiplier**: Increases for every consecutive note hit.
- **Resonance Bonus**: Points for hitting "Unison Notes" perfectly as a group.
- **Band Energy**: A shared meter that fills with correct notes; if it empties, the song ends early.

## Content Requirements
- **Song Library**: 10+ original, high-energy tracks with multiple difficulty charts per instrument.
- **Instrument Skins**: 20+ visual styles for the notes and lanes.
- **Audio Samples**: High-quality instrument sounds that trigger on player taps (local feedback).

## Technical Implementation
### Template Changes
- **Rhythm Highway Template**: A high-performance main screen that can render hundreds of moving "Note" entities with perfect timing.
- **Instrument Controller**: A low-latency mobile UI that provides haptic and audio feedback on tap.

### New Infrastructure
- **Low-Latency Clock Sync Engine**: 
    - **Network Time Protocol (NTP) Implementation**: A custom system to synchronize the "Game Clock" across the main screen and all devices with <10ms drift.
    - **Device Calibration & Drift Correction**: A tool to measure the round-trip time of an input and adjust the "Hit Window" for each player individually.
- **Hit-Window Judge**: A backend (or host-side) logic layer that compares the timestamp of a player's input against the "Perfect" timestamp of a note in the song chart.
- **Audio-Visual Sync**: Ensuring that the Godot engine's visual frame rate is locked to the audio playback buffer to prevent "Note Jitter."

### Input Types Used
- **Rhythm Tap**: Single-point touch.
- **Rhythm Hold**: Sustained touch for "Long Notes."
- **Rhythm Flick**: Directional swipe for "Accent Notes."

### Estimated Phases
- `LOBBY`
- `INSTRUMENT_SELECT`
- `CALIBRATION`
- `SONG_PLAYBACK` (Continuous)
- `ENCORE_PHASE`
- `RESULTS`

## Dependencies
- **Wave 4 Real-time Sync**: Foundation for clock synchronization.
- **Godot Audio Engine**: For high-fidelity music playback.

## Design Notes
Beat Brigade is the "technical peak" of Wave 5. Rhythm games are notoriously difficult to build in a web/mobile environment due to latency. Solving this (via Clock Sync and Calibration) is a massive engineering win that makes the Slopcade platform capable of handling any time-sensitive gameplay. It's a flagship experience because it's visceral, social, and highly rewarding when the band "clicks." The primary risk is "Audio Lag" on certain mobile browsers; we may need to implement a "Visual-only" mode as a fallback.
