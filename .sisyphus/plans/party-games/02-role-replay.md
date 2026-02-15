# Role Replay

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Social/Roleplay

## Concept
A reality TV show set in a haunted mansion where players are "contestants" with secret traits. The theme is "Spooky Reality TV" — cameras, ghosts, and dramatic confessionals.

## Core Mechanic
Each player is given a "Secret Trait" (e.g., "Obsessed with spoons" or "Thinks they are a cat"). They must answer prompts *in character* based on that trait. Others must guess what the secret trait is.

## Game Flow
1. **Lobby** → Players join and get a "Reality Star" persona.
2. **Round 1-2** → 
   - **Trait Assignment**: Each player gets a secret trait.
   - **Confessional**: Players answer a prompt in character.
   - **Guessing**: Others try to guess the trait from a list of options.
   - **Reveal**: The trait is revealed along with who guessed correctly.
3. **Finale** → "The Elimination Ceremony" — players must defend their "stay" in the mansion while still maintaining their trait.

## Scoring System
- **Correct Guess**: 300 points.
- **Fooling Others**: 200 points for each player who picks a wrong trait for you.
- **Acting Bonus**: 100 points if your answer is voted "Most In-Character".

## Content Requirements
- Content type: `SecretTrait` (trait + description)
- Volume needed: ~20-30 traits per game.
- Generation approach: AI generated.
- Categories/themes: Quirky habits, delusions, personality types, "Spooky Reality TV" flavor.

## Technical Implementation
### Template Changes
Modify `quiplash.ts` to support secret data (traits) per player and a guessing phase with multiple choices.

### New Infrastructure
None.

### Input Types Used
`text` (for confessional answers), `choice` (for guessing).

### Estimated Phases
`trait_assignment` → `confessional` → `guessing` → `reveal` → `scores`.

## Dependencies
`quiplash.ts` template.

## Design Notes
The game relies on the players' ability to roleplay. The "Spooky Reality TV" theme provides a fun, low-stakes environment for acting silly.
