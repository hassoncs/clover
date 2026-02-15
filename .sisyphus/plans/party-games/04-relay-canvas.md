# Graffiti Guild

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3–8 (plus Audience)
> **Category**: Collaborative Drawing

## Concept
Rival street art crews are competing to claim the "Eternal Wall." Players must collaborate on massive murals, but each has their own secret "Tag" they need to incorporate to earn extra points.

## Core Mechanic
Two players are paired to draw on the same canvas simultaneously. They see each other's strokes in real-time. Spectators can send "Spray Cans" (emoji reactions) that physically push the artists' brushes or change their colors temporarily.

## Game Flow
1. **Lobby** → Players choose their "Crew" (Color Palette).
2. **Round 1: The Base Layer** → Pairs are given a prompt (e.g., "Cyberpunk Sunset"). They have 60 seconds to draw.
3. **Round 2: The Overpaint** → The canvas is passed to a different pair. They must add to the existing drawing based on a new prompt (e.g., "Add a Giant Robot").
4. **Round 3: The Tagging** → Players must find a way to hide their secret "Tag" (a specific shape or letter) in the final mural without it being too obvious.
5. **Finale: The Reveal** → The audience votes on which crew's contribution "Saved" or "Ruined" the mural.

## Scoring System
- **Collaboration Bonus**: Points awarded if both players in a pair used a similar amount of "Ink."
- **Prompt Accuracy**: Audience votes (1-10) on how well the mural matches the prompts.
- **Tag Stealth**: If a player's "Tag" is NOT identified by the audience during the reveal, they get 500 points.
- **Emoji Impact**: Points for how many "Hype" emojis were received during the live drawing.

## Content Requirements
- 200+ Mural Prompts (Themes + Additions).
- 50+ Secret Tag Shapes.

## Technical Implementation
### Template Changes
- `CanvasEntity`: Support for `multiUser: true`.
- `StrokeData`: Add `userId` to each path for conflict resolution and scoring.

### New Infrastructure
- **Simultaneous Shared Canvas**: A WebSocket-based synchronization layer using `Y.js` or a custom CRDT (Conflict-free Replicated Data Type) to handle overlapping strokes.
- **Merge Model**: Logic to flatten layers from different rounds while preserving "Ink History" for the reveal animation.
- **Live Feedback Stream**: A low-latency "Reaction Bus" that translates audience taps into physics forces on the drawing cursor.

### Input Types Used
- `SharedDrawing`: Real-time multi-user vector drawing.
- `EmojiReaction`: Physics-based feedback.

### Estimated Phases
- `LOBBY`
- `PAIRING`
- `DRAWING_PHASE`
- `PASSING_PHASE`
- `TAGGING_PHASE`
- `VOTING`
- `RESULTS`

## Dependencies
- `CRDTDrawingSystem` (New)
- `ReactionPhysicsEngine` (New)

## Design Notes
- The tension between "Helping the mural" and "Hiding your tag" creates a fun social dynamic.
- Pitfall: Griefing (one player scribbling over another). Solution: "Undo" is per-user, and "Ink Limits" prevent total canvas coverage.
