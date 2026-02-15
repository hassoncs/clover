# Flicker Frames

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Drawing, Animation, Bluffing

## Concept
Static art is dead. Welcome to the era of the **Flicker Frame**. You'll create a two-frame masterpiece that loops forever. It's twice the drawing, twice the motion, and twice the potential for hilarious misunderstanding.

## Core Mechanic
Similar to `Sketch Bluff`, but players draw two frames. The game then loops these frames (Frame A -> Frame B -> A -> B) at a high speed to create a simple animation. Others write fake titles for the animation and vote on the real one.

## Game Flow
1. **Lobby** → Players choose their "Animator" tag.
2. **The Animation**:
    - Players draw Frame 1.
    - Players draw Frame 2 (with a "ghost" of Frame 1 visible to help with alignment).
3. **The Bluff**: Others see the looping animation and write fake titles.
4. **The Vote**: Players vote for the real title.
5. **Finale**: **The Double Down**: Players can bet double points on their guess.

## Scoring System
- **Animator Bonus**: +1000 points if someone guesses your prompt.
- **Master Bluffer**: +500 points per player fooled.
- **Eagle Eye**: +1000 points for finding the real prompt.

## Content Requirements
- Content type: `DrawingPrompt` (Action-oriented, e.g., "A cat exploding").
- Volume needed: 1 per player per round.
- Generation approach: AI-generated action phrases.

## Technical Implementation
### Template Changes
The `drawing` input needs to handle two separate buffers. The `reveal` phase needs to toggle between the two images every 200ms.

### New Infrastructure
- **Onion Skinning**: A feature in the drawing UI that shows a faint version of the previous frame.
- **Animation Player**: A component that handles the A/B looping logic on the main screen.

### Input Types Used
- `drawing`: Two frames per player.
- `text`: For fake titles.
- `choice`: For voting.

### Estimated Phases
`lobby` → `drawing_f1` → `drawing_f2` → `bluffing` → `voting` → `reveal` → `winner`

## Dependencies
- `paint.tsx` enhancement for onion skinning.
- `DrawingPrompt` content.

## Design Notes
The "Onion Skinning" is crucial for making the animation look intentional. Even simple animations (like a face blinking) are much more engaging than static drawings.
