# Shirt Clash

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Drawing, Design, Tournament

## Concept
Welcome to **Brand Battle Royale**. You are a rogue fashion designer. You'll draw icons and write slogans in a vacuum, then watch as the "Algorithm" mashes them into the world's most chaotic t-shirt brands to compete for the championship.

## Core Mechanic
Players draw two separate images and write two separate slogans. The game then randomly pairs an image from one player with a slogan from another to create a "Brand." These brands then face off in a 1v1 bracket tournament.

## Game Flow
1. **Lobby** → Players pick their "Fashion House" name.
2. **The Creation**:
    - Draw 2 images based on simple prompts.
    - Write 2 catchy slogans.
3. **The Assembly**: The game reveals the randomly generated brands.
4. **The Tournament**: 1v1 matchups where the rest of the room votes on which shirt they'd actually wear (or which is funnier).
5. **Championship**: The top two brands face off.

## Scoring System
- **Match Win**: +1000 points to the owners of the image and slogan.
- **Tournament Winner**: +5000 points.
- **Streak Bonus**: +500 for winning consecutive matches.

## Content Requirements
- Content type: `DrawingPrompt` (simple objects) and `QuipPrompt`.
- Volume needed: 2 drawings and 2 slogans per player.
- Generation approach: Player-generated.

## Technical Implementation
### Template Changes
Requires a complex "Assembly" phase that handles the cross-player data mapping. The tournament logic needs a state machine to handle the bracket.

### New Infrastructure
- **Layered Rendering**: Ability to overlay text (slogan) on top of a drawing (image) for the shirt preview.
- **Bracket Manager**: A utility to handle 1v1 pairings and winners.

### Input Types Used
- `drawing`: For the shirt graphics.
- `text`: For the slogans.
- `choice`: For tournament voting.

### Estimated Phases
`lobby` → `creation` → `assembly` → `tournament_round` → `championship` → `winner`

## Dependencies
- `paint.tsx` for drawing.
- `api/src/party/templates/crowd-comedy.ts` for voting patterns.

## Design Notes
The "Assembly" reveal is the peak of the game. The randomness creates unexpected comedy. We need to ensure the slogans are rendered in a "cool" font to sell the t-shirt aesthetic.
