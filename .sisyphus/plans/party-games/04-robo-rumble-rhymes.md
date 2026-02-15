# Cyber-Spit (Robo Rumble Rhymes)

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3-8
> **Category**: Rap Battle / TTS Performance

## Concept
In a futuristic junkyard, robots battle for dominance through the power of rhyme. Players build rap verses using a guided "lyric composer" and then watch as their robotic avatars perform the verses using ElevenLabs Text-to-Speech with rhythmic timing.

## Core Mechanic
Players are given a "beat" and a theme. They must fill in specific slots in a rap template (e.g., "I'm the [Noun] of the [Place], I'll [Verb] your [Body Part] right out of space"). The game then compiles these into a full verse, synced to a backing track.

## Game Flow
1. **Lobby** → Players choose their robot avatar (e.g., Rusty, Sparky, Beep-Boop).
2. **Writing Phase** → Players fill in 4-8 slots to complete two verses.
3. **The Duel** → Two robots are placed on the "Performance Stage".
4. **Performance** → The game plays a backing track. Robot A's verse is read by TTS in a rhythmic, "robotic rap" style. Then Robot B.
5. **Voting** → The audience votes on who had the better flow/lyrics.
6. **Finale** → The top two robots face off in a "Free-Style" where they get more slots and a faster beat.

## Scoring System
- **Win Duel**: 1000 points.
- **Rhyme Bonus**: AI evaluates if the chosen words actually rhyme (using a phonetic library) +200 points.
- **Audience Favorite**: Most votes in a round gets a "Golden Gear" (+500 points).

## Content Requirements
- 100+ Rap templates with varying themes (Sci-fi, Food, Trash, Ego).
- 10+ Looping backing tracks (Boom Bap, Trap, Industrial).
- ElevenLabs Voice IDs for each robot avatar.

## Technical Implementation
### Template Changes
- `robo-rumble.ts`: Manages the lyric assembly and performance timing.
- Integration with `ElevenLabsService` for real-time audio generation.

### New Infrastructure
- **Lyric Composer**: A specialized input type that shows a template with "blanks" and provides suggestions or constraints.
- **TTS Performance Stage**: A system that synchronizes TTS playback with a musical beat. Requires "viseme" or timing data from the TTS engine to animate robot mouths.
- **Audio Mixer**: Server-side or client-side mixing of the backing track and the generated TTS voice.

### Input Types Used
- `text-slots`: New input type for filling multiple blanks in a single view.
- `choice`: For voting.

### Estimated Phases
- `Lobby`
- `Writing`
- `Performance` (Loop per duel)
- `Voting` (Loop per duel)
- `Winner`

## Dependencies
- `ElevenLabsService` (already exists, but needs rhythmic timing support).
- Audio playback system that can handle multiple layers.

## Design Notes
- **Fun Factor**: Hearing a robot voice say ridiculous things in a rap cadence is inherently funny.
- **Balance**: Provide "auto-fill" or "suggestions" for players who struggle with rhyming.
- **Pitfalls**: TTS latency can break the "flow"; need to pre-generate or buffer audio.
