# Sigil Sabotage

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 4–12
> **Category**: Drawing / Social Deduction

## Concept
A secret society of occultists is meeting to perform a ritual. However, there are "Inquisitors" among them. To prove your identity to your allies, you must draw a "Sigil" that contains a HIDDEN LETTER from your secret name.

## Core Mechanic
Every player is simultaneously a "Killer" (trying to hide their identity) and a "Detective" (trying to find others' letters). You draw a weapon/sigil, and the game engine forces you to include a specific letter (e.g., 'A') in the lines of the drawing.

## Game Flow
1. **Lobby** → Players are assigned a "Secret Name" (e.g., "Balthazar").
2. **The Drawing** → You are told to draw a "Dagger" containing the letter 'B'.
3. **The Investigation** → All drawings are shown. You must tap on the "Hidden Letter" in other players' drawings.
4. **The Accusation** → If you find a letter, you can accuse that player of being a specific person from the name list.
5. **The Defense** → Accused players have 15 seconds to explain why that "B" is actually just a "cool curve in the blade."
6. **Finale: The Banishing** → A vote is held to eject the most suspicious player.

## Scoring System
- **Stealth Artist**: 500 points if no one finds your hidden letter.
- **Eagle Eye**: 200 points for every hidden letter you correctly identify.
- **Master Detective**: 1000 points for correctly linking a drawing to a Secret Name.
- **False Accusation**: -300 points for accusing an innocent occultist.

## Content Requirements
- 100+ Occult Objects to draw.
- 500+ Secret Names.
- Letter Validation Logic (OCR or manual tagging).

## Technical Implementation
### Template Changes
- `DrawingEntity`: Add `hiddenGlyph` metadata.
- `AccusationEvent`: New event type for the social phase.

### New Infrastructure
- **Hidden-Letter Validation**: A system that either uses a lightweight OCR (like Tesseract.js in a worker) or, more reliably, requires the artist to "Tag" the letter's location after drawing so the engine knows where the "Hitbox" is.
- **Accusation & Defense System**: A state machine that manages the transition from "Finding" to "Debating" to "Voting."
- **Name-to-Letter Mapping**: Logic to ensure every player has a unique letter/name combination that is mathematically solvable but difficult.

### Input Types Used
- `GlyphDrawing`: Drawing with a required shape.
- `PointOfInterest`: Tapping a specific coordinate on a drawing to "Find" the letter.

### Estimated Phases
- `LOBBY`
- `ASSIGNMENT`
- `DRAWING`
- `INVESTIGATION`
- `ACCUSATION`
- `DEFENSE`
- `VOTING`
- `RESULTS`

## Dependencies
- `GlyphValidationSystem` (New)
- `SocialDeductionEngine` (New)

## Design Notes
- The "Defense" phase is where the comedy happens—watching someone try to explain away a very obvious 'S' in their drawing.
- Pitfall: Players drawing the letter too small. Solution: Minimum stroke length for the "Glyph" part of the drawing.
