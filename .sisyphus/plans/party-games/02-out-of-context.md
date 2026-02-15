# Out of Context

> **Wave**: 2 | **Tier**: 2 | **Effort**: M | **Players**: 3-8
> **Category**: Comedy/Writing

## Concept
A digital archaeology site where players try to explain "ancient" (modern-day) internet artifacts. The theme is "Cyber-Archaeology" — wireframes, glitchy data, and holographic displays.

## Core Mechanic
Players are given a real-world image or a "post" (e.g., a picture of a toaster) and must write a "caption" or "comment" that makes it look ridiculous or misunderstood. Then, other players are given that caption and must guess what the original image was from a set of choices, OR write their own fake context.

## Game Flow
1. **Lobby** → Players join and get a "Scanner" (avatar).
2. **Round 1** → 
   - **Captioning**: Everyone gets an image and writes a caption for it.
   - **Contextualizing**: Captions are shown, and others must write a fake "Context" (what the image was).
   - **Voting**: The caption is shown with the real image and the fake contexts. Players guess the real one.
3. **Finale** → "The Deep Web" — a series of increasingly distorted images that everyone must caption.

## Scoring System
- **Fooling Others**: 500 points for every player who picks your fake context.
- **Finding Truth**: 250 points for picking the correct original image.
- **Bonus**: 100 points for the "Funniest Caption" (voted separately).

## Content Requirements
- Content type: `ImageArtifact` (image + description)
- Volume needed: ~15-20 images per game.
- Generation approach: Curated image set + AI generated descriptions.
- Categories/themes: Tech, memes, everyday objects, "Cyber-Archaeology" flavor.

## Technical Implementation
### Template Changes
Modify `quiplash.ts` to support image display and multiple-choice guessing phases.

### New Infrastructure
None.

### Input Types Used
`text` (for captions/contexts), `choice` (for guessing).

### Estimated Phases
`captioning` → `contextualizing` → `guessing` → `reveal` → `scores`.

## Dependencies
`quiplash.ts` template.

## Design Notes
The humor comes from how badly modern culture can be misinterpreted. The "Cyber-Archaeology" theme makes the "misunderstanding" feel like a legitimate (if failed) scientific endeavor.
