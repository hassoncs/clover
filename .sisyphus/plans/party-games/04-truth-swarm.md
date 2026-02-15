# The Great Filter

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 1–100
> **Category**: Rapid-fire Trivia / Mass Sorting

## Concept
The universe is being flooded with "Corrupted Data" (lies). Players act as Cosmic Archivists who must rapidly sort incoming data streams into "Pure" (True) or "Corrupted" (False) to prevent a total reality collapse.

## Core Mechanic
A high-speed stream of statements appears on the screen. Players must swipe left (False) or right (True) on their devices. The faster the answer, the higher the score. As the game progresses, the "Filter Speed" increases, and "Glitch Statements" (ambiguous or tricky) appear.

## Game Flow
1. **Lobby** → Players join via QR. Audience members (up to 100) are partitioned into "Processing Nodes."
2. **Round 1: The Stream** → 20 rapid-fire statements. 3 seconds per statement.
3. **Round 2: Overload** → Statements appear faster. Some statements are "Double Data" (two statements, must pick the one that is True).
4. **Round 3: The Singularity** → A single, complex paragraph where players must tap all "Corrupted" words within 15 seconds.
5. **Finale: The Great Purge** → A final gauntlet of 10 "Impossible" facts. Only the top 10% of players survive to the final leaderboard.

## Scoring System
- **Base Score**: 100 points for a correct answer.
- **Speed Bonus**: Up to +100 points based on response time (linear decay over 3s).
- **Streak Multiplier**: Every 5 correct answers in a row adds 0.5x to the multiplier (max 3x).
- **Audience Consensus**: If 90%+ of the audience gets it right, everyone gets a "Sync Bonus" of 50 points.

## Content Requirements
- 1,000+ True/False statements across categories: Science, History, Pop Culture, Absurdity.
- AI Generation: Use `generateObject` to create batches of 50 statements with "Tricky" variations.

## Technical Implementation
### Template Changes
- `GameDefinition`: Add `concurrencyConfig` to handle high-volume input.
- `Entity`: New `DataStream` component to manage rapid state transitions.

### New Infrastructure
- **High-Concurrency Input Buffer**: A specialized `Durable Object` (`StreamProcessorDO`) to aggregate 100+ inputs per second without blocking the main game loop.
- **Anti-Spam Filter**: Rate-limiting on the client-side and server-side validation to prevent macro-swiping.
- **Audience Partitioning**: Logic to group large audiences into sub-clusters for "Consensus" calculations.

### Input Types Used
- `SwipeGesture`: Left/Right swiping.
- `MultiTap`: Tapping specific words in a text block.

### Estimated Phases
- `LOBBY`
- `STREAM_PHASE`
- `OVERLOAD_PHASE`
- `SINGULARITY_PHASE`
- `PURGE_PHASE`
- `RESULTS`

## Dependencies
- `StreamProcessorDO` (New)
- `HighVolumeInputSystem` (New)

## Design Notes
- The "Fun Factor" comes from the sheer chaos of the speed. 
- Pitfall: Latency. Solution: Use client-side prediction for the "Correct/Incorrect" animation, then reconcile with the server.
- Uniqueness: Scaling to 100 players makes it feel like a massive event rather than a small room game.
