# Ruin and Redeem

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Comedy/Writing

## Concept
A divine court where players act as minor deities trying to "fix" or "ruin" mortal situations. The theme is "Celestial Bureaucracy" — clouds, golden scrolls, and overworked angels.

## Core Mechanic
Players are given a "Blessed" situation (something good) and must "Ruin" it with a short sentence. Then, another player must "Redeem" that ruined situation. Players vote on which redemption was the most clever or funny.

## Game Flow
1. **Lobby** → Players join and choose a divine domain (e.g., God of Lost Socks).
2. **Round 1** → 
   - **Ruining**: Everyone gets a positive prompt and must write a way to ruin it.
   - **Redeeming**: Ruined prompts are shuffled and given to other players to "Redeem".
   - **Voting**: The original prompt, the ruin, and the redemption are shown. Players vote on the redemption.
3. **Finale** → A "Grand Intervention" where everyone ruins and redeems the same world-ending event.

## Scoring System
- **Redemption Vote**: 300 points per vote.
- **Original Ruiner Bonus**: 100 points if the redemption of your ruin gets the most votes (you provided a good "setup").

## Content Requirements
- Content type: `PositiveSituation` (new schema needed)
- Volume needed: ~10-15 situations per game.
- Generation approach: AI generated.
- Categories/themes: Everyday life, historical events, fairy tales, "Celestial Bureaucracy" flavor.

## Technical Implementation
### Template Changes
Modify `quiplash.ts` to support two-stage writing (ruin then redeem) and passing data between players.

### New Infrastructure
None.

### Input Types Used
`text` (for ruins and redemptions), `choice` (for voting).

### Estimated Phases
`ruining` → `redeeming` → `voting` → `reveal` → `scores`.

## Dependencies
`quiplash.ts` template.

## Design Notes
The two-step writing process creates a collaborative comedy experience. The "Celestial Bureaucracy" theme adds a layer of irony to the "divine" task of ruining and redeeming things.
