# The Oracle's Gamble

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Trivia, Luck

## Concept
Deep in the mountains lives an Oracle with a giant, sentient wheel. To win its favor, you must answer its riddles. Correct answers give you more space on the wheel, but in the end, the Oracle's spin decides your fate.

## Core Mechanic
A hybrid trivia and luck game. Players answer multiple-choice trivia questions. Each correct answer allows them to place a "slice" of their color on a giant wheel. At the end of each round, the wheel spins.

## Game Flow
1. **Lobby** → Players pick a "Sacrifice" (avatar).
2. **The Riddles**: 3-5 trivia questions. Fast answers get more slices.
3. **The Placement**: Players choose where to place their earned slices on the wheel.
4. **The Spin**: The wheel spins. Where it lands determines points, bonuses, or "curses" (point stealing).
5. **Finale**: A final spin where the slices are doubled.

## Scoring System
- **Trivia Correct**: +100 points.
- **Wheel Landing**: Points vary based on the slice (500, 1000, 2000).
- **Special Slices**: "The Thief" (steal points), "The Saint" (give points to last place), "The Void" (reset current round points).

## Content Requirements
- Content type: `TriviaQuestion`.
- Volume needed: 20 questions per session.
- Generation approach: Imported or AI-generated.

## Technical Implementation
### Template Changes
Requires a `wheel` state in `sharedData` that tracks slice ownership. The `spin` phase needs a deterministic random seed synced across all clients.

### New Infrastructure
- **Physics-based Wheel**: A Godot-side component that handles the visual spin and collision detection for the pointer.
- **Slice Mapping**: Logic to map wheel degrees to player IDs.

### Input Types Used
- `choice`: For trivia and slice placement.

### Estimated Phases
`lobby` → `trivia` → `placement` → `spin` → `reveal` → `winner`

## Dependencies
- `godot-engine` for the wheel physics.
- `TriviaQuestion` schema.

## Design Notes
This game balances the "smartest person in the room" with "the luckiest." It prevents one person from running away with the lead early on.
