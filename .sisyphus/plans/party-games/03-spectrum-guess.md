# The Calibration Lab

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 3-8
> **Category**: Calibration, Drawing, Social

## Concept
You are a technician in a top-secret research facility. Your job is to calibrate the "Vibe-O-Meter." You'll be given a scale and a target percentage, and you must create a drawing or text that perfectly hits that mark. Your friends then try to guess your target.

## Core Mechanic
Players receive a prompt (e.g., "0% Cute to 100% Terrifying") and a target (e.g., "70%"). They must draw or write something that they believe represents that 70% mark. Others use a slider to guess the target percentage.

## Game Flow
1. **Lobby** → Players choose their "Lab Coat" color.
2. **The Calibration**:
    - Players receive a scale and a target number (1-10 or 1-100).
    - Players draw or write their response.
3. **The Guessing**:
    - One by one, responses are shown.
    - Others guess the target number using a slider.
4. **The Reveal**: The actual target is revealed. Proximity determines points.

## Scoring System
- **Creator Bonus**: Points based on how close the *average* guess was to the target.
- **Guesser Points**: 1000 points for an exact match, decreasing as distance increases.
- **Confidence Bonus**: +200 points if you are within 5% of the target.

## Content Requirements
- Content type: `NonsensoryScale` (New schema).
- Volume needed: 100+ scales.
- Generation approach: AI-generated scales (e.g., "Boring to Exciting", "Cheap to Expensive").

## Technical Implementation
### Template Changes
Needs a new `slider` input type or a `choice` input that represents a range. The `reveal` phase needs to animate the slider from the average guess to the actual truth.

### New Infrastructure
- **Slider Input**: A custom UI component for the phone that returns a numeric value.
- **Proximity Logic**: A utility to calculate scores based on absolute difference.

### Input Types Used
- `drawing` or `text`: For the response.
- `choice` (Slider): For guessing the percentage.

### Estimated Phases
`lobby` → `calibration` → `guessing` → `reveal` → `winner`

## Dependencies
- `paint.tsx`.
- New `slider` input support in `PartyRoomDO`.

## Design Notes
The fun is in the debate: "How is that 70% terrifying? That's at least 90%!" It tests how well you know your friends' internal scales.
