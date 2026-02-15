# Open Mic Frenzy

> **Wave**: 1 | **Tier**: 1 | **Effort**: S | **Players**: 3-8
> **Category**: Comedy/Writing

## Concept
A chaotic open mic night at a quirky intergalactic cafe. The theme is "Cosmic Coffeehouse" — aliens, robots, and strange brews.

## Core Mechanic
Players are given a setup and must provide the punchline. The twist is that the setups are often bizarre or nonsensical, forcing players to get creative.

## Game Flow
1. **Lobby** → Players join and pick an alien avatar.
2. **Round 1-2** → 
   - **Writing**: Everyone gets the same setup and writes their own punchline.
   - **Performance**: Punchlines are read out (via TTS) one by one.
   - **Voting**: Players vote for their favorite punchline (cannot vote for self).
3. **Finale** → A "Rapid Fire" round where players must complete 3 short setups in quick succession.

## Scoring System
- **Vote**: 250 points per vote.
- **Most Consistent**: 500 point bonus for the player who gets at least one vote in every round.

## Content Requirements
- Content type: `QuipPrompt` (Setup/Punchline style)
- Volume needed: ~10-12 setups per game.
- Generation approach: AI generated.
- Categories/themes: Sci-fi, surreal, puns, "Cosmic Coffeehouse" flavor.

## Technical Implementation
### Template Changes
None — use existing `crowd-comedy.ts` template.

### New Infrastructure
None.

### Input Types Used
`text` (for punchlines), `choice` (for voting).

### Estimated Phases
`writing` → `performance` → `voting` → `scores`.

## Dependencies
None.

## Design Notes
The use of TTS (ElevenLabs) adds a layer of comedy as the AI tries to read the players' often ridiculous punchlines. The "Cosmic Coffeehouse" theme allows for very weird and fun prompts.
