# Art Critic Chaos (Caption Clash Live)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-12
> **Category**: Image Debate / Annotation

## Concept
A prestigious art gallery has been filled with "Slop Art" (AI-generated nonsense). Players must take on the role of pretentious art critics and debate the "true meaning" of these pieces.

## Core Mechanic
Players use "Image Annotation" to circle specific parts of a weird image and explain what they represent. This is followed by a "Live Debate" where two critics defend their interpretations while others can "Jump In" with quick verbal jabs.

## Game Flow
1. **Lobby** → Critics put on their virtual turtlenecks.
2. **The Masterpiece** → A weird, abstract AI-generated image is shown.
3. **Annotation Phase** → Players circle a part of the image and write a "Deep Meaning" (e.g., "This smudge represents the death of the middle class").
4. **The Clash** → Two interpretations are paired up.
5. **Live Debate** → The two players have 45 seconds to verbally argue why their interpretation is superior.
6. **Jump In** → Non-active players have a "Buzzer" that lets them record a 2-second "Harrumph!" or "Preposterous!" to interrupt the debate.
7. **Voting** → The audience votes on the most "convincing" critic.

## Scoring System
- **Winning Debate**: 1000 points.
- **Pretentiousness Bonus**: +200 points if you used 3+ "art school" words (detected by AI).
- **Jump-In King**: +100 points for the best-timed interruption.

## Content Requirements
- 500+ AI-generated abstract/surreal images.
- List of "Pretentious Words" for the bonus system.

## Technical Implementation
### Template Changes
- `caption-clash-live.ts`: Manages the image state, annotations, and the debate timer.

### New Infrastructure
- **Image Annotation Input**: A specialized input type that allows drawing/circling on top of a provided image and attaching a text label to the coordinates.
- **Live Debate System**: A state machine that manages the 45-second window, handling the "Jump In" audio interrupts.
- **Audio Interrupt Mixer**: A system to duck the main debater's audio when a "Jump In" clip is played.

### Input Types Used
- `annotation`: New input type (Image + Drawing + Text).
- `mic`: For the debate and interruptions.
- `buzzer`: For the "Jump In" mechanic.
- `choice`: For voting.

### Estimated Phases
- `Lobby`
- `Annotation`
- `TheClash` (Loop per pair)
- `Debate` (Loop per pair)
- `Voting` (Loop per pair)
- `Winner`

## Dependencies
- `Scenario.com` for generating the "Slop Art" images.
- `BlobStore` for storing annotations and audio.

## Design Notes
- **Fun Factor**: Acting like a snobby critic is a great role-playing hook.
- **Balance**: The "Jump In" mechanic keeps non-active players engaged during long debates.
- **Pitfalls**: Debates can drag; the timer must be strict.
