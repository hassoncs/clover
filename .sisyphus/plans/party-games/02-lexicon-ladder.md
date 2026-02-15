# Lexicon Ladder

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Word Game

## Concept
A Victorian-era society of linguists discovering "lost" words. The theme is "Steampunk Academy" — brass gears, parchment, and monocles.

## Core Mechanic
Players are given a fake word and must write a plausible definition for it. Then, they must use that word in a sentence. Finally, they must draw a quick "illustration" for the word.

## Game Flow
1. **Lobby** → Players join and get a "Scholar's Cap".
2. **Round 1** → 
   - **Defining**: Everyone gets a fake word and writes a definition.
   - **Sentencing**: Definitions are shown, and others must write a sentence using the word.
   - **Voting**: Players vote for the best definition/sentence combo.
3. **Finale** → "The Grand Dictionary" — everyone defines the same complex fake word.

## Scoring System
- **Definition Vote**: 400 points.
- **Sentence Vote**: 200 points.
- **Bonus**: 100 points for the "Most Academic" sounding definition.

## Content Requirements
- Content type: `FakeWord` (word + phonetic spelling)
- Volume needed: ~10-15 words per game.
- Generation approach: AI generated.
- Categories/themes: Nonsense words, archaic-sounding words, "Steampunk Academy" flavor.

## Technical Implementation
### Template Changes
Modify `quiplash.ts` to support multiple writing stages (definition then sentence) and sequential display.

### New Infrastructure
None.

### Input Types Used
`text` (for definitions and sentences).

### Estimated Phases
`defining` → `sentencing` → `voting` → `reveal` → `scores`.

## Dependencies
`quiplash.ts` template.

## Design Notes
The game appeals to word nerds and creative writers. The "Steampunk Academy" theme gives it a sophisticated yet playful vibe.
