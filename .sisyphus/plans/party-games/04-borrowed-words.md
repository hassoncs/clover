# Lexicon Landfill (Borrowed Words)

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-12
> **Category**: Word Recycling Comedy

## Concept
In a post-apocalyptic world where original thought is banned, players must scavenge words from a "Lexicon Landfill" to answer questions. You can only use words that other players wrote in the first round.

## Core Mechanic
Phase 1 is a "Free-Text" icebreaker. All words used in these responses are broken down into individual "tokens." In Phase 2, players are given prompts but NO keyboard—they must drag and drop tokens from the shared pool to build their answers.

## Game Flow
1. **Lobby** → Scavengers assemble at the landfill.
2. **The Dump (Phase 1)** → Players answer 2 simple questions (e.g., "What's in your pocket?", "Describe your dream house").
3. **Tokenization** → The server breaks all answers into individual words, removes common stop words (optional), and creates a "Token Pool."
4. **The Scavenge (Phase 2)** → Players get a funny prompt (e.g., "A new slogan for a failing airline").
5. **Composition** → Players use the "Token Composer" to build an answer using ONLY the words in the pool.
6. **The Reveal** → Answers are shown, highlighting which player "donated" each word.
7. **Voting** → Players vote for the best scavenged answer.

## Scoring System
- **Best Answer**: 1000 points.
- **Word Donor Bonus**: +50 points to the player whose word was used in a winning answer.
- **Creativity Bonus**: +200 points for using 5+ tokens in a single answer.

## Content Requirements
- 200+ "The Dump" prompts (designed to elicit a variety of nouns/verbs).
- 300+ "The Scavenge" prompts (designed for funny combinations).

## Technical Implementation
### Template Changes
- `borrowed-words.ts`: Manages the tokenization logic and the constrained input phase.

### New Infrastructure
- **Token Composer**: A new input type for the mobile controller. It displays a "hand" of available tokens (words) that can be dragged into a "sentence area."
- **Word Parser**: A utility to clean and tokenize player input, handling punctuation and case sensitivity.
- **Attribution Engine**: Tracks which player originally submitted which word to calculate "Donor Bonuses."

### Input Types Used
- `text`: For the initial "Dump" phase.
- `token-composer`: New input type for selecting/rearranging words.
- `choice`: For voting.

### Estimated Phases
- `Lobby`
- `TheDump`
- `Scavenge`
- `Reveal`
- `Voting`
- `Winner`

## Dependencies
- UI components for the "Token Composer" (drag-and-drop in React Native).

## Design Notes
- **Fun Factor**: The frustration and hilarity of trying to express a complex idea with a limited, weird vocabulary.
- **Balance**: Ensure the "Dump" phase provides enough words (add "Emergency Tokens" if the pool is too small).
- **Pitfalls**: If players write very short answers in Phase 1, Phase 2 becomes too difficult.
