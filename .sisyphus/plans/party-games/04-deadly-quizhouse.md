# The Slop-House of Horrors (Deadly Quizhouse)

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3-8
> **Category**: Survival Trivia / Mini-Games

## Concept
Players are trapped in a haunted house where the only way to survive is to answer trivia correctly. If you fail, you must face the "Killing Floor"—a series of brutal mini-games. Die, and you become a ghost, haunting the survivors until the final race.

## Core Mechanic
Trivia is the "safe" phase. The "Killing Floor" is a mini-game framework that tests reflexes, memory, or luck. Elimination isn't the end; "Ghost" players can still win by "stealing the body" of a survivor in the finale.

## Game Flow
1. **Lobby** → Players choose their "Victim" avatar.
2. **Trivia Room** → A question is asked. Those who get it wrong go to the Killing Floor.
3. **The Killing Floor** → A random mini-game (e.g., "Don't Blink," "Math or Death," "The Finger Guillotine"). Fail here, and you are eliminated.
4. **Ghost State** → Eliminated players can still answer trivia. Correct answers give them "Ectoplasm."
5. **The Finale** → A race to the exit. Survivors have a head start. Ghosts can use "Ectoplasm" to slow down survivors or attempt a "Body Swap" if they catch up.

## Scoring System
- **Survival**: 1000 points per round survived.
- **Ghost Points**: 500 points for sabotaging a survivor.
- **The Escape**: 5000 points for the first player (living or ghost) to exit.

## Content Requirements
- 500+ Horror-themed trivia questions.
- 10+ "Killing Floor" mini-games (simple logic-based or reflex-based).
- Spooky atmosphere and "death" animations.

## Technical Implementation
### Template Changes
- `deadly-quizhouse.ts`: Manages the complex state of living vs. ghost players and the mini-game transitions.

### New Infrastructure
- **Elimination/Ghost State**: A robust player state manager that changes the UI and available actions based on "Life" status.
- **Mini-Game Framework**: A pluggable system that allows the `PartyRoomDO` to swap between the main trivia logic and smaller, self-contained mini-game logic.
- **Asymmetric Finale**: A specialized race UI that handles different movement rules for survivors and ghosts.

### Input Types Used
- `choice`: For trivia.
- `reflex-tap`: New input type for mini-games.
- `joystick/d-pad`: For the finale race.

### Estimated Phases
- `Lobby`
- `Trivia`
- `KillingFloor` (Conditional)
- `GhostHaunt` (Ongoing)
- `Finale`
- `Winner`

## Dependencies
- `Physics Engine` (optional, for some mini-games).
- Advanced state management in `PartyRoomDO`.

## Design Notes
- **Fun Factor**: The "Killing Floor" adds high-stakes tension to every trivia question.
- **Balance**: The "Body Swap" mechanic ensures that even the first person eliminated has a chance to win.
- **Pitfalls**: Mini-games must be very short (15-30 seconds) to keep the game moving.
