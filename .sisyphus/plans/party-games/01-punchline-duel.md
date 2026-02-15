# Punchline Duel

> **Wave**: 1 | **Tier**: 1 | **Effort**: S | **Players**: 3-8
> **Category**: Comedy/Writing

## Concept
A high-stakes underground comedy club where players battle it out with their sharpest wit. The theme is "Neon Noir Comedy" — think dark alleys, glowing signs, and gritty humor.

## Core Mechanic
Players are given prompts and must write the funniest response. Responses are then pitted against each other in head-to-head duels, and the rest of the players vote on the winner.

## Game Flow
1. **Lobby** → Players join and choose their "Stage Name".
2. **Round 1-2** → 
   - **Answering**: Each player gets two prompts. Each prompt is shared by two players.
   - **Voting**: Prompts are shown one by one with the two player responses. Others vote.
   - **Reveal**: Points are awarded based on vote percentage.
3. **Finale** → One final prompt for everyone. Votes are worth double. Final scores and winner revealed.

## Scoring System
- **Standard Vote**: 100 points per vote received.
- **Quiplash (All Votes)**: 500 point bonus.
- **Finale**: 200 points per vote received.

## Content Requirements
- Content type: `QuipPrompt`
- Volume needed: ~15-20 prompts per game session.
- Generation approach: AI generated via content pipeline.
- Categories/themes: Gritty, sarcastic, observational, "Neon Noir" flavored.

## Technical Implementation
### Template Changes
None — use existing `quiplash.ts` template.

### New Infrastructure
None.

### Input Types Used
`text` (for answers), `choice` (for voting).

### Estimated Phases
`answering` → `voting` → `reveal` → `scores` → `finale_answering` → `finale_voting` → `final_scores`.

## Dependencies
None.

## Design Notes
The fun comes from the head-to-head competition and the pressure of the timer. The "Neon Noir" theme provides a distinct visual identity that separates it from other quip-style games.
