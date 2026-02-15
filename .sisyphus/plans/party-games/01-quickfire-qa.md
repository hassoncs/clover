# Quickfire Q&A

> **Wave**: 1 | **Tier**: 1 | **Effort**: S | **Players**: 2-12
> **Category**: Trivia

## Concept
A fast-paced trivia game set in a high-tech research facility. The theme is "The Lab" — whiteboards, beakers, and frantic scientists.

## Core Mechanic
Players are presented with trivia questions and must select the correct answer as quickly as possible. The faster you answer, the more points you get.

## Game Flow
1. **Lobby** → Players join and get assigned a "Lab ID".
2. **Round 1-3** → 
   - **Question**: A multiple-choice question is shown on the host screen and player devices.
   - **Answering**: Players select an option. A timer counts down.
   - **Reveal**: The correct answer is shown along with who got it right.
3. **Finale** → A series of 5 rapid-fire questions with decreasing time limits.

## Scoring System
- **Correct Answer**: Base 500 points.
- **Speed Bonus**: Up to 500 additional points based on how quickly the player answered.
- **Streak Bonus**: 100 points extra for each consecutive correct answer.

## Content Requirements
- Content type: `TriviaQuestion`
- Volume needed: ~20-30 questions per game.
- Generation approach: AI generated or imported from trivia datasets.
- Categories/themes: General knowledge, science, pop culture, "The Lab" flavor.

## Technical Implementation
### Template Changes
None — use existing `question-answer.ts` template.

### New Infrastructure
None.

### Input Types Used
`choice`.

### Estimated Phases
`question` → `answering` → `reveal` → `scores`.

## Dependencies
None.

## Design Notes
The focus is on speed and accuracy. The "Lab" theme makes the frantic pace feel thematic, as if players are racing to complete an experiment.
