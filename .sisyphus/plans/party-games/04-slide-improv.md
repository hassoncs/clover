# Pitch Perfect (or Not)

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3–8 (plus Audience)
> **Category**: Performance / Improv

## Concept
You are a visionary entrepreneur pitching a "World-Changing Product." The only problem? You've never seen the slides before, and your "Assistant" (another player) is the one choosing which slide comes next.

## Core Mechanic
Presenter/Assistant Dual-Role. The Presenter speaks live (audio streamed to others or just played in the room). The Assistant has a "Control Panel" with 3 possible next slides. They can choose a "Helpful" slide (matches the vibe) or a "Sabotage" slide (completely unrelated).

## Game Flow
1. **Lobby** → Players are paired: One Presenter, one Assistant.
2. **The Pitch** → A product name is generated (e.g., "The Solar-Powered Umbrella").
3. **The Presentation** → 90 seconds. 
   - Every 15 seconds, the Assistant picks the next slide from a random pool.
   - The Presenter must incorporate whatever appears (e.g., a picture of a sad horse) into their pitch.
4. **Audience Reaction** → Spectators have "Hype" and "Cringe" buttons they can mash during the speech.
5. **Finale: The Investment** → The audience decides how much "Monopoly Money" to invest in the product.

## Scoring System
- **Investment Total**: The primary score.
- **Assistant Synergy**: Points if the Presenter successfully "Transitioned" to a Sabotage slide without stuttering.
- **Hype Peak**: Bonus for the highest "Hype-per-second" moment.
- **Quick Thinking**: AI-detected "Keywords" from the speech that match the slide content.

## Content Requirements
- 1,000+ Random Slide Images (Stock photos, charts, weird art).
- 500+ Ridiculous Product Names.

## Technical Implementation
### Template Changes
- `SlideDeckEntity`: A collection of `Image` components with `transition` logic.
- `PresenterState`: Tracks `isSpeaking` and `currentSlideIndex`.

### New Infrastructure
- **Live Slide Control**: A real-time "Director's View" for the Assistant that shows previews of upcoming slides and allows one-tap transitions.
- **Mic Performance Stack**: A system to capture and (optionally) transcribe or analyze the Presenter's voice for "Energy" and "Keywords."
- **Audience Reaction HUD**: A transparent overlay on the main screen showing a "Live Sentiment Graph" based on audience button mashing.

### Input Types Used
- `SlideSelector`: Assistant's 3-choice input.
- `SentimentButton`: Rapid-fire audience feedback.
- `LiveAudio`: (Optional) Streaming voice to remote players.

### Estimated Phases
- `LOBBY`
- `PAIRING`
- `PITCH_PHASE`
- `INVESTMENT_PHASE`
- `RESULTS`

## Dependencies
- `LiveSlideSystem` (New)
- `SentimentAnalysisEngine` (New)

## Design Notes
- The "Assistant" role is just as fun as the "Presenter" because you get to be the puppet master.
- Pitfall: Presenters getting "Stage Fright." Solution: A "Panic Button" that generates a "Script Prompt" to help them get back on track.
- Uniqueness: High-stakes performance combined with real-time collaborative sabotage.
