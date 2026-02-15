# Chronos' Crisis

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 1-8
> **Category**: Trivia, Year Guessing

## Concept
Time is collapsing! As a Time Warden, you must stabilize the timeline by correctly identifying when major events occurred. The further you are from the truth, the more "Time Stress" you accumulate. Lowest stress wins.

## Core Mechanic
Players are shown an event (e.g., "The first iPhone is released"). They must guess the exact year. Scoring is "Golf Style"—you want the lowest score. Your score is the absolute difference between your guess and the actual year.

## Game Flow
1. **Lobby** → Players select their "Time Machine" model.
2. **Decade Rounds**:
    - **The 90s**: 3 questions from that decade.
    - **The 20th Century**: 3 questions from 1900-1999.
    - **Ancient History**: 3 questions from BC/BCE.
3. **The Jinx**: A rapid-fire round where you have 5 seconds to guess each year.
4. **Finale**: One final event. You can "bet" to reduce your current stress if you get it exactly right.

## Scoring System
- **Year Difference**: +1 point per year off.
- **Perfect Match**: -500 points (Stress reduction).
- **Within 2 Years**: 0 points (No stress added).

## Content Requirements
- Content type: `HistoricalEvent` (New schema: `{ event: string, year: number, description: string }`).
- Volume needed: 500+ events to ensure replayability.
- Generation approach: AI-curated historical database.

## Technical Implementation
### Template Changes
Needs a numeric input field that handles a wide range of years (including negative for BC).

### New Infrastructure
- **Timeline UI**: A scrollable timeline component for the phone to make year selection intuitive.
- **Stress Meter**: A visual representation of the player's score that "cracks" as it gets higher.

### Input Types Used
- `text` (Numeric): For year entry.
- `choice`: For decade selection.

### Estimated Phases
`lobby` → `round_start` → `guessing` → `reveal` → `scores` → `winner`

## Dependencies
- `HistoricalEvent` content type.
- Numeric input validation.

## Design Notes
Solo mode is a great addition here for practice. The "Jinx" round adds tension. We should include "fun facts" in the reveal phase to add educational value.
