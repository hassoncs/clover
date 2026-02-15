# Flip Sketch Bluff

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-12
> **Category**: Drawing / Bluffing

## Concept
A digital flip-book game where players create simple two-frame looping animations based on a prompt. Others must then guess the original title while trying to bluff their friends with fake titles. It's "Drawful" meets "Steamboat Willie."

## Core Mechanic
Two-frame animation drawing. Players are given a prompt (e.g., "A dancing cactus"). They draw Frame 1, then Frame 2. While drawing Frame 2, they see a faint "Onion Skin" of Frame 1 to help them align the movement. The main screen then loops these two frames at 4fps to create a charming, jittery animation.

## Game Flow
1. **Lobby** → Players join; drawing tools are initialized.
2. **The Prompt** → Each player receives a unique, weird prompt.
3. **The Animation Lab** → 
    - **Frame 1**: 60 seconds to draw the base image.
    - **Frame 2**: 45 seconds to draw the second frame (with onion skinning).
4. **The Bluffing** → One by one, animations are shown on the main screen. All other players submit a "Fake Title" that they think sounds like the original prompt.
5. **The Voting** → Players see all submitted titles (plus the real one) and vote on which they think is the truth.
6. **The Reveal** → Points are awarded for finding the truth and for tricking others.

## Scoring System
- **Find the Truth**: +500 points.
- **Tricked a Friend**: +250 points for every player who voted for your fake title.
- **Animation Bonus**: At the end of the round, everyone votes for their "Favorite Animation" (+1000 points).
- **Double Down**: In the final round, players can "Double Down" on a guess to earn 2x points (or lose 2x).

## Content Requirements
- **Drawing Prompts**: 500+ quirky, movement-oriented prompts (e.g., "A toaster exploding," "A ghost doing a backflip").
- **Color Palette**: A limited 3-color palette (Black, White, and one "Accent Color" that changes per round).

## Technical Implementation
### Template Changes
- **Animation Canvas**: A mobile drawing UI that supports multiple layers (Current Frame + Onion Skin) and a "Play" button to preview the loop.
- **Looping Viewer**: A main-screen component that can efficiently loop two SVG or Raster frames at a specific FPS.

### New Infrastructure
- **Multi-frame Drawing Timeline**: 
    - **Frame Management**: A system to store, transmit, and associate multiple drawing buffers with a single player/prompt.
    - **Onion Skinning**: A client-side rendering technique that displays the previous frame at 20% opacity behind the current drawing canvas.
- **Animation Encoder**: A utility to combine two drawings into a single "Animation Object" (e.g., a GIF or a custom JSON sequence) for storage and playback.

### Input Types Used
- **Freehand Drawing**: With brush size and eraser.
- **Text Input**: For submitting fake titles.
- **Selection List**: For voting.

### Estimated Phases
- `LOBBY`
- `PROMPT_ASSIGNMENT`
- `DRAW_FRAME_1`
- `DRAW_FRAME_2`
- `BLUFF_SUBMISSION`
- `VOTING`
- `REVEAL_ANIMATION`
- `RESULTS`

## Dependencies
- **Wave 3 Drawing Engine**: The foundation for the canvas.
- **Wave 3 Voting/Bluffing Loop**: The core game structure.

## Design Notes
Flip Sketch Bluff is a Tier 4 game because it adds a "Time" dimension to the drawing mechanic. It's a significant step up from static drawing games and provides the infrastructure for any future "Animation" or "Video" based games. The "Onion Skin" is the key technical feature—without it, the animations would be too disjointed to be funny. It's a high-value game because the resulting loops are often hilarious and highly shareable on social media.
