# The Glitch in the Matrix (Faux Signal)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-8
> **Category**: Social Deduction

## Concept
Everyone in the room is a "Protocol Droid" receiving instructions from the Motherboard—except for one "Glitch." The Glitch doesn't know the instruction but must pretend they do to avoid being detected and "reformatted."

## Core Mechanic
Hidden state routing. The server sends a prompt to all players except one. The prompt might be "Hold up 3 fingers" or "Point to the person you'd trust with your life." Everyone performs the action simultaneously in real life. Then, players vote on who looked the most suspicious.

## Game Flow
1. **Lobby** → Droids initialize their circuits.
2. **The Signal** → A prompt type is chosen (Gesture, Number, Text, or Pointing).
3. **Instruction** → All "Droids" see the prompt (e.g., "Raise your hand if you like pineapple on pizza"). The "Glitch" sees "YOU ARE THE GLITCH. BLUFF!"
4. **The Action** → On the count of three, everyone performs the action.
5. **Discussion** → 30 seconds to accuse and defend.
6. **Voting** → Everyone votes for the suspected Glitch.
7. **Reveal** → If the Glitch is caught, they have one chance to guess what the prompt was to "Hack" their way out of it.

## Scoring System
- **Glitch Caught**: 500 points to all Droids.
- **Glitch Escapes**: 1000 points to the Glitch.
- **The Hack**: If the Glitch is caught but guesses the prompt correctly, they get 500 points and the Droids get 0.

## Content Requirements
- 400+ Prompts across 4 categories:
    - **Gestures**: Physical actions (e.g., "Make a heart with your hands").
    - **Numbers**: Holding up fingers (e.g., "How many siblings do you have?").
    - **Pointing**: Identifying players (e.g., "Who is the most likely to survive a zombie apocalypse?").
    - **Text**: Typing a short word (e.g., "A fruit that is red").

## Technical Implementation
### Template Changes
- `faux-signal.ts`: Manages the hidden prompt routing and the "Hack" guess phase.

### New Infrastructure
- **Hidden State Routing**: A system to send different data to specific `PartyRoom` connections based on their role (Droid vs. Glitch).
- **Accusation UX**: A specialized voting UI that highlights the "accused" player and allows for quick "rebuttal" text.
- **Prompt Guessing Engine**: A text-matching system (with fuzzy matching) for the Glitch's final "Hack" attempt.

### Input Types Used
- `hidden-prompt`: New input type that displays different content based on player role.
- `choice`: For voting.
- `text`: For the "Hack" guess.

### Estimated Phases
- `Lobby`
- `Signal`
- `Action`
- `Discussion`
- `Voting`
- `Reveal`
- `TheHack` (Conditional)
- `Winner`

## Dependencies
- Reliable per-player data synchronization.

## Design Notes
- **Fun Factor**: The "Oh no, what are they doing?" panic of being the Glitch.
- **Balance**: Prompts must be specific enough to be guessable but broad enough to allow for bluffing.
- **Pitfalls**: Requires players to be in the same room (or on video call) to see the actions.
