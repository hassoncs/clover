# The Glitch Board (Chaos Edit)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 2-10 (Team-based)
> **Category**: Simultaneous Text Editing

## Concept
A shared digital billboard in a chaotic city. Two teams compete to write the most "persuasive" (or ridiculous) message, but everyone on the team is typing in the SAME text field at the same time. And there's no delete key.

## Core Mechanic
Players are split into two teams. Each team is given a prompt (e.g., "Write a 5-star review for a restaurant that serves literal garbage"). All team members type into a single, shared text area. The cursor jumps around as people type, and the "No Delete" rule ensures that every mistake is permanent.

## Game Flow
1. **Lobby** → Players split into "The Hackers" and "The Glitches."
2. **The Prompt** → Both teams get the same prompt.
3. **The Chaos Edit** → 60 seconds of simultaneous typing. The screen shows the text evolving in real-time.
4. **The Reading** → An AI voice (TTS) reads the resulting mangled text for Team A, then Team B.
5. **The Highlight** → Players from the OPPOSING team highlight the "best" (funniest/most coherent) fragment of the mess.
6. **Voting** → Everyone votes on which team's "masterpiece" was better.

## Scoring System
- **Winning Team**: 2000 points split among members.
- **Fragment Bonus**: +500 points to the team if their highlighted fragment is particularly funny (voted by all).
- **Speed Bonus**: Points for total characters typed (encourages chaos).

## Content Requirements
- 150+ "Billboard" prompts (Reviews, Slogans, Manifestos, Apology Letters).
- Glitchy visual effects and "hacker" aesthetic.

## Technical Implementation
### Template Changes
- `chaos-edit.ts`: Manages the team-based state and the concurrent text buffer.

### New Infrastructure
- **CRDT-Lite**: A simplified Conflict-free Replicated Data Type implementation to handle multiple users typing into the same string without losing data or crashing.
- **No-Delete Input**: A specialized text input component that intercepts and blocks the backspace/delete key.
- **Live Text Sync**: High-frequency synchronization of the text buffer across all clients in a team.

### Input Types Used
- `chaos-text`: New input type for simultaneous, no-delete editing.
- `highlight`: New input type for selecting a substring of text.
- `choice`: For voting.

### Estimated Phases
- `Lobby`
- `Prompt`
- `ChaosEdit`
- `Reading`
- `Highlighting`
- `Voting`
- `Winner`

## Dependencies
- `ElevenLabsService` for reading the final "glitch" text.
- Real-time socket optimization for low-latency text sync.

## Design Notes
- **Fun Factor**: The pure physical comedy of fighting for control of a sentence.
- **Balance**: Team sizes should be equal; if odd, one player can be a "Chaos Agent" who types on both boards.
- **Pitfalls**: Can become unreadable; the "Highlighting" phase is crucial to find the "gems" in the trash.
