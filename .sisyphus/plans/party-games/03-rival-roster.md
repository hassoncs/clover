# Rival Roster

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Drawing, Social Deduction

## Concept
In **Gladiator Gala**, you are a manager of intergalactic fighters. You'll design a Champion to fit a specific title, but your rival only gets to see your art before they have to design a Challenger to take you down. It's a battle of visual intuition and creative spite.

## Core Mechanic
Player A gets a title (e.g., "The God of Damp Socks") and draws a Champion. Player B sees the drawing but NOT the title, and must draw a "Challenger" they think can defeat this mysterious foe. The room then sees the title and both drawings and votes on the winner.

## Game Flow
1. **Lobby** → Players choose their "Gym" name.
2. **The Champion**: Half the players draw a Champion for a specific title.
3. **The Challenger**: The other half sees the Champion's art and draws a Challenger.
4. **The Battle**: The title is revealed. Both drawings are shown side-by-side. The room votes.
5. **Round 2**: Roles swap.

## Scoring System
- **Battle Victory**: +1000 points.
- **Underdog Bonus**: +500 points if the Challenger wins (since they had less info).
- **Artistic Flair**: +200 points if the "Judge" (AI or top player) likes the style.

## Content Requirements
- Content type: `DrawingPrompt` (Titles/Categories).
- Volume needed: 1 title per pair.
- Generation approach: AI-generated titles that are evocative but slightly ambiguous.

## Technical Implementation
### Template Changes
Asymmetric input phase: `requestInput` needs to send different data to different players simultaneously.

### New Infrastructure
- **Asymmetric State**: `room.updateSharedData` needs to handle "hidden" info that only certain players can see (or just use `requestInput` payload).

### Input Types Used
- `drawing`: For both Champions and Challengers.
- `choice`: For voting.

### Estimated Phases
`lobby` → `champion_phase` → `challenger_phase` → `battle_reveal` → `winner`

## Dependencies
- `paint.tsx`.
- `ecs-architecture` for entity spawning of the "fighters" in the reveal.

## Design Notes
The asymmetry is the hook. Seeing a weird drawing and trying to guess what it's supposed to be "beating" leads to hilarious misinterpretations.
