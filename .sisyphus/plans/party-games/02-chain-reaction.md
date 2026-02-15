# Chain Reaction

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 2-8
> **Category**: Word Game

## Concept
A high-speed particle accelerator where players must keep the "word reaction" going. The theme is "Atomic Lab" — glowing tubes, warning sirens, and hazmat suits.

## Core Mechanic
Players are given a word and must provide a related word to keep the chain going. The catch is that the relationship must be justified if challenged. It's a fast-paced association game.

## Game Flow
1. **Lobby** → Players join and get a "Scientist" avatar.
2. **Round 1-3** → 
   - **Reaction**: A starting word is shown. Players take turns (or act simultaneously) to provide a related word.
   - **Challenge**: If a word seems too far-fetched, any player can hit the "Challenge" buzzer.
   - **Justification**: The player must write a quick justification. The room votes on whether it's valid.
3. **Finale** → "Meltdown" — the timer gets faster and faster until only one player is left standing.

## Scoring System
- **Successful Link**: 100 points.
- **Winning a Challenge**: 500 points.
- **Losing a Challenge**: -200 points.
- **Last Scientist Standing**: 1000 points.

## Content Requirements
- Content type: `StartingWord`
- Volume needed: ~5-10 starting words per game.
- Generation approach: AI generated or curated list.
- Categories/themes: Science, nature, objects, "Atomic Lab" flavor.

## Technical Implementation
### Template Changes
Modify `question-answer.ts` to support turn-based input and a "Challenge" buzzer mechanic.

### New Infrastructure
None.

### Input Types Used
`text` (for words and justifications), `buzzer` (for challenges), `choice` (for voting on challenges).

### Estimated Phases
`reaction` → `challenge` → `justification` → `voting` → `reveal` → `scores`.

## Dependencies
`question-answer.ts` template.

## Design Notes
The game is about quick thinking and creative justification. The "Atomic Lab" theme adds a sense of urgency and danger to the word association.
