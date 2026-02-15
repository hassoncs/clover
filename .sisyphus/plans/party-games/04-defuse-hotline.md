# Defuse Hotline

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 2-8
> **Category**: Cooperative Communication

## Concept
A high-stakes telephonic bomb disposal unit where the "Expert" on the scene is blind to the manual, and the "Dispatchers" are looking at contradictory, glitchy instructions. Players must shout over each other to reconcile conflicting data before the hotline—and the building—goes dead.

## Core Mechanic
Asymmetric information exchange. One player (The Technician) sees the bomb interface on the main screen and their device. All other players (The Dispatchers) receive different pages of a digital manual on their devices. Crucially, the manuals contain overlapping but slightly contradictory rules (e.g., "If the wire is red, cut it" vs "If there are more than 3 wires, never cut red"). Players must verbally synthesize the "true" instruction.

## Game Flow
1. **Lobby** → Players join; one is randomly designated the Technician (rotates each round).
2. **The Briefing** → The bomb type is revealed (e.g., "The Spicy Toaster" or "The Overclocked Cuckoo"). Dispatchers get a 10-second head start to skim their unique manual pages.
3. **Defusal Round** → A series of modules (3-5) appear on the bomb. 
    - **Technician** describes the module (colors, symbols, sounds).
    - **Dispatchers** search their manuals for matching patterns and cross-reference with others.
    - **Technician** performs the action on their device.
4. **The Panic Shift** → At 30 seconds remaining, the manuals "glitch," swapping pages between Dispatchers or introducing "Static" (redacted text) that requires even more coordination.
5. **Finale** → A final "Master Switch" requires all players to hold a specific button on their device simultaneously while the Technician enters a code derived from the previous modules.

## Scoring System
- **Base Completion**: 1000 points per module defused.
- **Time Bonus**: Points = (Seconds Remaining * 50).
- **Communication Efficiency**: Bonus for defusing modules with zero incorrect inputs.
- **Hotline Streak**: Multiplier increases for consecutive successful defusals across rounds.
- **Failure**: If the bomb explodes, the team gets 0 for that round, but retains "Bravery Points" for modules completed.

## Content Requirements
- **Bomb Modules**: 20+ unique logic puzzles (wire cutting, keypad sequences, symbol matching, sound patterns).
- **Manual Pages**: Procedurally generated instruction sets that ensure contradictions are present but resolvable.
- **Thematic Flavor**: Corporate "Bomb Corp" style dialogue and frantic sound effects.

## Technical Implementation
### Template Changes
- **Asymmetric View Template**: Ability to serve completely different UI/Content to the "Technician" vs "Dispatchers" within the same phase.

### New Infrastructure
- **Private Role Docs**: A system to push large, scrollable text/image documents to specific players that persist across sub-phases.
- **Timed Cooperative Resolver**: A backend state machine that handles multi-user inputs where the "correctness" depends on the global state and the specific manual distribution.
- **Voice-Triggered Visuals**: (Optional/Polish) UI elements that shake or glitch based on microphone volume levels to simulate the "Hotline" atmosphere.

### Input Types Used
- **Keypad**: Standard 0-9 input.
- **Toggle/Switch**: Real-time state syncing.
- **Hold-to-Confirm**: Multi-user synchronized input.
- **Scrollable Manual**: High-performance text/image viewer for mobile.

### Estimated Phases
- `LOBBY`
- `ROLE_ASSIGNMENT`
- `MANUAL_PREVIEW`
- `MODULE_ACTIVE` (Looping)
- `PANIC_MODE`
- `FINAL_CODE`
- `RESULTS`

## Dependencies
- **Wave 3 Private Messaging**: Foundation for sending unique data to players.
- **Wave 4 Real-time Sync**: Required for the Technician's actions to reflect instantly on the main screen.

## Design Notes
This game is the ultimate "stress test" for a group's communication. It moves away from the "everyone votes" loop into a "one person acts, everyone helps" model. The technical risk lies in the manual generation—ensuring the puzzles are difficult but never impossible due to the random distribution of manual pages. It provides the infrastructure for any future "Asymmetric Information" games (like spy/traitor games).
