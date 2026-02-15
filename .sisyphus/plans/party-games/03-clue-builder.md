# The Lexicon Limit

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Communication, Guessing

## Concept
In a world where vocabulary is a taxed resource, you must describe complex topics using only a government-approved word bank. Can you make your friends guess "The Great Wall of China" using only the words "Big," "Old," "Stone," and "Long"?

## Core Mechanic
One player (The Describer) is given a secret topic. They must build clues using a restricted word bank and sentence templates (e.g., "It is a [Word] [Word]"). Others type their guesses freely. The Describer can see guesses and use them to build new clues.

## Game Flow
1. **Lobby** → Players choose a "Linguist" avatar.
2. **The Description**:
    - The Describer selects words from a shifting word bank to fill a template.
    - Guesser's type answers.
    - If a guess is close, the Describer can select it to "incorporate" it into the next clue.
3. **The Reveal**: Points awarded based on how fast the correct answer was found.
4. **Rotation**: Everyone gets a turn to describe.

## Scoring System
- **Speed Bonus**: Both Describer and correct Guesser get points (starts at 2000, ticks down).
- **Inspiration Bonus**: +200 points if the Describer uses a guesser's word in a successful clue.

## Content Requirements
- Content type: `SecretTopic` (New schema: `{ topic: string, category: string, difficulty: number }`).
- Volume needed: 500+ topics.
- Generation approach: AI-generated topics ranging from "Easy" to "Impossible."

## Technical Implementation
### Template Changes
Requires a "Sentence Builder" UI for the Describer. The `requestInput` for the Describer needs to be persistent/updating as they submit clues.

### New Infrastructure
- **Word Bank Generator**: A system that provides a mix of helpful and useless words for each topic.
- **Real-time Guess Stream**: Guesses must appear on the Describer's screen instantly.

### Input Types Used
- `choice` (Word Bank): For the Describer.
- `text`: For the Guessers.

### Estimated Phases
`lobby` → `describe_round` → `reveal` → `scores` → `winner`

## Dependencies
- Real-time message relay (WebSockets).
- Sentence template engine.

## Design Notes
The frustration of not having the "perfect" word is where the comedy lives. It's like Charades but with a very small dictionary.
