# Guffaw Galleon (Punchline Ferry)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-8
> **Category**: Collaborative Joke Construction

## Concept
Comedians on a ferry to "Comedy Island" must work together to craft the perfect joke. One player sets the stage, another provides a "forced word," and the final player delivers the punchline.

## Core Mechanic
Jokes are built in three stages across different players. The "Token Bank" allows players to save funny words from earlier rounds to use as "forced words" in later ones. Optional live voice recording for the punchline adds a layer of performance.

## Game Flow
1. **Lobby** → Players board the Galleon.
2. **Word Bank Phase** → Everyone submits 3 "funny words" to a shared pool.
3. **Setup Phase** → Player A gets a joke template (e.g., "Why did the [Blank] cross the road?") and fills the first blank.
4. **Forced Word Phase** → Player B is given a random word from the pool and must incorporate it into the setup or a "bridge" sentence.
5. **Punchline Phase** → Player C writes the punchline. They can choose to "Perform Live" (record a 5-second audio clip).
6. **The Show** → The joke is displayed (and played if recorded).
7. **Voting** → Players vote on the funniest joke.

## Scoring System
- **Funniest Joke**: 1000 points split between the three contributors (Setup: 200, Bridge: 300, Punchline: 500).
- **Token Usage**: +100 points if the "forced word" was used effectively (voted by others).
- **Performance Bonus**: +200 points for using the live voice feature.

## Content Requirements
- 300+ Joke templates (Setups, Bridges, Punchline structures).
- Sound effects for the "Comedy Club" atmosphere (rimshot, crickets, applause).

## Technical Implementation
### Template Changes
- `punchline-ferry.ts`: Handles the 3-stage pipeline and token bank state.

### New Infrastructure
- **Token Bank**: A shared state object that tracks "funny words" submitted by players and assigns them to future joke stages.
- **Mic Template**: A standardized UI for recording, trimming, and uploading short audio clips to R2.
- **Audio Playback Pipeline**: Ensures the recorded punchline plays at the right moment during the joke reveal.

### Input Types Used
- `text`: For writing setups and punchlines.
- `mic`: New input type for audio recording.
- `choice`: For voting.

### Estimated Phases
- `Lobby`
- `WordBank`
- `Setup`
- `ForcedWord`
- `Punchline`
- `TheShow`
- `Voting`
- `Winner`

## Dependencies
- `BlobStore` for storing audio clips.
- `ElevenLabsService` (optional, for reading the setup if no live voice is used).

## Design Notes
- **Fun Factor**: The "forced word" often leads to surreal and unexpected humor.
- **Balance**: Ensure the setup player doesn't make it impossible for the punchline player.
- **Pitfalls**: Audio quality can vary; need clear instructions for the "Mic" phase.
