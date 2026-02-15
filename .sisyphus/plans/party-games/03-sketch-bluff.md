# Sketch Bluff

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Drawing, Bluffing

## Concept
In **Abstract Artifacts**, you are an underground artist tasked with illustrating the most nonsensical concepts imaginable. The catch? Your tools are primitive, and your audience is trying to rename your masterpiece to steal your glory.

## Core Mechanic
Players receive a weird prompt (e.g., "A haunted toaster") and must draw it using the `paint.tsx` system. Then, everyone else sees the drawing and writes a fake title for it. Finally, players try to find the original prompt among the fake titles.

## Game Flow
1. **Lobby** → Players choose a color palette.
2. **Round 1-2** → 
    - **The Sketch**: Players draw their prompt (45 seconds).
    - **The Bluff**: Players see someone else's drawing and write a fake title.
    - **The Vote**: Players vote for the real title.
3. **Finale** → **Speed Gallery**: One drawing is shown to everyone, and everyone submits a title simultaneously.

## Scoring System
- **Artist Bonus**: +1000 points if someone guesses your prompt.
- **Master Bluffer**: +500 points for every player who picks your fake title.
- **Eagle Eye**: +1000 points for finding the real prompt.

## Content Requirements
- Content type: `DrawingPrompt`
- Volume needed: 1 prompt per player per round.
- Generation approach: AI-generated bizarre phrases.
- Categories/themes: Surrealism, Idioms, Modern Problems.

## Technical Implementation
### Template Changes
Extends `quiplash.ts` but replaces the first text input with a `drawing` input. Uses `NormalizedDrawCommand` to sync strokes.

### New Infrastructure
- **Drawing Buffer**: Uses the `pixel buffer` system from `paint.tsx`.
- **Canvas Sync**: Real-time stroke synchronization for the "Sketch" phase.

### Input Types Used
- `drawing`: For the initial sketch.
- `text`: For writing fake titles.
- `choice`: For voting.

### Estimated Phases
`lobby` → `drawing` → `bluffing` → `voting` → `reveal` → `winner`

## Dependencies
- `paint.tsx` component stability.
- `DrawingPrompt` schema.

## Design Notes
Terrible drawings are the engine of comedy here. The limited color palette and phone-screen constraints are features, not bugs. We should ensure the "Bluffing" phase shows the drawing clearly.
