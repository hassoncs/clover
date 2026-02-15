# Truth Trap

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 3-8
> **Category**: Bluffing, Trivia

## Concept
Welcome to the **Fact-Checker's Nightmare**, a high-stakes game of historical revisionism. Players are presented with obscure, unbelievable facts where the most important detail has been redacted. Your job is to write a lie so plausible that your friends fall into your "Truth Trap."

## Core Mechanic
Each round, a prompt appears with a blank (e.g., "In 1923, a man was arrested for trying to sell the ______."). Players submit a "decoy" answer. All player decoys, plus one AI-generated "House Decoy," are mixed with the actual truth. Players then vote on which one they believe is the real fact.

## Game Flow
1. **Lobby** → Players join and select a "Fact-Checker" avatar.
2. **Round 1-2** → 
    - **The Lie**: Players write a believable lie for the blank.
    - **The Choice**: All answers are revealed. Players pick the one they think is true.
    - **The Reveal**: Truth is revealed, points are awarded.
3. **Finale** → **The Double Trap**: A final, high-stakes question where points are doubled and players can submit two lies.

## Scoring System
- **Fooling Others**: +500 points for every player who picks your lie.
- **Finding Truth**: +1000 points for picking the correct answer.
- **House Trap**: If you pick the AI's lie, -250 points (The House always wins).
- **Multiplier**: Round 2 scores are 1.5x, Finale is 2x.

## Content Requirements
- Content type: `FibbageQuestion`
- Volume needed: 10-15 questions per session.
- Generation approach: AI-generated via `content-pipeline` using GPT-4o to find obscure facts and verify them.
- Categories/themes: History, Science, Pop Culture, Weird Laws.

## Technical Implementation
### Template Changes
Reuses the `quiplash.ts` structure but adds a "Truth" field to the prompt. Needs a new `answering` phase that handles single-string input and a `voting` phase that includes the correct answer in the options.

### New Infrastructure
- **House Decoy Logic**: Integration with `ai-sdk-usage` to generate a believable lie based on the prompt and the real answer.
- **Validation**: Check if player input matches the real answer (if so, prompt them to try again).

### Input Types Used
- `text`: For submitting lies.
- `choice`: For voting on the truth.

### Estimated Phases
`lobby` → `writing_lies` → `voting` → `reveal` → `scores` → `finale` → `winner`

## Dependencies
- `FibbageQuestion` schema in `packages/content-pipeline/`.
- AI lie generation service.

## Design Notes
The fun comes from the "Aha!" moment when the truth is weirder than the lies. Difficulty calibration is key; if the truth is too obvious, the game fails. The AI "House Decoy" ensures there's always a professional-grade lie in the mix.
