# About You Bluff

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Bluffing/Social

## Concept
A cozy campfire gathering where friends share "true" stories that might actually be lies. The theme is "Midnight Campfire" — crackling fire, starry sky, and marshmallow roasting.

## Core Mechanic
Players are asked personal questions (e.g., "What is the weirdest thing in your fridge?"). One player's real answer is shown along with fake answers written by other players. Everyone must guess which one is the truth.

## Game Flow
1. **Lobby** → Players join and get a "Camper" avatar.
2. **Round 1-2** → 
   - **The Truth**: One player (the "Subject") answers a personal question truthfully.
   - **The Bluff**: Others see the question and write a fake answer that sounds like something the Subject would say.
   - **Guessing**: All answers (including the truth) are shown. Everyone (except the Subject) guesses the truth.
3. **Finale** → "The Big Reveal" — a series of rapid-fire personal questions where everyone answers at once, and the room votes on the most surprising truth.

## Scoring System
- **Finding the Truth**: 500 points.
- **Fooling Others**: 500 points for every player who picks your bluff.
- **Subject Bonus**: 100 points for every player who *fails* to find your truth (you bluffed them well).

## Content Requirements
- Content type: `PersonalQuestion`
- Volume needed: ~10-15 questions per game.
- Generation approach: AI generated.
- Categories/themes: Funny, slightly embarrassing, observational, "Midnight Campfire" flavor.

## Technical Implementation
### Template Changes
Modify `quiplash.ts` to support "Subject" based rounds where one player provides the "correct" answer and others provide the "bluffs".

### New Infrastructure
None.

### Input Types Used
`text` (for truths and bluffs), `choice` (for guessing).

### Estimated Phases
`truth_writing` → `bluff_writing` → `guessing` → `reveal` → `scores`.

## Dependencies
`quiplash.ts` template.

## Design Notes
The game is highly personal and works best with friends. The "Midnight Campfire" theme creates a relaxed, intimate atmosphere that encourages sharing.
