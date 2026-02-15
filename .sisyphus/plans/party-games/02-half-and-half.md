# Half and Half

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Social/Voting

## Concept
A high-stakes negotiation in a futuristic "Neutral Zone" space station. The theme is "Intergalactic Diplomacy" — sleek metal, glowing blue accents, and diverse alien delegates.

## Core Mechanic
Players are given a "Would You Rather" style scenario with one half missing. They must fill in the second half to make the choice as close to a 50/50 split as possible. The goal is to divide the room.

## Game Flow
1. **Lobby** → Players join and choose an alien embassy.
2. **Round 1-2** → 
   - **Drafting**: Each player gets a scenario (e.g., "You can fly, BUT...") and must write the second half.
   - **Voting**: The full scenario is shown, and everyone else votes for Option A or Option B.
   - **Reveal**: The split is shown. Points are awarded based on how close to 50/50 the vote was.
3. **Finale** → "The Ultimate Compromise" — one final scenario where everyone writes a second half, and the room votes on which one is the most divisive.

## Scoring System
- **Perfect Split (50/50)**: 1000 points.
- **Near Split (60/40)**: 500 points.
- **Lopsided (90/10)**: 0 points.
- **Bonus**: 200 points for being in the minority vote (the "Rebel" bonus).

## Content Requirements
- Content type: `SplitPrompt` (Scenario setup)
- Volume needed: ~10-15 setups per game.
- Generation approach: AI generated.
- Categories/themes: Ethical dilemmas, silly powers, social situations, "Intergalactic Diplomacy" flavor.

## Technical Implementation
### Template Changes
Modify `question-answer.ts` to support text input for the second half of the question and custom scoring based on vote distribution.

### New Infrastructure
None.

### Input Types Used
`text` (for the second half), `choice` (for voting).

### Estimated Phases
`drafting` → `voting` → `reveal` → `scores`.

## Dependencies
`question-answer.ts` template.

## Design Notes
The game rewards empathy and understanding of the group's psyche. The "Intergalactic Diplomacy" theme makes the act of "splitting the room" feel like a delicate political maneuver.
