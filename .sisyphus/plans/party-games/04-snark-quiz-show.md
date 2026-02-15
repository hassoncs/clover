# The Snark Tank (Snark Quiz Show)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 1-8
> **Category**: Irreverent Trivia

## Concept
A trivia show hosted by "S.N.A.R.K." (Synthetic Network for Arrogant Research and Knowledge), an AI that hates you. The questions are trick-phrased, pop-culture obsessed, and designed to make you feel stupid.

## Core Mechanic
Fast-paced trivia with a "Screw" mechanic. If you have a "Screw," you can force an opponent to answer a question under extreme pressure (shorter timer, distorted text, or moving buttons).

## Game Flow
1. **Lobby** → S.N.A.R.K. insults the players as they join.
2. **Standard Round** → 5 questions. Faster answers = more "Snark-Bucks."
3. **The Screw** → Players with the lowest scores get a "Screw."
4. **Screw Phase** → Before a question, a player can "Screw" an opponent. The victim's controller becomes difficult to use (e.g., buttons swap places, or the prompt is in a tiny font).
5. **Speed-Association Finale** → A rapid-fire round where players must match items (e.g., "Real Cereal" vs "Fake Cereal") as they fly across the screen.

## Scoring System
- **Correct Answer**: Up to 1000 points (decays over time).
- **Screw Success**: If you screw someone and they get it WRONG, you get 500 points.
- **Screw Fail**: If they get it RIGHT despite the screw, they get 1000 points and you lose 500.
- **Finale Streak**: Multiplier for consecutive correct matches in the speed round.

## Content Requirements
- 1000+ Trick-phrased trivia questions.
- 50+ Speed-association categories.
- AI-generated snarky insults for every possible player action.

## Technical Implementation
### Template Changes
- `snark-quiz.ts`: Manages the high-speed trivia state and the "Screw" logic.

### New Infrastructure
- **Screw Mechanic**: A system that sends "debuffs" to specific player controllers. Requires the controller UI to be dynamic and capable of "glitching" (e.g., CSS transforms, button remapping).
- **Speed Buzzer Fairness**: High-precision timing on the server to handle sub-millisecond differences in buzzer presses.
- **Dynamic Question Engine**: Supports multi-part questions and "association" style inputs.

### Input Types Used
- `choice`: For standard trivia.
- `speed-match`: New input type for the association finale.
- `target-select`: For choosing who to "Screw."

### Estimated Phases
- `Lobby`
- `TriviaRound`
- `ScrewSelection`
- `Finale`
- `Winner`

## Dependencies
- `ElevenLabsService` for the snarky host voice.
- Low-latency WebSocket connection for the speed round.

## Design Notes
- **Fun Factor**: The "Screw" mechanic creates great "revenge" narratives.
- **Balance**: The "Screw" is a catch-up mechanic for trailing players.
- **Pitfalls**: Questions must be clever, not just hard; writing good "snark" is a content challenge.
